import { ModuleRef } from '@nestjs/core';
import { UserRepository } from './user.repository';
import { CreateUserDto, FollowUserDto, UpdateUserDto, UserDto } from './user.dto';
import { ResourceNotFoundException } from '../../common';
import { FollowersService } from '../followers/followers.service';

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * FollowersService can't be constructor-injected: it depends on UserService
   * too, and this codebase's useFactory providers run once, synchronously,
   * before a forwardRef()'d circular provider is actually constructed - the
   * factory ends up receiving null (this broke login in production). Looking
   * it up lazily through ModuleRef sidesteps the ordering problem: by the
   * time any request handler runs, every provider is fully built.
   */
  private get followersService(): FollowersService {
    return this.moduleRef.get(FollowersService, { strict: false });
  }

  /**
   * Create a new user
   */
  async createUser(user: CreateUserDto): Promise<UserDto> {
    return await this.userRepository.create(user);
  }

  /**
   * Raw, tolerant lookup (null if missing, no follower hydration) - for
   * other services that need a single user without the 404-throwing/
   * follower-counting behavior of getUserById, so they don't have to depend
   * on UserRepository directly.
   */
  async findById(userId: string): Promise<UserDto | null> {
    return await this.userRepository.findById(userId);
  }

  /**
   * Raw passthrough - for other services that need a batch of users by id
   * (e.g. hydrating event/favorite creator names) without depending on
   * UserRepository directly.
   */
  async findByIds(userIds: string[]): Promise<UserDto[]> {
    return await this.userRepository.findByIds(userIds);
  }

  /**
   * Raw passthrough - case-insensitive name search, for EventService's
   * search-by-organizer-name without depending on UserRepository directly.
   */
  async findByNameContains(query: string): Promise<UserDto[]> {
    return await this.userRepository.findByNameContains(query);
  }

  /**
   * Raw, tolerant lookup (null if missing, no follower hydration) - for
   * CurrentUserInterceptor, which resolves the authenticated Firebase
   * identity's app user on every request that needs it, without depending
   * on UserRepository directly.
   */
  async findByEmail(email: string): Promise<UserDto | null> {
    return await this.userRepository.findByEmail(email);
  }

  /**
   * Raw passthrough - users whose saved preferences match a new event, for
   * EventService's "preference_new_event" notification fan-out without
   * depending on UserRepository directly.
   */
  async findMatchingEventPreferences(
    disciplineIds: string[],
    typeIds: string[],
    status: string,
  ): Promise<UserDto[]> {
    return await this.userRepository.findMatchingEventPreferences(disciplineIds, typeIds, status);
  }

  /**
   * Get user by ID with populated follower/following arrays
   */
  async getUserById(userId: string): Promise<UserDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    const followers = await this.followersService.findByUser(userId);
    user.followedId = followers.map((f) => f.followerId);

    const following = await this.followersService.findByFollower(userId);
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

    const followers = await this.followersService.findByUser(user.id!);
    user.followedId = followers.map((f) => f.followerId);

    const following = await this.followersService.findByFollower(user.id!);
    user.followingId = following.map((f) => f.userId);

    return user;
  }

  /**
   * Get followers of a user, hydrated with just enough profile info (name,
   * photo) to render a list - sorted/filtered client-side afterwards.
   */
  async getFollowersDetailed(userId: string): Promise<FollowUserDto[]> {
    const followers = await this.followersService.findByUser(userId);
    return await this.hydrateFollowRelations(followers.map((f) => ({ userId: f.followerId, followedAt: f.createdAt })));
  }

  /**
   * Get the users someone follows, hydrated the same way as getFollowersDetailed.
   */
  async getFollowingDetailed(userId: string): Promise<FollowUserDto[]> {
    const following = await this.followersService.findByFollower(userId);
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
