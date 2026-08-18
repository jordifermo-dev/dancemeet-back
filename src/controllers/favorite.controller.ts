import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FavoriteService } from '../services/favorite.service';
import { EventAttendeeDto, FavoriteDto, FavoritedEventDto } from '../dto';

@Controller('api/favorites')
export class FavoriteController {
  constructor(private favoriteService: FavoriteService) {}

  @Get('user/:userId/events')
  async getFavoritedEventsDetailed(@Param('userId') userId: string): Promise<FavoritedEventDto[]> {
    return await this.favoriteService.getFavoritedEventsDetailed(userId);
  }

  @Get('event/:eventId/attendees')
  async getEventAttendeesDetailed(@Param('eventId') eventId: string): Promise<EventAttendeeDto[]> {
    return await this.favoriteService.getEventAttendeesDetailed(eventId);
  }

  @Get('check/:userId/:eventId')
  async isFavorited(
    @Param('userId') userId: string,
    @Param('eventId') eventId: string,
  ): Promise<{ isFavorited: boolean }> {
    const isFavorited = await this.favoriteService.isFavorited(userId, eventId);
    return { isFavorited };
  }

  @Post(':userId/:eventId/add')
  async addToFavorites(
    @Param('userId') userId: string,
    @Param('eventId') eventId: string,
  ): Promise<FavoriteDto> {
    return await this.favoriteService.addToFavorites(userId, eventId);
  }

  @Delete(':userId/:eventId/remove')
  async removeFromFavorites(
    @Param('userId') userId: string,
    @Param('eventId') eventId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.favoriteService.removeFromFavorites(userId, eventId);
    return { success };
  }

  @Post(':userId/series/:seriesId/add')
  @HttpCode(HttpStatus.NO_CONTENT)
  async addSeriesToFavorites(
    @Param('userId') userId: string,
    @Param('seriesId') seriesId: string,
  ): Promise<void> {
    await this.favoriteService.addSeriesToFavorites(userId, seriesId);
  }

  @Delete(':userId/series/:seriesId/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSeriesFromFavorites(
    @Param('userId') userId: string,
    @Param('seriesId') seriesId: string,
  ): Promise<void> {
    await this.favoriteService.removeSeriesFromFavorites(userId, seriesId);
  }

  @Get('count/event/:eventId')
  async countEventFavorites(@Param('eventId') eventId: string): Promise<{ count: number }> {
    const count = await this.favoriteService.countEventFavorites(eventId);
    return { count };
  }
}
