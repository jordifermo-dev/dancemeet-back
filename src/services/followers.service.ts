import { FollowersRepository } from '../repositories';
import { CreateFollowersDto, FollowersDto, UpdateFollowersDto } from '../dto';
import {
  ResourceNotFoundException,
  BusinessRuleException,
  DuplicateKeyException,
} from '../common';

export class FollowersService {
  constructor(private readonly followersRepository: FollowersRepository) {}

  /**
   * Create a new follower relationship
   */
  async createFollower(followerData: CreateFollowersDto): Promise<FollowersDto> {
    try {
      return await this.followersRepository.create(followerData);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get follower relationship by ID
   */
  async getFollowerById(followerId: string): Promise<FollowersDto> {
    try {
      const relationship = await this.followersRepository.findById(followerId);
      if (!relationship) {
        throw new ResourceNotFoundException('Follower', followerId);
      }
      return relationship;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all follower relationships
   */
  async getAllFollowers(): Promise<FollowersDto[]> {
    try {
      return await this.followersRepository.findAll();
    } catch (err) {
      throw err;
    }
  }

  /**
   * Update follower relationship
   */
  async updateFollower(followerId: string, updateData: UpdateFollowersDto): Promise<boolean> {
    try {
      const updated = await this.followersRepository.update(followerId, updateData);
      if (!updated) {
        throw new ResourceNotFoundException('Follower', followerId);
      }
      return true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Delete follower relationship
   */
  async deleteFollower(followerId: string): Promise<boolean> {
    try {
      const deleted = await this.followersRepository.delete(followerId);
      if (!deleted) {
        throw new ResourceNotFoundException('Follower', followerId);
      }
      return true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all followers of a user (users following this user)
   */
  async getFollowersOfUser(userId: string): Promise<FollowersDto[]> {
    try {
      return await this.followersRepository.findByUser(userId);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all users that someone is following
   */
  async getFollowingByUser(followerId: string): Promise<FollowersDto[]> {
    try {
      return await this.followersRepository.findByFollower(followerId);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Check if user A follows user B
   */
  async isFollowing(userId: string, followerId: string): Promise<boolean> {
    try {
      const relationship = await this.followersRepository.findByUserAndFollower(userId, followerId);
      return relationship !== null;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Add a follower (user A follows user B)
   */
  async follow(userId: string, followerId: string): Promise<FollowersDto> {
    try {
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
        return await this.createFollower({
          userId,
          followerId,
          createdAt: Date.now(),
        });
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
    } catch (err) {
      throw err;
    }
  }

  /**
   * Remove a follower (user A unfollows user B)
   */
  async unfollow(userId: string, followerId: string): Promise<boolean> {
    try {
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
    } catch (err) {
      throw err;
    }
  }

  /**
   * Count followers of a user
   */
  async countFollowers(userId: string): Promise<number> {
    try {
      return await this.followersRepository.countFollowers(userId);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Count following of a user
   */
  async countFollowing(followerId: string): Promise<number> {
    try {
      return await this.followersRepository.countFollowing(followerId);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get mutual followers between two users
   */
  async getMutualFollowers(userId1: string, userId2: string): Promise<FollowersDto[]> {
    try {
      const followers1 = await this.followersRepository.findByUser(userId1);
      const followers1Ids = followers1.map((f) => f.followerId);

      const followers2 = await this.followersRepository.findByUser(userId2);
      const followers2Ids = followers2.map((f) => f.followerId);

      // Find common follower IDs
      const mutual = followers1Ids.filter((id) => followers2Ids.includes(id));

      return followers1.filter((f) => mutual.includes(f.followerId));
    } catch (err) {
      throw err;
    }
  }
}
