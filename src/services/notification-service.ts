import * as Notifications from 'expo-notifications';
import { parseISO, subMinutes, addMinutes } from 'date-fns';
import { NOTIFICATION_CATEGORY, NOTIFICATION_CHANNELS } from '@/lib/constants';

// iOS caps scheduled notifications at 64. With maxNags=24 each dose needs 25 slots,
// giving ~2 doses of full coverage before the platform silently drops extras.
// Android imposes no comparable limit. Tune maxNags per schedule row to balance
// coverage depth against breadth, or add a foreground-rescheduling step (post-MVP).

export interface DoseNotificationParams {
  doseLogId: string;
  medicineName: string;
  dosage: string; // e.g. "500 mg"
  scheduledAt: string; // 'YYYY-MM-DDTHH:mm:00' local time (no Z suffix)
  leadMinutes: number;
  nagIntervalMinutes: number;
  maxNags: number;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string; // 'HH:MM'
  quietHoursEnd?: string; // 'HH:MM'
  soundEnabled?: boolean;
}

// Identifier scheme: `${doseLogId}:${index}`
//   0          = lead reminder (fires leadMinutes before doseTime)
//   1 … maxNags = nag chain (index 1 at doseTime, 2 at doseTime+interval, …)
function nagId(doseLogId: string, index: number): string {
  return `${doseLogId}:${index}`;
}

/** If `time` falls inside the quiet window, returns the next quiet-hours end time. */
function shiftOutOfQuietHours(time: Date, quietStart: string, quietEnd: string): Date {
  const parseHM = (s: string): number => {
    const parts = s.split(':');
    return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
  };
  const startMin = parseHM(quietStart);
  const endMin = parseHM(quietEnd);
  const timeMin = time.getHours() * 60 + time.getMinutes();

  const isOvernight = startMin > endMin; // e.g. 22:00 > 07:00
  const inQuiet = isOvernight
    ? timeMin >= startMin || timeMin < endMin
    : timeMin >= startMin && timeMin < endMin;

  if (!inQuiet) return time;

  const endParts = quietEnd.split(':');
  const shifted = new Date(time);
  shifted.setHours(Number(endParts[0]) || 7, Number(endParts[1]) || 0, 0, 0);
  if (shifted <= time) shifted.setDate(shifted.getDate() + 1);
  return shifted;
}

async function hasPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function scheduleNotificationsForDoseLog(
  params: DoseNotificationParams,
): Promise<void> {
  if (!(await hasPermission())) return;

  const {
    doseLogId,
    medicineName,
    dosage,
    scheduledAt,
    leadMinutes,
    nagIntervalMinutes,
    maxNags,
    quietHoursEnabled = true,
    quietHoursStart = '22:00',
    quietHoursEnd = '07:00',
    soundEnabled = true,
  } = params;

  const now = new Date();
  const doseTime = parseISO(scheduledAt); // treated as local time (no Z)
  const channelId = NOTIFICATION_CHANNELS.DOSE_REMINDERS;
  const promises: Promise<string>[] = [];

  const maybeShift = (t: Date): Date =>
    quietHoursEnabled ? shiftOutOfQuietHours(t, quietHoursStart, quietHoursEnd) : t;

  // ── Lead reminder (index 0) ──────────────────────────────────────────────
  const leadTime = maybeShift(subMinutes(doseTime, leadMinutes));
  if (leadTime > now) {
    promises.push(
      Notifications.scheduleNotificationAsync({
        identifier: nagId(doseLogId, 0),
        content: {
          title: 'Upcoming dose',
          body: `${medicineName} in ${leadMinutes} min`,
          categoryIdentifier: NOTIFICATION_CATEGORY,
          data: { doseLogId, medicineName, dosage },
          sound: soundEnabled,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: leadTime,
          channelId,
        },
      }),
    );
  }

  // ── Nag chain (indices 1 … maxNags) ─────────────────────────────────────
  // Index 1 fires at doseTime (the "it's time" notification).
  // Each subsequent index fires nagIntervalMinutes later.
  for (let i = 0; i < maxNags; i++) {
    const nagTime = maybeShift(addMinutes(doseTime, i * nagIntervalMinutes));
    if (nagTime > now) {
      promises.push(
        Notifications.scheduleNotificationAsync({
          identifier: nagId(doseLogId, i + 1),
          content: {
            title: `Time for ${medicineName}`,
            body: dosage,
            categoryIdentifier: NOTIFICATION_CATEGORY,
            data: { doseLogId, medicineName, dosage },
            sound: soundEnabled,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: nagTime,
            channelId,
          },
        }),
      );
    }
  }

  await Promise.all(promises);
}

