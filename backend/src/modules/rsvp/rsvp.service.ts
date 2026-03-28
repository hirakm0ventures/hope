import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RsvpStatus, Tier } from '../../../generated/prisma/enums.js';
import { Prisma, type Rsvp } from '../../../generated/prisma/client.js';
import { CreateRsvpDto } from './dto/index.js';
import { WaitlistService } from '../waitlist/waitlist.service.js';

/** Valid RSVP state transitions */
const VALID_TRANSITIONS: Record<RsvpStatus, RsvpStatus[]> = {
  WAITLISTED: ['OFFERED', 'CANCELLED'],
  OFFERED: ['CONFIRMED', 'EXPIRED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED'],
  EXPIRED: [],
  CANCELLED: [],
};

type LockedOfferRow = {
  id: string;
  eventId: string;
  tier: Tier;
  status: RsvpStatus;
  offerExpiresAt: Date | null;
};

type AcceptOfferResult =
  | {
      expired: true;
      eventId: string;
      tier: Tier;
    }
  | {
      expired: false;
      rsvp: Rsvp;
    };

@Injectable()
export class RsvpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly waitlistService: WaitlistService,
  ) {}

  validateTransition(from: RsvpStatus, to: RsvpStatus): void {
    if (!VALID_TRANSITIONS[from]?.includes(to)) {
      throw new BadRequestException(
        `Invalid status transition: ${from} → ${to}`,
      );
    }
  }

  /**
   * Create RSVP: if capacity available → CONFIRMED, else → WAITLISTED
   */
  async create(dto: CreateRsvpDto) {
    const tier = dto.tier ?? 'GENERAL';

    return this.prisma.client.$transaction(async (tx) => {
      const [event] = await tx.$queryRaw<
        { id: string; totalCapacity: number }[]
      >(
        Prisma.sql`
          SELECT "id", "totalCapacity"
          FROM "events"
          WHERE "id" = ${dto.eventId}
          FOR UPDATE
        `,
      );
      if (!event) throw new NotFoundException(`Event ${dto.eventId} not found`);

      // Check for existing active RSVP by this user for this event
      const existing = await tx.rsvp.findFirst({
        where: {
          userId: dto.userId,
          eventId: dto.eventId,
          status: { in: ['CONFIRMED', 'WAITLISTED', 'OFFERED'] },
        },
      });
      if (existing) {
        throw new ConflictException(
          `User ${dto.userId} already has an active RSVP (${existing.status}) for this event`,
        );
      }

      // Count CONFIRMED + OFFERED to avoid over-allocation
      const activeCount = await tx.rsvp.count({
        where: {
          eventId: dto.eventId,
          status: { in: ['CONFIRMED', 'OFFERED'] },
        },
      });

      if (activeCount < event.totalCapacity) {
        // Capacity available → CONFIRMED
        const rsvp = await tx.rsvp.create({
          data: {
            userId: dto.userId,
            eventId: dto.eventId,
            tier,
            status: 'CONFIRMED',
          },
        });
        console.log(
          `RSVP confirmed for user ${dto.userId} on event ${dto.eventId}`,
        );
        return rsvp;
      }

      // No capacity → WAITLISTED
      const maxPosition = await tx.rsvp.aggregate({
        where: { eventId: dto.eventId, status: 'WAITLISTED' },
        _max: { waitlistPosition: true },
      });
      const nextPosition = (maxPosition._max.waitlistPosition ?? 0) + 1;

      const rsvp = await tx.rsvp.create({
        data: {
          userId: dto.userId,
          eventId: dto.eventId,
          tier,
          status: 'WAITLISTED',
          waitlistPosition: nextPosition,
        },
      });
      console.log(
        `User ${dto.userId} waitlisted at position ${nextPosition} for event ${dto.eventId}`,
      );
      return rsvp;
    });
  }

  async findOne(id: string) {
    const rsvp = await this.prisma.client.rsvp.findUnique({ where: { id } });
    if (!rsvp) throw new NotFoundException(`RSVP ${id} not found`);
    return rsvp;
  }

  async findByUser(userId: string, eventId?: string) {
    const where: Prisma.RsvpWhereInput = eventId
      ? { userId, eventId }
      : { userId };
    return this.prisma.client.rsvp.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel an RSVP. If it was CONFIRMED, trigger waitlist processing.
   */
  async cancel(id: string) {
    return this.prisma.client
      .$transaction(async (tx) => {
        const rsvp = await tx.rsvp.findUnique({ where: { id } });
        if (!rsvp) throw new NotFoundException(`RSVP ${id} not found`);

        this.validateTransition(rsvp.status, 'CANCELLED');

        const updated = await tx.rsvp.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            waitlistPosition: null,
            offerExpiresAt: null,
          },
        });

        console.log(`RSVP ${id} cancelled (was ${rsvp.status})`);
        return { rsvp: updated, previousStatus: rsvp.status };
      })
      .then(async (result) => {
        // After transaction, if was CONFIRMED or OFFERED → process waitlist
        if (
          result.previousStatus === 'CONFIRMED' ||
          result.previousStatus === 'OFFERED'
        ) {
          await this.waitlistService.processWaitlist(result.rsvp.eventId, [
            result.rsvp.tier,
          ]);
        }
        return result.rsvp;
      });
  }

  /**
   * Accept an offer — atomic: check not expired, set CONFIRMED
   */
  async acceptOffer(id: string) {
    const result: AcceptOfferResult = await this.prisma.client.$transaction(
      async (tx) => {
        // Lock the row using SELECT FOR UPDATE
        const [rsvp] = await tx.$queryRaw<LockedOfferRow[]>(Prisma.sql`
          SELECT "id", "eventId", "tier", "status", "offerExpiresAt"
          FROM "rsvps"
          WHERE "id" = ${id}
          FOR UPDATE
        `);

        if (!rsvp) throw new NotFoundException(`RSVP ${id} not found`);

        if (rsvp.status !== 'OFFERED') {
          throw new ConflictException(
            `Cannot accept: RSVP is ${rsvp.status}, not OFFERED`,
          );
        }

        if (rsvp.offerExpiresAt && new Date(rsvp.offerExpiresAt) < new Date()) {
          // Mark as expired inside tx
          await tx.rsvp.update({
            where: { id },
            data: { status: 'EXPIRED', offerExpiresAt: null },
          });
          return { expired: true, eventId: rsvp.eventId, tier: rsvp.tier };
        }

        const updated = await tx.rsvp.update({
          where: { id },
          data: {
            status: 'CONFIRMED',
            waitlistPosition: null,
            offerExpiresAt: null,
          },
        });

        console.log(`Offer accepted: RSVP ${id} is now CONFIRMED`);
        return { expired: false, rsvp: updated };
      },
    );

    if (result.expired) {
      // Reprocess waitlist for the freed slot, then tell the caller
      await this.waitlistService.processWaitlist(result.eventId, [result.tier]);
      throw new ConflictException('Offer has expired');
    }

    return result.rsvp;
  }

  /**
   * Decline an offer — mark as CANCELLED, trigger next in waitlist
   */
  async declineOffer(id: string) {
    const rsvp = await this.prisma.client.$transaction(async (tx) => {
      // Lock the row to prevent races with cron expiry
      const [row] = await tx.$queryRaw<LockedOfferRow[]>(Prisma.sql`
        SELECT "id", "eventId", "tier", "status", "offerExpiresAt"
        FROM "rsvps"
        WHERE "id" = ${id}
        FOR UPDATE
      `);
      if (!row) throw new NotFoundException(`RSVP ${id} not found`);

      if (row.status !== 'OFFERED') {
        throw new ConflictException(
          `Cannot decline: RSVP is ${row.status}, not OFFERED`,
        );
      }

      const updated = await tx.rsvp.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          waitlistPosition: null,
          offerExpiresAt: null,
        },
      });

      console.log(`Offer declined: RSVP ${id}`);
      return updated;
    });

    // Process waitlist to offer spot to next user
    await this.waitlistService.processWaitlist(rsvp.eventId, [rsvp.tier]);
    return rsvp;
  }
}
