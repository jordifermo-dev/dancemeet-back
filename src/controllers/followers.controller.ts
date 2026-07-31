import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FollowersService } from '../services/followers.service';
import { CreateFollowersDto, FollowersDto, UpdateFollowersDto } from '../dto';

@Controller('api/followers')
export class FollowersController {
  constructor(private followersService: FollowersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFollower(@Body() followerData: CreateFollowersDto): Promise<FollowersDto> {
    try {
      return await this.followersService.createFollower(followerData);
    } catch (err) {
      throw err;
    }
  }

  @Get()
  async getAllFollowers(): Promise<FollowersDto[]> {
    try {
      return await this.followersService.getAllFollowers();
    } catch (err) {
      throw err;
    }
  }

  @Get(':id')
  async getFollowerById(@Param('id') followerId: string): Promise<FollowersDto> {
    try {
      return await this.followersService.getFollowerById(followerId);
    } catch (err) {
      throw err;
    }
  }

  @Get('user/:userId')
  async getFollowersOfUser(@Param('userId') userId: string): Promise<FollowersDto[]> {
    try {
      return await this.followersService.getFollowersOfUser(userId);
    } catch (err) {
      throw err;
    }
  }

  @Get('following/:followerId')
  async getFollowingByUser(@Param('followerId') followerId: string): Promise<FollowersDto[]> {
    try {
      return await this.followersService.getFollowingByUser(followerId);
    } catch (err) {
      throw err;
    }
  }

  @Get('check/:userId/:followerId')
  async isFollowing(
    @Param('userId') userId: string,
    @Param('followerId') followerId: string,
  ): Promise<{ isFollowing: boolean }> {
    try {
      const isFollowing = await this.followersService.isFollowing(userId, followerId);
      return { isFollowing };
    } catch (err) {
      throw err;
    }
  }

  @Post(':userId/:followerId/follow')
  async follow(
    @Param('userId') userId: string,
    @Param('followerId') followerId: string,
  ): Promise<FollowersDto> {
    try {
      return await this.followersService.follow(userId, followerId);
    } catch (err) {
      throw err;
    }
  }

  @Delete(':userId/:followerId/unfollow')
  async unfollow(
    @Param('userId') userId: string,
    @Param('followerId') followerId: string,
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.followersService.unfollow(userId, followerId);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Put(':id')
  async updateFollower(
    @Param('id') followerId: string,
    @Body() updateData: UpdateFollowersDto,
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.followersService.updateFollower(followerId, updateData);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Delete(':id')
  async deleteFollower(@Param('id') followerId: string): Promise<{ success: boolean }> {
    try {
      const success = await this.followersService.deleteFollower(followerId);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Get('count/followers/:userId')
  async countFollowers(@Param('userId') userId: string): Promise<{ count: number }> {
    try {
      const count = await this.followersService.countFollowers(userId);
      return { count };
    } catch (err) {
      throw err;
    }
  }

  @Get('count/following/:followerId')
  async countFollowing(@Param('followerId') followerId: string): Promise<{ count: number }> {
    try {
      const count = await this.followersService.countFollowing(followerId);
      return { count };
    } catch (err) {
      throw err;
    }
  }

  @Get('mutual/:userId1/:userId2')
  async getMutualFollowers(
    @Param('userId1') userId1: string,
    @Param('userId2') userId2: string,
  ): Promise<FollowersDto[]> {
    try {
      return await this.followersService.getMutualFollowers(userId1, userId2);
    } catch (err) {
      throw err;
    }
  }
}
