import { FollowersRepository, UserRepository } from '../repositories';
import { CreateFollowersDto, FollowersDto, UpdateFollowersDto } from '../dto';
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
   * Get follower relationship by ID
   */
  async getFollowerById(followerId: string): Promise<FollowersDto> {
    const relationship = await this.followersRepository.findById(followerId);
    if (!relationship) {
      throw new ResourceNotFoundException('Follower', followerId);
    }
    return relationship;
  }

  /**
   * Get all follower relationships
   */
  async getAllFollowers(): Promise<FollowersDto[]> {
    return await this.followersRepository.findAll();
  }

  /**
   * Update follower relationship
   */
  async updateFollower(followerId: string, updateData: UpdateFollowersDto): Promise<boolean> {
    const updated = await this.followersRepository.update(followerId, updateData);
    if (!updated) {
      throw new ResourceNotFoundException('Follower', followerId);
    }
    return true;
  }

  /**
   * Delete follower relationship
   */
  async deleteFollower(followerId: string): Promise<boolean> {
    const deleted = await this.followersRepository.delete(followerId);
    if (!deleted) {
      throw new ResourceNotFoundException('Follower', followerId);
    }
    return true;
  }

  /**
   * Get all followers of a user (users following this user)
   */
  async getFollowersOfUser(userId: string): Promise<FollowersDto[]> {
    return await this.followersRepository.findByUser(userId);
  }

  /**
   * Get all users that someone is following
   */
  async getFollowingByUser(followerId: string): Promise<FollowersDto[]> {
    return await this.followersRepository.findByFollower(followerId);
  }

  /**
   * Check if user A follows user B
   */
  async isFollowing(userId: string, followerId: string): Promise<boolean> {
    const relationship = await this.followersRepository.findByUserAndFollower(userId, followerId);
    return relationship !== null;
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
