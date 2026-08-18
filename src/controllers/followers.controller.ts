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
    return await this.followersService.createFollower(followerData);
  }

  @Get()
  async getAllFollowers(): Promise<FollowersDto[]> {
    return await this.followersService.getAllFollowers();
  }

  @Get(':id')
  async getFollowerById(@Param('id') followerId: string): Promise<FollowersDto> {
    return await this.followersService.getFollowerById(followerId);
  }

  @Get('user/:userId')
  async getFollowersOfUser(@Param('userId') userId: string): Promise<FollowersDto[]> {
    return await this.followersService.getFollowersOfUser(userId);
  }

  @Get('following/:followerId')
  async getFollowingByUser(@Param('followerId') followerId: string): Promise<FollowersDto[]> {
    return await this.followersService.getFollowingByUser(followerId);
  }

  @Get('check/:userId/:followerId')
  async isFollowing(
    @Param('userId') userId: string,
    @Param('followerId') followerId: string,
  ): Promise<{ isFollowing: boolean }> {
    const isFollowing = await this.followersService.isFollowing(userId, followerId);
    return { isFollowing };
  }

  @Post(':userId/:followerId/follow')
  async follow(
    @Param('userId') userId: string,
    @Param('followerId') followerId: string,
  ): Promise<FollowersDto> {
    return await this.followersService.follow(userId, followerId);
  }

  @Delete(':userId/:followerId/unfollow')
  async unfollow(
    @Param('userId') userId: string,
    @Param('followerId') followerId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.followersService.unfollow(userId, followerId);
    return { success };
  }

  @Put(':id')
  async updateFollower(
    @Param('id') followerId: string,
    @Body() updateData: UpdateFollowersDto,
  ): Promise<{ success: boolean }> {
    const success = await this.followersService.updateFollower(followerId, updateData);
    return { success };
  }

  @Delete(':id')
  async deleteFollower(@Param('id') followerId: string): Promise<{ success: boolean }> {
    const success = await this.followersService.deleteFollower(followerId);
    return { success };
  }

}
