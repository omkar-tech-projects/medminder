import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { NOTIFICATION_ACTIONS, DOSE_STATUS, PRE_SCHEDULED_NAGS } from '@/lib/constants';
import {
  cancelNotificationsForDoseLog,
  scheduleSnoozeNotification,
  scheduleNextNagForDoseLog,
} from '@/services/notification-service';
import { getDoseLogStatus } from '@/db/queries/dose-logs';
import { useDoseStore } from '@/store/dose-store';
import { useSettingsStore } from '@/store/settings-store';

// Prevents the same notification response from being processed twice within a session.
const processedIds = new Set<string>();
// Prevents double-chaining when a nag is received more than once (defensive).
const chainedNags = new Set<string>();

/** Converts expo-notifications date (seconds on iOS, ms on Android) to milliseconds. */
function notificationDateMs(date: number): number {
  // expo-notifications normalises to seconds on iOS; heuristic: values < 1e11 are seconds.
  return date < 1e11 ? date * 1000 : date;
}

export async function processResponse(response: Notifications.NotificationResponse): Promise<void> {
  const data = response.notification.request.content.data ?? {};
  const doseLogId = typeof data['doseLogId'] === 'string' ? data['doseLogId'] : null;
  const isTest = data['isTest'] === true;

  if (isTest || !doseLogId) return;

  // Guard: ignore responses that were already handled this session.
  const responseId = `${response.notification.request.identifier}:${response.actionIdentifier}`;
  if (processedIds.has(responseId)) return;
  processedIds.add(responseId);

  // Always dismiss the delivered notification from the system tray when the user acts on it.
  await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(
    () => undefined,
  );

  if (response.actionIdentifier === NOTIFICATION_ACTIONS.MARK_TAKEN) {
    useDoseStore.getState().markTaken(doseLogId, 'notification');
    void cancelNotificationsForDoseLog(doseLogId);
  } else if (response.actionIdentifier === NOTIFICATION_ACTIONS.SNOOZE) {
    await cancelNotificationsForDoseLog(doseLogId);
    const {
      snoozeDurationMin,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      notificationSoundEnabled,
    } = useSettingsStore.getState();
    const medicineName = typeof data['medicineName'] === 'string' ? data['medicineName'] : '';
    const dosage = typeof data['dosage'] === 'string' ? data['dosage'] : '';
    await scheduleSnoozeNotification({
      doseLogId,
      medicineName,
      dosage,
      snoozeMinutes: snoozeDurationMin,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      soundEnabled: notificationSoundEnabled,
    });
  }
  // Default tap (open app): nag chain continues via scheduleWindowNotifications re-arm.
}

/**
 * Chains the next nag when a nag notification fires in the foreground and the
 * dose is still pending. This keeps pre-scheduled alarms at ≤2 per dose while
 * still delivering the full nag chain (up to maxNags) when the app is active.
 * When the app is backgrounded, the gap is closed by scheduleWindowNotifications
 * called in the AppState 'active' handler in _layout.tsx.
 */
async function handleNagChain(notification: Notifications.Notification): Promise<void> {
  const data = notification.request.content.data ?? {};
  const doseLogId = typeof data['doseLogId'] === 'string' ? data['doseLogId'] : null;
  const nagIndex = typeof data['nagIndex'] === 'number' ? data['nagIndex'] : null;
  const maxNags = typeof data['maxNags'] === 'number' ? data['maxNags'] : null;
  const nagIntervalMinutes =
    typeof data['nagIntervalMinutes'] === 'number' ? data['nagIntervalMinutes'] : null;

  if (!doseLogId || nagIndex === null || maxNags === null || nagIntervalMinutes === null) return;

  // NAGS ARE 1-BASED (lead=0, nag 1 at doseTime, nag k at doseTime+(k-1)×interval).
  // Nags 1 … PRE_SCHEDULED_NAGS are pre-scheduled as real Android alarms — they
  // fire even when the app is killed, so the next one is already in the alarm
  // manager and we must NOT chain it again from here.
  //
  // Decision table (PRE_SCHEDULED_NAGS = 3):
  //   nag 1 fires (nagIndex=1): 1<3 → skip  (nag 2 already scheduled)
  //   nag 2 fires (nagIndex=2): 2<3 → skip  (nag 3 already scheduled)
  //   nag 3 fires (nagIndex=3): 3<3 → FALSE → chain nag 4  ← handoff point
  //   nag 4 fires (nagIndex=4): 4<3 → FALSE → chain nag 5  (foreground only)
  if (__DEV__) {
    const nextIsPreScheduled = nagIndex < PRE_SCHEDULED_NAGS;
    console.log(
      `[nag-chain] nag ${nagIndex} received for ${doseLogId}` +
        ` | next=${nagIndex + 1}` +
        ` | action=${nextIsPreScheduled ? `skip (nag ${nagIndex + 1} already pre-scheduled)` : `chain nag ${nagIndex + 1}`}`,
    );
  }
  if (nagIndex < PRE_SCHEDULED_NAGS) return;

  // Guard against double-chaining the same nag index this session.
  // e.g. if nag 3 somehow delivers twice, chainedNags blocks the second scheduling.
  const chainKey = `${doseLogId}:${nagIndex}`;
  if (chainedNags.has(chainKey)) {
    if (__DEV__) console.log(`[nag-chain] skip duplicate chain for ${chainKey}`);
    return;
  }
  chainedNags.add(chainKey);

  // Only continue the chain if the dose is still pending (user hasn't taken it).
  const status = getDoseLogStatus(doseLogId);
  if (status !== DOSE_STATUS.PENDING) {
    if (__DEV__) console.log(`[nag-chain] dose ${doseLogId} is ${status ?? 'null'}, stopping chain`);
    return;
  }

  const medicineName = typeof data['medicineName'] === 'string' ? data['medicineName'] : '';
  const dosage = typeof data['dosage'] === 'string' ? data['dosage'] : '';
  const { quietHoursEnabled, quietHoursStart, quietHoursEnd, notificationSoundEnabled } =
    useSettingsStore.getState();

  await scheduleNextNagForDoseLog({
    doseLogId,
    medicineName,
    dosage,
    nagIndex,
    maxNags,
    nagIntervalMinutes,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
    soundEnabled: notificationSoundEnabled,
  });
}

export function useNotificationHandler(): void {
  // Track whether getLastNotificationResponseAsync has already been processed this session.
  const lastResponseHandled = useRef(false);

  const handleResponse = useCallback((response: Notifications.NotificationResponse): void => {
    void processResponse(response);
  }, []);

  useEffect(() => {
    if (lastResponseHandled.current) return;
    lastResponseHandled.current = true;

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;

      // Only replay responses received within the last 2 hours.
      // This prevents stale "Mark Taken" actions from previous sessions being replayed.
      const ageMs = Date.now() - notificationDateMs(response.notification.date);
      if (ageMs > 2 * 60 * 60 * 1000) return;

      handleResponse(response);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(handleResponse);

    // Chain the next nag when a nag fires while the app is in the foreground.
    // On Android, addNotificationReceivedListener only fires in the foreground;
    // background gaps are covered by scheduleWindowNotifications on AppState active.
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      void handleNagChain(notification);
    });

    return () => {
      responseSub.remove();
      receivedSub.remove();
    };
  }, [handleResponse]);
}
