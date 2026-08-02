import { NotificationType } from '../schemas/notification.schema';

export class NotificationDto {
  id?: string;
  userId!: string;
  type!: NotificationType;
  title!: string;
  body!: string;
  data?: Record<string, string>;
  read!: boolean;
  createdAt!: number;
}
