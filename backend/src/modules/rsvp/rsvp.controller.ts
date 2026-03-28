import { Controller, Post, Param, Body } from '@nestjs/common';
import { RsvpService } from './rsvp.service.js';
import { CreateRsvpDto } from './dto/index.js';

@Controller()
export class RsvpController {
  constructor(private readonly rsvpService: RsvpService) {}

  @Post('rsvp')
  create(@Body() dto: CreateRsvpDto) {
    return this.rsvpService.create(dto);
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
