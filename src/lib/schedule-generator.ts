/**
 * Pure, DST-safe schedule expansion.
 *
 * All scheduled datetime strings are LOCAL-time ISO 8601 without a timezone
 * suffix, e.g. "2026-03-08T08:00:00". This means "8 am in whatever timezone
 * the device is currently in" — exactly what a medication reminder needs.
 *
 * DST safety: calendar-day iteration uses date-fns addDays() (which adds a
 * real calendar day, not 86 400 s), and the time component is appended as a
 * string — never derived from UTC arithmetic. Spring-forward / fall-back
 * transitions therefore never shift a scheduled time.
 */

import { parseISO, addDays, format, isAfter, getDay, differenceInCalendarDays } from 'date-fns';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type DayPattern =
  | { type: 'daily' }
  | { type: 'every_n_days'; n: number } // n >= 2; day-0 anchor = startDate
  | { type: 'weekly'; days: number[] }; // 0 = Sunday … 6 = Saturday (getDay())

export interface SlotExpansionParams {
  /** Course start 'yyyy-MM-dd'. First possible dose falls on this date. */
  startDate: string;
  /** Course end 'yyyy-MM-dd', or null for open-ended. */
  endDate: string | null;
  /** Dose times as 'HH:mm' 24-hour strings, e.g. ['08:00', '20:00']. */
  timesOfDay: string[];
  /** Recurrence rule within the course. */
  dayPattern: DayPattern;
  /** Inclusive start of the pre-generation window 'yyyy-MM-dd'. */
  windowStart: string;
  /** Inclusive end of the pre-generation window 'yyyy-MM-dd'. */
  windowEnd: string;
}

// ---------------------------------------------------------------------------
// Day-pattern helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Returns true when `date` is a scheduled day for the given pattern.
 * `courseStart` is the anchor for every_n_days offset calculation.
 */
export function matchesDayPattern(date: Date, courseStart: Date, pattern: DayPattern): boolean {
  switch (pattern.type) {
    case 'daily':
      return true;
    case 'every_n_days': {
      const diff = differenceInCalendarDays(date, courseStart);
      return diff >= 0 && diff % pattern.n === 0;
    }
    case 'weekly':
      return pattern.days.includes(getDay(date));
  }
}

/** Deserialise a JSON day-pattern from the DB column. null/empty → daily. */
export function parseDayPattern(raw: string | null | undefined): DayPattern {
  if (!raw) return { type: 'daily' };
  try {
    return JSON.parse(raw) as DayPattern;
  } catch {
    return { type: 'daily' };
  }
}

/** Serialise for DB storage. 'daily' → null (compact; null reads back as daily). */
export function serializeDayPattern(pattern: DayPattern): string | null {
  return pattern.type === 'daily' ? null : JSON.stringify(pattern);
}

// ---------------------------------------------------------------------------
// Core expansion
// ---------------------------------------------------------------------------

/**
 * Expands one schedule into a sorted list of local-time datetime strings
 * ('yyyy-MM-ddTHH:mm:00') that fall inside:
 *   intersection([startDate, endDate], [windowStart, windowEnd])
 *
 * Returns an empty array when the intersection is empty or timesOfDay is [].
 */
export function expandScheduleToSlots(params: SlotExpansionParams): string[] {
  const { startDate, endDate, timesOfDay, dayPattern, windowStart, windowEnd } = params;

  if (timesOfDay.length === 0) return [];

  // Clamp effective range to intersection of course bounds and window
  const effectiveStart = windowStart > startDate ? windowStart : startDate;
  const effectiveEnd = endDate != null && endDate < windowEnd ? endDate : windowEnd;

  if (effectiveStart > effectiveEnd) return [];

  const courseStart = parseISO(startDate);
  let cur = parseISO(effectiveStart);
  const end = parseISO(effectiveEnd);

  const slots: string[] = [];

  while (!isAfter(cur, end)) {
    if (matchesDayPattern(cur, courseStart, dayPattern)) {
      const dateStr = format(cur, 'yyyy-MM-dd');
      for (const time of timesOfDay) {
        // Guard against malformed time strings
        if (/^\d{2}:\d{2}$/.test(time)) {
          slots.push(`${dateStr}T${time}:00`);
        }
      }
    }
    cur = addDays(cur, 1);
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Rolling-window helper
// ---------------------------------------------------------------------------

/**
 * Returns the end-date string for a rolling pre-generation window.
 * Uses addDays so the result is always a real calendar day (DST-safe).
 */
export function computeWindowEnd(today: Date, windowDays: number): string {
  return format(addDays(today, windowDays - 1), 'yyyy-MM-dd');
}
