import { NotificationType } from './notification.schema';

export class NotificationDto {
  id?: string;
  userId!: string;
  type!: NotificationType;
  title!: string;
  body!: string;
  data?: Record<string, string>;
  isRead!: boolean;
  createdAt!: number;
}
