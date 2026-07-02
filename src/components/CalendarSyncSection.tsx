import { useState, useEffect, useCallback } from 'react';
import { View, Switch, StyleSheet, ActivityIndicator, Alert, Pressable, AppState, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { ListItem } from './ListItem';
import { Button } from './Button';
import { useTheme } from '@/theme';
import { useSettingsStore } from '@/store/settings-store';
import { useMedicationStore, selectActiveMedications } from '@/store/medication-store';
import { useShallow } from 'zustand/shallow';
import { useCalendarSync } from '@/hooks/use-calendar-sync';
import { connectDeviceCalendar } from '@/services/device-calendar-service';
import {
  signInGoogle,
  signOutGoogle,
  isGoogleConnected,
  getGoogleConnectedEmail,
  GOOGLE_CALENDAR_CONFIGURED,
} from '@/services/google-calendar-service';

export function CalendarSyncSection() {
  const { colors, spacing } = useTheme();
  const calendarSync = useSettingsStore((s) => s.calendarSync);
  const googleCalendarEnabled = useSettingsStore((s) => s.googleCalendarEnabled);
  const deviceCalendarId = useSettingsStore((s) => s.deviceCalendarId);
  const deviceCalendarName = useSettingsStore((s) => s.deviceCalendarName);
  const update = useSettingsStore((s) => s.update);
  const medicines = useMedicationStore(useShallow(selectActiveMedications));
  const { syncAll, desyncAll, syncMedicineToggle } = useCalendarSync();

  const [syncing, setSyncing] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [googleExpanded, setGoogleExpanded] = useState(false);
  // true while waiting for the user to grant calendar permission in system Settings
  const [pendingConnect, setPendingConnect] = useState(false);

  // True when device calendar is both enabled in settings and a calendarId is stored.
  const isDeviceConnected = calendarSync && !!deviceCalendarId;

  useEffect(() => {
    void isGoogleConnected().then((ok) => {
      if (ok) void getGoogleConnectedEmail().then(setConnectedEmail);
    });
  }, [googleCalendarEnabled]);

  // Completes device-calendar connection after the user grants permission in Settings.
  // Called both from handleDeviceConnect and from the AppState foreground listener.
  const tryCompleteConnect = useCallback(async (): Promise<void> => {
    setSyncing(true);
    try {
      const result = await connectDeviceCalendar();
      if (result) {
        setPendingConnect(false);
        update('device_calendar_id', result.calendarId);
        update('device_calendar_name', result.calendarName);
        update('calendar_sync', 'true');
        await syncAll();
      }
      // null = permission still not granted — keep pendingConnect=true, wait for next foreground.
    } catch (err) {
      // Permission was granted but calendar creation failed (all strategies exhausted).
      setPendingConnect(false);
      Alert.alert(
        'Calendar setup failed',
        err instanceof Error ? err.message : 'Could not set up the calendar. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setSyncing(false);
    }
  }, [update, syncAll]);

  // When pendingConnect is true, listen for the app coming back to foreground
  // so we can silently retry after the user grants permission in system Settings.
  useEffect(() => {
    if (!pendingConnect) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void tryCompleteConnect();
      }
    });
    return () => sub.remove();
  }, [pendingConnect, tryCompleteConnect]);

  const handleDeviceConnect = useCallback(async (): Promise<void> => {
    if (connectedEmail) {
      Alert.alert(
        'Disconnect Google Calendar first',
        'Device calendar and Google Calendar sync cannot be active at the same time.',
        [{ text: 'OK' }],
      );
      return;
    }
    setSyncing(true);
    try {
      const result = await connectDeviceCalendar();
      if (!result) {
        // Permission denied — prompt the user to grant it in Settings.
        setPendingConnect(true);
        Alert.alert(
          'Calendar access needed',
          'Allow MedMinder to access your calendar in Settings, then return to this screen — the connection will complete automatically.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setPendingConnect(false) },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ],
        );
        return;
      }
      update('device_calendar_id', result.calendarId);
      update('device_calendar_name', result.calendarName);
      update('calendar_sync', 'true');
      await syncAll();
    } catch (err) {
      // Permission was granted but calendar creation failed.
      Alert.alert(
        'Calendar setup failed',
        err instanceof Error ? err.message : 'Could not set up the calendar. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setSyncing(false);
    }
  }, [connectedEmail, update, syncAll]);

  const handleDeviceDisconnect = useCallback((): void => {
    Alert.alert(
      'Disconnect device calendar?',
      'All MedMinder events will be removed from your calendar.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            setSyncing(true);
            void desyncAll()
              .then(() => {
                update('calendar_sync', 'false');
                update('device_calendar_id', '');
                update('device_calendar_name', '');
              })
              .finally(() => setSyncing(false));
          },
        },
      ],
    );
  }, [desyncAll, update]);

  const handleGoogleSetupInfo = useCallback((): void => {
    Alert.alert(
      'Google Calendar — Setup Required',
      'Direct Google Calendar sync needs a one-time configuration:\n\n' +
        '1. Go to console.cloud.google.com and create a project.\n' +
        '2. Enable "Google Calendar API" under APIs & Services.\n' +
        '3. Create an OAuth 2.0 Client ID:\n' +
        '   • Type: Android\n' +
        '   • Package: com.medminder.app\n' +
        '   • SHA-1: run ./gradlew signingReport\n' +
        '4. Paste the Client ID into:\n' +
        '   src/services/google-calendar-service.ts\n' +
        '   → ANDROID_CLIENT_ID\n' +
        '5. Rebuild the app.\n\n' +
        'Tip: "Connect to device calendar" above works without any setup.',
      [{ text: 'Got it' }],
    );
  }, []);

  const handleGoogleConnect = useCallback(async (): Promise<void> => {
    if (isDeviceConnected) {
      Alert.alert(
        'Disconnect device calendar first',
        'Device calendar and Google Calendar sync cannot be active at the same time.',
        [{ text: 'OK' }],
      );
      return;
    }
    setGoogleBusy(true);
    try {
      const ok = await signInGoogle();
      if (ok) {
        update('google_calendar_enabled', 'true');
        setConnectedEmail(await getGoogleConnectedEmail());
      } else {
        Alert.alert(
          'Sign-in failed',
          'Could not connect to Google. Check that your Android OAuth Client ID is correct and the SHA-1 matches your signing certificate, then try again.',
          [{ text: 'OK' }],
        );
      }
    } finally {
      setGoogleBusy(false);
    }
  }, [isDeviceConnected, update]);

  const handleGoogleDisconnect = useCallback(async (): Promise<void> => {
    setGoogleBusy(true);
    try {
      await signOutGoogle();
      update('google_calendar_enabled', 'false');
      setConnectedEmail(null);
    } finally {
      setGoogleBusy(false);
    }
  }, [update]);

  return (
    <View style={styles.container}>
      {/* ── Device Calendar — primary path ── */}
      {isDeviceConnected ? (
        <ListItem
          title="Device calendar connected"
          subtitle={`Events sync to ${deviceCalendarName || 'MedMinder'}`}
          leftIcon="calendar-outline"
          accessibilityLabel="Device calendar status"
          right={
            syncing ? (
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            ) : (
              <Button
                label="Disconnect"
                variant="ghost"
                size="sm"
                onPress={handleDeviceDisconnect}
                accessibilityLabel="Disconnect device calendar"
              />
            )
          }
        />
      ) : (
        <ListItem
          title="Connect to device calendar"
          subtitle="Sync doses to your phone's calendar — no account needed"
          leftIcon="calendar-outline"
          accessibilityLabel="Connect to device calendar"
          right={
            syncing ? (
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            ) : (
              <Button
                label="Connect"
                variant="primary"
                size="sm"
                onPress={() => void handleDeviceConnect()}
                accessibilityLabel="Connect device calendar"
              />
            )
          }
        />
      )}

      {/* Per-medicine toggles — only when device calendar is connected */}
      {isDeviceConnected && medicines.length > 0 && (
        <View style={[styles.perMed, { marginTop: spacing[2] }]}>
          <Text
            variant="overline"
            color={colors.textTertiary}
            style={[styles.sectionLabel, { marginBottom: spacing[2] }]}
          >
            Per medication
          </Text>
          <View style={{ gap: 8 }}>
            {medicines.map((med) => (
              <ListItem
                key={med.id}
                title={med.name}
                subtitle={`${med.dosage} ${med.dosageUnit}`}
                leftContent={<View style={[styles.colorDot, { backgroundColor: med.color }]} />}
                right={
                  <Switch
                    value={med.calendarSync === 1}
                    onValueChange={(v) => void syncMedicineToggle(med.id, v)}
                    trackColor={{ true: colors.brandPrimary, false: colors.border }}
                    thumbColor={colors.surface}
                    accessibilityLabel={`Toggle calendar sync for ${med.name}`}
                  />
                }
              />
            ))}
          </View>
        </View>
      )}

      {/* ── Advanced: Google Calendar (collapsible) ── */}
      <Pressable
        onPress={() => setGoogleExpanded((v) => !v)}
        style={[styles.advancedHeader, { marginTop: spacing[4] }]}
        accessibilityLabel={
          googleExpanded ? 'Collapse Google Calendar section' : 'Expand Google Calendar section'
        }
        accessibilityRole="button"
      >
        <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
          Advanced: Google Calendar
        </Text>
        <Ionicons
          name={googleExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={14}
          color={colors.textTertiary}
        />
      </Pressable>

      {googleExpanded && (
        <View style={{ marginTop: spacing[2] }}>
          {isDeviceConnected && (
            <Text
              variant="caption"
              color={colors.textTertiary}
              style={{ marginBottom: spacing[2] }}
            >
              Disconnect device calendar above to enable Google Calendar sync.
            </Text>
          )}
          <ListItem
            title="Connect to Google Calendar"
            subtitle={
              !GOOGLE_CALENDAR_CONFIGURED
                ? 'Not connected — Client ID missing · Tap for setup steps'
                : connectedEmail
                  ? `Connected as ${connectedEmail} · Syncs as recurring events`
                  : 'Sign in to sync doses directly to your Google Calendar as recurring events'
            }
            onPress={!GOOGLE_CALENDAR_CONFIGURED ? handleGoogleSetupInfo : undefined}
            leftContent={
              <View style={[styles.iconCircle, { backgroundColor: colors.brandPrimaryLight }]}>
                <Ionicons name="logo-google" size={18} color={colors.brandPrimary} />
              </View>
            }
            right={
              googleBusy ? (
                <ActivityIndicator size="small" color={colors.brandPrimary} />
              ) : (
                <Switch
                  value={!!connectedEmail}
                  onValueChange={(v) => void (v ? handleGoogleConnect() : handleGoogleDisconnect())}
                  disabled={!GOOGLE_CALENDAR_CONFIGURED || isDeviceConnected}
                  trackColor={{ true: colors.brandPrimary, false: colors.border }}
                  thumbColor={colors.surface}
                  accessibilityLabel="Toggle Google Calendar sync"
                />
              )
            }
          />
          {!!connectedEmail && (
            <Text
              variant="caption"
              color={colors.textTertiary}
              style={{ marginTop: spacing[1], marginLeft: spacing[2] }}
            >
              Note: Mark Taken and Snooze are only available in MedMinder, not from Google Calendar.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  perMed: {},
  sectionLabel: { textTransform: 'uppercase' },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
