export type RecurrenceFrequency = 'weekly' | 'monthlyNthWeekday';

export interface NthWeekday {
  /** 1-4, no "último" (nth = -1) support in v1. */
  nth: number;
  /** 0 = Monday .. 6 = Sunday - matches the frontend's weekdayShortLabels()/startOfWeek() convention. */
  weekday: number;
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  /** Every N weeks (frequency='weekly') or every N months (frequency='monthlyNthWeekday'). */
  interval: number;
  /** 0-6 (Monday-first), required when frequency='weekly'. */
  weekdays?: number[];
  /** e.g. [{nth:2,weekday:5},{nth:4,weekday:5}] = 2nd and 4th Saturday, required when frequency='monthlyNthWeekday'. */
  nthWeekdays?: NthWeekday[];
  dateFrom: number;
  /** null = "sin límite" - expandRecurrence stops at MAX_SERIES_OCCURRENCES instead of a concrete end date. */
  dateTo: number | null;
}

export interface RecurrenceOccurrence {
  eventDateFrom: number;
  eventDateTo: number;
}

// Doubled from the original 52 (~1 year weekly) - a single-day-per-week
// course was the baseline, but a Mon-Fri course already hits 52 within 11
// weeks, well short of a real term/season.
export const MAX_SERIES_OCCURRENCES = 104;

// Defensive ceiling for the internal day-collection loop, independent of
// MAX_SERIES_OCCURRENCES - lets a bounded (dateTo set) rule collect more
// than 52 days so the caller can report "too many, reduce the range" with
// an accurate count, instead of silently truncating a bounded request.
const HARD_ITERATION_CAP = 500;

function startOfDayLocal(timestamp: number): Date {
  const d = new Date(timestamp);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(day: Date, delta: number): Date {
  const d = new Date(day);
  d.setDate(d.getDate() + delta);
  return d;
}

function addMonths(day: Date, delta: number): Date {
  const d = new Date(day);
  d.setMonth(d.getMonth() + delta);
  return d;
}

/** JS Date.getDay() is 0=Sunday..6=Saturday - convert to this module's
 * Monday-first convention (0=Monday..6=Sunday). */
function toMondayFirst(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function applyTime(day: Date, hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const merged = new Date(day);
  merged.setHours(hours, minutes, 0, 0);
  return merged.getTime();
}

function collectWeeklyDays(rule: RecurrenceRule): Date[] {
  const weekdays = [...new Set(rule.weekdays ?? [])].sort((a, b) => a - b);
  if (!weekdays.length) {
    return [];
  }
  const interval = Math.max(1, Math.floor(rule.interval));
  const from = startOfDayLocal(rule.dateFrom);
  const to = rule.dateTo !== null ? startOfDayLocal(rule.dateTo) : null;
  const cap = to === null ? MAX_SERIES_OCCURRENCES : HARD_ITERATION_CAP;

  const mondayOfFromWeek = addDays(from, -toMondayFirst(from.getDay()));
  const days: Date[] = [];

  for (let weekIndex = 0; days.length < cap; weekIndex += interval) {
    const weekStart = addDays(mondayOfFromWeek, weekIndex * 7);
    if (to !== null && weekStart > to) {
      break;
    }
    for (const weekday of weekdays) {
      const day = addDays(weekStart, weekday);
      if (day < from) {
        continue;
      }
      if (to !== null && day > to) {
        return days;
      }
      days.push(day);
      if (days.length >= cap) {
        break;
      }
    }
  }
  return days;
}

/** nth-th occurrence of `weekday` in the month containing `monthAnchor` -
 * null if that occurrence doesn't exist in this month (e.g. a 4th Friday in
 * a month that only has three). */
function nthWeekdayOfMonth(monthAnchor: Date, nth: number, weekday: number): Date | null {
  const firstOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const firstWeekdayOffset = (weekday - toMondayFirst(firstOfMonth.getDay()) + 7) % 7;
  const day = addDays(firstOfMonth, firstWeekdayOffset + (nth - 1) * 7);
  return day.getMonth() === monthAnchor.getMonth() ? day : null;
}

function collectMonthlyNthWeekdayDays(rule: RecurrenceRule): Date[] {
  const pairs = rule.nthWeekdays ?? [];
  if (!pairs.length) {
    return [];
  }
  const interval = Math.max(1, Math.floor(rule.interval));
  const from = startOfDayLocal(rule.dateFrom);
  const to = rule.dateTo !== null ? startOfDayLocal(rule.dateTo) : null;
  const cap = to === null ? MAX_SERIES_OCCURRENCES : HARD_ITERATION_CAP;

  const days: Date[] = [];
  let monthAnchor = new Date(from.getFullYear(), from.getMonth(), 1);

  for (let monthIndex = 0; days.length < cap; monthIndex += interval) {
    const anchor = addMonths(monthAnchor, monthIndex);
    if (to !== null && anchor > to) {
      break;
    }
    const monthDays = pairs
      .map((pair) => nthWeekdayOfMonth(anchor, pair.nth, pair.weekday))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    for (const day of monthDays) {
      if (day < from) {
        continue;
      }
      if (to !== null && day > to) {
        return days;
      }
      days.push(day);
      if (days.length >= cap) {
        break;
      }
    }
    // A full HARD_ITERATION_CAP scan over an unbounded/huge range would
    // otherwise loop forever if every month happens to produce zero valid
    // days (e.g. a nth that never lands in-range) - months are still
    // monotonically increasing, so this is bounded by the date range alone
    // when `to` is set; when unbounded, MAX_SERIES_OCCURRENCES is reached
    // well before this could matter in practice.
  }
  return days;
}

/** Expands a recurrence rule into concrete {eventDateFrom, eventDateTo}
 * pairs, one per occurrence, with `timeFromHHmm`/`timeToHHmm` ("HH:mm")
 * applied to every day. Callers are responsible for rejecting results that
 * exceed MAX_SERIES_OCCURRENCES when `rule.dateTo` is set (this function
 * only self-truncates when `rule.dateTo` is null / "sin límite"). */
export function expandRecurrence(
  rule: RecurrenceRule,
  timeFromHHmm: string,
  timeToHHmm: string,
): RecurrenceOccurrence[] {
  const days = rule.frequency === 'weekly' ? collectWeeklyDays(rule) : collectMonthlyNthWeekdayDays(rule);
  return days.map((day) => ({
    eventDateFrom: applyTime(day, timeFromHHmm),
    eventDateTo: applyTime(day, timeToHHmm),
  }));
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** "HH:mm" (local) for a timestamp - used to derive timeFrom/timeTo from an
 * already-existing event's own eventDateFrom/eventDateTo when attaching a
 * recurrence rule to it after the fact (see EventService.attachRecurrenceToEvent). */
export function formatHHmm(timestamp: number): string {
  const d = new Date(timestamp);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Same local calendar day, regardless of time-of-day. */
export function isSameLocalDay(a: number, b: number): boolean {
  return startOfDayLocal(a).getTime() === startOfDayLocal(b).getTime();
}
