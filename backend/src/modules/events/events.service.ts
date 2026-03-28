import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateEventDto, UpdateCapacityDto } from './dto/index.js';
import { WaitlistService } from '../waitlist/waitlist.service.js';
import { Prisma } from '../../../generated/prisma/client.js';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly waitlistService: WaitlistService,
  ) {}

  async create(dto: CreateEventDto) {
    return this.prisma.client.event.create({
      data: {
        name: dto.name,
        totalCapacity: dto.totalCapacity,
      },
    });
  }

  async findAll() {
    return this.prisma.client.event.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.client.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException(`Event ${id} not found`);
    return event;
  }

  async getStats(id: string) {
    const event = await this.findOne(id);
    const [confirmed, waitlisted, offered] = await Promise.all([
      this.prisma.client.rsvp.count({
        where: { eventId: id, status: 'CONFIRMED' },
      }),
      this.prisma.client.rsvp.count({
        where: { eventId: id, status: 'WAITLISTED' },
      }),
      this.prisma.client.rsvp.count({
        where: { eventId: id, status: 'OFFERED' },
      }),
    ]);
    return {
      ...event,
      confirmed,
      waitlisted,
      offered,
      available: event.totalCapacity - confirmed - offered,
    };
  }

  async updateCapacity(id: string, dto: UpdateCapacityDto) {
    const { previousCapacity, updated } = await this.prisma.client.$transaction(
      async (tx) => {
        const [event] = await tx.$queryRaw<
          { id: string; totalCapacity: number }[]
        >(Prisma.sql`
          SELECT "id", "totalCapacity"
          FROM "events"
          WHERE "id" = ${id}
          FOR UPDATE
        `);
        if (!event) {
          throw new NotFoundException(`Event ${id} not found`);
        }

        const updatedEvent = await tx.event.update({
          where: { id },
          data: { totalCapacity: dto.totalCapacity },
        });

        return {
          previousCapacity: event.totalCapacity,
          updated: updatedEvent,
        };
      },
    );

    // If capacity increased, process waitlist to fill new slots.
    if (dto.totalCapacity > previousCapacity) {
      await this.waitlistService.processWaitlist(id);
    }

    return updated;
  }

  async getActiveCount(eventId: string): Promise<number> {
    return this.prisma.client.rsvp.count({
      where: {
        eventId,
        status: { in: ['CONFIRMED', 'OFFERED'] },
      },
    });
  }

  async hasAvailableCapacity(eventId: string): Promise<boolean> {
    const event = await this.findOne(eventId);
    const active = await this.getActiveCount(eventId);
    return active < event.totalCapacity;
  }
}
