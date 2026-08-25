import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { GalleryController } from './gallery.controller';
import { UserGalleryController } from './user-gallery.controller';
import { GalleryCoversController } from './gallery-covers.controller';
import { PrivateGalleryController } from './private-gallery.controller';
import { GalleryService } from './gallery.service';
import { GalleryRepository } from './gallery.repository';
import { EventModule } from '../event/event.module';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { EventService } from '../event/event.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { AttendanceService } from '../attendance/attendance.service';
import { NotificationModule } from '../notification/notification.module';
import { NotificationService } from '../notification/notification.service';
import { GALLERY_MODEL } from '../../config/mongoose.config';
import { GalleryPhotoDocument } from './gallery.schema';

@Module({
  // Plain (non-circular) imports - nothing in EventModule/UserModule/
  // AttendanceModule/NotificationModule needs to call back into
  // GalleryModule, so no forwardRef() is needed here (unlike
  // EventManagerModule's pairs).
  imports: [EventModule, UserModule, AttendanceModule, NotificationModule],
  controllers: [GalleryController, UserGalleryController, GalleryCoversController, PrivateGalleryController],
  providers: [
    {
      provide: GalleryService,
      useFactory: (
        galleryModel: Model<GalleryPhotoDocument>,
        userService: UserService,
        eventService: EventService,
        attendanceService: AttendanceService,
        notificationService: NotificationService,
      ) => {
        const galleryRepository = new GalleryRepository(galleryModel);
        return new GalleryService(galleryRepository, userService, eventService, attendanceService, notificationService);
      },
      inject: [GALLERY_MODEL, UserService, EventService, AttendanceService, NotificationService],
    },
  ],
  exports: [GalleryService],
})
export class GalleryModule {}
