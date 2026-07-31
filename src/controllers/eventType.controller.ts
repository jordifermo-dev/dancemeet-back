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
import { EventTypeService } from '../services/eventType.service';
import { CreateEventTypeDto, EventTypeDto, UpdateEventTypeDto } from '../dto';
import { Public } from '../common';

@Controller('api/event-types')
export class EventTypeController {
  constructor(private eventTypeService: EventTypeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEventType(@Body() eventTypeData: CreateEventTypeDto): Promise<EventTypeDto> {
    try {
      return await this.eventTypeService.createEventType(eventTypeData);
    } catch (err) {
      throw err;
    }
  }

  @Public()
  @Get()
  async getAllEventTypes(): Promise<EventTypeDto[]> {
    try {
      return await this.eventTypeService.getAllEventTypes();
    } catch (err) {
      throw err;
    }
  }

  @Public()
  @Get(':id')
  async getEventTypeById(@Param('id') eventTypeId: string): Promise<EventTypeDto> {
    try {
      return await this.eventTypeService.getEventTypeById(eventTypeId);
    } catch (err) {
      throw err;
    }
  }

  @Public()
  @Get('name/:name')
  async getEventTypeByName(@Param('name') name: string): Promise<EventTypeDto> {
    try {
      return await this.eventTypeService.getEventTypeByName(name);
    } catch (err) {
      throw err;
    }
  }

  @Put(':id')
  async updateEventType(
    @Param('id') eventTypeId: string,
    @Body() updateData: UpdateEventTypeDto,
  ): Promise<{ success: boolean }> {
    try {
      const success = await this.eventTypeService.updateEventType(eventTypeId, updateData);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Delete(':id')
  async deleteEventType(@Param('id') eventTypeId: string): Promise<{ success: boolean }> {
    try {
      const success = await this.eventTypeService.deleteEventType(eventTypeId);
      return { success };
    } catch (err) {
      throw err;
    }
  }

  @Public()
  @Get('/count/total')
  async countEventTypes(): Promise<{ count: number }> {
    try {
      const count = await this.eventTypeService.countEventTypes();
      return { count };
    } catch (err) {
      throw err;
    }
  }
}
