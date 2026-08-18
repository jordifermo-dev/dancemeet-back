import { FollowersRepository, UserRepository } from '../repositories';
import { CreateFollowersDto, FollowersDto } from '../dto';
import {
  ResourceNotFoundException,
  BusinessRuleException,
  DuplicateKeyException,
} from '../common';
import { NotificationService } from './notification.service';

export class FollowersService {
  constructor(
    private readonly followersRepository: FollowersRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new follower relationship
   */
  async createFollower(followerData: CreateFollowersDto): Promise<FollowersDto> {
    return await this.followersRepository.create(followerData);
  }

  /**
   * Add a follower (user A follows user B)
   */
  async follow(userId: string, followerId: string): Promise<FollowersDto> {
    if (userId === followerId) {
      throw new BusinessRuleException(
        'A user cannot follow themselves',
        'errors.BUSINESS_CANNOT_FOLLOW_SELF',
      );
    }
    const existing = await this.followersRepository.findByUserAndFollower(userId, followerId);
    if (existing) {
      throw new BusinessRuleException(
        `User "${followerId}" already follows user "${userId}"`,
        'errors.BUSINESS_ALREADY_FOLLOWING',
        { userId, followerId },
      );
    }
    try {
      const created = await this.createFollower({
        userId,
        followerId,
        createdAt: Date.now(),
      });
      const follower = await this.userRepository.findById(followerId);
      if (follower) {
        await this.notificationService.notify(userId, 'new_follower', {
          fromUserId: followerId,
          name: follower.name,
        });
      }
      return created;
    } catch (err) {
      if (err instanceof DuplicateKeyException) {
        throw new BusinessRuleException(
          `User "${followerId}" already follows user "${userId}"`,
          'errors.BUSINESS_ALREADY_FOLLOWING',
          { userId, followerId },
        );
      }
      throw err;
    }
  }

  /**
   * Remove a follower (user A unfollows user B)
   */
  async unfollow(userId: string, followerId: string): Promise<boolean> {
    const existing = await this.followersRepository.findByUserAndFollower(userId, followerId);
    if (!existing) {
      throw new ResourceNotFoundException(
        'Follower',
        `user "${userId}" / follower "${followerId}"`,
        'errors.FOLLOWER_NOT_FOUND_BY_USER_FOLLOWER',
        { userId, followerId },
      );
    }
    await this.followersRepository.deleteByUserAndFollower(userId, followerId);
    return true;
  }

}
