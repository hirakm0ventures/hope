import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { RsvpService } from './rsvp.service.js';
import { CreateRsvpDto } from './dto/index.js';

@Controller()
export class RsvpController {
  constructor(private readonly rsvpService: RsvpService) {}

  @Post('rsvp')
  create(@Body() dto: CreateRsvpDto) {
    return this.rsvpService.create(dto);
  }

  @Get('rsvp/user/:userId')
  findByUser(@Param('userId') userId: string, @Query('eventId') eventId?: string) {
    return this.rsvpService.findByUser(userId, eventId);
  }

  @Get('rsvp/:id')
  findOne(@Param('id') id: string) {
    return this.rsvpService.findOne(id);
  }

  @Post('rsvp/:id/cancel')
  cancel(@Param('id') id: string) {
    return this.rsvpService.cancel(id);
  }

  @Post('offers/:id/accept')
  acceptOffer(@Param('id') id: string) {
    return this.rsvpService.acceptOffer(id);
  }

  @Post('offers/:id/decline')
  declineOffer(@Param('id') id: string) {
    return this.rsvpService.declineOffer(id);
  }
}
