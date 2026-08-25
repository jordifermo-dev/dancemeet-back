import { forwardRef, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Model } from 'mongoose';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRepository } from './attendance.repository';
import { EventModule } from '../event/event.module';
import { EventManagerModule } from '../event-manager/event-manager.module';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
import { NotificationService } from '../notification/notification.service';
import { NotificationModule } from '../notification/notification.module';
import { ATTENDANCE_MODEL } from '../../config/mongoose.config';
import { AttendanceDocument } from './attendance.schema';

@Module({
  // Circular with EventModule - EventService auto-attends the creator on
  // create, AttendanceService needs EventService for "events I organize or
  // attend" and attendee-list lookups. Also circular with
  // EventManagerModule - see that module's own comment for why. forwardRef()
  // here still resolves the *module* graph in both cases; AttendanceService
  // itself resolves each lazily via ModuleRef (see AttendanceService).
  imports: [forwardRef(() => EventModule), forwardRef(() => EventManagerModule), UserModule, NotificationModule],
  controllers: [AttendanceController],
  providers: [
    {
      provide: AttendanceService,
      useFactory: (
        attendanceModel: Model<AttendanceDocument>,
        moduleRef: ModuleRef,
        userService: UserService,
        notificationService: NotificationService,
      ) => {
        const attendanceRepository = new AttendanceRepository(attendanceModel);
        return new AttendanceService(attendanceRepository, moduleRef, userService, notificationService);
      },
      inject: [ATTENDANCE_MODEL, ModuleRef, UserService, NotificationService],
    },
  ],
  exports: [AttendanceService],
})
export class AttendanceModule {}
