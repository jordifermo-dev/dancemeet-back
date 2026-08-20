import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NotificationType } from './notification.schema';

type NotificationStrings = Record<string, string>;

const SUPPORTED_LANGUAGES = ['es', 'ca', 'en'];

// Loaded straight from the same assets/i18n JSON files nestjs-i18n uses,
// but read directly instead of going through I18nContext - the daily
// same-day-reminder cron runs with no active HTTP request, so there's no
// request-scoped I18nContext to pull a language from there.
const cache = new Map<string, NotificationStrings>();

function loadStrings(lang: string): NotificationStrings {
  const safeLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'es';
  const cached = cache.get(safeLang);
  if (cached) {
    return cached;
  }
  const filePath = join(__dirname, '..', '..', 'assets', 'i18n', safeLang, 'notifications.json');
  const strings = JSON.parse(readFileSync(filePath, 'utf8')) as NotificationStrings;
  cache.set(safeLang, strings);
  return strings;
}

function interpolate(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => params[key] ?? '');
}

const TEMPLATE_KEYS: Record<NotificationType, { title: string; body: string }> = {
  new_follower: { title: 'newFollowerTitle', body: 'newFollowerBody' },
  event_attendee: { title: 'eventAttendeeTitle', body: 'eventAttendeeBody' },
  event_updated: { title: 'eventUpdatedTitle', body: 'eventUpdatedBody' },
  event_reminder_today: { title: 'eventReminderTodayTitle', body: 'eventReminderTodayBody' },
  following_new_event: { title: 'followingNewEventTitle', body: 'followingNewEventBody' },
  preference_new_event: { title: 'preferenceNewEventTitle', body: 'preferenceNewEventBody' },
  recurring_series_created: { title: 'recurringSeriesCreatedTitle', body: 'recurringSeriesCreatedBody' },
  event_manager_invite: { title: 'eventManagerInviteTitle', body: 'eventManagerInviteBody' },
  event_attendee_invite: { title: 'eventAttendeeInviteTitle', body: 'eventAttendeeInviteBody' },
};

export function renderNotification(
  lang: string,
  type: NotificationType,
  params: Record<string, string>,
): { title: string; body: string } {
  const strings = loadStrings(lang);
  const keys = TEMPLATE_KEYS[type];
  return {
    title: interpolate(strings[keys.title] ?? type, params),
    body: interpolate(strings[keys.body] ?? '', params),
  };
}
