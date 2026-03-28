import { Module, forwardRef } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { WaitlistModule } from '../waitlist/waitlist.module.js';

@Module({
  imports: [forwardRef(() => WaitlistModule)],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
