/**
 * Unit tests for notification-service.ts
 *
 * Strategy: mock expo-notifications entirely and use Jest fake timers to
 * control "now". Inspect what was passed to scheduleNotificationAsync to
 * verify correct trigger dates, titles, and quiet-hours behaviour.
 *
 * Timezone: tests use `new Date(year, month, day, h, m, s)` constructor
 * which always produces LOCAL time, making assertions timezone-agnostic.
 *
 * eslint-disable-next-line import/first is required below because Jest
 * hoists jest.mock() calls above import statements at runtime. The mock*
 * variable names trigger babel-jest's automatic hoisting so they are
 * initialised before the factory runs, but ESLint cannot model that.
 */
/* eslint-disable import/first */

import type * as ExpoNotifications from 'expo-notifications';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSchedule = jest
  .fn<Promise<string>, [ExpoNotifications.NotificationRequestInput]>()
  .mockResolvedValue('mock-id');

const mockGetAll = jest
  .fn<Promise<ExpoNotifications.ScheduledNotificationObject[]>, []>()
  .mockResolvedValue([]);

const mockCancel = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
const mockCancelAll = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
const mockGetPermissions = jest
  .fn<Promise<{ status: string }>, []>()
  .mockResolvedValue({ status: 'granted' });

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (req: unknown) => mockSchedule(req as never),
  getAllScheduledNotificationsAsync: () => mockGetAll(),
  cancelScheduledNotificationAsync: (id: unknown) => mockCancel(id as string),
  cancelAllScheduledNotificationsAsync: () => mockCancelAll(),
  getPermissionsAsync: () => mockGetPermissions(),
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'time_interval' },
}));

