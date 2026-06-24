import { useCallback, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { NOTIFICATION_ACTIONS } from '@/lib/constants';
import { cancelNotificationsForDoseLog } from '@/services/notification-service';
import { useDoseStore } from '@/store/dose-store';

function processResponse(response: Notifications.NotificationResponse): void {
  const data = response.notification.request.content.data ?? {};
  const doseLogId = typeof data['doseLogId'] === 'string' ? data['doseLogId'] : null;
  const isTest = data['isTest'] === true;

  if (isTest || !doseLogId) return;

  if (response.actionIdentifier === NOTIFICATION_ACTIONS.MARK_TAKEN) {
    // Write to DB + update in-memory store so the UI reflects the change immediately.
    useDoseStore.getState().markTaken(doseLogId, 'notification');
    void cancelNotificationsForDoseLog(doseLogId);
  }
  // SNOOZE or default tap (open app): pre-scheduled nag chain continues on its own.
}

export function useNotificationHandler(): void {
  const handleResponse = useCallback((response: Notifications.NotificationResponse): void => {
    processResponse(response);
  }, []);

  useEffect(() => {
    // Handle the response that brought the app out of a killed state.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    // Handle responses while app is running (foreground or background).
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, [handleResponse]);
}
