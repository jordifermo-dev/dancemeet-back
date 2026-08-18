import { forwardRef, Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventController } from '../controllers/event.controller';
import { ShareController } from '../controllers/share.controller';
import { EventService } from '../services/event.service';
import { EventRepository } from '../repositories/event.repository';
import { UserService } from '../services/user.service';
import { UserModule } from './user.module';
import { FollowersService } from '../services/followers.service';
import { FollowersModule } from './followers.module';
import { FavoriteService } from '../services/favorite.service';
import { FavoriteModule } from './favorite.module';
import { NotificationService } from '../services/notification.service';
import { NotificationModule } from './notification.module';
import { EVENT_MODEL } from '../config/mongoose.config';
import { EventDocument } from '../schemas/event.schema';

@Module({
  // FavoriteModule is circular with this one - see FavoriteModule's own
  // comment for why (auto-favoriting the creator vs. "events I favorited").
  imports: [UserModule, FollowersModule, forwardRef(() => FavoriteModule), NotificationModule],
  controllers: [EventController, ShareController],
  providers: [
    {
      provide: EventService,
      useFactory: (
        eventModel: Model<EventDocument>,
        userService: UserService,
        followersService: FollowersService,
        favoriteService: FavoriteService,
        notificationService: NotificationService,
      ) => {
        const eventRepository = new EventRepository(eventModel);
        return new EventService(
          eventRepository,
          userService,
          followersService,
          favoriteService,
          notificationService,
        );
      },
      // forwardRef() on the FavoriteService token itself - see
      // FavoriteModule's identical comment for why the cast is needed and safe.
      inject: [
        EVENT_MODEL,
        UserService,
        FollowersService,
        forwardRef(() => FavoriteService) as unknown as typeof FavoriteService,
        NotificationService,
      ],
    },
  ],
  exports: [EventService],
})
export class EventModule {}
