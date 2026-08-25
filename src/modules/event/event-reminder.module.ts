import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { EventReminderService } from './event-reminder.service';
import { EventRepository } from './event.repository';
import { AttendanceRepository } from '../attendance/attendance.repository';
import { NotificationService } from '../notification/notification.service';
import { NotificationModule } from '../notification/notification.module';
import { EVENT_MODEL, ATTENDANCE_MODEL } from '../../config/mongoose.config';
import { EventDocument } from './event.schema';
import { AttendanceDocument } from '../attendance/attendance.schema';

@Module({
  imports: [NotificationModule],
  providers: [
    {
      provide: EventReminderService,
      useFactory: (
        eventModel: Model<EventDocument>,
        attendanceModel: Model<AttendanceDocument>,
        notificationService: NotificationService,
      ) => {
        const eventRepository = new EventRepository(eventModel);
        const attendanceRepository = new AttendanceRepository(attendanceModel);
        return new EventReminderService(eventRepository, attendanceRepository, notificationService);
      },
      inject: [EVENT_MODEL, ATTENDANCE_MODEL, NotificationService],
    },
  ],
  exports: [EventReminderService],
})
export class EventReminderModule {}
