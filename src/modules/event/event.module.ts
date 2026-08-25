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
import { AttendanceModule } from '../attendance/attendance.module';
import { EventManagerModule } from '../event-manager/event-manager.module';
import { NotificationService } from '../notification/notification.service';
import { NotificationModule } from '../notification/notification.module';
import { EVENT_MODEL } from '../../config/mongoose.config';
import { EventDocument } from './event.schema';

@Module({
  // FavoriteModule, AttendanceModule and EventManagerModule are all circular
  // with this one - see FavoriteModule's own comment for why (auto-liking
  // the creator vs. "events I liked"), AttendanceModule's (same shape, for
  // attendance), and EventManagerModule's (assertCanManage needs
  // EventManagerService, invites need the event back). forwardRef() here
  // still resolves the *module* graph; EventService itself resolves all
  // three lazily via ModuleRef (see EventService), because constructor-
  // injecting a forwardRef()'d circular provider through a useFactory
  // produced null at runtime.
  imports: [
    UserModule,
    FollowersModule,
    forwardRef(() => FavoriteModule),
    forwardRef(() => AttendanceModule),
    forwardRef(() => EventManagerModule),
    NotificationModule,
  ],
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
