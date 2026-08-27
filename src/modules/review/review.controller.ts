import { Body, Controller, Delete, Get, Param, Put, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../../common';
import { CurrentUserInterceptor } from '../user/current-user.interceptor';
import { UserDto } from '../user/user.dto';
import { ReviewService } from './review.service';
import { CreateOrganizerReplyDto, CreateReviewDto, ReviewDto, ReviewWithAuthorDto } from './review.dto';

@Controller('api/events/:eventId/reviews')
@UseInterceptors(CurrentUserInterceptor)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /** Public read, no gating - the point of a review is helping decide
   * whether to attend, so it must be visible even to someone who hasn't
   * (same access model as the public gallery). */
  @Get()
  async getEventReviews(@Param('eventId') eventId: string): Promise<ReviewWithAuthorDto[]> {
    return await this.reviewService.getEventReviews(eventId);
  }

  @Get('mine')
  async getMyReview(@Param('eventId') eventId: string, @CurrentUser() user: UserDto): Promise<ReviewDto | null> {
    return await this.reviewService.getMyReview(eventId, user.id!);
  }

  /** Create-or-update in one endpoint - the backend decides which based on
   * whether this user already reviewed this event, so the frontend never
   * needs to know a previous review's id just to edit it. */
  @Put()
  async createOrUpdateReview(
    @Param('eventId') eventId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: UserDto,
  ): Promise<ReviewDto> {
    return await this.reviewService.createOrUpdateReview(eventId, user.id!, dto);
  }

  @Delete(':reviewId')
  async deleteReview(
    @Param('eventId') eventId: string,
    @Param('reviewId') reviewId: string,
    @CurrentUser() user: UserDto,
  ): Promise<{ success: boolean }> {
    await this.reviewService.deleteReview(eventId, reviewId, user.id!);
    return { success: true };
  }

  @Put(':reviewId/reply')
  async replyToReview(
    @Param('eventId') eventId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateOrganizerReplyDto,
    @CurrentUser() user: UserDto,
  ): Promise<ReviewDto> {
    return await this.reviewService.replyToReview(eventId, reviewId, user.id!, dto);
  }

  @Delete(':reviewId/reply')
  async deleteOrganizerReply(
    @Param('eventId') eventId: string,
    @Param('reviewId') reviewId: string,
    @CurrentUser() user: UserDto,
  ): Promise<{ success: boolean }> {
    await this.reviewService.deleteOrganizerReply(eventId, reviewId, user.id!);
    return { success: true };
  }
}
