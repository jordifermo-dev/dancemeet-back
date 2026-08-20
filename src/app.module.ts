import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseAuthGuard } from './common/guards';
import {
  DatabaseModule,
  UserModule,
  EventModule,
  DisciplineModule,
  EventTypeModule,
  FavoriteModule,
  FollowersModule,
  GeocodingModule,
  UploadModule,
  NotificationModule,
  EventReminderModule,
  EventManagerModule,
} from './modules';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'es',
      loaderOptions: {
        path: join(__dirname, 'assets/i18n'),
        watch: true,
      },
      resolvers: [{ use: AcceptLanguageResolver, options: { matchType: 'loose' } }],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    UserModule,
    EventModule,
    DisciplineModule,
    EventTypeModule,
    FavoriteModule,
    FollowersModule,
    GeocodingModule,
    UploadModule,
    NotificationModule,
    EventReminderModule,
    EventManagerModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: FirebaseAuthGuard }],
})
export class AppModule {}
