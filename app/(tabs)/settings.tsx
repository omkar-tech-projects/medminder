import { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import {
  Screen,
  AppHeader,
  ListItem,
  Text,
  CalendarSyncSection,
  RefillSettingsSheet,
  NotificationSettingsSheet,
  ThemeSheet,
  ProfileSwitcherSheet,
} from '@/components';
import { useTheme } from '@/theme';
import { useSettingsStore } from '@/store/settings-store';
import { useProfileStore } from '@/store/profile-store';
import { rescheduleAllFutureNotifications } from '@/services/reschedule-service';

export default function SettingsScreen() {
  const { colors, spacing } = useTheme();
  const s = useSettingsStore();
  const profiles = useProfileStore((st) => st.profiles);
  const activeProfileId = useProfileStore((st) => st.activeProfileId);
  const activeName = useProfileStore((st) => st.name);

  const [notifSheetOpen, setNotifSheetOpen] = useState(false);
  const [refillSheetOpen, setRefillSheetOpen] = useState(false);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const themeLabel = s.theme === 'light' ? 'Light' : s.theme === 'dark' ? 'Dark' : 'System';
  const nameLabel = activeName.trim().length > 0 ? activeName : 'Not set';

  function handleResetAll(): void {
    Alert.alert(
      'Reset all settings?',
      'This restores every setting to its default value. Your medication data is not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            s.resetToDefaults();
            void rescheduleAllFutureNotifications().catch(() => undefined);
          },
        },
      ],
    );
  }

  return (
    <Screen scroll edges={['top']}>
      <AppHeader title="Settings" />

      {/* Profiles & Caregivers */}
      <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
        <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
          Profiles & Caregivers
        </Text>
        <ListItem
          title="Manage profiles"
          subtitle={
            profiles.length > 1
              ? `${profiles.length} people · active: ${profiles.find((p) => p.id === activeProfileId)?.name ?? ''}`
              : nameLabel
          }
          leftIcon="people-outline"
          showChevron
          onPress={() => setProfileSheetOpen(true)}
        />
      </View>

      {/* Notifications */}
      <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
        <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
          Notifications
        </Text>
        <View style={{ gap: 8 }}>
          <ListItem
            title="Reminders"
            subtitle={`Lead ${s.notificationLeadMin}m · Re-remind ${s.reRemindIntervalMin}m · Max ${s.maxNags} · Snooze ${s.snoozeDurationMin}m · Quiet ${s.quietHoursEnabled ? `${s.quietHoursStart}–${s.quietHoursEnd}` : 'off'}`}
            leftIcon="notifications-outline"
            showChevron
            onPress={() => setNotifSheetOpen(true)}
          />
          <ListItem
            title="Refill alerts"
            subtitle={`Course: ${s.refillWarningDays}d before end · Stock: ${s.lowStockWarningDays}d remaining`}
            leftIcon="alarm-outline"
            showChevron
            onPress={() => setRefillSheetOpen(true)}
          />
        </View>
      </View>

      {/* Appearance */}
      <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
        <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
          Appearance
        </Text>
        <ListItem
          title="Theme"
          subtitle={themeLabel}
          leftIcon="contrast-outline"
          showChevron
          onPress={() => setThemeSheetOpen(true)}
        />
      </View>

      {/* Calendar */}
      <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
        <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
          Calendar
        </Text>
        <CalendarSyncSection />
      </View>

      {/* Data & Privacy */}
      <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
        <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
          Data & Privacy
        </Text>
        <View style={{ gap: 8 }}>
          <ListItem
            title="Claude API key"
            subtitle="Required for prescription scanning"
            leftIcon="key-outline"
            showChevron
            onPress={() => undefined}
          />
          <ListItem
            title="Export data"
            subtitle="Download your full history as JSON"
            leftIcon="download-outline"
            showChevron
            onPress={() => undefined}
          />
          <ListItem
            title="Reset all settings"
            subtitle="Restore every setting to its default value"
            leftIcon="refresh-outline"
            showChevron
            onPress={handleResetAll}
          />
          <ListItem
            title="Clear all data"
            subtitle="Permanently delete all medications and history"
            leftIcon="trash-outline"
            showChevron
            onPress={() => undefined}
            destructive
          />
        </View>
      </View>

      {__DEV__ && (
        <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
          <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
            Developer
          </Text>
          <View style={{ gap: 8 }}>
            <ListItem
              title="Test notifications"
              subtitle="Fire a test dose reminder, inspect scheduled queue"
              leftIcon="notifications-outline"
              showChevron
              onPress={() => router.push('/debug' as never)}
            />
            <ListItem
              title="Component Gallery"
              subtitle="Preview all UI components"
              leftIcon="flask-outline"
              showChevron
              onPress={() => router.push('/gallery')}
            />
          </View>
        </View>
      )}

      <View style={{ height: spacing[8] }} />

      <NotificationSettingsSheet
        visible={notifSheetOpen}
        onClose={() => setNotifSheetOpen(false)}
      />
      <RefillSettingsSheet visible={refillSheetOpen} onClose={() => setRefillSheetOpen(false)} />
      <ThemeSheet visible={themeSheetOpen} onClose={() => setThemeSheetOpen(false)} />
      <ProfileSwitcherSheet visible={profileSheetOpen} onClose={() => setProfileSheetOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  sectionLabel: { marginBottom: 10 },
});
