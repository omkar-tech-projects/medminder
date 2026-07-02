import * as Notifications from 'expo-notifications';
import { Platform, PermissionsAndroid } from 'react-native';
import { parseISO, subMinutes, addMinutes } from 'date-fns';
import { NOTIFICATION_CATEGORY, NOTIFICATION_CHANNELS, PRE_SCHEDULED_NAGS } from '@/lib/constants';

// iOS notification titles are hard-truncated by the OS at ~75 chars, but UX
// degrades long before that. Cap medicine names so titles stay scannable.
const MEDICINE_NAME_MAX = 40;
function truncateName(name: string): string {
  return name.length > MEDICINE_NAME_MAX ? `${name.slice(0, MEDICINE_NAME_MAX - 1)}…` : name;
}

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

// Notification identifier scheme: `${doseLogId}:${index}`
//
//   NAGS ARE 1-BASED.
//   0   = lead reminder   fires at doseTime − leadMinutes
//   1   = nag 1           fires at doseTime + (1−1)×interval  = doseTime
//   2   = nag 2           fires at doseTime + (2−1)×interval
//   k   = nag k           fires at doseTime + (k−1)×interval
//
// Nags 1 … PRE_SCHEDULED_NAGS are real Android alarms (fire even when app is
// killed). Nags > PRE_SCHEDULED_NAGS are chained dynamically when the prior nag
// fires while the app is in the foreground (addNotificationReceivedListener).
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
  if (status !== 'granted') return false;
  // Android 12 (API 31-32): SCHEDULE_EXACT_ALARM requires explicit user grant.
  // Android 13+ (API 33+): USE_EXACT_ALARM is auto-granted at install time.
  // On earlier versions or iOS, no extra check is needed.
  if (Platform.OS === 'android') {
    const api = Platform.Version as number;
    if (api >= 31 && api < 33) {
      const exactGranted = await PermissionsAndroid.check(
        'android.permission.SCHEDULE_EXACT_ALARM' as never,
      );
      if (!exactGranted) {
        if (__DEV__) {
          console.warn('[notifications] SCHEDULE_EXACT_ALARM not granted — reminders may be late');
        }
        // Still return true; inexact alarms are better than no alarms.
        // The settings screen provides the user a path to grant the permission.
      }
    }
  }
  return true;
}

/** Returns true if the exact alarm permission is granted (or not needed on this OS/version). */
export async function hasExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const api = Platform.Version as number;
  if (api < 31) return true; // not required before Android 12
  if (api >= 33) return true; // USE_EXACT_ALARM auto-granted on Android 13+
  return PermissionsAndroid.check('android.permission.SCHEDULE_EXACT_ALARM' as never);
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
  const name = truncateName(medicineName);
  let scheduled = 0;
  let failed = 0;

  if (__DEV__) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nowMs = Date.now();
    console.log(
      `[notif-schedule] ${doseLogId}` +
        `\n  scheduledAt="${scheduledAt}"` +
        `\n  doseTime=${doseTime.toISOString()} (epoch ${doseTime.getTime()})` +
        `\n  now=${new Date(nowMs).toISOString()} (epoch ${nowMs})` +
        `\n  tz="${tz}" lead=${leadMinutes}min nag=${nagIntervalMinutes}min maxNags=${maxNags}`,
    );
  }

  const maybeShift = (t: Date): Date =>
    quietHoursEnabled ? shiftOutOfQuietHours(t, quietHoursStart, quietHoursEnd) : t;

  async function trySchedule(
    req: Parameters<typeof Notifications.scheduleNotificationAsync>[0],
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync(req);
      scheduled++;
    } catch (err) {
      failed++;
      // Always log scheduling failures — the "500 alarms" error is important in production.
      console.warn(`[notifications] scheduleNotificationAsync failed for ${req.identifier}:`, err);
    }
  }

  // ── Lead reminder (index 0) ──────────────────────────────────────────────
  const leadTime = maybeShift(subMinutes(doseTime, leadMinutes));
  if (__DEV__ && leadTime <= now) {
    console.log(`[notif-schedule] ${doseLogId}: skip lead (${leadTime.toISOString()} already past)`);
  }
  if (leadTime > now) {
    await trySchedule({
      identifier: nagId(doseLogId, 0),
      content: {
        title: 'Upcoming dose',
        body: `${name} in ${leadMinutes} min`,
        categoryIdentifier: NOTIFICATION_CATEGORY,
        data: { doseLogId, medicineName, dosage },
        sound: soundEnabled,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: leadTime,
        channelId,
      },
    });
  }

  // ── Pre-scheduled nags (indices 1 … PRE_SCHEDULED_NAGS) ─────────────────
  // These are real Android alarms and fire even when the app is killed.
  // Nag 1 fires at doseTime, nag N fires at doseTime + (N-1)×interval.
  // Nags beyond PRE_SCHEDULED_NAGS are chained dynamically by
  // handleNagChain() in use-notification-handler.ts once the app is active.
  // Alarm budget: PRE_SCHEDULED_NAGS+1 per dose (lead + 3 nags = 4).
  // With 5 meds × 2 doses/day × 48 h = 20 logs × 4 = 80 alarms, well under cap.
  const nagCount = Math.min(maxNags, PRE_SCHEDULED_NAGS);
  for (let nagIdx = 1; nagIdx <= nagCount; nagIdx++) {
    const nagTime = maybeShift(addMinutes(doseTime, (nagIdx - 1) * nagIntervalMinutes));
    if (__DEV__ && nagTime <= now) {
      console.log(`[notif-schedule] ${doseLogId}: skip nag ${nagIdx} (${nagTime.toISOString()} already past)`);
    }
    if (nagTime > now) {
      await trySchedule({
        identifier: nagId(doseLogId, nagIdx),
        content: {
          title: `Time for ${name}`,
          body: dosage,
          categoryIdentifier: NOTIFICATION_CATEGORY,
          data: { doseLogId, medicineName, dosage, nagIndex: nagIdx, maxNags, nagIntervalMinutes },
          sound: soundEnabled,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nagTime,
          channelId,
        },
      });
    }
  }

  if (__DEV__) {
    const exactOk = await hasExactAlarmPermission();
    const all = await Notifications.getAllScheduledNotificationsAsync();
    const doseAlarms = all.filter((n) => n.identifier.startsWith(`${doseLogId}:`));
    console.warn(
      `[notif-schedule] ${doseLogId}: scheduled=${scheduled} failed=${failed}` +
        ` total_queue=${all.length} EXACT_ALARM=${exactOk}`,
    );
    for (const alarm of doseAlarms) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = alarm.trigger as any;
      const fireAt: Date | null =
        t?.date instanceof Date
          ? t.date
          : t?.value != null
            ? new Date(t.value as number)
            : null;
      if (fireAt) {
        console.log(
          `  ${alarm.identifier} → ${fireAt.toISOString()} (epoch ${fireAt.getTime()})`,
        );
      }
    }
  }
}

