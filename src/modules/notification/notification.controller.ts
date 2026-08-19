import { Controller, Get, Put, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationDto } from './notification.dto';

@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('user/:userId')
  async getByUser(@Param('userId') userId: string): Promise<NotificationDto[]> {
    return this.notificationService.getByUser(userId);
  }

  @Get('user/:userId/unread-count')
  async getUnreadCount(@Param('userId') userId: string): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Put(':id/read')
  async markRead(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.notificationService.markRead(id);
    return { success };
  }

  @Put(':id/unread')
  async markUnread(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.notificationService.markUnread(id);
    return { success };
  }

  @Put('user/:userId/read-all')
  async markAllRead(@Param('userId') userId: string): Promise<{ success: boolean }> {
    await this.notificationService.markAllRead(userId);
    return { success: true };
  }
}
