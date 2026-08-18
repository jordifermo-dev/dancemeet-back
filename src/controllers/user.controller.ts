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

  @Get()
  async getAllUsers(): Promise<UserDto[]> {
    return await this.userService.getAllUsers();
  }

  @Get(':id')
  async getUserById(@Param('id') userId: string): Promise<UserDto> {
    return await this.userService.getUserById(userId);
  }

  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string): Promise<UserDto> {
    return await this.userService.getUserByEmail(email);
  }

  @Get('city/:city')
  async getUsersByCity(@Param('city') city: string): Promise<UserDto[]> {
    return await this.userService.getUsersByCity(city);
  }

  @Get('discipline/:disciplineId')
  async getUsersByDiscipline(@Param('disciplineId') disciplineId: string): Promise<UserDto[]> {
    return await this.userService.getUsersByDiscipline(disciplineId);
  }

  @Get('event-type/:eventTypeId')
  async getUsersByEventType(@Param('eventTypeId') eventTypeId: string): Promise<UserDto[]> {
    return await this.userService.getUsersByEventType(eventTypeId);
  }

  @Get('status/:statusId')
  async getUsersByStatus(@Param('statusId') statusId: string): Promise<UserDto[]> {
    return await this.userService.getUsersByStatus(statusId);
  }

  @Put(':id')
  async updateUser(
    @Param('id') userId: string,
    @Body() updateData: UpdateUserDto,
  ): Promise<{ success: boolean }> {
    const success = await this.userService.updateUser(userId, updateData);
    return { success };
  }

  @Delete(':id')
  async deleteUser(@Param('id') userId: string): Promise<{ success: boolean }> {
    const success = await this.userService.deleteUser(userId);
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

  @Delete(':id/fcm-token')
  async removeFcmToken(@Param('id') userId: string, @Body() body: FcmTokenDto): Promise<{ success: boolean }> {
    const success = await this.userService.removeFcmToken(userId, body.token);
    return { success };
  }

  @Post(':id/block/:blockedId')
  async blockUser(
    @Param('id') userId: string,
    @Param('blockedId') blockedId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.userService.blockUser(userId, blockedId);
    return { success };
  }
}
