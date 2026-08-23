import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { GalleryController } from './gallery.controller';
import { UserGalleryController } from './user-gallery.controller';
import { GalleryCoversController } from './gallery-covers.controller';
import { GalleryService } from './gallery.service';
import { GalleryRepository } from './gallery.repository';
import { EventModule } from '../event/event.module';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { EventService } from '../event/event.service';
import { FavoriteModule } from '../favorite/favorite.module';
import { FavoriteService } from '../favorite/favorite.service';
import { NotificationModule } from '../notification/notification.module';
import { NotificationService } from '../notification/notification.service';
import { GALLERY_MODEL } from '../../config/mongoose.config';
import { GalleryPhotoDocument } from './gallery.schema';

@Module({
  // Plain (non-circular) imports - nothing in EventModule/UserModule/
  // FavoriteModule/NotificationModule needs to call back into GalleryModule,
  // so no forwardRef() is needed here (unlike EventManagerModule's pairs).
  imports: [EventModule, UserModule, FavoriteModule, NotificationModule],
  controllers: [GalleryController, UserGalleryController, GalleryCoversController],
  providers: [
    {
      provide: GalleryService,
      useFactory: (
        galleryModel: Model<GalleryPhotoDocument>,
        userService: UserService,
        eventService: EventService,
        favoriteService: FavoriteService,
        notificationService: NotificationService,
      ) => {
        const galleryRepository = new GalleryRepository(galleryModel);
        return new GalleryService(galleryRepository, userService, eventService, favoriteService, notificationService);
      },
      inject: [GALLERY_MODEL, UserService, EventService, FavoriteService, NotificationService],
    },
  ],
  exports: [GalleryService],
})
export class GalleryModule {}
