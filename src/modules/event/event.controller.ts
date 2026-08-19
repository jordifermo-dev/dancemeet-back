import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseFloatPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto, EventDto, SearchedEventDto, UpdateEventDto } from './event.dto';
import { AttachRecurrenceDto, CreateEventSeriesDto, PatchEventSeriesDto } from './event-series.dto';

@Controller('api/events')
export class EventController {
  constructor(private eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() eventData: CreateEventDto): Promise<EventDto> {
    return await this.eventService.createEvent(eventData);
  }

  @Post('series')
  @HttpCode(HttpStatus.CREATED)
  async createEventSeries(@Body() seriesData: CreateEventSeriesDto): Promise<{ seriesId: string; events: EventDto[] }> {
    return await this.eventService.createEventSeries(seriesData);
  }

  @Get()
  async getAllEvents(): Promise<EventDto[]> {
    return await this.eventService.getAllEvents();
  }

  // Must come before @Get(':id') below - otherwise ':id' would greedily
  // match the literal "series" path segment as an event id.
  @Get('series/:seriesId')
  async getEventsBySeriesId(@Param('seriesId') seriesId: string): Promise<EventDto[]> {
    return await this.eventService.getEventsBySeriesId(seriesId);
  }

  @Get(':id')
  async getEventById(@Param('id') eventId: string): Promise<EventDto> {
    return await this.eventService.getEventById(eventId);
  }

  @Get(':id/detail')
  async getEventDetail(@Param('id') eventId: string): Promise<SearchedEventDto> {
    return await this.eventService.getEventDetail(eventId);
  }

  @Get('discipline/:disciplineId')
  async getEventsByDiscipline(@Param('disciplineId') disciplineId: string): Promise<EventDto[]> {
    return await this.eventService.getEventsByDiscipline(disciplineId);
  }

  @Get('type/:typeId')
  async getEventsByType(@Param('typeId') typeId: string): Promise<EventDto[]> {
    return await this.eventService.getEventsByType(typeId);
  }

  @Get('city/:city')
  async getEventsByCity(@Param('city') city: string): Promise<EventDto[]> {
    return await this.eventService.getEventsByCity(city);
  }

  @Get('/upcoming/list')
  async getUpcomingEvents(
    @Query('currentTime', new ParseIntPipe({ optional: true })) currentTime?: number,
  ): Promise<EventDto[]> {
    return await this.eventService.getUpcomingEvents(currentTime);
  }

  @Get('/nearby/list')
  async getEventsNearby(
    @Query('latitude', ParseFloatPipe) latitude: number,
    @Query('longitude', ParseFloatPipe) longitude: number,
    @Query('maxDistance', ParseFloatPipe) maxDistance: number,
  ): Promise<EventDto[]> {
    return await this.eventService.getEventsNearby(latitude, longitude, maxDistance);
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
  }

  // Same route-order reasoning as getEventsBySeriesId above - must come
  // before @Put(':id')/@Delete(':id').
  @Patch('series/:seriesId')
  async updateEventSeries(
    @Param('seriesId') seriesId: string,
    @Body() patch: PatchEventSeriesDto,
  ): Promise<{ modifiedCount: number }> {
    const modifiedCount = await this.eventService.updateEventSeries(seriesId, patch);
    return { modifiedCount };
  }

  @Delete('series/:seriesId')
  async deleteEventSeries(@Param('seriesId') seriesId: string): Promise<{ deletedCount: number }> {
    const deletedCount = await this.eventService.deleteEventSeries(seriesId);
    return { deletedCount };
  }

  @Put(':id')
  async updateEvent(
    @Param('id') eventId: string,
    @Body() updateData: UpdateEventDto,
  ): Promise<{ success: boolean }> {
    const success = await this.eventService.updateEvent(eventId, updateData);
    return { success };
  }

  @Delete(':id')
  async deleteEvent(@Param('id') eventId: string): Promise<{ success: boolean }> {
    const success = await this.eventService.deleteEvent(eventId);
    return { success };
  }

  @Patch(':id/recurrence')
  async attachRecurrenceToEvent(
    @Param('id') eventId: string,
    @Body() dto: AttachRecurrenceDto,
  ): Promise<{ seriesId: string; events: EventDto[] }> {
    return await this.eventService.attachRecurrenceToEvent(eventId, dto.recurrence);
  }

  @Get('/count/total')
  async countEvents(): Promise<{ count: number }> {
    const count = await this.eventService.countEvents();
    return { count };
  }

  @Get('/count/creator/:creatorId')
  async countEventsByCreator(@Param('creatorId') creatorId: string): Promise<{ count: number }> {
    const count = await this.eventService.countEventsByCreator(creatorId);
    return { count };
  }
}
