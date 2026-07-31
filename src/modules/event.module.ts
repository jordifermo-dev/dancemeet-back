import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventController } from '../controllers/event.controller';
import { EventService } from '../services/event.service';
import { EventRepository } from '../repositories/event.repository';
import { UserRepository } from '../repositories/user.repository';
import { EVENT_MODEL, USER_MODEL } from '../config/mongoose.config';
import { EventDocument } from '../schemas/event.schema';
import { UserDocument } from '../schemas/user.schema';

@Module({
  controllers: [EventController],
  providers: [
    {
      provide: EventService,
      useFactory: (eventModel: Model<EventDocument>, userModel: Model<UserDocument>) => {
        const eventRepository = new EventRepository(eventModel);
        const userRepository = new UserRepository(userModel);
        return new EventService(eventRepository, userRepository);
      },
      inject: [EVENT_MODEL, USER_MODEL],
    },
  ],
  exports: [EventService],
})
export class EventModule {}
