import { Controller, Post, Patch, Param, Body, Get } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { CreateEventDto, UpdateCapacityDto } from './dto/index.js';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.eventsService.getStats(id);
  }

  @Patch(':id/capacity')
  updateCapacity(@Param('id') id: string, @Body() dto: UpdateCapacityDto) {
    return this.eventsService.updateCapacity(id, dto);
  }
}
