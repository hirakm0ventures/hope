import { Module, forwardRef } from '@nestjs/common';
import { RsvpController } from './rsvp.controller.js';
import { RsvpService } from './rsvp.service.js';
import { WaitlistModule } from '../waitlist/waitlist.module.js';

@Module({
  imports: [forwardRef(() => WaitlistModule)],
  controllers: [RsvpController],
  providers: [RsvpService],
  exports: [RsvpService],
})
export class RsvpModule {}
