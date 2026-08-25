import { forwardRef, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Model } from 'mongoose';
import { EventManagerController } from './event-manager.controller';
import { EventManagerService } from './event-manager.service';
import { EventManagerRepository } from './event-manager.repository';
import { EventModule } from '../event/event.module';
import { FavoriteModule } from '../favorite/favorite.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
import { NotificationService } from '../notification/notification.service';
import { NotificationModule } from '../notification/notification.module';
import { EVENT_MANAGER_MODEL } from '../../config/mongoose.config';
import { EventManagerDocument } from './event-manager.schema';

@Module({
  // Circular with EventModule - EventService.assertCanManage needs
  // EventManagerService.isAcceptedManager() to authorize edits/deletes,
  // EventManagerService needs EventService for the event itself (owner,
  // title, series membership). Also circular with FavoriteModule and
  // AttendanceModule - respondToInvite() grants both like and attendance on
  // accept, and each of those services' own getFavoritedEventsDetailed/
  // getAttendedEventsDetailed call getAcceptedEventIdsForUser. forwardRef()
  // here resolves the *module* graph in all cases; the services resolve
  // each other lazily via ModuleRef (see each service's own comments) - same
  // pattern as the other circular pairs in this codebase.
  imports: [
    forwardRef(() => EventModule),
    forwardRef(() => FavoriteModule),
    forwardRef(() => AttendanceModule),
    UserModule,
    NotificationModule,
  ],
  controllers: [EventManagerController],
  providers: [
    {
      provide: EventManagerService,
      useFactory: (
        eventManagerModel: Model<EventManagerDocument>,
        moduleRef: ModuleRef,
        userService: UserService,
        notificationService: NotificationService,
      ) => {
        const eventManagerRepository = new EventManagerRepository(eventManagerModel);
        return new EventManagerService(eventManagerRepository, moduleRef, userService, notificationService);
      },
      inject: [EVENT_MANAGER_MODEL, ModuleRef, UserService, NotificationService],
    },
  ],
  exports: [EventManagerService],
})
export class EventManagerModule {}
