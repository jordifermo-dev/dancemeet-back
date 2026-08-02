import { getMessaging } from 'firebase-admin/messaging';
import { initFirebaseAdmin } from '../config/firebase-admin.config';
import { renderNotification } from '../common';
import { NotificationRepository } from '../repositories/notification.repository';
import { UserRepository } from '../repositories/user.repository';
import { NotificationDto } from '../dto';
import { NotificationType } from '../schemas/notification.schema';

/** Central place every trigger (follow, attend, event create/update, the
 * same-day reminder cron) goes through - persists the in-app inbox row and
 * best-effort sends a web push. Never throws: a notification failure must
 * never break the action that triggered it (following someone, creating an
 * event, ...), so every public method swallows its own errors and just logs. */
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async notify(userId: string, type: NotificationType, params: Record<string, string>): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user || user.disabledNotificationTypes?.includes(type)) {
        return;
      }
      const { title, body } = renderNotification(user.language ?? 'es', type, params);
      const created = await this.notificationRepository.create({
        userId,
        type,
        title,
        body,
        data: params,
      });
      await this.sendPush(user.id!, user.fcmTokens ?? [], created);
    } catch (err) {
      console.error(`[NotificationService] notify(${userId}, ${type}) failed:`, err);
    }
  }

  async notifyMany(userIds: string[], type: NotificationType, params: Record<string, string>): Promise<void> {
    const uniqueIds = [...new Set(userIds)];
    await Promise.all(uniqueIds.map((userId) => this.notify(userId, type, params)));
  }

  async getByUser(userId: string): Promise<NotificationDto[]> {
    return this.notificationRepository.findByUser(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.countUnread(userId);
  }

  async markRead(id: string): Promise<boolean> {
    return this.notificationRepository.markRead(id);
  }

  async markUnread(id: string): Promise<boolean> {
    return this.notificationRepository.markUnread(id);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationRepository.markAllRead(userId);
  }

  private async sendPush(userId: string, tokens: string[], notification: NotificationDto): Promise<void> {
    if (!tokens.length) {
      return;
    }
    try {
      const response = await getMessaging(initFirebaseAdmin()).sendEachForMulticast({
        tokens,
        notification: { title: notification.title, body: notification.body },
        data: Object.fromEntries(
          Object.entries({ type: notification.type, ...notification.data }).map(([key, value]) => [
            key,
            String(value),
          ]),
        ),
      });
      const staleTokens = response.responses
        .map((result, index) => (!result.success ? tokens[index] : null))
        .filter((token): token is string => !!token);
      await Promise.all(staleTokens.map((token) => this.userRepository.removeFcmToken(userId, token)));
    } catch (err) {
      // Most commonly: Firebase Web push isn't configured yet (placeholder
      // appId/VAPID key) - the in-app inbox row above still gets created, so
      // this failing doesn't lose the notification, only the OS-level push.
      console.error(`[NotificationService] FCM send failed for user ${userId}:`, err);
    }
  }
}
