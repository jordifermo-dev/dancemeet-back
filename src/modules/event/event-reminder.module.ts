import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventReminderService } from './event-reminder.service';
import { EventRepository } from './event.repository';
import { FavoriteRepository } from '../favorite/favorite.repository';
import { NotificationService } from '../notification/notification.service';
import { NotificationModule } from '../notification/notification.module';
import { EVENT_MODEL, FAVORITE_MODEL } from '../../config/mongoose.config';
import { EventDocument } from './event.schema';
import { FavoriteDocument } from '../favorite/favorite.schema';

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
