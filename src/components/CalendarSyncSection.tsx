import { useState, useEffect, useCallback } from 'react';
import { View, Switch, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { ListItem } from './ListItem';
import { useTheme } from '@/theme';
import { useSettingsStore } from '@/store/settings-store';
import { useMedicationStore, selectActiveMedications } from '@/store/medication-store';
import { useShallow } from 'zustand/shallow';
import { useCalendarSync } from '@/hooks/use-calendar-sync';
import { requestDeviceCalendarPermission } from '@/services/device-calendar-service';
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
  const update = useSettingsStore((s) => s.update);
  const medicines = useMedicationStore(useShallow(selectActiveMedications));
  const { syncAll, desyncAll, syncMedicineToggle } = useCalendarSync();

  const [syncing, setSyncing] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

  useEffect(() => {
    void isGoogleConnected().then((ok) => {
      if (ok) void getGoogleConnectedEmail().then(setConnectedEmail);
    });
  }, [googleCalendarEnabled]);

  const handleGlobalToggle = useCallback(
    async (enabled: boolean): Promise<void> => {
      setSyncing(true);
      try {
        if (enabled) {
          const granted = await requestDeviceCalendarPermission();
          if (!granted) return;
          update('calendar_sync', 'true');
          await syncAll();
        } else {
          update('calendar_sync', 'false');
          await desyncAll();
        }
      } finally {
        setSyncing(false);
      }
    },
    [update, syncAll, desyncAll],
  );

  const handleGoogleSetupInfo = useCallback((): void => {
    Alert.alert(
      'Google Calendar Setup',
      'Enable "Sync to device calendar" above — your doses will appear in the Google Calendar app automatically via your linked Google account.\n\nFor direct OAuth sync, a Google Cloud project with Calendar API access is required.',
      [{ text: 'Got it' }],
    );
  }, []);

  const handleGoogleConnect = useCallback(async (): Promise<void> => {
    setGoogleBusy(true);
    try {
      const ok = await signInGoogle();
      if (ok) {
        update('google_calendar_enabled', 'true');
        setConnectedEmail(await getGoogleConnectedEmail());
      }
    } finally {
      setGoogleBusy(false);
    }
  }, [update]);

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
      {/* Global toggle */}
      <ListItem
        title="Sync to device calendar"
        subtitle="Doses appear in your Apple / Google Calendar automatically"
        leftIcon="calendar-outline"
        accessibilityLabel="Toggle calendar sync"
        right={
          syncing ? (
            <ActivityIndicator size="small" color={colors.brandPrimary} />
          ) : (
            <Switch
              value={calendarSync}
              onValueChange={(v) => void handleGlobalToggle(v)}
              trackColor={{ true: colors.brandPrimary, false: colors.border }}
              thumbColor={colors.surface}
              accessibilityLabel="Toggle calendar sync"
            />
          )
        }
      />

      {/* Per-medicine toggles — only visible when sync is on */}
      {calendarSync && medicines.length > 0 && (
        <View style={[styles.perMed, { marginTop: spacing[2] }]}>
          <Text
            variant="overline"
            color={colors.textTertiary}
            style={[styles.perMedLabel, { marginBottom: spacing[2] }]}
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

      {/* Google Calendar direct sync */}
      <View style={[styles.googleSection, { marginTop: spacing[4] }]}>
        <Text
          variant="overline"
          color={colors.textTertiary}
          style={[styles.perMedLabel, { marginBottom: spacing[2] }]}
        >
          Google Calendar (advanced)
        </Text>
        <ListItem
          title="Google Calendar"
          subtitle={
            !GOOGLE_CALENDAR_CONFIGURED
              ? 'Sync doses to your Google Calendar. Tap to set up.'
              : connectedEmail
                ? `Connected as ${connectedEmail}`
                : 'Sign in to sync directly to a Google account'
          }
          onPress={
            !GOOGLE_CALENDAR_CONFIGURED
              ? handleGoogleSetupInfo
              : !connectedEmail
                ? () => void handleGoogleConnect()
                : undefined
          }
          leftContent={
            <View style={[styles.iconCircle, { backgroundColor: colors.brandPrimaryLight }]}>
              <Ionicons name="logo-google" size={18} color={colors.brandPrimary} />
            </View>
          }
          right={
            !GOOGLE_CALENDAR_CONFIGURED ? (
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            ) : googleBusy ? (
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            ) : connectedEmail ? (
              <Text
                variant="labelSmall"
                color={colors.danger}
                onPress={() => void handleGoogleDisconnect()}
                accessibilityRole="button"
                accessibilityLabel="Disconnect Google Calendar"
              >
                Disconnect
              </Text>
            ) : (
              <Text
                variant="labelSmall"
                color={colors.brandPrimary}
                onPress={() => void handleGoogleConnect()}
                accessibilityRole="button"
                accessibilityLabel="Connect Google Calendar"
              >
                Connect
              </Text>
            )
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  perMed: {},
  perMedLabel: { textTransform: 'uppercase' },
  googleSection: {},
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
