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
import { FavoriteService } from '../services/favorite.service';
import { CreateFavoriteDto, EventAttendeeDto, FavoriteDto, FavoritedEventDto, UpdateFavoriteDto } from '../dto';

@Controller('api/favorites')
export class FavoriteController {
  constructor(private favoriteService: FavoriteService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createFavorite(@Body() favoriteData: CreateFavoriteDto): Promise<FavoriteDto> {
    try {
      return await this.favoriteService.createFavorite(favoriteData);
    } catch (err) {
      throw err;
    }
  }

  @Get()
  async getAllFavorites(): Promise<FavoriteDto[]> {
    try {
      return await this.favoriteService.getAllFavorites();
    } catch (err) {
      throw err;
    }
  }

  @Get(':id')
  async getFavoriteById(@Param('id') favoriteId: string): Promise<FavoriteDto> {
    try {
      return await this.favoriteService.getFavoriteById(favoriteId);
    } catch (err) {
      throw err;
    }
  }

  @Get('user/:userId')
  async getFavoritesByUser(@Param('userId') userId: string): Promise<FavoriteDto[]> {
    try {
      return await this.favoriteService.getFavoritesByUser(userId);
    } catch (err) {
      throw err;
    }
  }

  @Get('user/:userId/events')
  async getFavoritedEventsDetailed(@Param('userId') userId: string): Promise<FavoritedEventDto[]> {
    try {
      return await this.favoriteService.getFavoritedEventsDetailed(userId);
    } catch (err) {
      throw err;
    }
  }

  @Get('event/:eventId')
  async getFavoritesByEvent(@Param('eventId') eventId: string): Promise<FavoriteDto[]> {
    try {
      return await this.favoriteService.getFavoritesByEvent(eventId);
    } catch (err) {
      throw err;
    }
  }

  @Get('event/:eventId/attendees')
  async getEventAttendeesDetailed(@Param('eventId') eventId: string): Promise<EventAttendeeDto[]> {
    try {
      return await this.favoriteService.getEventAttendeesDetailed(eventId);
    } catch (err) {
      throw err;
    }
  }

  @Get('check/:userId/:eventId')
  async isFavorited(
    @Param('userId') userId: string,
    @Param('eventId') eventId: string,
  ): Promise<{ isFavorited: boolean }> {
    try {
      const isFavorited = await this.favoriteService.isFavorited(userId, eventId);
      return { isFavorited };
    } catch (err) {
      throw err;
    }
  }

  @Post(':userId/:eventId/add')
  async addToFavorites(
    @Param('userId') userId: string,
    @Param('eventId') eventId: string,
  ): Promise<FavoriteDto> {
    try {
      return await this.favoriteService.addToFavorites(userId, eventId);
    } catch (err) {
      throw err;
    }
  }

  @Delete(':userId/:eventId/remove')
  async removeFromFavorites(
    @Param('userId') userId: string,
    @Param('eventId') eventId: string,
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.favoriteService.removeFromFavorites(userId, eventId);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Put(':id')
  async updateFavorite(
    @Param('id') favoriteId: string,
    @Body() updateData: UpdateFavoriteDto,
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.favoriteService.updateFavorite(favoriteId, updateData);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Delete(':id')
  async deleteFavorite(@Param('id') favoriteId: string): Promise<{ success: boolean }> {
    try {
      const success = await this.favoriteService.deleteFavorite(favoriteId);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Get('count/user/:userId')
  async countUserFavorites(@Param('userId') userId: string): Promise<{ count: number }> {
    try {
      const count = await this.favoriteService.countUserFavorites(userId);
      return { count };
    } catch (err) {
      throw err;
    }
  }

  @Get('count/event/:eventId')
  async countEventFavorites(@Param('eventId') eventId: string): Promise<{ count: number }> {
    try {
      const count = await this.favoriteService.countEventFavorites(eventId);
      return { count };
    } catch (err) {
      throw err;
    }
  }
}
