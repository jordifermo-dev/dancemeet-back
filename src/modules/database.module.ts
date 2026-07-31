import { Module, Global } from '@nestjs/common';
import { connectToDatabase } from '../config/database';
import {
  DISCIPLINE_MODEL,
  EVENT_TYPE_MODEL,
  EVENT_MODEL,
  FAVORITE_MODEL,
  FOLLOWERS_MODEL,
  USER_MODEL,
} from '../config/mongoose.config';
import { DisciplineModel } from '../schemas/discipline.schema';
import { EventTypeModel } from '../schemas/event-type.schema';
import { EventModel } from '../schemas/event.schema';
import { FavoriteModel } from '../schemas/favorite.schema';
import { FollowersModel } from '../schemas/followers.schema';
import { UserModel } from '../schemas/user.schema';
import { HealthModule } from '../health/health.module';

@Global()
@Module({
  providers: [
    {
      provide: 'DATABASE',
      useFactory: async () => {
        const { db } = await connectToDatabase();
        return db;
      },
    },
    {
      provide: DISCIPLINE_MODEL,
      useFactory: () => DisciplineModel,
    },
    {
      provide: EVENT_TYPE_MODEL,
      useFactory: () => EventTypeModel,
    },
    {
      provide: EVENT_MODEL,
      useFactory: () => EventModel,
    },
    {
      provide: FAVORITE_MODEL,
      useFactory: () => FavoriteModel,
    },
    {
      provide: FOLLOWERS_MODEL,
      useFactory: () => FollowersModel,
    },
    {
      provide: USER_MODEL,
      useFactory: () => UserModel,
    },
  ],
  exports: [
    'DATABASE',
    DISCIPLINE_MODEL,
    EVENT_TYPE_MODEL,
    EVENT_MODEL,
    FAVORITE_MODEL,
    FOLLOWERS_MODEL,
    USER_MODEL,
  ],
  imports: [HealthModule],
})
export class DatabaseModule {}
