import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { CurrentUserInterceptor } from '../user/current-user.interceptor';
import { ReviewService } from './review.service';
import { OrganizerRatingDto } from './review.dto';

/** Separate from ReviewController - an organizer's aggregate rating isn't
 * scoped to one event, it's derived across every event they've organized
 * (see ReviewService.getOrganizerRating), so it doesn't belong nested under
 * /events/:eventId like the rest of this module. */
@Controller('api/users/:userId/organizer-rating')
@UseInterceptors(CurrentUserInterceptor)
export class OrganizerRatingController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  async getOrganizerRating(@Param('userId') userId: string): Promise<OrganizerRatingDto> {
    return await this.reviewService.getOrganizerRating(userId);
  }
}
