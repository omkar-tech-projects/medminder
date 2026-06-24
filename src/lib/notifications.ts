import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NOTIFICATION_CHANNELS, NOTIFICATION_CATEGORY, NOTIFICATION_ACTIONS } from './constants';

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.DOSE_REMINDERS, {
      name: 'Dose Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.REFILL_ALERTS, {
      name: 'Refill Alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
    {
      identifier: NOTIFICATION_ACTIONS.MARK_TAKEN,
      buttonTitle: 'Mark Taken',
      options: { isDestructive: false, isAuthenticationRequired: false },
    },
    {
      identifier: NOTIFICATION_ACTIONS.SNOOZE,
      buttonTitle: 'Snooze 5 min',
      options: { isDestructive: false, isAuthenticationRequired: false },
    },
  ]);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status === 'granted';
}

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
