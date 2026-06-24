/**
 * Unit tests for schedule-generator pure functions.
 *
 * These tests run in Node with TZ=UTC unless noted. DST behaviour is validated
 * by asserting the time component of every slot matches the requested HH:mm —
 * our string-concatenation approach means DST transitions can never shift a
 * scheduled time regardless of the host timezone.
 */

import {
  matchesDayPattern,
  expandScheduleToSlots,
  parseDayPattern,
  serializeDayPattern,
  computeWindowEnd,
  type DayPattern,
} from '../schedule-generator';
import { parseISO } from 'date-fns';

// ---------------------------------------------------------------------------
// matchesDayPattern
// ---------------------------------------------------------------------------

describe('matchesDayPattern — daily', () => {
  const pattern: DayPattern = { type: 'daily' };
  const anchor = parseISO('2026-01-01');

  it('returns true for every day', () => {
    expect(matchesDayPattern(parseISO('2026-01-01'), anchor, pattern)).toBe(true);
    expect(matchesDayPattern(parseISO('2026-06-15'), anchor, pattern)).toBe(true);
  });
});

describe('matchesDayPattern — every_n_days', () => {
  const anchor = parseISO('2026-01-01');

  it('fires on day 0, n, 2n …', () => {
    const p: DayPattern = { type: 'every_n_days', n: 3 };
    expect(matchesDayPattern(parseISO('2026-01-01'), anchor, p)).toBe(true); // diff=0
    expect(matchesDayPattern(parseISO('2026-01-02'), anchor, p)).toBe(false); // diff=1
    expect(matchesDayPattern(parseISO('2026-01-03'), anchor, p)).toBe(false); // diff=2
    expect(matchesDayPattern(parseISO('2026-01-04'), anchor, p)).toBe(true); // diff=3
    expect(matchesDayPattern(parseISO('2026-01-07'), anchor, p)).toBe(true); // diff=6
  });

  it('handles n=2 (every other day)', () => {
    const p: DayPattern = { type: 'every_n_days', n: 2 };
    expect(matchesDayPattern(parseISO('2026-01-01'), anchor, p)).toBe(true); // 0
    expect(matchesDayPattern(parseISO('2026-01-02'), anchor, p)).toBe(false); // 1
    expect(matchesDayPattern(parseISO('2026-01-03'), anchor, p)).toBe(true); // 2
  });

  it('handles n=7 (weekly-by-interval)', () => {
    const p: DayPattern = { type: 'every_n_days', n: 7 };
    expect(matchesDayPattern(parseISO('2026-01-01'), anchor, p)).toBe(true);
    expect(matchesDayPattern(parseISO('2026-01-08'), anchor, p)).toBe(true);
    expect(matchesDayPattern(parseISO('2026-01-05'), anchor, p)).toBe(false);
  });
});

describe('matchesDayPattern — weekly', () => {
  const anchor = parseISO('2026-01-01');

  it('fires only on specified days-of-week', () => {
    // Mon=1, Wed=3, Fri=5
    const p: DayPattern = { type: 'weekly', days: [1, 3, 5] };
    expect(matchesDayPattern(parseISO('2026-06-22'), anchor, p)).toBe(true); // Mon
    expect(matchesDayPattern(parseISO('2026-06-23'), anchor, p)).toBe(false); // Tue
    expect(matchesDayPattern(parseISO('2026-06-24'), anchor, p)).toBe(true); // Wed
    expect(matchesDayPattern(parseISO('2026-06-25'), anchor, p)).toBe(false); // Thu
    expect(matchesDayPattern(parseISO('2026-06-26'), anchor, p)).toBe(true); // Fri
    expect(matchesDayPattern(parseISO('2026-06-27'), anchor, p)).toBe(false); // Sat
    expect(matchesDayPattern(parseISO('2026-06-28'), anchor, p)).toBe(false); // Sun
  });

  it('handles weekend-only pattern', () => {
    const p: DayPattern = { type: 'weekly', days: [0, 6] }; // Sun, Sat
    expect(matchesDayPattern(parseISO('2026-06-27'), anchor, p)).toBe(true); // Sat
    expect(matchesDayPattern(parseISO('2026-06-28'), anchor, p)).toBe(true); // Sun
    expect(matchesDayPattern(parseISO('2026-06-29'), anchor, p)).toBe(false); // Mon
  });
});

// ---------------------------------------------------------------------------
// parseDayPattern / serializeDayPattern
// ---------------------------------------------------------------------------

