import {
  Controller,
  Post,
  Delete,
  Param,
} from '@nestjs/common';
import { FollowersService } from '../services/followers.service';
import { FollowersDto } from '../dto';

@Controller('api/followers')
export class FollowersController {
  constructor(private followersService: FollowersService) {}

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
}
