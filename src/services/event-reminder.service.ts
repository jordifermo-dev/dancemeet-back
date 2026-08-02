import { Cron, CronExpression } from '@nestjs/schedule';
import { EventRepository } from '../repositories/event.repository';
import { FavoriteRepository } from '../repositories/favorite.repository';
import { NotificationService } from './notification.service';

/** Daily "this is happening today" reminder for every event starting that
 * day, sent to its attendees and its organizer alike - plus a more frequent
 * housekeeping job that flips `published` events over to `finished` once
 * their end time passes, so status (and anything filtering by it) reflects
 * reality without the organizer having to edit the event by hand. */
export class EventReminderService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly favoriteRepository: FavoriteRepository,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendTodayReminders(): Promise<void> {
    try {
      await this.remindForToday();
    } catch (err) {
      console.error('[EventReminderService] sendTodayReminders failed:', err);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async finishPastEvents(): Promise<void> {
    try {
      const updated = await this.eventRepository.finishPastEvents(Date.now());
      if (updated > 0) {
        console.log(`[EventReminderService] finishPastEvents: marked ${updated} event(s) as finished`);
      }
    } catch (err) {
      console.error('[EventReminderService] finishPastEvents failed:', err);
    }
  }

  /** Split out from the @Cron-decorated method so it can be triggered
   * manually (e.g. from a throwaway script in src/scripts/) to verify the
   * reminder logic without waiting for 8am. */
  async remindForToday(): Promise<void> {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
    const events = await this.eventRepository.findHappeningToday(dayStart, dayEnd);
    for (const event of events) {
      const attendees = await this.favoriteRepository.findByEvent(event.id!);
      const recipientIds = [...new Set([...attendees.map((a) => a.userId), event.creatorId])];
      await this.notificationService.notifyMany(recipientIds, 'event_reminder_today', {
        eventId: event.id!,
        eventTitle: event.title,
      });
    }
  }
}
