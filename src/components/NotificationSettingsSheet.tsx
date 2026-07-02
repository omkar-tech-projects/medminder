import { useEffect, useState } from 'react';
import { View, Switch, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();

  const [leadText, setLeadText] = useState('5');
  const [nagText, setNagText] = useState('5');
  const [maxNagsText, setMaxNagsText] = useState('24');
  const [snoozeText, setSnoozeText] = useState('5');
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceAnnounce, setVoiceAnnounce] = useState(false);

  // Read fresh values from the store at open time to avoid stale closure
  useEffect(() => {
    if (visible) {
      const s = useSettingsStore.getState();
      setLeadText(String(s.notificationLeadMin));
      setNagText(String(s.reRemindIntervalMin));
      setMaxNagsText(String(s.maxNags));
      setSnoozeText(String(s.snoozeDurationMin));
      setQuietEnabled(s.quietHoursEnabled);
      setQuietStart(s.quietHoursStart);
      setQuietEnd(s.quietHoursEnd);
      setSoundEnabled(s.notificationSoundEnabled);
      setVoiceAnnounce(s.voiceAnnounceDoses);
    }
  }, [visible]);

  function clamp(text: string, min: number, max: number): number | null {
    const n = parseInt(text, 10);
    if (isNaN(n) || n < min || n > max) return null;
    return n;
  }

  const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

  function handleSave(): void {
    const s = useSettingsStore.getState();
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
    s.update('voice_announce_doses', String(voiceAnnounce));
    void rescheduleAllFutureNotifications().catch(() => undefined);
    onClose();
  }

  function handleReset(): void {
    useSettingsStore.getState().resetToDefaults();
    void rescheduleAllFutureNotifications().catch(() => undefined);
    onClose();
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('notificationSettings.title')}
      height={720}
    >
      <View style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Input
            label={t('notificationSettings.leadTimeLabel')}
            value={leadText}
            onChangeText={setLeadText}
            keyboardType="number-pad"
            maxLength={3}
            accessibilityLabel={t('notificationSettings.leadTimeA11y')}
          />
          <FieldHint text={t('notificationSettings.leadTimeHint')} />

          <Input
            label={t('notificationSettings.reRemindLabel')}
            value={nagText}
            onChangeText={setNagText}
            keyboardType="number-pad"
            maxLength={3}
            containerStyle={styles.field}
            accessibilityLabel={t('notificationSettings.reRemindA11y')}
          />
          <FieldHint text={t('notificationSettings.reRemindHint')} />

          <Input
            label={t('notificationSettings.maxRemindersLabel')}
            value={maxNagsText}
            onChangeText={setMaxNagsText}
            keyboardType="number-pad"
            maxLength={3}
            containerStyle={styles.field}
            accessibilityLabel={t('notificationSettings.maxRemindersA11y')}
          />
          <FieldHint text={t('notificationSettings.maxRemindersHint')} />

          <Input
            label={t('notificationSettings.snoozeDurationLabel')}
            value={snoozeText}
            onChangeText={setSnoozeText}
            keyboardType="number-pad"
            maxLength={3}
            containerStyle={styles.field}
            accessibilityLabel={t('notificationSettings.snoozeDurationA11y')}
          />
          <FieldHint text={t('notificationSettings.snoozeDurationHint')} />

          <View style={[styles.toggleRow, { marginTop: spacing[4] }]}>
            <View style={styles.toggleLabel}>
              <Text variant="bodyMedium">{t('notificationSettings.quietHoursLabel')}</Text>
              <FieldHint text={t('notificationSettings.quietHoursHint')} />
            </View>
            <Switch
              value={quietEnabled}
              onValueChange={setQuietEnabled}
              accessibilityLabel={t('notificationSettings.quietHoursA11y')}
              accessibilityState={{ checked: quietEnabled }}
            />
          </View>

          {quietEnabled && (
            <View style={[styles.row, { marginTop: spacing[2] }]}>
              <Input
                label={t('notificationSettings.quietFromLabel')}
                value={quietStart}
                onChangeText={setQuietStart}
                placeholder="22:00"
                maxLength={5}
                containerStyle={styles.half}
                accessibilityLabel={t('notificationSettings.quietFromLabel')}
              />
              <Input
                label={t('notificationSettings.quietUntilLabel')}
                value={quietEnd}
                onChangeText={setQuietEnd}
                placeholder="07:00"
                maxLength={5}
                containerStyle={styles.half}
                accessibilityLabel={t('notificationSettings.quietUntilLabel')}
              />
            </View>
          )}

          <View style={[styles.toggleRow, { marginTop: spacing[4] }]}>
            <View style={styles.toggleLabel}>
              <Text variant="bodyMedium">{t('notificationSettings.soundLabel')}</Text>
              <FieldHint text={t('notificationSettings.soundHint')} />
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              accessibilityLabel={t('notificationSettings.soundA11y')}
              accessibilityState={{ checked: soundEnabled }}
            />
          </View>

          <View style={[styles.toggleRow, { marginTop: spacing[4] }]}>
            <View style={styles.toggleLabel}>
              <Text variant="bodyMedium">{t('notificationSettings.voiceAnnounceLabel')}</Text>
              <FieldHint text={t('notificationSettings.voiceAnnounceHint')} />
            </View>
            <Switch
              value={voiceAnnounce}
              onValueChange={setVoiceAnnounce}
              accessibilityLabel={t('notificationSettings.voiceAnnounceA11y')}
              accessibilityState={{ checked: voiceAnnounce }}
            />
          </View>
        </ScrollView>

        {/* Sticky footer — always visible, never scrolled away */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            label={t('notificationSettings.save')}
            variant="primary"
            fullWidth
            onPress={handleSave}
            accessibilityLabel={t('notificationSettings.saveA11y')}
          />
          <Button
            label={t('notificationSettings.resetDefaults')}
            variant="ghost"
            fullWidth
            onPress={handleReset}
            style={{ marginTop: spacing[2] }}
            accessibilityLabel={t('notificationSettings.resetDefaultsA11y')}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: 8 },
  field: { marginTop: 12 },
  hint: { marginTop: 2, marginBottom: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  toggleLabel: { flex: 1, marginRight: 12 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
});
