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
    return await this.userRepository.create(user);
  }

  /**
   * Get user by ID with populated follower/following arrays
   */
  async getUserById(userId: string): Promise<UserDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    const followers = await this.followersRepository.findByUser(userId);
    user.followedId = followers.map((f) => f.followerId);

    const following = await this.followersRepository.findByFollower(userId);
    user.followingId = following.map((f) => f.userId);

    return user;
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updateData: UpdateUserDto): Promise<boolean> {
    const updated = await this.userRepository.update(userId, {
      ...updateData,
      updatedAt: Date.now(),
    });

    if (!updated) {
      throw new ResourceNotFoundException('User', userId);
    }
    return true;
  }

  /**
   * Find user by email
   */
  async getUserByEmail(email: string): Promise<UserDto> {
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
  }

  /**
   * Get followers of a user, hydrated with just enough profile info (name,
   * photo) to render a list - sorted/filtered client-side afterwards.
   */
  async getFollowersDetailed(userId: string): Promise<FollowUserDto[]> {
    const followers = await this.followersRepository.findByUser(userId);
    return await this.hydrateFollowRelations(followers.map((f) => ({ userId: f.followerId, followedAt: f.createdAt })));
  }

  /**
   * Get the users someone follows, hydrated the same way as getFollowersDetailed.
   */
  async getFollowingDetailed(userId: string): Promise<FollowUserDto[]> {
    const following = await this.followersRepository.findByFollower(userId);
    return await this.hydrateFollowRelations(following.map((f) => ({ userId: f.userId, followedAt: f.createdAt })));
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
   * Register this device's FCM token for push notifications - additive, a
   * user can have several tabs/devices registered at once.
   */
  async addFcmToken(userId: string, token: string): Promise<boolean> {
    const updated = await this.userRepository.addFcmToken(userId, token);
    if (!updated) {
      throw new ResourceNotFoundException('User', userId);
    }
    return true;
  }

}
