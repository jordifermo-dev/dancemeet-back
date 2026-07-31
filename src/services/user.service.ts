import { FollowersRepository, UserRepository } from '../repositories';
import { CreateUserDto, FollowUserDto, UpdateUserDto, UserDto } from '../dto';
import { ResourceNotFoundException } from '../common';

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly followersRepository: FollowersRepository,
  ) {}

  /**
   * Create a new user
   */
  async createUser(user: CreateUserDto): Promise<UserDto> {
    try {
      return await this.userRepository.create(user);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get user by ID with populated follower/following arrays
   */
  async getUserById(userId: string): Promise<UserDto> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundException('User', userId);
      }

      const followers = await this.followersRepository.findByUser(userId);
      user.followedId = followers.map((f) => f.followerId);

      const following = await this.followersRepository.findByFollower(userId);
      user.followingId = following.map((f) => f.userId);

      return user;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<UserDto[]> {
    try {
      const users = await this.userRepository.findAll();

      for (const user of users) {
        const followers = await this.followersRepository.findByUser(user.id!);
        user.followedId = followers.map((f) => f.followerId);

        const following = await this.followersRepository.findByFollower(user.id!);
        user.followingId = following.map((f) => f.userId);
      }

      return users;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updateData: UpdateUserDto): Promise<boolean> {
    try {
      const updated = await this.userRepository.update(userId, {
        ...updateData,
        updatedAt: Date.now(),
      });

      if (!updated) {
        throw new ResourceNotFoundException('User', userId);
      }
      return true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      await this.followersRepository.deleteMany({ userId });
      await this.followersRepository.deleteMany({ followerId: userId });

      const deleted = await this.userRepository.delete(userId);
      if (!deleted) {
        throw new ResourceNotFoundException('User', userId);
      }
      return true;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Find user by email
   */
  async getUserByEmail(email: string): Promise<UserDto> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new ResourceNotFoundException(
          'User',
          `email "${email}"`,
          'errors.RESOURCE_NOT_FOUND_BY_EMAIL',
          { resource: 'User', email },
        );
      }

      const followers = await this.followersRepository.findByUser(user.id!);
      user.followedId = followers.map((f) => f.followerId);

      const following = await this.followersRepository.findByFollower(user.id!);
      user.followingId = following.map((f) => f.userId);

      return user;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Find users by city
   */
  async getUsersByCity(city: string): Promise<UserDto[]> {
    try {
      const users = await this.userRepository.findByCity(city);

      for (const user of users) {
        const followers = await this.followersRepository.findByUser(user.id!);
        user.followedId = followers.map((f) => f.followerId);

        const following = await this.followersRepository.findByFollower(user.id!);
        user.followingId = following.map((f) => f.userId);
      }

      return users;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Find users by discipline
   */
  async getUsersByDiscipline(disciplineId: string): Promise<UserDto[]> {
    try {
      const users = await this.userRepository.findByDiscipline(disciplineId);

      for (const user of users) {
        const followers = await this.followersRepository.findByUser(user.id!);
        user.followedId = followers.map((f) => f.followerId);

        const following = await this.followersRepository.findByFollower(user.id!);
        user.followingId = following.map((f) => f.userId);
      }

      return users;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Find users by event type
   */
  async getUsersByEventType(eventTypeId: string): Promise<UserDto[]> {
    try {
      const users = await this.userRepository.findByEventType(eventTypeId);

      for (const user of users) {
        const followers = await this.followersRepository.findByUser(user.id!);
        user.followedId = followers.map((f) => f.followerId);

        const following = await this.followersRepository.findByFollower(user.id!);
        user.followingId = following.map((f) => f.userId);
      }

      return users;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Find users by status preference
   */
  async getUsersByStatus(statusId: string): Promise<UserDto[]> {
    try {
      const users = await this.userRepository.findByStatus(statusId);

      for (const user of users) {
        const followers = await this.followersRepository.findByUser(user.id!);
        user.followedId = followers.map((f) => f.followerId);

        const following = await this.followersRepository.findByFollower(user.id!);
        user.followingId = following.map((f) => f.userId);
      }

      return users;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get followers of a user, hydrated with just enough profile info (name,
   * photo) to render a list - sorted/filtered client-side afterwards.
   */
  async getFollowersDetailed(userId: string): Promise<FollowUserDto[]> {
    try {
      const followers = await this.followersRepository.findByUser(userId);
      return await this.hydrateFollowRelations(followers.map((f) => ({ userId: f.followerId, followedAt: f.createdAt })));
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get the users someone follows, hydrated the same way as getFollowersDetailed.
   */
  async getFollowingDetailed(userId: string): Promise<FollowUserDto[]> {
    try {
      const following = await this.followersRepository.findByFollower(userId);
      return await this.hydrateFollowRelations(following.map((f) => ({ userId: f.userId, followedAt: f.createdAt })));
    } catch (err) {
      throw err;
    }
  }

  private async hydrateFollowRelations(
    relations: { userId: string; followedAt: number }[],
  ): Promise<FollowUserDto[]> {
    const users = await Promise.all(
      relations.map((relation) => this.userRepository.findById(relation.userId)),
    );
    return relations
      .map((relation, index): FollowUserDto | null => {
        const user = users[index];
        if (!user) {
          return null;
        }
        return {
          id: user.id!,
          name: user.name,
          photoUrl: user.photoUrl,
          disciplineIds: user.disciplineIds,
          followedAt: relation.followedAt,
        };
      })
      .filter((item): item is FollowUserDto => item !== null);
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
  async countFollowing(userId: string): Promise<number> {
    try {
      return await this.followersRepository.countFollowing(userId);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Block another user (one-directional - only recorded on the blocker's own document)
   */
  async blockUser(userId: string, blockedId: string): Promise<boolean> {
    try {
      const updated = await this.userRepository.addBlockedId(userId, blockedId);
      if (!updated) {
        throw new ResourceNotFoundException('User', userId);
      }
      return true;
    } catch (err) {
      throw err;
    }
  }
}
