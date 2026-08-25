import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceDto, AttendedEventDto, EventAttendeeDto } from './attendance.dto';

@Controller('api/attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get('user/:userId/events')
  async getAttendedEventsDetailed(@Param('userId') userId: string): Promise<AttendedEventDto[]> {
    return await this.attendanceService.getAttendedEventsDetailed(userId);
  }

  @Get('event/:eventId/attendees')
  async getEventAttendeesDetailed(@Param('eventId') eventId: string): Promise<EventAttendeeDto[]> {
    return await this.attendanceService.getEventAttendeesDetailed(eventId);
  }

  @Get('check/:userId/:eventId')
  async isAttending(
    @Param('userId') userId: string,
    @Param('eventId') eventId: string,
  ): Promise<{ isAttending: boolean }> {
    const isAttending = await this.attendanceService.isAttending(userId, eventId);
    return { isAttending };
  }

  @Post(':userId/:eventId/add')
  async addAttendance(
    @Param('userId') userId: string,
    @Param('eventId') eventId: string,
  ): Promise<AttendanceDto> {
    return await this.attendanceService.addAttendance(userId, eventId);
  }

  @Delete(':userId/:eventId/remove')
  async removeAttendance(
    @Param('userId') userId: string,
    @Param('eventId') eventId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.attendanceService.removeAttendance(userId, eventId);
    return { success };
  }

  @Post(':userId/series/:seriesId/add')
  @HttpCode(HttpStatus.NO_CONTENT)
  async addSeriesAttendance(
    @Param('userId') userId: string,
    @Param('seriesId') seriesId: string,
  ): Promise<void> {
    await this.attendanceService.addSeriesAttendance(userId, seriesId);
  }

  @Delete(':userId/series/:seriesId/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSeriesAttendance(
    @Param('userId') userId: string,
    @Param('seriesId') seriesId: string,
  ): Promise<void> {
    await this.attendanceService.removeSeriesAttendance(userId, seriesId);
  }

  @Get('count/event/:eventId')
  async countEventAttendance(@Param('eventId') eventId: string): Promise<{ count: number }> {
    const count = await this.attendanceService.countEventAttendance(eventId);
    return { count };
  }
}
