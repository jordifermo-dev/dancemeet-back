import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseFloatPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { EventService } from '../services/event.service';
import { CreateEventDto, EventDto, SearchedEventDto, UpdateEventDto } from '../dto';

@Controller('api/events')
export class EventController {
  constructor(private eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() eventData: CreateEventDto): Promise<EventDto> {
    try {
      return await this.eventService.createEvent(eventData);
    } catch (err) {
      throw err;
    }
  }

  @Get()
  async getAllEvents(): Promise<EventDto[]> {
    try {
      return await this.eventService.getAllEvents();
    } catch (err) {
      throw err;
    }
  }

  @Get(':id')
  async getEventById(@Param('id') eventId: string): Promise<EventDto> {
    try {
      return await this.eventService.getEventById(eventId);
    } catch (err) {
      throw err;
    }
  }

  @Get(':id/detail')
  async getEventDetail(@Param('id') eventId: string): Promise<SearchedEventDto> {
    try {
      return await this.eventService.getEventDetail(eventId);
    } catch (err) {
      throw err;
    }
  }

  @Get('creator/:creatorId')
  async getEventsByCreator(@Param('creatorId') creatorId: string): Promise<EventDto[]> {
    try {
      return await this.eventService.getEventsByCreator(creatorId);
    } catch (err) {
      throw err;
    }
  }

  @Get('discipline/:disciplineId')
  async getEventsByDiscipline(@Param('disciplineId') disciplineId: string): Promise<EventDto[]> {
    try {
      return await this.eventService.getEventsByDiscipline(disciplineId);
    } catch (err) {
      throw err;
    }
  }

  @Get('type/:typeId')
  async getEventsByType(@Param('typeId') typeId: string): Promise<EventDto[]> {
    try {
      return await this.eventService.getEventsByType(typeId);
    } catch (err) {
      throw err;
    }
  }

  @Get('city/:city')
  async getEventsByCity(@Param('city') city: string): Promise<EventDto[]> {
    try {
      return await this.eventService.getEventsByCity(city);
    } catch (err) {
      throw err;
    }
  }

  @Get('/upcoming/list')
  async getUpcomingEvents(
    @Query('currentTime', new ParseIntPipe({ optional: true })) currentTime?: number,
  ): Promise<EventDto[]> {
    try {
      return await this.eventService.getUpcomingEvents(currentTime);
    } catch (err) {
      throw err;
    }
  }

  @Get('/nearby/list')
  async getEventsNearby(
    @Query('latitude', ParseFloatPipe) latitude: number,
    @Query('longitude', ParseFloatPipe) longitude: number,
    @Query('maxDistance', ParseFloatPipe) maxDistance: number,
  ): Promise<EventDto[]> {
    try {
      return await this.eventService.getEventsNearby(latitude, longitude, maxDistance);
    } catch (err) {
      throw err;
    }
  }

  @Get('/search/list')
  async searchEvents(
    @Query('disciplineIds') disciplineIds?: string,
    @Query('typeIds') typeIds?: string,
    @Query('statuses') statuses?: string,
    @Query('dateFrom', new ParseIntPipe({ optional: true })) dateFrom?: number,
    @Query('dateTo', new ParseIntPipe({ optional: true })) dateTo?: number,
    @Query('latitude', new ParseFloatPipe({ optional: true })) latitude?: number,
    @Query('longitude', new ParseFloatPipe({ optional: true })) longitude?: number,
    @Query('radius', new ParseFloatPipe({ optional: true })) radius?: number,
    @Query('search') search?: string,
    @Query('priceOptions') priceOptions?: string,
  ): Promise<SearchedEventDto[]> {
    try {
      return await this.eventService.searchEvents({
        // !== undefined (not truthy) - an empty string still means "the
        // client explicitly sent zero disciplines/types", which must filter
        // down to zero results rather than being treated as "no filter".
        disciplineIds: disciplineIds !== undefined ? disciplineIds.split(',').filter(Boolean) : undefined,
        typeIds: typeIds !== undefined ? typeIds.split(',').filter(Boolean) : undefined,
        statuses: statuses ? statuses.split(',').filter(Boolean) : undefined,
        dateFrom,
        dateTo,
        latitude,
        longitude,
        radius,
        search,
        priceOptions: priceOptions !== undefined ? priceOptions.split(',').filter(Boolean) : undefined,
      });
    } catch (err) {
      throw err;
    }
  }

  @Put(':id')
  async updateEvent(
    @Param('id') eventId: string,
    @Body() updateData: UpdateEventDto,
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.eventService.updateEvent(eventId, updateData);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Delete(':id')
  async deleteEvent(@Param('id') eventId: string): Promise<{ success: boolean }> {
    try {
      const success = await this.eventService.deleteEvent(eventId);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Get('/count/total')
  async countEvents(): Promise<{ count: number }> {
    try {
      const count = await this.eventService.countEvents();
      return { count };
    } catch (err) {
      throw err;
    }
  }

  @Get('/count/creator/:creatorId')
  async countEventsByCreator(@Param('creatorId') creatorId: string): Promise<{ count: number }> {
    try {
      const count = await this.eventService.countEventsByCreator(creatorId);
      return { count };
    } catch (err) {
      throw err;
    }
  }
}
