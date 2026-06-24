import { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Input } from './Input';
import { Button } from './Button';
import { Text } from './Text';
import { useTheme } from '@/theme';
import { useSettingsStore } from '@/store/settings-store';
import { updateMedicine } from '@/db/queries/medicines';
import { rescheduleNotificationsForMedicine } from '@/services/reschedule-service';
import type { Medicine } from '@/db/schema';

interface MedicineOverrideSheetProps {
  medicine: Medicine | null;
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type QuietOverride = 'global' | 'on' | 'off';

function quietFromDb(v: number | null | undefined): QuietOverride {
  if (v == null) return 'global';
  return v === 1 ? 'on' : 'off';
}

export function MedicineOverrideSheet({
  medicine,
  visible,
  onClose,
  onSaved,
}: MedicineOverrideSheetProps) {
  const { colors, spacing, radii } = useTheme();
  const gs = useSettingsStore();

  const [leadText, setLeadText] = useState('');
  const [nagText, setNagText] = useState('');
  const [maxNagsText, setMaxNagsText] = useState('');
  const [snoozeText, setSnoozeText] = useState('');
  const [quietOverride, setQuietOverride] = useState<QuietOverride>('global');

  useEffect(() => {
    if (visible && medicine) {
      setLeadText(medicine.leadMinutesOverride != null ? String(medicine.leadMinutesOverride) : '');
      setNagText(
        medicine.nagIntervalMinutesOverride != null
          ? String(medicine.nagIntervalMinutesOverride)
          : '',
      );
      setMaxNagsText(medicine.maxNagsOverride != null ? String(medicine.maxNagsOverride) : '');
      setSnoozeText(
        medicine.snoozeDurationMinOverride != null
          ? String(medicine.snoozeDurationMinOverride)
          : '',
      );
      setQuietOverride(quietFromDb(medicine.quietHoursOverride));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function parseOrNull(text: string, min: number, max: number): number | null {
    if (!text.trim()) return null;
    const n = parseInt(text, 10);
    return !isNaN(n) && n >= min && n <= max ? n : null;
  }

  async function handleSave(): Promise<void> {
    if (!medicine) return;
    const quietValue: number | null =
      quietOverride === 'on' ? 1 : quietOverride === 'off' ? 0 : null;
    updateMedicine(medicine.id, {
      leadMinutesOverride: parseOrNull(leadText, 1, 60),
      nagIntervalMinutesOverride: parseOrNull(nagText, 1, 60),
      maxNagsOverride: parseOrNull(maxNagsText, 1, 96),
      snoozeDurationMinOverride: parseOrNull(snoozeText, 1, 60),
      quietHoursOverride: quietValue,
    });
    await rescheduleNotificationsForMedicine(medicine.id).catch(() => undefined);
    onSaved?.();
    onClose();
  }

  function handleClear(): void {
    if (!medicine) return;
    updateMedicine(medicine.id, {
      leadMinutesOverride: null,
      nagIntervalMinutesOverride: null,
      maxNagsOverride: null,
      snoozeDurationMinOverride: null,
      quietHoursOverride: null,
    });
    void rescheduleNotificationsForMedicine(medicine.id).catch(() => undefined);
    onSaved?.();
    onClose();
  }

  const global = (label: string): string => `${label} — global: `;

  const QUIET_OPTIONS: { value: QuietOverride; label: string }[] = [
    { value: 'global', label: 'Use global' },
    { value: 'on', label: 'Always on' },
    { value: 'off', label: 'Always off' },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={medicine ? `Override: ${medicine.name}` : 'Override'}
      height={580}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text variant="caption" color={colors.textTertiary} style={{ marginBottom: spacing[3] }}>
          Leave a field blank to inherit the global setting.
        </Text>

        <Input
          label={`Lead time (min) — global: ${gs.notificationLeadMin}`}
          placeholder={String(gs.notificationLeadMin)}
          value={leadText}
          onChangeText={setLeadText}
          keyboardType="number-pad"
          maxLength={3}
          accessibilityLabel="Lead time override for this medicine"
        />

        <Input
          label={`Re-remind interval (min) — global: ${gs.reRemindIntervalMin}`}
          placeholder={String(gs.reRemindIntervalMin)}
          value={nagText}
          onChangeText={setNagText}
          keyboardType="number-pad"
          maxLength={3}
          containerStyle={styles.field}
          accessibilityLabel="Re-remind interval override for this medicine"
        />

        <Input
          label={`${global('Max reminders')}${gs.maxNags}`}
          placeholder={String(gs.maxNags)}
          value={maxNagsText}
          onChangeText={setMaxNagsText}
          keyboardType="number-pad"
          maxLength={3}
          containerStyle={styles.field}
          accessibilityLabel="Max reminders override for this medicine"
        />

        <Input
          label={`${global('Snooze duration (min)')}${gs.snoozeDurationMin}`}
          placeholder={String(gs.snoozeDurationMin)}
          value={snoozeText}
          onChangeText={setSnoozeText}
          keyboardType="number-pad"
          maxLength={3}
          containerStyle={styles.field}
          accessibilityLabel="Snooze duration override for this medicine"
        />

        <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing[4] }}>
          Quiet hours
        </Text>
        <View style={[styles.segmented, { marginTop: spacing[2] }]}>
          {QUIET_OPTIONS.map((opt) => {
            const active = quietOverride === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setQuietOverride(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={opt.label}
                style={[
                  styles.segment,
                  {
                    flex: 1,
                    paddingVertical: spacing[2],
                    borderRadius: radii.md,
                    backgroundColor: active ? colors.brandPrimary : colors.backgroundTertiary,
                  },
                ]}
              >
                <Text
                  variant="labelSmall"
                  align="center"
                  color={active ? colors.textInverse : colors.textSecondary}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          label="Save overrides"
          variant="primary"
          fullWidth
          onPress={() => void handleSave()}
          style={{ marginTop: spacing[5] }}
          accessibilityLabel="Save notification overrides for this medicine"
        />
        <Button
          label="Clear all overrides (use global)"
          variant="ghost"
          fullWidth
          onPress={handleClear}
          style={{ marginTop: spacing[2] }}
          accessibilityLabel="Remove all overrides and use global settings"
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 16 },
  field: { marginTop: 12 },
  segmented: { flexDirection: 'row', gap: 6 },
  segment: { alignItems: 'center' },
});
