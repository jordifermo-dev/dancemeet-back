import { FollowersRepository } from '../repositories';
import { CreateFollowersDto, FollowersDto } from '../dto';
import {
  ResourceNotFoundException,
  BusinessRuleException,
  DuplicateKeyException,
} from '../common';
import { NotificationService } from './notification.service';
// Type-only: avoids a runtime circular import between user.service.ts and
// followers.service.ts (they need each other's data - see UserModule/
// FollowersModule's forwardRef() wiring for the actual DI circularity fix).
import type { UserService } from './user.service';

export class FollowersService {
  constructor(
    private readonly followersRepository: FollowersRepository,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new follower relationship
   */
  async createFollower(followerData: CreateFollowersDto): Promise<FollowersDto> {
    return await this.followersRepository.create(followerData);
  }

  /**
   * Raw passthrough - users following this user, for UserService's follower
   * counts/list without depending on FollowersRepository directly.
   */
  async findByUser(userId: string): Promise<FollowersDto[]> {
    return await this.followersRepository.findByUser(userId);
  }

  /**
   * Raw passthrough - users this user follows, for UserService's following
   * counts/list without depending on FollowersRepository directly.
   */
  async findByFollower(followerId: string): Promise<FollowersDto[]> {
    return await this.followersRepository.findByFollower(followerId);
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
      const follower = await this.userService.findById(followerId);
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
