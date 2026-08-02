import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventReminderService } from '../services/event-reminder.service';
import { EventRepository } from '../repositories/event.repository';
import { FavoriteRepository } from '../repositories/favorite.repository';
import { NotificationService } from '../services/notification.service';
import { NotificationModule } from './notification.module';
import { EVENT_MODEL, FAVORITE_MODEL } from '../config/mongoose.config';
import { EventDocument } from '../schemas/event.schema';
import { FavoriteDocument } from '../schemas/favorite.schema';

@Module({
  imports: [NotificationModule],
  providers: [
    {
      provide: EventReminderService,
      useFactory: (
        eventModel: Model<EventDocument>,
        favoriteModel: Model<FavoriteDocument>,
        notificationService: NotificationService,
      ) => {
        const eventRepository = new EventRepository(eventModel);
        const favoriteRepository = new FavoriteRepository(favoriteModel);
        return new EventReminderService(eventRepository, favoriteRepository, notificationService);
      },
      inject: [EVENT_MODEL, FAVORITE_MODEL, NotificationService],
    },
  ],
  exports: [EventReminderService],
})
export class EventReminderModule {}
