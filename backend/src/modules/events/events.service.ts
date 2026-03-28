import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateEventDto, UpdateCapacityDto } from './dto/index.js';
import { WaitlistService } from '../waitlist/waitlist.service.js';

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

  async findOne(id: string) {
    const event = await this.prisma.client.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException(`Event ${id} not found`);
    return event;
  }

  async updateCapacity(id: string, dto: UpdateCapacityDto) {
    const event = await this.findOne(id);
    const updated = await this.prisma.client.event.update({
      where: { id },
      data: { totalCapacity: dto.totalCapacity },
    });

    // If capacity increased, process waitlist to fill new slots
    if (dto.totalCapacity > event.totalCapacity) {
      await this.waitlistService.processWaitlist(id);
    }

    return updated;
  }

  async getConfirmedCount(eventId: string): Promise<number> {
    return this.prisma.client.rsvp.count({
      where: { eventId, status: 'CONFIRMED' },
    });
  }

  async hasAvailableCapacity(eventId: string): Promise<boolean> {
    const event = await this.findOne(eventId);
    const confirmed = await this.getConfirmedCount(eventId);
    return confirmed < event.totalCapacity;
  }
}
