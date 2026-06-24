import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { format } from 'date-fns';
import { Screen, AppHeader, Button, Text, Card } from '@/components';
import { useTheme } from '@/theme';
import { useToast } from '@/store/ui-store';
import { requestNotificationPermissions } from '@/lib/notifications';
import {
  scheduleTestNotification,
  cancelAllDoseNotifications,
} from '@/services/notification-service';

interface ScheduledItem {
  id: string;
  title: string | null | undefined;
  body: string | null | undefined;
  fireDate: string;
}

function triggerToDate(trigger: Notifications.NotificationTrigger | null): number {
  if (trigger == null) return 0;
  if ('date' in trigger && trigger.date != null) return Number(trigger.date);
  return 0;
}

function triggerLabel(trigger: Notifications.NotificationTrigger | null): string {
  if (trigger == null) return '—';
  if ('date' in trigger && trigger.date != null) {
    try {
      return format(new Date(Number(trigger.date)), 'MMM d HH:mm:ss');
    } catch {
      return String(trigger.date);
    }
  }
  if ('seconds' in trigger) return `in ${String(trigger.seconds)}s`;
  return '—';
}

export default function DebugScreen() {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<string>('checking…');

  const refresh = useCallback(async (): Promise<void> => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);

    const all = await Notifications.getAllScheduledNotificationsAsync();
    const sorted = [...all].sort((a, b) => triggerToDate(a.trigger) - triggerToDate(b.trigger));
    setItems(
      sorted.map((n) => ({
        id: n.identifier,
        title: n.content.title,
        body: n.content.body,
        fireDate: triggerLabel(n.trigger),
      })),
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleTest = async (): Promise<void> => {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      toast.error('Notification permission denied');
      return;
    }
    await scheduleTestNotification();
    toast.success('Test notification fires in 3 seconds');
    void refresh();
  };

  const handleCancelAll = async (): Promise<void> => {
    await cancelAllDoseNotifications();
    toast.success('All scheduled notifications cancelled');
    void refresh();
  };

  return (
    <Screen edges={['top']} contentContainerStyle={{ paddingBottom: 48 }}>
      <AppHeader
        title="Developer"
        leftAction={{
          icon: 'arrow-back',
          onPress: () => router.back(),
          accessibilityLabel: 'Close developer screen',
        }}
      />

      <View style={[styles.actions, { paddingHorizontal: spacing[5] }]}>
        <Text variant="caption" color={colors.textSecondary} style={styles.statusLine}>
          Permission: {permissionStatus}
        </Text>

        <Button
          label="Fire test notification (3 s)"
          onPress={() => {
            void handleTest();
          }}
          variant="primary"
          fullWidth
          leftIcon="notifications-outline"
          accessibilityLabel="Schedule a test notification that fires in 3 seconds"
        />
        <Button
          label="Cancel all notifications"
          onPress={() => {
            void handleCancelAll();
          }}
          variant="secondary"
          fullWidth
          leftIcon="close-circle-outline"
          style={{ marginTop: spacing[3] }}
          accessibilityLabel="Cancel every scheduled notification"
        />
        <Button
          label="Refresh list"
          onPress={() => {
            void refresh();
          }}
          variant="ghost"
          fullWidth
          leftIcon="refresh-outline"
          style={{ marginTop: spacing[2] }}
          accessibilityLabel="Reload the scheduled notification list"
        />
      </View>

      <View style={[styles.listHeader, { paddingHorizontal: spacing[5] }]}>
        <Text variant="overline" color={colors.textTertiary}>
          Scheduled — {items.length}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingHorizontal: spacing[5] }]}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 && (
          <Text variant="bodySmall" color={colors.textTertiary} style={styles.empty}>
            No notifications scheduled
          </Text>
        )}
        {items.map((item) => (
          <Card key={item.id} style={styles.card} elevated={false}>
            <Text variant="labelSmall" color={colors.brandPrimary} numberOfLines={1}>
              {item.fireDate}
            </Text>
            <Text variant="bodySmall" numberOfLines={1}>
              {item.title ?? '—'}
            </Text>
            <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {item.body ?? '—'}
            </Text>
            <Text variant="caption" color={colors.textTertiary} numberOfLines={1} style={styles.id}>
              {item.id}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { paddingTop: 8, paddingBottom: 16 },
  statusLine: { marginBottom: 12 },
  listHeader: { paddingBottom: 8 },
  list: { gap: 8, paddingBottom: 24 },
  empty: { textAlign: 'center', marginTop: 32 },
  card: {
    padding: 12,
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  id: { marginTop: 2, fontVariant: ['tabular-nums'] },
});
