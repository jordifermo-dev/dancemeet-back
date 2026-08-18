import { forwardRef, Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { FavoriteController } from '../controllers/favorite.controller';
import { FavoriteService } from '../services/favorite.service';
import { FavoriteRepository } from '../repositories/favorite.repository';
import { EventService } from '../services/event.service';
import { EventModule } from './event.module';
import { UserService } from '../services/user.service';
import { UserModule } from './user.module';
import { NotificationService } from '../services/notification.service';
import { NotificationModule } from './notification.module';
import { FAVORITE_MODEL } from '../config/mongoose.config';
import { FavoriteDocument } from '../schemas/favorite.schema';

@Module({
  // Circular with EventModule - EventService auto-favorites the creator on
  // create, FavoriteService needs EventService for "events I organize or
  // favorited" and attendee-list lookups. forwardRef() on both sides is
  // NestJS's documented way to resolve this without either domain reaching
  // into the other's repository directly.
  imports: [forwardRef(() => EventModule), UserModule, NotificationModule],
  controllers: [FavoriteController],
  providers: [
    {
      provide: FavoriteService,
      useFactory: (
        favoriteModel: Model<FavoriteDocument>,
        eventService: EventService,
        userService: UserService,
        notificationService: NotificationService,
      ) => {
        const favoriteRepository = new FavoriteRepository(favoriteModel);
        return new FavoriteService(favoriteRepository, eventService, userService, notificationService);
      },
      // forwardRef() on the EventService token itself - the @nestjs/common
      // types for FactoryProvider.inject don't declare ForwardReference as
      // an allowed element, but Nest's injector explicitly unwraps a
      // `{ forwardRef: () => X }` object at runtime (see injector.js), so
      // the cast is safe.
      inject: [
        FAVORITE_MODEL,
        forwardRef(() => EventService) as unknown as typeof EventService,
        UserService,
        NotificationService,
      ],
    },
  ],
  exports: [FavoriteService],
})
export class FavoriteModule {}
