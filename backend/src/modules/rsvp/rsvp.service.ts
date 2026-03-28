import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RsvpStatus } from '../../../generated/prisma/enums.js';
import { CreateRsvpDto } from './dto/index.js';
import { WaitlistService } from '../waitlist/waitlist.service.js';

/** Valid RSVP state transitions */
const VALID_TRANSITIONS: Record<RsvpStatus, RsvpStatus[]> = {
  WAITLISTED: ['OFFERED'],
  OFFERED: ['CONFIRMED', 'EXPIRED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED'],
  EXPIRED: [],
  CANCELLED: [],
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
      const event = await tx.event.findUnique({ where: { id: dto.eventId } });
      if (!event) throw new NotFoundException(`Event ${dto.eventId} not found`);

      const confirmedCount = await tx.rsvp.count({
        where: { eventId: dto.eventId, status: 'CONFIRMED' },
      });

      if (confirmedCount < event.totalCapacity) {
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

  /**
   * Cancel an RSVP. If it was CONFIRMED, trigger waitlist processing.
   */
  async cancel(id: string) {
    return this.prisma.client
      .$transaction(async (tx) => {
        const rsvp = await tx.rsvp.findUnique({ where: { id } });
        if (!rsvp) throw new NotFoundException(`RSVP ${id} not found`);

        // Allow cancelling from CONFIRMED or OFFERED
        if (rsvp.status !== 'CONFIRMED' && rsvp.status !== 'OFFERED') {
          this.validateTransition(rsvp.status as RsvpStatus, 'CANCELLED');
        }

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
        // After transaction, if was CONFIRMED → process waitlist outside tx
        if (result.previousStatus === 'CONFIRMED') {
          await this.waitlistService.processWaitlist(result.rsvp.eventId);
        }
        return result.rsvp;
      });
  }

  /**
   * Accept an offer — atomic: check not expired, set CONFIRMED
   */
  async acceptOffer(id: string) {
    return this.prisma.client.$transaction(async (tx) => {
      // Lock the row using findFirst with a raw query for SELECT FOR UPDATE
      const [rsvp] = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "rsvps" WHERE "id" = $1 FOR UPDATE`,
        id,
      );

      if (!rsvp) throw new NotFoundException(`RSVP ${id} not found`);

      if (rsvp.status !== 'OFFERED') {
        throw new ConflictException(
          `Cannot accept: RSVP is ${rsvp.status}, not OFFERED`,
        );
      }

      if (rsvp.offerExpiresAt && new Date(rsvp.offerExpiresAt) < new Date()) {
        // Mark as expired
        await tx.rsvp.update({
          where: { id },
          data: { status: 'EXPIRED', offerExpiresAt: null },
        });
        throw new ConflictException('Offer has expired');
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
      return updated;
    });
  }

  /**
   * Decline an offer — mark as CANCELLED, trigger next in waitlist
   */
  async declineOffer(id: string) {
    const rsvp = await this.prisma.client.$transaction(async (tx) => {
      const rsvp = await tx.rsvp.findUnique({ where: { id } });
      if (!rsvp) throw new NotFoundException(`RSVP ${id} not found`);

      if (rsvp.status !== 'OFFERED') {
        throw new ConflictException(
          `Cannot decline: RSVP is ${rsvp.status}, not OFFERED`,
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
    await this.waitlistService.processWaitlist(rsvp.eventId);
    return rsvp;
  }
}
