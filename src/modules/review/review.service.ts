import { ReviewRepository } from './review.repository';
import { CreateOrganizerReplyDto, CreateReviewDto, OrganizerRatingDto, ReviewDto, ReviewWithAuthorDto } from './review.dto';
import { ForbiddenActionException, ResourceNotFoundException } from '../../common';
import { EventService } from '../event/event.service';
import { AttendanceService } from '../attendance/attendance.service';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notification/notification.service';
import { EventManagerService } from '../event-manager/event-manager.service';

export class ReviewService {
  constructor(
    private readonly repository: ReviewRepository,
    private readonly eventService: EventService,
    private readonly attendanceService: AttendanceService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly eventManagerService: EventManagerService,
  ) {}

  /**
   * Creates a new review, or updates the author's existing one for this
   * event (see ReviewRepository - at most one per {authorUserId, eventId}).
   * Only a real attendee of a *finished* event can review it, and never the
   * event's own creator or an accepted co-organizer (manager) - reviewing an
   * event you help run would let you inflate your own (or a fellow
   * organizer's) aggregate rating - see getOrganizerRating.
   */
  async createOrUpdateReview(eventId: string, authorUserId: string, dto: CreateReviewDto): Promise<ReviewDto> {
    const event = await this.eventService.findById(eventId);
    if (!event) {
      throw new ResourceNotFoundException('Event', eventId);
    }
    if (event.status !== 'finished') {
      throw new ForbiddenActionException(
        `Event "${eventId}" has not finished yet, cannot be reviewed`,
        'errors.FORBIDDEN_REVIEW_NOT_FINISHED',
      );
    }
    const isManaging =
      event.creatorId === authorUserId || (await this.eventManagerService.isAcceptedManager(eventId, authorUserId));
    if (isManaging) {
      throw new ForbiddenActionException(
        `User "${authorUserId}" manages event "${eventId}", cannot review it`,
        'errors.FORBIDDEN_REVIEW_OWN_EVENT',
      );
    }
    const isAttending = await this.attendanceService.isAttending(authorUserId, eventId);
    if (!isAttending) {
      throw new ForbiddenActionException(
        `User "${authorUserId}" did not attend event "${eventId}", cannot review it`,
        'errors.FORBIDDEN_REVIEW_NOT_ATTENDED',
      );
    }

    const existing = await this.repository.findByUserAndEvent(authorUserId, eventId);
    if (existing) {
      const updated = await this.repository.update(existing.id!, { rating: dto.rating, comment: dto.comment });
      return updated!;
    }

    const created = await this.repository.create({
      eventId,
      authorUserId,
      organizerId: event.creatorId,
      rating: dto.rating,
      comment: dto.comment,
    });
    const author = await this.userService.findById(authorUserId);
    await this.notificationService.notify(event.creatorId, 'event_review_created', {
      name: author?.name ?? '',
      eventTitle: event.title,
      eventId,
      rating: String(dto.rating),
    });
    return created;
  }

  async getMyReview(eventId: string, userId: string): Promise<ReviewDto | null> {
    return this.repository.findByUserAndEvent(userId, eventId);
  }

  async getEventReviews(eventId: string): Promise<ReviewWithAuthorDto[]> {
    const reviews = await this.repository.findByEvent(eventId);
    if (!reviews.length) {
      return [];
    }
    const userIds = new Set<string>();
    for (const review of reviews) {
      userIds.add(review.authorUserId);
      if (review.organizerReply) {
        userIds.add(review.organizerReply.repliedByUserId);
      }
    }
    const users = await this.userService.findByIds([...userIds]);
    const userById = new Map(users.map((user) => [user.id, user]));

    return reviews
      .map((review): ReviewWithAuthorDto | null => {
        const author = userById.get(review.authorUserId);
        if (!author) {
          return null;
        }
        const organizerReply = review.organizerReply
          ? { ...review.organizerReply, repliedByName: userById.get(review.organizerReply.repliedByUserId)?.name ?? '' }
          : undefined;
        return {
          id: review.id!,
          eventId: review.eventId,
          authorUserId: review.authorUserId,
          authorName: author.name,
          authorPhotoUrl: author.photoUrl,
          organizerId: review.organizerId,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          organizerReply,
        };
      })
      .filter((review): review is ReviewWithAuthorDto => review !== null);
  }

  async deleteReview(eventId: string, reviewId: string, requestingUserId: string): Promise<void> {
    const review = await this.repository.findById(reviewId);
    if (!review || review.eventId !== eventId) {
      throw new ResourceNotFoundException('Review', reviewId);
    }
    if (review.authorUserId !== requestingUserId) {
      throw new ForbiddenActionException(
        `User "${requestingUserId}" is not allowed to delete review "${reviewId}"`,
        'errors.FORBIDDEN_DELETE_REVIEW',
      );
    }
    await this.repository.deleteById(reviewId);
  }

  /**
   * Writes or replaces the event's single organizer reply to a review - any
   * accepted manager or the creator can do this (assertCanManage is the same
   * check "Editar evento"/"Eliminar evento" already use), regardless of
   * which of them wrote the previous reply, if any.
   */
  async replyToReview(eventId: string, reviewId: string, requestingUserId: string, dto: CreateOrganizerReplyDto): Promise<ReviewDto> {
    const event = await this.eventService.assertCanManage(eventId, requestingUserId);
    const review = await this.repository.findById(reviewId);
    if (!review || review.eventId !== eventId) {
      throw new ResourceNotFoundException('Review', reviewId);
    }
    const isNewReply = !review.organizerReply;
    const now = Date.now();
    const updated = await this.repository.setOrganizerReply(reviewId, {
      text: dto.text,
      repliedByUserId: requestingUserId,
      createdAt: review.organizerReply?.createdAt ?? now,
      updatedAt: isNewReply ? undefined : now,
    });
    if (isNewReply) {
      await this.notificationService.notify(review.authorUserId, 'event_review_replied', {
        eventTitle: event.title,
        eventId,
      });
    }
    return updated!;
  }

  async deleteOrganizerReply(eventId: string, reviewId: string, requestingUserId: string): Promise<void> {
    await this.eventService.assertCanManage(eventId, requestingUserId);
    const review = await this.repository.findById(reviewId);
    if (!review || review.eventId !== eventId) {
      throw new ResourceNotFoundException('Review', reviewId);
    }
    await this.repository.removeOrganizerReply(reviewId);
  }

  async getOrganizerRating(organizerId: string): Promise<OrganizerRatingDto> {
    const { averageRating, count } = await this.repository.getOrganizerRating(organizerId);
    return { organizerId, averageRating, count };
  }
}
