import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventController } from '../controllers/event.controller';
import { ShareController } from '../controllers/share.controller';
import { EventService } from '../services/event.service';
import { EventRepository } from '../repositories/event.repository';
import { UserRepository } from '../repositories/user.repository';
import { FollowersRepository } from '../repositories/followers.repository';
import { FavoriteRepository } from '../repositories/favorite.repository';
import { NotificationService } from '../services/notification.service';
import { NotificationModule } from './notification.module';
import { EVENT_MODEL, USER_MODEL, FOLLOWERS_MODEL, FAVORITE_MODEL } from '../config/mongoose.config';
import { EventDocument } from '../schemas/event.schema';
import { UserDocument } from '../schemas/user.schema';
import { FollowersDocument } from '../schemas/followers.schema';
import { FavoriteDocument } from '../schemas/favorite.schema';

@Module({
  imports: [NotificationModule],
  controllers: [EventController, ShareController],
  providers: [
    {
      provide: EventService,
      useFactory: (
        eventModel: Model<EventDocument>,
        userModel: Model<UserDocument>,
        followersModel: Model<FollowersDocument>,
        favoriteModel: Model<FavoriteDocument>,
        notificationService: NotificationService,
      ) => {
        const eventRepository = new EventRepository(eventModel);
        const userRepository = new UserRepository(userModel);
        const followersRepository = new FollowersRepository(followersModel);
        const favoriteRepository = new FavoriteRepository(favoriteModel);
        return new EventService(
          eventRepository,
          userRepository,
          followersRepository,
          favoriteRepository,
          notificationService,
        );
      },
      inject: [EVENT_MODEL, USER_MODEL, FOLLOWERS_MODEL, FAVORITE_MODEL, NotificationService],
    },
  ],
  exports: [EventService],
})
export class EventModule {}
