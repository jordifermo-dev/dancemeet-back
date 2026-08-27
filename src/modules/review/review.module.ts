import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { ReviewController } from './review.controller';
import { OrganizerRatingController } from './organizer-rating.controller';
import { ReviewService } from './review.service';
import { ReviewRepository } from './review.repository';
import { EventModule } from '../event/event.module';
import { EventService } from '../event/event.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { AttendanceService } from '../attendance/attendance.service';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { NotificationModule } from '../notification/notification.module';
import { NotificationService } from '../notification/notification.service';
import { EventManagerModule } from '../event-manager/event-manager.module';
import { EventManagerService } from '../event-manager/event-manager.service';
import { REVIEW_MODEL } from '../../config/mongoose.config';
import { ReviewDocument } from './review.schema';

@Module({
  // Plain (non-circular) imports, same reasoning as GalleryModule - nothing
  // in EventModule/AttendanceModule/UserModule/NotificationModule/
  // EventManagerModule needs to call back into ReviewModule, so no
  // forwardRef() here. EventManagerModule's own internal circularity (with
  // EventModule etc., see its own comment) is resolved inside itself and
  // doesn't involve ReviewModule at all - this is just a plain outside
  // consumer of it, same as EventService already is.
  imports: [EventModule, AttendanceModule, UserModule, NotificationModule, EventManagerModule],
  controllers: [ReviewController, OrganizerRatingController],
  providers: [
    {
      provide: ReviewService,
      useFactory: (
        reviewModel: Model<ReviewDocument>,
        eventService: EventService,
        attendanceService: AttendanceService,
        userService: UserService,
        notificationService: NotificationService,
        eventManagerService: EventManagerService,
      ) => {
        const reviewRepository = new ReviewRepository(reviewModel);
        return new ReviewService(
          reviewRepository,
          eventService,
          attendanceService,
          userService,
          notificationService,
          eventManagerService,
        );
      },
      inject: [REVIEW_MODEL, EventService, AttendanceService, UserService, NotificationService, EventManagerService],
    },
  ],
  exports: [ReviewService],
})
export class ReviewModule {}
