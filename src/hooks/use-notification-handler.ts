import { useCallback, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { NOTIFICATION_ACTIONS } from '@/lib/constants';
import {
  cancelNotificationsForDoseLog,
  scheduleSnoozeNotification,
} from '@/services/notification-service';
import { useDoseStore } from '@/store/dose-store';
import { useSettingsStore } from '@/store/settings-store';

// Prevents the same notification response from being processed twice within a session.
const processedIds = new Set<string>();

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
  // Default tap (open app): pre-scheduled nag chain continues on its own.
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

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, [handleResponse]);
}
