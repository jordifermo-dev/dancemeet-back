import { Model } from 'mongoose';
import { mapNotificationToDto } from '../config/mongoose.config';
import { NotificationDto } from '../dto';
import { NotificationDocument, NotificationType } from '../schemas/notification.schema';
import { handleDbOperation, isValidObjectId, InvalidIdException } from '../common';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class NotificationRepository {
  private readonly resourceName = 'Notification';

  constructor(private readonly notificationModel: Model<NotificationDocument>) {}

  async create(notificationData: CreateNotificationData): Promise<NotificationDto> {
    return handleDbOperation(this.resourceName, 'create', async () => {
      const createdDocument = await this.notificationModel.create({
        ...notificationData,
        read: false,
        createdAt: Date.now(),
      });
      return mapNotificationToDto(createdDocument);
    });
  }

  /** Most recent first - the inbox has no pagination UI yet, so a flat
   * recent-N cap is enough rather than building out cursor pagination. */
  async findByUser(userId: string, limit = 50): Promise<NotificationDto[]> {
    return handleDbOperation(this.resourceName, 'findByUser', async () => {
      const documents = await this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return documents.map((document) => mapNotificationToDto(document));
    });
  }

  async countUnread(userId: string): Promise<number> {
    return handleDbOperation(this.resourceName, 'countUnread', async () => {
      return this.notificationModel.countDocuments({ userId, read: false });
    });
  }

  async markRead(id: string): Promise<boolean> {
    return handleDbOperation(this.resourceName, 'markRead', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const updatedDocument = await this.notificationModel.findByIdAndUpdate(id, {
        $set: { read: true },
      });
      return !!updatedDocument;
    });
  }

  async markUnread(id: string): Promise<boolean> {
    return handleDbOperation(this.resourceName, 'markUnread', async () => {
      if (!isValidObjectId(id)) {
        throw new InvalidIdException(this.resourceName, id);
      }
      const updatedDocument = await this.notificationModel.findByIdAndUpdate(id, {
        $set: { read: false },
      });
      return !!updatedDocument;
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await handleDbOperation(this.resourceName, 'markAllRead', async () => {
      await this.notificationModel.updateMany({ userId, read: false }, { $set: { read: true } });
    });
  }
}