// Cancel every lead + nag notification for one dose log by prefix-matching identifiers.
export async function cancelNotificationsForDoseLog(doseLogId: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = `${doseLogId}:`;
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function cancelAllDoseNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleRefillWarningNotification(params: {
  medicineId: string;
  medicineName: string;
  endDate: string;
  triggerDate: Date;
}): Promise<void> {
  if (!(await hasPermission())) return;
  await Notifications.scheduleNotificationAsync({
    identifier: `refill:${params.medicineId}:course`,
    content: {
      title: 'Course ending soon',
      body: `Your course of ${params.medicineName} ends on ${params.endDate}.`,
      data: { medicineId: params.medicineId, type: 'refill-warning' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: params.triggerDate,
      channelId: NOTIFICATION_CHANNELS.REFILL_ALERTS,
    },
  });
}

export async function scheduleRefillReminderNotification(params: {
  medicineId: string;
  medicineName: string;
  remindAt: Date;
}): Promise<void> {
  if (!(await hasPermission())) return;
  if (params.remindAt <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: `refill:${params.medicineId}:reminder`,
    content: {
      title: 'Refill reminder',
      body: `Time to refill ${params.medicineName}.`,
      data: { medicineId: params.medicineId, type: 'refill-reminder' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: params.remindAt,
      channelId: NOTIFICATION_CHANNELS.REFILL_ALERTS,
    },
  });
}

export async function cancelRefillNotificationsForMedicine(medicineId: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = `refill:${medicineId}:`;
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export interface SnoozeNotificationParams {
  doseLogId: string;
  medicineName: string;
  dosage: string;
  snoozeMinutes: number;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  soundEnabled?: boolean;
}

export async function scheduleSnoozeNotification(params: SnoozeNotificationParams): Promise<void> {
  if (!(await hasPermission())) return;
  const {
    doseLogId,
    medicineName,
    dosage,
    snoozeMinutes,
    quietHoursEnabled = true,
    quietHoursStart = '22:00',
    quietHoursEnd = '07:00',
    soundEnabled = true,
  } = params;
  const fireAt = addMinutes(new Date(), snoozeMinutes);
  const shifted = quietHoursEnabled
    ? shiftOutOfQuietHours(fireAt, quietHoursStart, quietHoursEnd)
    : fireAt;
  await Notifications.scheduleNotificationAsync({
    identifier: `${doseLogId}:snooze`,
    content: {
      title: `Time for ${medicineName}`,
      body: dosage,
      categoryIdentifier: NOTIFICATION_CATEGORY,
      data: { doseLogId, medicineName, dosage },
      sound: soundEnabled,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: shifted,
      channelId: NOTIFICATION_CHANNELS.DOSE_REMINDERS,
    },
  });
}

// Schedules a single test notification 3 seconds from now.
export async function scheduleTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: 'debug:test',
    content: {
      title: 'Test notification',
      body: 'MedMinder dose reminder — working!',
      categoryIdentifier: NOTIFICATION_CATEGORY,
      data: { doseLogId: 'test', isTest: true },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: NOTIFICATION_CHANNELS.DOSE_REMINDERS,
    },
  });
}