/**
 * Schedules the next nag in the chain after the previous nag fires.
 * Called from addNotificationReceivedListener in use-notification-handler.ts
 * when a nag fires while the app is in foreground and the dose is still pending.
 * On Android this fires for foreground; background gaps are covered by the
 * scheduleWindowNotifications() re-arm when the app comes to foreground.
 */
export async function scheduleNextNagForDoseLog(params: {
  doseLogId: string;
  medicineName: string;
  dosage: string;
  nagIndex: number;
  maxNags: number;
  nagIntervalMinutes: number;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  soundEnabled?: boolean;
}): Promise<void> {
  const {
    doseLogId,
    medicineName,
    dosage,
    nagIndex,
    maxNags,
    nagIntervalMinutes,
    quietHoursEnabled = true,
    quietHoursStart = '22:00',
    quietHoursEnd = '07:00',
    soundEnabled = true,
  } = params;

  const nextIndex = nagIndex + 1;
  if (nextIndex > maxNags) {
    if (__DEV__) console.log(`[nag-chain] nag ${nagIndex} → cap reached (maxNags=${maxNags}), no nag ${nextIndex}`);
    return;
  }

  if (!(await hasPermission())) return;

  const name = truncateName(medicineName);
  const fireAt = addMinutes(new Date(), nagIntervalMinutes);
  const shifted = quietHoursEnabled
    ? shiftOutOfQuietHours(fireAt, quietHoursStart, quietHoursEnd)
    : fireAt;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: nagId(doseLogId, nextIndex),
      content: {
        title: `Time for ${name}`,
        body: dosage,
        categoryIdentifier: NOTIFICATION_CATEGORY,
        data: { doseLogId, medicineName, dosage, nagIndex: nextIndex, maxNags, nagIntervalMinutes },
        sound: soundEnabled,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: shifted,
        channelId: NOTIFICATION_CHANNELS.DOSE_REMINDERS,
      },
    });
    if (__DEV__) console.log(`[nag-chain] scheduled nag ${nextIndex} for ${doseLogId} at ${shifted.toISOString()}`);
  } catch (err) {
    console.warn(`[notifications] chain nag ${nextIndex} failed for ${doseLogId}:`, err);
  }
}

// Cancel every lead + nag notification for one dose log by prefix-matching identifiers.
export async function cancelNotificationsForDoseLog(doseLogId: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = `${doseLogId}:`;
  const toCancel = all.filter((n) => n.identifier.startsWith(prefix));
  if (__DEV__) {
    console.log(
      `[notifications] cancel ${toCancel.length} alarm(s) for ${doseLogId}:`,
      toCancel.map((n) => n.identifier),
    );
  }
  await Promise.all(toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
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
      body: `Your course of ${truncateName(params.medicineName)} ends on ${params.endDate}.`,
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
      body: `Time to refill ${truncateName(params.medicineName)}.`,
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
      title: `Time for ${truncateName(medicineName)}`,
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

// Schedules a single test notification 60 seconds from now.
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
      seconds: 60,
      channelId: NOTIFICATION_CHANNELS.DOSE_REMINDERS,
    },
  });
}
