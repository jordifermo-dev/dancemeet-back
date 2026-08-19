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
import { EventTypeService } from './event-type.service';
import { CreateEventTypeDto, EventTypeDto, UpdateEventTypeDto } from './event-type.dto';
import { Public } from '../../common';

@Controller('api/event-types')
export class EventTypeController {
  constructor(private eventTypeService: EventTypeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEventType(@Body() eventTypeData: CreateEventTypeDto): Promise<EventTypeDto> {
    return await this.eventTypeService.createEventType(eventTypeData);
  }

  @Public()
  @Get()
  async getAllEventTypes(): Promise<EventTypeDto[]> {
    return await this.eventTypeService.getAllEventTypes();
  }

  @Public()
  @Get(':id')
  async getEventTypeById(@Param('id') eventTypeId: string): Promise<EventTypeDto> {
    return await this.eventTypeService.getEventTypeById(eventTypeId);
  }

  @Public()
  @Get('name/:name')
  async getEventTypeByName(@Param('name') name: string): Promise<EventTypeDto> {
    return await this.eventTypeService.getEventTypeByName(name);
  }

  @Put(':id')
  async updateEventType(
    @Param('id') eventTypeId: string,
    @Body() updateData: UpdateEventTypeDto,
  ): Promise<{ success: boolean }> {
    const success = await this.eventTypeService.updateEventType(eventTypeId, updateData);
    return { success };
  }

  @Delete(':id')
  async deleteEventType(@Param('id') eventTypeId: string): Promise<{ success: boolean }> {
    const success = await this.eventTypeService.deleteEventType(eventTypeId);
    return { success };
  }

  @Public()
  @Get('/count/total')
  async countEventTypes(): Promise<{ count: number }> {
    const count = await this.eventTypeService.countEventTypes();
    return { count };
  }
}