import {
  scheduleNotificationsForDoseLog,
  cancelNotificationsForDoseLog,
  cancelAllDoseNotifications,
  scheduleSnoozeNotification,
  type DoseNotificationParams,
} from '../notification-service';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a UTC-free local datetime string: '2026-01-01T08:00:00'. */
function localDT(y: number, mo: number, d: number, h: number, m: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(m)}:00`;
}

/** Extract the trigger Date from a scheduleNotificationAsync call by index. */
function triggerDate(callIndex: number): Date {
  const req = mockSchedule.mock.calls[callIndex]?.[0];
  if (!req) throw new Error(`No call at index ${callIndex}`);
  const trigger = req.trigger as { date: Date };
  return trigger.date;
}

function makeParams(overrides: Partial<DoseNotificationParams> = {}): DoseNotificationParams {
  return {
    doseLogId: 'dl:test',
    medicineName: 'Amoxicillin',
    dosage: '500 mg',
    scheduledAt: localDT(2026, 1, 1, 8, 0),
    leadMinutes: 5,
    nagIntervalMinutes: 5,
    maxNags: 3,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    soundEnabled: true,
    ...overrides,
  };
}

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Set "now" to 2026-01-01 06:00 local time — 2 h before the 08:00 dose
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 0, 1, 6, 0, 0));
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Permission gate ───────────────────────────────────────────────────────────

describe('scheduleNotificationsForDoseLog — permission denied', () => {
  it('schedules nothing when permission is not granted', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'denied' });
    await scheduleNotificationsForDoseLog(makeParams());
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});

// ── Basic lead + nag chain ────────────────────────────────────────────────────

describe('scheduleNotificationsForDoseLog — lead + nag chain', () => {
  it('schedules lead notification at doseTime - leadMinutes', async () => {
    await scheduleNotificationsForDoseLog(makeParams({ leadMinutes: 5, maxNags: 0 }));
    // lead only (index 0) — trigger should be 07:55
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const trigger = triggerDate(0);
    expect(trigger.getHours()).toBe(7);
    expect(trigger.getMinutes()).toBe(55);
  });

  it('schedules maxNags nag notifications after doseTime', async () => {
    await scheduleNotificationsForDoseLog(
      makeParams({ leadMinutes: 5, maxNags: 3, nagIntervalMinutes: 5 }),
    );
    // 1 lead + 3 nags = 4 total (all are in the future from 06:00)
    expect(mockSchedule).toHaveBeenCalledTimes(4);
    // Nag 1 (index 1) fires at 08:00
    expect(triggerDate(1).getHours()).toBe(8);
    expect(triggerDate(1).getMinutes()).toBe(0);
    // Nag 2 (index 2) fires at 08:05
    expect(triggerDate(2).getHours()).toBe(8);
    expect(triggerDate(2).getMinutes()).toBe(5);
    // Nag 3 (index 3) fires at 08:10
    expect(triggerDate(3).getHours()).toBe(8);
    expect(triggerDate(3).getMinutes()).toBe(10);
  });

  it('skips notifications already in the past', async () => {
    // Move "now" to 08:06 — lead (07:55) and nag 1 (08:00) and nag 2 (08:05) are past
    jest.setSystemTime(new Date(2026, 0, 1, 8, 6, 0));
    await scheduleNotificationsForDoseLog(
      makeParams({ leadMinutes: 5, maxNags: 3, nagIntervalMinutes: 5 }),
    );
    // Only nag 3 at 08:10 remains
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const trigger = triggerDate(0);
    expect(trigger.getMinutes()).toBe(10);
  });

  it('schedules nothing when dose time is fully in the past', async () => {
    // now = 10:00, dose was at 08:00 with maxNags=3 at 5-min intervals (latest = 08:10)
    jest.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));
    await scheduleNotificationsForDoseLog(makeParams({ maxNags: 3 }));
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});

// ── Lead identifier ───────────────────────────────────────────────────────────

describe('scheduleNotificationsForDoseLog — identifiers', () => {
  it('uses doseLogId:0 for lead and doseLogId:N for nag index N', async () => {
    await scheduleNotificationsForDoseLog(makeParams({ maxNags: 2 }));
    const ids = mockSchedule.mock.calls.map((c) => (c[0] as { identifier: string }).identifier);
    expect(ids).toEqual(['dl:test:0', 'dl:test:1', 'dl:test:2']);
  });
});

// ── Quiet hours ───────────────────────────────────────────────────────────────

describe('scheduleNotificationsForDoseLog — quiet hours', () => {
  it('shifts a nag inside the overnight window (22:00-07:00) to 07:00 next day', async () => {
    // now = 21:00, dose at 22:30 (inside quiet window 22:00-07:00)
    jest.setSystemTime(new Date(2026, 0, 1, 21, 0, 0));
    await scheduleNotificationsForDoseLog(
      makeParams({
        scheduledAt: localDT(2026, 1, 1, 22, 30),
        leadMinutes: 5,
        maxNags: 1,
        nagIntervalMinutes: 5,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      }),
    );
    // Lead at 22:25 — inside quiet window, should shift to Jan 2 07:00
    const leadTrigger = triggerDate(0);
    expect(leadTrigger.getDate()).toBe(2);
    expect(leadTrigger.getHours()).toBe(7);
    expect(leadTrigger.getMinutes()).toBe(0);
    // Nag 1 at 22:30 — inside quiet window, should shift to Jan 2 07:00
    const nagTrigger = triggerDate(1);
    expect(nagTrigger.getDate()).toBe(2);
    expect(nagTrigger.getHours()).toBe(7);
    expect(nagTrigger.getMinutes()).toBe(0);
  });

  it('does not shift times outside the quiet window', async () => {
    // now = 06:00, dose at 08:00 — outside 22:00-07:00
    await scheduleNotificationsForDoseLog(
      makeParams({
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        maxNags: 1,
      }),
    );
    const nagTrigger = triggerDate(1);
    expect(nagTrigger.getHours()).toBe(8);
    expect(nagTrigger.getMinutes()).toBe(0);
  });

  it('does not shift when quietHoursEnabled is false', async () => {
    jest.setSystemTime(new Date(2026, 0, 1, 21, 0, 0));
    await scheduleNotificationsForDoseLog(
      makeParams({
        scheduledAt: localDT(2026, 1, 1, 22, 30),
        leadMinutes: 5,
        maxNags: 1,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      }),
    );
    const nagTrigger = triggerDate(1);
    // No shift — should stay at 22:30
    expect(nagTrigger.getHours()).toBe(22);
    expect(nagTrigger.getMinutes()).toBe(30);
  });
});

// ── Sound flag ────────────────────────────────────────────────────────────────

describe('scheduleNotificationsForDoseLog — sound', () => {
  it('passes sound:false when soundEnabled is false', async () => {
    await scheduleNotificationsForDoseLog(makeParams({ maxNags: 1, soundEnabled: false }));
    for (const [req] of mockSchedule.mock.calls) {
      expect((req as { content: { sound: boolean } }).content.sound).toBe(false);
    }
  });

  it('passes sound:true when soundEnabled is true', async () => {
    await scheduleNotificationsForDoseLog(makeParams({ maxNags: 1, soundEnabled: true }));
    for (const [req] of mockSchedule.mock.calls) {
      expect((req as { content: { sound: boolean } }).content.sound).toBe(true);
    }
  });
});

// ── Medicine name truncation ──────────────────────────────────────────────────

describe('scheduleNotificationsForDoseLog — name truncation', () => {
  it('truncates medicine names longer than 40 chars in notification body/title', async () => {
    const longName = 'A'.repeat(60);
    await scheduleNotificationsForDoseLog(makeParams({ medicineName: longName, maxNags: 1 }));
    for (const [req] of mockSchedule.mock.calls) {
      const { title, body } = (req as { content: { title: string; body: string } }).content;
      // title is either "Upcoming dose" (lead) or "Time for <name>" (nag)
      // body for lead contains the name; for nag it's the dosage string
      const combined = `${title} ${body}`;
      // The truncated name is at most 40 chars with an ellipsis appended
      expect(combined).not.toContain('A'.repeat(41));
    }
  });

  it('does not truncate names of 40 chars or fewer', async () => {
    const exactName = 'B'.repeat(40);
    await scheduleNotificationsForDoseLog(makeParams({ medicineName: exactName, maxNags: 0 }));
    // Lead body should contain the full 40-char name
    const body = (mockSchedule.mock.calls[0]?.[0] as { content: { body: string } }).content.body;
    expect(body).toContain(exactName);
  });
});

// ── Cancel ────────────────────────────────────────────────────────────────────

describe('cancelNotificationsForDoseLog', () => {
  it('cancels only notifications whose identifier starts with the doseLogId prefix', async () => {
    mockGetAll.mockResolvedValueOnce([
      { identifier: 'dl:1:0' } as ExpoNotifications.ScheduledNotificationObject,
      { identifier: 'dl:1:1' } as ExpoNotifications.ScheduledNotificationObject,
      { identifier: 'dl:2:0' } as ExpoNotifications.ScheduledNotificationObject,
      { identifier: 'other:0' } as ExpoNotifications.ScheduledNotificationObject,
    ]);
    await cancelNotificationsForDoseLog('dl:1');
    expect(mockCancel).toHaveBeenCalledTimes(2);
    expect(mockCancel).toHaveBeenCalledWith('dl:1:0');
    expect(mockCancel).toHaveBeenCalledWith('dl:1:1');
    expect(mockCancel).not.toHaveBeenCalledWith('dl:2:0');
    expect(mockCancel).not.toHaveBeenCalledWith('other:0');
  });

  it('does nothing when there are no matching notifications', async () => {
    mockGetAll.mockResolvedValueOnce([
      { identifier: 'dl:2:0' } as ExpoNotifications.ScheduledNotificationObject,
    ]);
    await cancelNotificationsForDoseLog('dl:1');
    expect(mockCancel).not.toHaveBeenCalled();
  });
});

describe('cancelAllDoseNotifications', () => {
  it('delegates to cancelAllScheduledNotificationsAsync', async () => {
    await cancelAllDoseNotifications();
    expect(mockCancelAll).toHaveBeenCalledTimes(1);
  });
});

// ── Snooze ────────────────────────────────────────────────────────────────────

describe('scheduleSnoozeNotification', () => {
  it('schedules a notification at now + snoozeMinutes', async () => {
    // now = 06:00, snooze 10 min → fires at 06:10
    await scheduleSnoozeNotification({
      doseLogId: 'dl:sn',
      medicineName: 'Paracetamol',
      dosage: '1 tab',
      snoozeMinutes: 10,
      quietHoursEnabled: false,
    });
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const trigger = triggerDate(0);
    expect(trigger.getHours()).toBe(6);
    expect(trigger.getMinutes()).toBe(10);
  });

  it('shifts snooze notification out of quiet hours', async () => {
    // now = 21:55, snooze 10 min → fires at 22:05 (inside quiet 22:00-07:00) → shifted to 07:00
    jest.setSystemTime(new Date(2026, 0, 1, 21, 55, 0));
    await scheduleSnoozeNotification({
      doseLogId: 'dl:sn2',
      medicineName: 'Dolo',
      dosage: '650 mg',
      snoozeMinutes: 10,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    });
    const trigger = triggerDate(0);
    expect(trigger.getDate()).toBe(2);
    expect(trigger.getHours()).toBe(7);
    expect(trigger.getMinutes()).toBe(0);
  });

  it('uses doseLogId:snooze as identifier', async () => {
    await scheduleSnoozeNotification({
      doseLogId: 'dl:abc',
      medicineName: 'Med',
      dosage: '1',
      snoozeMinutes: 5,
      quietHoursEnabled: false,
    });
    const id = (mockSchedule.mock.calls[0]?.[0] as { identifier: string }).identifier;
    expect(id).toBe('dl:abc:snooze');
  });

  it('skips scheduling when permission is not granted', async () => {
    mockGetPermissions.mockResolvedValueOnce({ status: 'denied' });
    await scheduleSnoozeNotification({
      doseLogId: 'dl:x',
      medicineName: 'Med',
      dosage: '1',
      snoozeMinutes: 5,
      quietHoursEnabled: false,
    });
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});
