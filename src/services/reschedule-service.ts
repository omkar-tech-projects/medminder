import { format, addHours, subHours } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { getPendingDoseLogsInWindow, getPendingDoseLogsWithParams } from '@/db/queries/dose-logs';
import {
  scheduleNotificationsForDoseLog,
  cancelNotificationsForDoseLog,
} from '@/services/notification-service';
import { useSettingsStore } from '@/store/settings-store';
import { NOTIFICATION_WINDOW_HOURS, DOSE_REMINDER_RE_REMIND_CAP_HOURS } from '@/lib/constants';

function buildParams(
  log: ReturnType<typeof getPendingDoseLogsWithParams>[number],
  settings: ReturnType<typeof useSettingsStore.getState>,
) {
  return {
    doseLogId: log.doseLogId,
    medicineName: log.medicineName,
    dosage: log.dosage,
    scheduledAt: log.scheduledAt,
    leadMinutes: log.leadMinutesOverride ?? settings.notificationLeadMin,
    nagIntervalMinutes: log.nagIntervalMinutesOverride ?? settings.reRemindIntervalMin,
    maxNags: log.maxNagsOverride ?? settings.maxNags,
    quietHoursEnabled:
      log.quietHoursOverride != null ? log.quietHoursOverride === 1 : settings.quietHoursEnabled,
    quietHoursStart: settings.quietHoursStart,
    quietHoursEnd: settings.quietHoursEnd,
    soundEnabled: settings.notificationSoundEnabled,
  };
}

/**
 * Cancels only dose-reminder alarms, preserving refill and debug notifications.
 * This avoids wiping refill alerts when we re-arm the dose window on foreground.
 */
async function cancelScheduledDoseNotifications(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => !n.identifier.startsWith('refill:') && !n.identifier.startsWith('debug:'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

// Debounce: at most one full reschedule per minute. Rapid foreground events
// (e.g. user switching apps quickly) should not accumulate alarms.
let _lastRescheduleAt = 0;
const RESCHEDULE_DEBOUNCE_MS = 60_000;

/**
 * Cancels all dose alarms and reschedules only doses in the next
 * NOTIFICATION_WINDOW_HOURS hours. This keeps the live alarm count at
 * ≤2 per dose (lead + first nag), well under Android's 500-alarm cap.
 *
 * Call on: app launch, app foreground, after adding/editing medicines.
 * Refill and debug alarms are intentionally preserved.
 */
export async function scheduleWindowNotifications(): Promise<void> {
  const now = Date.now();
  if (now - _lastRescheduleAt < RESCHEDULE_DEBOUNCE_MS) return;
  _lastRescheduleAt = now;

  const settings = useSettingsStore.getState();
  // Look back DOSE_REMINDER_RE_REMIND_CAP_HOURS so doses that fired recently but are
  // still pending (not yet auto-missed) have their remaining future nags rescheduled.
  // scheduleNotificationsForDoseLog already guards each trigger with `if (nagTime > now)`,
  // so already-delivered nags are never double-scheduled.
  const fromIso = format(
    subHours(new Date(now), DOSE_REMINDER_RE_REMIND_CAP_HOURS),
    "yyyy-MM-dd'T'HH:mm:ss",
  );
  const toIso = format(addHours(new Date(now), NOTIFICATION_WINDOW_HOURS), "yyyy-MM-dd'T'HH:mm:ss");

  await cancelScheduledDoseNotifications();
  const pending = getPendingDoseLogsInWindow(fromIso, toIso);
  await Promise.all(
    pending.map((log) =>
      scheduleNotificationsForDoseLog(buildParams(log, settings)).catch(() => undefined),
    ),
  );
}

/** @deprecated Use scheduleWindowNotifications. Kept for callers in settings/refill flows. */
export async function rescheduleAllFutureNotifications(): Promise<void> {
  // Force reschedule bypassing the debounce (settings changed, must take effect immediately).
  _lastRescheduleAt = 0;
  await scheduleWindowNotifications();
}

/** Cancels and reschedules one medicine's pending future dose notifications within the window. */
export async function rescheduleNotificationsForMedicine(medicineId: string): Promise<void> {
  const settings = useSettingsStore.getState();
  const now = new Date();
  const fromIso = format(now, "yyyy-MM-dd'T'HH:mm:ss");
  const toIso = format(addHours(now, NOTIFICATION_WINDOW_HOURS), "yyyy-MM-dd'T'HH:mm:ss");

  const pending = getPendingDoseLogsInWindow(fromIso, toIso).filter(
    (l) => l.medicineId === medicineId,
  );
  await Promise.all(
    pending.map((log) => cancelNotificationsForDoseLog(log.doseLogId).catch(() => undefined)),
  );
  await Promise.all(
    pending.map((log) =>
      scheduleNotificationsForDoseLog(buildParams(log, settings)).catch(() => undefined),
    ),
  );
}
