import { forwardRef, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Model } from 'mongoose';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';
import { FavoriteRepository } from './favorite.repository';
import { EventModule } from '../event/event.module';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
import { NotificationService } from '../notification/notification.service';
import { NotificationModule } from '../notification/notification.module';
import { FAVORITE_MODEL } from '../../config/mongoose.config';
import { FavoriteDocument } from './favorite.schema';

@Module({
  // Circular with EventModule - EventService auto-favorites the creator on
  // create, FavoriteService needs EventService for "events I organize or
  // favorited" and attendee-list lookups. forwardRef() here still resolves
  // the *module* graph; FavoriteService itself resolves EventService lazily
  // via ModuleRef (see FavoriteService) - see EventModule's identical
  // comment for why.
  imports: [forwardRef(() => EventModule), UserModule, NotificationModule],
  controllers: [FavoriteController],
  providers: [
    {
      provide: FavoriteService,
      useFactory: (
        favoriteModel: Model<FavoriteDocument>,
        moduleRef: ModuleRef,
        userService: UserService,
        notificationService: NotificationService,
      ) => {
        const favoriteRepository = new FavoriteRepository(favoriteModel);
        return new FavoriteService(favoriteRepository, moduleRef, userService, notificationService);
      },
      inject: [FAVORITE_MODEL, ModuleRef, UserService, NotificationService],
    },
  ],
  exports: [FavoriteService],
})
export class FavoriteModule {}
