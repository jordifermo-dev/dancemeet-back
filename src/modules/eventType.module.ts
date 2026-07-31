import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventTypeController } from '../controllers/eventType.controller';
import { EventTypeService } from '../services/eventType.service';
import { EventTypeRepository } from '../repositories/eventType.repository';
import { EVENT_TYPE_MODEL } from '../config/mongoose.config';
import { EventTypeDocument } from '../schemas/event-type.schema';

@Module({
  controllers: [EventTypeController],
  providers: [
    {
      provide: EventTypeService,
      useFactory: (eventTypeModel: Model<EventTypeDocument>) => {
        const eventTypeRepository = new EventTypeRepository(eventTypeModel);
        return new EventTypeService(eventTypeRepository);
      },
      inject: [EVENT_TYPE_MODEL],
    },
  ],
  exports: [EventTypeService],
})
export class EventTypeModule {}
