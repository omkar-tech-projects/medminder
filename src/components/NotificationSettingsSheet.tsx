import { useEffect, useState } from 'react';
import { View, Switch, ScrollView, StyleSheet } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Input } from './Input';
import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '@/theme';
import { useSettingsStore } from '@/store/settings-store';
import { rescheduleAllFutureNotifications } from '@/services/reschedule-service';

interface NotificationSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

function FieldHint({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <Text variant="caption" color={colors.textTertiary} style={styles.hint}>
      {text}
    </Text>
  );
}

export function NotificationSettingsSheet({ visible, onClose }: NotificationSettingsSheetProps) {
  const { spacing } = useTheme();
  const s = useSettingsStore();

  const [leadText, setLeadText] = useState(String(s.notificationLeadMin));
  const [nagText, setNagText] = useState(String(s.reRemindIntervalMin));
  const [maxNagsText, setMaxNagsText] = useState(String(s.maxNags));
  const [snoozeText, setSnoozeText] = useState(String(s.snoozeDurationMin));
  const [quietEnabled, setQuietEnabled] = useState(s.quietHoursEnabled);
  const [quietStart, setQuietStart] = useState(s.quietHoursStart);
  const [quietEnd, setQuietEnd] = useState(s.quietHoursEnd);
  const [soundEnabled, setSoundEnabled] = useState(s.notificationSoundEnabled);

  useEffect(() => {
    if (visible) {
      setLeadText(String(s.notificationLeadMin));
      setNagText(String(s.reRemindIntervalMin));
      setMaxNagsText(String(s.maxNags));
      setSnoozeText(String(s.snoozeDurationMin));
      setQuietEnabled(s.quietHoursEnabled);
      setQuietStart(s.quietHoursStart);
      setQuietEnd(s.quietHoursEnd);
      setSoundEnabled(s.notificationSoundEnabled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function clamp(text: string, min: number, max: number): number | null {
    const n = parseInt(text, 10);
    if (isNaN(n) || n < min || n > max) return null;
    return n;
  }

  const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

  function handleSave(): void {
    const lead = clamp(leadText, 1, 60);
    const nag = clamp(nagText, 1, 60);
    const nags = clamp(maxNagsText, 1, 96);
    const snooze = clamp(snoozeText, 1, 60);
    if (lead != null) s.update('notification_lead_min', String(lead));
    if (nag != null) s.update('re_remind_interval_min', String(nag));
    if (nags != null) s.update('max_nags', String(nags));
    if (snooze != null) s.update('snooze_duration_min', String(snooze));
    s.update('quiet_hours_enabled', String(quietEnabled));
    if (HH_MM.test(quietStart)) s.update('quiet_hours_start', quietStart);
    if (HH_MM.test(quietEnd)) s.update('quiet_hours_end', quietEnd);
    s.update('notification_sound_enabled', String(soundEnabled));
    void rescheduleAllFutureNotifications().catch(() => undefined);
    onClose();
  }

  function handleReset(): void {
    s.resetToDefaults();
    void rescheduleAllFutureNotifications().catch(() => undefined);
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Reminders" height={640}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Input
          label="Lead time (minutes before dose)"
          value={leadText}
          onChangeText={setLeadText}
          keyboardType="number-pad"
          maxLength={3}
          accessibilityLabel="Minutes before dose to fire the lead reminder"
        />
        <FieldHint text="A heads-up fires this many minutes before the scheduled dose time." />

        <Input
          label="Re-remind interval (minutes)"
          value={nagText}
          onChangeText={setNagText}
          keyboardType="number-pad"
          maxLength={3}
          containerStyle={styles.field}
          accessibilityLabel="Minutes between repeat reminders"
        />
        <FieldHint text="If you don't respond, another reminder fires every N minutes." />

        <Input
          label="Max reminders per dose"
          value={maxNagsText}
          onChangeText={setMaxNagsText}
          keyboardType="number-pad"
          maxLength={3}
          containerStyle={styles.field}
          accessibilityLabel="Maximum number of reminders before dose is auto-marked missed"
        />
        <FieldHint
          text={`After this many reminders the dose is auto-marked missed (e.g. 24 = 2 h at 5-min intervals).`}
        />

        <Input
          label="Snooze duration (minutes)"
          value={snoozeText}
          onChangeText={setSnoozeText}
          keyboardType="number-pad"
          maxLength={3}
          containerStyle={styles.field}
          accessibilityLabel="Minutes a snoozed reminder is delayed"
        />
        <FieldHint text="How long 'Snooze' delays a reminder." />

        <View style={[styles.toggleRow, { marginTop: spacing[4] }]}>
          <View style={styles.toggleLabel}>
            <Text variant="bodyMedium">Quiet hours</Text>
            <FieldHint text="Reminders during this window are shifted to the end time." />
          </View>
          <Switch
            value={quietEnabled}
            onValueChange={setQuietEnabled}
            accessibilityLabel="Enable quiet hours"
          />
        </View>

        {quietEnabled && (
          <View style={[styles.row, { marginTop: spacing[2] }]}>
            <Input
              label="From (HH:MM)"
              value={quietStart}
              onChangeText={setQuietStart}
              placeholder="22:00"
              maxLength={5}
              containerStyle={styles.half}
              accessibilityLabel="Quiet hours start time"
            />
            <Input
              label="Until (HH:MM)"
              value={quietEnd}
              onChangeText={setQuietEnd}
              placeholder="07:00"
              maxLength={5}
              containerStyle={styles.half}
              accessibilityLabel="Quiet hours end time"
            />
          </View>
        )}

        <View style={[styles.toggleRow, { marginTop: spacing[4] }]}>
          <View style={styles.toggleLabel}>
            <Text variant="bodyMedium">Sound</Text>
            <FieldHint text="Play a sound with each reminder." />
          </View>
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            accessibilityLabel="Enable notification sound"
          />
        </View>

        <Button
          label="Save"
          variant="primary"
          fullWidth
          onPress={handleSave}
          style={{ marginTop: spacing[5] }}
          accessibilityLabel="Save notification settings"
        />
        <Button
          label="Reset to defaults"
          variant="ghost"
          fullWidth
          onPress={handleReset}
          style={{ marginTop: spacing[2] }}
          accessibilityLabel="Reset all notification settings to defaults"
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 16 },
  field: { marginTop: 12 },
  hint: { marginTop: 2, marginBottom: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  toggleLabel: { flex: 1, marginRight: 12 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
});
