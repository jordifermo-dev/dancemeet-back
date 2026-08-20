import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, FcmTokenDto, FollowUserDto, UpdateUserDto, UserDto } from './user.dto';

@Controller('api/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() userData: CreateUserDto): Promise<UserDto> {
    return await this.userService.createUser(userData);
  }

  // Must come before @Get(':id') below - a literal "search" segment would
  // otherwise be swallowed as an :id value (same route-order reasoning used
  // throughout EventController for its 'series/:seriesId' routes).
  @Get('search/list')
  async searchUsers(@Query('q') query?: string): Promise<UserDto[]> {
    const trimmed = query?.trim() ?? '';
    // An empty/blank query would otherwise match everyone (findByNameContains
    // is a substring regex) - require at least something to search for.
    return trimmed ? await this.userService.findByNameContains(trimmed) : [];
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
