import { forwardRef, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Model } from 'mongoose';
import { EventController } from './event.controller';
import { ShareController } from './share.controller';
import { EventService } from './event.service';
import { EventRepository } from './event.repository';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
import { FollowersService } from '../followers/followers.service';
import { FollowersModule } from '../followers/followers.module';
import { FavoriteModule } from '../favorite/favorite.module';
import { NotificationService } from '../notification/notification.service';
import { NotificationModule } from '../notification/notification.module';
import { EVENT_MODEL } from '../../config/mongoose.config';
import { EventDocument } from './event.schema';

@Module({
  // FavoriteModule is circular with this one - see FavoriteModule's own
  // comment for why (auto-favoriting the creator vs. "events I favorited").
  // forwardRef() here still resolves the *module* graph; EventService itself
  // resolves FavoriteService lazily via ModuleRef (see EventService), because
  // constructor-injecting a forwardRef()'d circular provider through a
  // useFactory produced null at runtime.
  imports: [UserModule, FollowersModule, forwardRef(() => FavoriteModule), NotificationModule],
  controllers: [EventController, ShareController],
  providers: [
    {
      provide: EventService,
      useFactory: (
        eventModel: Model<EventDocument>,
        userService: UserService,
        followersService: FollowersService,
        moduleRef: ModuleRef,
        notificationService: NotificationService,
      ) => {
        const eventRepository = new EventRepository(eventModel);
        return new EventService(
          eventRepository,
          userService,
          followersService,
          moduleRef,
          notificationService,
        );
      },
      inject: [EVENT_MODEL, UserService, FollowersService, ModuleRef, NotificationService],
    },
  ],
  exports: [EventService],
})
export class EventModule {}