describe('parseDayPattern', () => {
  it('null → daily', () => {
    expect(parseDayPattern(null)).toEqual({ type: 'daily' });
  });
  it('undefined → daily', () => {
    expect(parseDayPattern(undefined)).toEqual({ type: 'daily' });
  });
  it('empty string → daily', () => {
    expect(parseDayPattern('')).toEqual({ type: 'daily' });
  });
  it('malformed JSON → daily', () => {
    expect(parseDayPattern('not-json')).toEqual({ type: 'daily' });
  });
  it('round-trips every_n_days', () => {
    const p: DayPattern = { type: 'every_n_days', n: 3 };
    expect(parseDayPattern(serializeDayPattern(p))).toEqual(p);
  });
  it('round-trips weekly', () => {
    const p: DayPattern = { type: 'weekly', days: [1, 3, 5] };
    expect(parseDayPattern(serializeDayPattern(p))).toEqual(p);
  });
});

describe('serializeDayPattern', () => {
  it('daily → null', () => {
    expect(serializeDayPattern({ type: 'daily' })).toBeNull();
  });
  it('every_n_days → JSON string', () => {
    const s = serializeDayPattern({ type: 'every_n_days', n: 3 });
    expect(s).toBe('{"type":"every_n_days","n":3}');
  });
});

// ---------------------------------------------------------------------------
// expandScheduleToSlots — basic cases
// ---------------------------------------------------------------------------

