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
import { CreateUserDto, FollowUserDto, UpdateUserDto, UserDto } from '../dto';

@Controller('api/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() userData: CreateUserDto): Promise<UserDto> {
    try {
      return await this.userService.createUser(userData);
    } catch (err) {
      throw err;
    }
  }

  @Get()
  async getAllUsers(): Promise<UserDto[]> {
    try {
      return await this.userService.getAllUsers();
    } catch (err) {
      throw err;
    }
  }

  @Get(':id')
  async getUserById(@Param('id') userId: string): Promise<UserDto> {
    try {
      return await this.userService.getUserById(userId);
    } catch (err) {
      throw err;
    }
  }

  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string): Promise<UserDto> {
    try {
      return await this.userService.getUserByEmail(email);
    } catch (err) {
      throw err;
    }
  }

  @Get('city/:city')
  async getUsersByCity(@Param('city') city: string): Promise<UserDto[]> {
    try {
      return await this.userService.getUsersByCity(city);
    } catch (err) {
      throw err;
    }
  }

  @Get('discipline/:disciplineId')
  async getUsersByDiscipline(@Param('disciplineId') disciplineId: string): Promise<UserDto[]> {
    try {
      return await this.userService.getUsersByDiscipline(disciplineId);
    } catch (err) {
      throw err;
    }
  }

  @Get('event-type/:eventTypeId')
  async getUsersByEventType(@Param('eventTypeId') eventTypeId: string): Promise<UserDto[]> {
    try {
      return await this.userService.getUsersByEventType(eventTypeId);
    } catch (err) {
      throw err;
    }
  }

  @Get('status/:statusId')
  async getUsersByStatus(@Param('statusId') statusId: string): Promise<UserDto[]> {
    try {
      return await this.userService.getUsersByStatus(statusId);
    } catch (err) {
      throw err;
    }
  }

  @Put(':id')
  async updateUser(
    @Param('id') userId: string,
    @Body() updateData: UpdateUserDto,
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.userService.updateUser(userId, updateData);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Delete(':id')
  async deleteUser(@Param('id') userId: string): Promise<{ success: boolean }> {
    try {
      const success = await this.userService.deleteUser(userId);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Get(':id/followers')
  async getFollowers(@Param('id') userId: string): Promise<FollowUserDto[]> {
    try {
      return await this.userService.getFollowersDetailed(userId);
    } catch (err) {
      throw err;
    }
  }

  @Get(':id/following')
  async getFollowing(@Param('id') userId: string): Promise<FollowUserDto[]> {
    try {
      return await this.userService.getFollowingDetailed(userId);
    } catch (err) {
      throw err;
    }
  }

  @Get(':id/followers-count')
  async getFollowersCount(@Param('id') userId: string): Promise<{ count: number }> {
    try {
      const count = await this.userService.countFollowers(userId);
      return { count };
    } catch (err) {
      throw err;
    }
  }

  @Get(':id/following-count')
  async getFollowingCount(@Param('id') userId: string): Promise<{ count: number }> {
    try {
      const count = await this.userService.countFollowing(userId);
      return { count };
    } catch (err) {
      throw err;
    }
  }

  @Post(':id/block/:blockedId')
  async blockUser(
    @Param('id') userId: string,
    @Param('blockedId') blockedId: string,
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.userService.blockUser(userId, blockedId);
      return { success };
    } catch (err) {
      throw err;
    }
  }
}
