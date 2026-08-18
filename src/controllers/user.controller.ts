import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { CreateUserDto, FcmTokenDto, FollowUserDto, UpdateUserDto, UserDto } from '../dto';

@Controller('api/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() userData: CreateUserDto): Promise<UserDto> {
    return await this.userService.createUser(userData);
  }

  @Get(':id')
  async getUserById(@Param('id') userId: string): Promise<UserDto> {
    return await this.userService.getUserById(userId);
  }

  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string): Promise<UserDto> {
    return await this.userService.getUserByEmail(email);
  }

  @Put(':id')
  async updateUser(
    @Param('id') userId: string,
    @Body() updateData: UpdateUserDto,
  ): Promise<{ success: boolean }> {
    const success = await this.userService.updateUser(userId, updateData);
    return { success };
  }

  @Get(':id/followers')
  async getFollowers(@Param('id') userId: string): Promise<FollowUserDto[]> {
    return await this.userService.getFollowersDetailed(userId);
  }

  @Get(':id/following')
  async getFollowing(@Param('id') userId: string): Promise<FollowUserDto[]> {
    return await this.userService.getFollowingDetailed(userId);
  }

  @Post(':id/fcm-token')
  async addFcmToken(@Param('id') userId: string, @Body() body: FcmTokenDto): Promise<{ success: boolean }> {
    const success = await this.userService.addFcmToken(userId, body.token);
    return { success };
  }
}
