import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventChatController } from './event-chat.controller';
import { EventChatGateway } from './event-chat.gateway';
import { EventChatService } from './event-chat.service';
import { EventChatRepository } from './event-chat.repository';
import { EventModule } from '../event/event.module';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { EventService } from '../event/event.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { AttendanceService } from '../attendance/attendance.service';
import { NotificationModule } from '../notification/notification.module';
import { NotificationService } from '../notification/notification.service';
import { GalleryModule } from '../gallery/gallery.module';
import { GalleryService } from '../gallery/gallery.service';
import { EVENT_CHAT_MODEL } from '../../config/mongoose.config';
import { EventMessageDocument } from './event-chat.schema';

@Module({
  // Plain (non-circular) imports, same reasoning as GalleryModule's own -
  // nothing in EventModule/UserModule/AttendanceModule/NotificationModule/
  // GalleryModule needs to call back into EventChatModule, so no
  // forwardRef() here (confirmed by reading gallery.module.ts - it doesn't
  // import EventChatModule in either direction).
  imports: [EventModule, UserModule, AttendanceModule, NotificationModule, GalleryModule],
  controllers: [EventChatController],
  providers: [
    {
      provide: EventChatService,
      useFactory: (
        eventMessageModel: Model<EventMessageDocument>,
        userService: UserService,
        eventService: EventService,
        attendanceService: AttendanceService,
        notificationService: NotificationService,
        galleryService: GalleryService,
      ) => {
        const eventChatRepository = new EventChatRepository(eventMessageModel);
        return new EventChatService(
          eventChatRepository,
          userService,
          eventService,
          attendanceService,
          notificationService,
          galleryService,
        );
      },
      inject: [EVENT_CHAT_MODEL, UserService, EventService, AttendanceService, NotificationService, GalleryService],
    },
    EventChatGateway,
  ],
  exports: [EventChatService],
})
export class EventChatModule {}
