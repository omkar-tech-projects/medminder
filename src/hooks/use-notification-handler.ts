import { useCallback, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { NOTIFICATION_ACTIONS } from '@/lib/constants';
import {
  cancelNotificationsForDoseLog,
  scheduleSnoozeNotification,
} from '@/services/notification-service';
import { useDoseStore } from '@/store/dose-store';
import { useSettingsStore } from '@/store/settings-store';

export async function processResponse(response: Notifications.NotificationResponse): Promise<void> {
  const data = response.notification.request.content.data ?? {};
  const doseLogId = typeof data['doseLogId'] === 'string' ? data['doseLogId'] : null;
  const isTest = data['isTest'] === true;

  if (isTest || !doseLogId) return;

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
  const handleResponse = useCallback((response: Notifications.NotificationResponse): void => {
    void processResponse(response);
  }, []);

  useEffect(() => {
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, [handleResponse]);
}