describe('expandScheduleToSlots — daily, single time', () => {
  it('generates one slot per day for a 3-day window', () => {
    const slots = expandScheduleToSlots({
      startDate: '2026-01-01',
      endDate: null,
      timesOfDay: ['08:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-01-01',
      windowEnd: '2026-01-03',
    });
    expect(slots).toEqual(['2026-01-01T08:00:00', '2026-01-02T08:00:00', '2026-01-03T08:00:00']);
  });

  it('returns [] when timesOfDay is empty', () => {
    const slots = expandScheduleToSlots({
      startDate: '2026-01-01',
      endDate: null,
      timesOfDay: [],
      dayPattern: { type: 'daily' },
      windowStart: '2026-01-01',
      windowEnd: '2026-01-07',
    });
    expect(slots).toHaveLength(0);
  });
});

describe('expandScheduleToSlots — multiple doses per day', () => {
  it('emits all times in order for each day', () => {
    const slots = expandScheduleToSlots({
      startDate: '2026-01-01',
      endDate: null,
      timesOfDay: ['08:00', '14:00', '20:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-01-01',
      windowEnd: '2026-01-02',
    });
    expect(slots).toEqual([
      '2026-01-01T08:00:00',
      '2026-01-01T14:00:00',
      '2026-01-01T20:00:00',
      '2026-01-02T08:00:00',
      '2026-01-02T14:00:00',
      '2026-01-02T20:00:00',
    ]);
  });
});

// ---------------------------------------------------------------------------
// expandScheduleToSlots — course bounds vs window
// ---------------------------------------------------------------------------

describe('expandScheduleToSlots — course shorter than window', () => {
  it('stops at endDate even when window extends further', () => {
    // 5-day course: Jan 1–5, window Jan 1–14
    const slots = expandScheduleToSlots({
      startDate: '2026-01-01',
      endDate: '2026-01-05',
      timesOfDay: ['09:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-01-01',
      windowEnd: '2026-01-14',
    });
    expect(slots).toHaveLength(5);
    expect(slots[0]).toBe('2026-01-01T09:00:00');
    expect(slots[4]).toBe('2026-01-05T09:00:00');
  });

  it('returns [] when course already ended before window starts', () => {
    const slots = expandScheduleToSlots({
      startDate: '2025-12-01',
      endDate: '2025-12-31',
      timesOfDay: ['09:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-01-01',
      windowEnd: '2026-01-14',
    });
    expect(slots).toHaveLength(0);
  });
});

describe('expandScheduleToSlots — course longer than window', () => {
  it('stops at windowEnd when course extends beyond window', () => {
    // 90-day course, 14-day window
    const slots = expandScheduleToSlots({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      timesOfDay: ['09:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-01-01',
      windowEnd: '2026-01-14',
    });
    expect(slots).toHaveLength(14);
    expect(slots[13]).toBe('2026-01-14T09:00:00');
  });
});

describe('expandScheduleToSlots — open-ended course', () => {
  it('fills the entire window when endDate is null', () => {
    const slots = expandScheduleToSlots({
      startDate: '2026-01-01',
      endDate: null,
      timesOfDay: ['09:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-01-01',
      windowEnd: '2026-01-14',
    });
    expect(slots).toHaveLength(14);
  });
});

describe('expandScheduleToSlots — startDate after windowStart', () => {
  it('does not generate slots before startDate', () => {
    // Course starts Jan 5, window starts Jan 1
    const slots = expandScheduleToSlots({
      startDate: '2026-01-05',
      endDate: null,
      timesOfDay: ['09:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-01-01',
      windowEnd: '2026-01-07',
    });
    // Only Jan 5, 6, 7
    expect(slots).toHaveLength(3);
    expect(slots[0]).toBe('2026-01-05T09:00:00');
  });
});

// ---------------------------------------------------------------------------
// expandScheduleToSlots — every_n_days
// ---------------------------------------------------------------------------

describe('expandScheduleToSlots — every_n_days', () => {
  it('generates slots every 3 days anchored to startDate', () => {
    const slots = expandScheduleToSlots({
      startDate: '2026-01-01', // day 0 → dose
      endDate: null,
      timesOfDay: ['08:00'],
      dayPattern: { type: 'every_n_days', n: 3 },
      windowStart: '2026-01-01',
      windowEnd: '2026-01-10', // days 0-9
    });
    // Doses on days 0, 3, 6, 9 → Jan 1, 4, 7, 10
    expect(slots).toEqual([
      '2026-01-01T08:00:00',
      '2026-01-04T08:00:00',
      '2026-01-07T08:00:00',
      '2026-01-10T08:00:00',
    ]);
  });

  it('every 2 days for 7-day course = 4 doses', () => {
    // Jan 1 (day 0), Jan 3 (day 2), Jan 5 (day 4), Jan 7 (day 6)
    const slots = expandScheduleToSlots({
      startDate: '2026-01-01',
      endDate: '2026-01-07',
      timesOfDay: ['20:00'],
      dayPattern: { type: 'every_n_days', n: 2 },
      windowStart: '2026-01-01',
      windowEnd: '2026-01-14',
    });
    expect(slots).toEqual([
      '2026-01-01T20:00:00',
      '2026-01-03T20:00:00',
      '2026-01-05T20:00:00',
      '2026-01-07T20:00:00',
    ]);
  });

  it('window starts mid-course: anchor still respects startDate', () => {
    // Course Jan 1 every 3 days, window starts Jan 6
    // Day 0=Jan1, 3=Jan4, 6=Jan7, 9=Jan10
    const slots = expandScheduleToSlots({
      startDate: '2026-01-01',
      endDate: null,
      timesOfDay: ['08:00'],
      dayPattern: { type: 'every_n_days', n: 3 },
      windowStart: '2026-01-06',
      windowEnd: '2026-01-12',
    });
    expect(slots).toEqual(['2026-01-07T08:00:00', '2026-01-10T08:00:00']);
  });
});

// ---------------------------------------------------------------------------
// expandScheduleToSlots — weekly pattern
// ---------------------------------------------------------------------------

describe('expandScheduleToSlots — weekly', () => {
  it('Mon/Wed/Fri only over a full week', () => {
    // Week of June 22 (Mon) – June 28 (Sun) 2026
    const slots = expandScheduleToSlots({
      startDate: '2026-06-01',
      endDate: null,
      timesOfDay: ['08:00'],
      dayPattern: { type: 'weekly', days: [1, 3, 5] }, // Mon, Wed, Fri
      windowStart: '2026-06-22',
      windowEnd: '2026-06-28',
    });
    expect(slots).toEqual([
      '2026-06-22T08:00:00', // Mon
      '2026-06-24T08:00:00', // Wed
      '2026-06-26T08:00:00', // Fri
    ]);
  });

  it('Sunday-only over two weeks = 2 slots', () => {
    const slots = expandScheduleToSlots({
      startDate: '2026-06-01',
      endDate: null,
      timesOfDay: ['10:00'],
      dayPattern: { type: 'weekly', days: [0] }, // Sun
      windowStart: '2026-06-22',
      windowEnd: '2026-07-05',
    });
    expect(slots).toEqual(['2026-06-28T10:00:00', '2026-07-05T10:00:00']);
  });

  it('no matching days in window → []', () => {
    // Weekdays only, but window is a Sat + Sun only
    const slots = expandScheduleToSlots({
      startDate: '2026-06-01',
      endDate: null,
      timesOfDay: ['08:00'],
      dayPattern: { type: 'weekly', days: [1, 2, 3, 4, 5] },
      windowStart: '2026-06-27',
      windowEnd: '2026-06-28',
    });
    expect(slots).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// expandScheduleToSlots — DST transitions
// ---------------------------------------------------------------------------

describe('expandScheduleToSlots — DST transitions', () => {
  /**
   * DST safety: regardless of the test runner's timezone, each slot's time
   * component must exactly match the requested HH:mm. Our string-concat
   * approach guarantees this because we never convert through UTC.
   *
   * US Eastern spring-forward: 2026-03-08 02:00 → 03:00
   * US Eastern fall-back:      2026-11-01 02:00 → 01:00
   */

  it('time component is preserved across US spring-forward (Mar 8 2026)', () => {
    const slots = expandScheduleToSlots({
      startDate: '2026-03-07',
      endDate: null,
      timesOfDay: ['08:00', '20:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-03-07',
      windowEnd: '2026-03-10',
    });
    expect(slots).toHaveLength(8); // 4 days × 2 times
    // All time components must be exactly '08:00:00' or '20:00:00'
    const times = slots.map((s) => s.slice(11));
    expect(times.filter((t) => t === '08:00:00')).toHaveLength(4);
    expect(times.filter((t) => t === '20:00:00')).toHaveLength(4);
    // Specific DST-day slot must exist
    expect(slots).toContain('2026-03-08T08:00:00');
    expect(slots).toContain('2026-03-08T20:00:00');
  });

  it('time component is preserved across US fall-back (Nov 1 2026)', () => {
    const slots = expandScheduleToSlots({
      startDate: '2026-10-31',
      endDate: null,
      timesOfDay: ['08:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-10-31',
      windowEnd: '2026-11-02',
    });
    expect(slots).toEqual([
      '2026-10-31T08:00:00',
      '2026-11-01T08:00:00', // fall-back day — still 08:00
      '2026-11-02T08:00:00',
    ]);
  });

  it('addDays advances exactly one calendar day across DST boundary', () => {
    // 14 days including DST change: should produce exactly 14 slots
    const slots = expandScheduleToSlots({
      startDate: '2026-03-02',
      endDate: null,
      timesOfDay: ['09:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-03-02',
      windowEnd: '2026-03-15',
    });
    expect(slots).toHaveLength(14);
    const dates = slots.map((s) => s.slice(0, 10));
    const unique = new Set(dates);
    expect(unique.size).toBe(14); // no duplicate or skipped dates
  });
});

// ---------------------------------------------------------------------------
// expandScheduleToSlots — year / month boundary
// ---------------------------------------------------------------------------

describe('expandScheduleToSlots — year boundary', () => {
  it('spans Dec–Jan correctly', () => {
    const slots = expandScheduleToSlots({
      startDate: '2025-12-30',
      endDate: null,
      timesOfDay: ['08:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2025-12-30',
      windowEnd: '2026-01-02',
    });
    expect(slots).toEqual([
      '2025-12-30T08:00:00',
      '2025-12-31T08:00:00',
      '2026-01-01T08:00:00',
      '2026-01-02T08:00:00',
    ]);
  });
});

// ---------------------------------------------------------------------------
// expandScheduleToSlots — edge cases
// ---------------------------------------------------------------------------

describe('expandScheduleToSlots — edge cases', () => {
  it('single-day course = one slot per time', () => {
    const slots = expandScheduleToSlots({
      startDate: '2026-06-01',
      endDate: '2026-06-01',
      timesOfDay: ['08:00', '20:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-06-01',
      windowEnd: '2026-06-14',
    });
    expect(slots).toEqual(['2026-06-01T08:00:00', '2026-06-01T20:00:00']);
  });

  it('windowStart === windowEnd = at most N slots for the one day', () => {
    const slots = expandScheduleToSlots({
      startDate: '2026-01-01',
      endDate: null,
      timesOfDay: ['08:00', '20:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-06-01',
      windowEnd: '2026-06-01',
    });
    expect(slots).toEqual(['2026-06-01T08:00:00', '2026-06-01T20:00:00']);
  });

  it('malformed time strings are skipped', () => {
    const slots = expandScheduleToSlots({
      startDate: '2026-01-01',
      endDate: null,
      timesOfDay: ['08:00', 'bad', '20:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-01-01',
      windowEnd: '2026-01-01',
    });
    expect(slots).toEqual(['2026-01-01T08:00:00', '2026-01-01T20:00:00']);
  });

  it('windowStart > windowEnd → []', () => {
    const slots = expandScheduleToSlots({
      startDate: '2026-01-01',
      endDate: null,
      timesOfDay: ['08:00'],
      dayPattern: { type: 'daily' },
      windowStart: '2026-01-10',
      windowEnd: '2026-01-01',
    });
    expect(slots).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// computeWindowEnd
// ---------------------------------------------------------------------------

describe('computeWindowEnd', () => {
  it('windowDays=14 returns today + 13 days', () => {
    const today = parseISO('2026-06-23');
    expect(computeWindowEnd(today, 14)).toBe('2026-07-06');
  });

  it('windowDays=1 returns today itself', () => {
    const today = parseISO('2026-01-01');
    expect(computeWindowEnd(today, 1)).toBe('2026-01-01');
  });

  it('handles month rollover correctly', () => {
    const today = parseISO('2026-01-28');
    expect(computeWindowEnd(today, 14)).toBe('2026-02-10');
  });
});
