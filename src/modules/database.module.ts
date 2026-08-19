import { Module, Global } from '@nestjs/common';
import { connectToDatabase } from '../config/database';
import {
  DISCIPLINE_MODEL,
  EVENT_TYPE_MODEL,
  EVENT_MODEL,
  FAVORITE_MODEL,
  FOLLOWERS_MODEL,
  NOTIFICATION_MODEL,
  USER_MODEL,
} from '../config/mongoose.config';
import { DisciplineModel } from './discipline/discipline.schema';
import { EventTypeModel } from './event-type/event-type.schema';
import { EventModel } from './event/event.schema';
import { FavoriteModel } from './favorite/favorite.schema';
import { FollowersModel } from './followers/followers.schema';
import { NotificationModel } from './notification/notification.schema';
import { UserModel } from './user/user.schema';
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
      provide: NOTIFICATION_MODEL,
      useFactory: () => NotificationModel,
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
    NOTIFICATION_MODEL,
    USER_MODEL,
  ],
  imports: [HealthModule],
})
export class DatabaseModule {}
