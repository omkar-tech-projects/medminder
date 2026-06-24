import { getPendingDoseLogsWithParams } from '@/db/queries/dose-logs';
import {
  scheduleNotificationsForDoseLog,
  cancelNotificationsForDoseLog,
  cancelAllDoseNotifications,
} from '@/services/notification-service';
import { useSettingsStore } from '@/store/settings-store';

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

/** Cancels all dose notifications and reschedules every pending future dose with current settings. */
export async function rescheduleAllFutureNotifications(): Promise<void> {
  const settings = useSettingsStore.getState();
  await cancelAllDoseNotifications();
  const pending = getPendingDoseLogsWithParams(new Date().toISOString());
  await Promise.all(
    pending.map((log) =>
      scheduleNotificationsForDoseLog(buildParams(log, settings)).catch(() => undefined),
    ),
  );
}

/** Cancels and reschedules only one medicine's pending future dose notifications. */
export async function rescheduleNotificationsForMedicine(medicineId: string): Promise<void> {
  const settings = useSettingsStore.getState();
  const pending = getPendingDoseLogsWithParams(new Date().toISOString()).filter(
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
