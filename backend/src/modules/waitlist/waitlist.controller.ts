import { Controller, Post, Body } from '@nestjs/common';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { JoinWaitlistDto } from './dto/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('join')
  async join(@Body() dto: JoinWaitlistDto) {
    const tier = dto.tier ?? 'GENERAL';

    return this.prisma.client.$transaction(async (tx) => {
      const [event] = await tx.$queryRaw<{ id: string; totalCapacity: number }[]>(
        Prisma.sql`
          SELECT "id", "totalCapacity"
          FROM "events"
          WHERE "id" = ${dto.eventId}
          FOR UPDATE
        `,
      );
      if (!event) {
        throw new NotFoundException(`Event ${dto.eventId} not found`);
      }

      // Prevent duplicate active RSVP
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

      // Check if there's capacity — if so, confirm directly instead of waitlisting
      const activeCount = await tx.rsvp.count({
        where: {
          eventId: dto.eventId,
          status: { in: ['CONFIRMED', 'OFFERED'] },
        },
      });

      if (activeCount < event.totalCapacity) {
        const rsvp = await tx.rsvp.create({
          data: {
            userId: dto.userId,
            eventId: dto.eventId,
            tier,
            status: 'CONFIRMED',
          },
        });
        console.log(
          `Capacity available — user ${dto.userId} confirmed directly for event ${dto.eventId}`,
        );
        return rsvp;
      }

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
        `User ${dto.userId} joined waitlist at position ${nextPosition} for event ${dto.eventId}`,
      );
      return rsvp;
    });
  }
}
