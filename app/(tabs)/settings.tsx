import { useState } from 'react';
import { View, Alert, Switch, StyleSheet, Share, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import { format } from 'date-fns';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
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
import { useAppLockStore } from '@/store/app-lock-store';
import { rescheduleAllFutureNotifications } from '@/services/reschedule-service';
import { scheduleTestNotification, hasExactAlarmPermission } from '@/services/notification-service';
import { getAllMedicines, deleteMedicine } from '@/db/queries/medicines';
import { getAllDoseLogsForProfile } from '@/db/queries/dose-logs';
import { useMedicationStore } from '@/store/medication-store';
import { useDoseStore } from '@/store/dose-store';

export default function SettingsScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();
  const s = useSettingsStore();
  const profiles = useProfileStore((st) => st.profiles);
  const activeProfileId = useProfileStore((st) => st.activeProfileId);
  const activeName = useProfileStore((st) => st.name);

  const { biometricEnabled, setBiometricEnabled } = useAppLockStore();

  const [notifSheetOpen, setNotifSheetOpen] = useState(false);
  const [refillSheetOpen, setRefillSheetOpen] = useState(false);
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const themeLabel =
    s.theme === 'light'
      ? t('settings.themeLight')
      : s.theme === 'dark'
        ? t('settings.themeDark')
        : t('settings.themeSystem');

  const nameLabel = activeName.trim().length > 0 ? activeName : 'Not set';

  async function handleSendTestNotification(): Promise<void> {
    // On Android 12 (API 31-32), SCHEDULE_EXACT_ALARM needs a manual user grant.
    // TIME_INTERVAL triggers don't require exact alarms, so the test notification
    // itself will fire regardless — but we still surface the permission gap here
    // so the user can fix it before real dose reminders are affected.
    if (Platform.OS === 'android') {
      const exactOk = await hasExactAlarmPermission();
      if (!exactOk) {
        Alert.alert(t('settings.alarmPermTitle'), t('settings.alarmPermBody'), [
          { text: t('settings.alarmPermLater'), style: 'cancel' },
          {
            text: t('settings.alarmPermOpenSettings'),
            onPress: () => void Linking.openSettings(),
          },
        ]);
        return;
      }
    }
    try {
      await scheduleTestNotification();
      Alert.alert(t('settings.testNotifSentTitle'), t('settings.testNotifSentBody'));
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to schedule notification');
    }
  }

  function handleResetAll(): void {
    Alert.alert(t('settings.resetConfirmTitle'), t('settings.resetConfirmBody'), [
      { text: t('settings.resetConfirmCancel'), style: 'cancel' },
      {
        text: t('settings.resetConfirmButton'),
        style: 'destructive',
        onPress: () => {
          s.resetToDefaults();
          void rescheduleAllFutureNotifications().catch(() => undefined);
        },
      },
    ]);
  }

  async function handleExportJson(): Promise<void> {
    if (exporting) return;
    setExporting(true);
    try {
      const meds = getAllMedicines(activeProfileId);
      const logs = getAllDoseLogsForProfile(activeProfileId);
      const payload = JSON.stringify(
        { exportedAt: new Date().toISOString(), medicines: meds, doseLogs: logs },
        null,
        2,
      );
      const filename = `medminder-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      if (Platform.OS === 'ios') {
        const file = new File(Paths.document, filename);
        file.write(payload);
        await Share.share({ url: file.uri, title: filename });
      } else {
        await Share.share({ message: payload, title: filename });
      }
    } catch {
      Alert.alert(t('settings.exportFailed'), t('settings.exportFailedBody'));
    } finally {
      setExporting(false);
    }
  }

  function handleClearData(): void {
    Alert.alert(t('settings.clearConfirmTitle'), t('settings.clearConfirmBody'), [
      { text: t('settings.clearConfirmCancel'), style: 'cancel' },
      {
        text: t('settings.clearConfirmButton'),
        style: 'destructive',
        onPress: () => {
          const meds = getAllMedicines(activeProfileId);
          for (const m of meds) {
            deleteMedicine(m.id);
          }
          useMedicationStore.getState().load();
          useDoseStore.getState().loadForDate(format(new Date(), 'yyyy-MM-dd'));
          router.replace('/(tabs)');
        },
      },
    ]);
  }

  async function handleToggleAppLock(enable: boolean): Promise<void> {
    if (enable) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert(t('appLock.promptMessage'), t('appLock.biometricNotAvailable'));
        return;
      }
      Alert.alert(t('appLock.enableConfirmTitle'), t('appLock.enableConfirmBody'), [
        { text: t('appLock.enableConfirmCancel'), style: 'cancel' },
        {
          text: t('appLock.enableConfirmButton'),
          onPress: async () => {
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: t('appLock.promptMessage'),
              fallbackLabel: t('appLock.fallbackLabel'),
              disableDeviceFallback: false,
            });
            if (result.success) {
              await setBiometricEnabled(true);
            }
          },
        },
      ]);
    } else {
      await setBiometricEnabled(false);
    }
  }

  const profilesSubtitle =
    profiles.length > 1
      ? t('settings.manageProfilesSubtitle_other', { count: profiles.length, name: activeName })
      : nameLabel;

  return (
    <Screen scroll edges={['top']}>
      <AppHeader title={t('settings.title')} />

      {/* Profiles & Caregivers */}
      <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
        <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
          {t('settings.profilesSection')}
        </Text>
        <ListItem
          title={t('settings.manageProfiles')}
          subtitle={profilesSubtitle}
          leftIcon="people-outline"
          showChevron
          onPress={() => setProfileSheetOpen(true)}
          accessibilityLabel={t('settings.manageProfiles')}
        />
      </View>

      {/* Notifications */}
      <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
        <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
          {t('settings.notificationsSection')}
        </Text>
        <View style={{ gap: 8 }}>
          <ListItem
            title={t('settings.remindersItem')}
            subtitle={t('settings.remindersSubtitle', {
              lead: s.notificationLeadMin,
              nag: s.reRemindIntervalMin,
              max: s.maxNags,
              snooze: s.snoozeDurationMin,
              quiet: s.quietHoursEnabled
                ? `${s.quietHoursStart}–${s.quietHoursEnd}`
                : t('settings.quietOff'),
            })}
            leftIcon="notifications-outline"
            showChevron
            onPress={() => setNotifSheetOpen(true)}
            accessibilityLabel={t('settings.remindersItem')}
          />
          <ListItem
            title={t('settings.refillAlertsItem')}
            subtitle={t('settings.refillSubtitle', {
              course: s.refillWarningDays,
              stock: s.lowStockWarningDays,
            })}
            leftIcon="alarm-outline"
            showChevron
            onPress={() => setRefillSheetOpen(true)}
            accessibilityLabel={t('settings.refillAlertsItem')}
          />
          <ListItem
            title={t('settings.sendTestNotif')}
            subtitle={t('settings.sendTestNotifSubtitle')}
            leftIcon="paper-plane-outline"
            showChevron
            onPress={() => void handleSendTestNotification()}
            accessibilityLabel={t('settings.sendTestNotif')}
          />
        </View>
      </View>

      {/* Appearance */}
      <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
        <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
          {t('settings.appearanceSection')}
        </Text>
        <ListItem
          title={t('settings.themeItem')}
          subtitle={themeLabel}
          leftIcon="contrast-outline"
          showChevron
          onPress={() => setThemeSheetOpen(true)}
          accessibilityLabel={t('settings.themeItem')}
        />
      </View>

      {/* Calendar */}
      <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
        <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
          {t('settings.calendarSection')}
        </Text>
        <CalendarSyncSection />
      </View>

      {/* Security */}
      <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
        <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
          {t('settings.securitySection')}
        </Text>
        <View
          style={[
            styles.toggleRow,
            {
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: spacing[4],
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.toggleLabel}>
            <Text variant="bodyMedium">{t('settings.appLockItem')}</Text>
            <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
              {t('settings.appLockSubtitle')}
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={(v) => void handleToggleAppLock(v)}
            accessibilityLabel={t('settings.appLockItem')}
            accessibilityHint={t('settings.appLockSubtitle')}
            accessibilityState={{ checked: biometricEnabled }}
          />
        </View>
      </View>

      {/* Data & Privacy */}
      <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
        <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
          {t('settings.dataPrivacySection')}
        </Text>
        <View style={{ gap: 8 }}>
          <ListItem
            title={exporting ? t('settings.exporting') : t('settings.exportData')}
            subtitle={t('settings.exportDataSubtitle')}
            leftIcon="download-outline"
            showChevron
            onPress={() => void handleExportJson()}
            accessibilityLabel={t('settings.exportData')}
          />
          <ListItem
            title={t('settings.privacyPolicy')}
            subtitle={t('settings.privacyPolicySubtitle')}
            leftIcon="shield-checkmark-outline"
            showChevron
            onPress={() => router.push('/privacy')}
            accessibilityLabel={t('settings.privacyPolicy')}
          />
          <ListItem
            title={t('settings.resetSettings')}
            subtitle={t('settings.resetSettingsSubtitle')}
            leftIcon="refresh-outline"
            showChevron
            onPress={handleResetAll}
            accessibilityLabel={t('settings.resetSettings')}
          />
          <ListItem
            title={t('settings.clearData')}
            subtitle={t('settings.clearDataSubtitle')}
            leftIcon="trash-outline"
            showChevron
            onPress={handleClearData}
            destructive
            accessibilityLabel={t('settings.clearData')}
          />
        </View>
      </View>

      {__DEV__ && (
        <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
          <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
            {t('settings.developerSection')}
          </Text>
          <View style={{ gap: 8 }}>
            <ListItem
              title={t('settings.testNotifications')}
              subtitle={t('settings.testNotificationsSubtitle')}
              leftIcon="notifications-outline"
              showChevron
              onPress={() => router.push('/debug' as never)}
              accessibilityLabel={t('settings.testNotifications')}
            />
            <ListItem
              title={t('settings.componentGallery')}
              subtitle={t('settings.componentGallerySubtitle')}
              leftIcon="flask-outline"
              showChevron
              onPress={() => router.push('/gallery')}
              accessibilityLabel={t('settings.componentGallery')}
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
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  toggleLabel: { flex: 1, marginRight: 12 },
});
