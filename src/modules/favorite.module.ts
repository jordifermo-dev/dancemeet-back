import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { FavoriteController } from '../controllers/favorite.controller';
import { FavoriteService } from '../services/favorite.service';
import { FavoriteRepository } from '../repositories/favorite.repository';
import { EventRepository } from '../repositories/event.repository';
import { UserRepository } from '../repositories/user.repository';
import { FAVORITE_MODEL, EVENT_MODEL, USER_MODEL } from '../config/mongoose.config';
import { FavoriteDocument } from '../schemas/favorite.schema';
import { EventDocument } from '../schemas/event.schema';
import { UserDocument } from '../schemas/user.schema';

@Module({
  controllers: [FavoriteController],
  providers: [
    {
      provide: FavoriteService,
      useFactory: (
        favoriteModel: Model<FavoriteDocument>,
        eventModel: Model<EventDocument>,
        userModel: Model<UserDocument>,
      ) => {
        const favoriteRepository = new FavoriteRepository(favoriteModel);
        const eventRepository = new EventRepository(eventModel);
        const userRepository = new UserRepository(userModel);
        return new FavoriteService(favoriteRepository, eventRepository, userRepository);
      },
      inject: [FAVORITE_MODEL, EVENT_MODEL, USER_MODEL],
    },
  ],
  exports: [FavoriteService],
})
export class FavoriteModule {}
