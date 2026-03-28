import { Controller, Post, Body } from '@nestjs/common';
import { JoinWaitlistDto } from './dto/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('join')
  async join(@Body() dto: JoinWaitlistDto) {
    const tier = dto.tier ?? 'GENERAL';

    return this.prisma.client.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: dto.eventId } });
      if (!event) {
        throw new Error(`Event ${dto.eventId} not found`);
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
