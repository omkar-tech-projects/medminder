import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { format, addDays, parseISO } from 'date-fns';
import { BottomSheet } from './BottomSheet';
import { Input } from './Input';
import { Button } from './Button';
import { useTheme } from '@/theme';
import { updateMedicine } from '@/db/queries/medicines';
import { replaceSchedulesForMedicine } from '@/db/queries/schedules';
import { regenerateFutureDoseLogs } from '@/db/queries/dose-logs';
import { rescheduleNotificationsForMedicine } from '@/services/reschedule-service';
import { useSettingsStore } from '@/store/settings-store';
import type { Medicine, Schedule } from '@/db/schema';

interface MedicineEditSheetProps {
  medicine: Medicine | null;
  schedules: Schedule[];
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function parseDosage(raw: string): { dosage: number; dosageUnit: string } {
  const m = /^(\d+(?:\.\d+)?)\s*(.*)$/.exec(raw.trim());
  if (m) {
    const n = parseFloat(m[1] ?? '1');
    const unit = (m[2] ?? 'dose').trim() || 'dose';
    return { dosage: isNaN(n) ? 1 : n, dosageUnit: unit };
  }
  return { dosage: 1, dosageUnit: raw.trim() || 'dose' };
}

function autoTimes(freq: number): string[] {
  const presets: Partial<Record<number, string[]>> = {
    1: ['08:00'],
    2: ['08:00', '20:00'],
    3: ['08:00', '14:00', '20:00'],
    4: ['08:00', '12:00', '16:00', '20:00'],
  };
  return (
    presets[freq] ??
    Array.from({ length: freq }, (_, i) => {
      const hour = Math.round(6 + (12 * i) / freq) % 24;
      return `${String(hour).padStart(2, '0')}:00`;
    })
  );
}

export function MedicineEditSheet({
  medicine,
  schedules,
  visible,
  onClose,
  onSaved,
}: MedicineEditSheetProps) {
  const { colors, spacing } = useTheme();

  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [dosageAmount, setDosageAmount] = useState('');
  const [timesPerDayText, setTimesPerDayText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationText, setDurationText] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && medicine) {
      setName(medicine.name);
      setStrength(medicine.strength ?? '');
      setDosageAmount(`${medicine.dosage} ${medicine.dosageUnit}`.trim());
      setTimesPerDayText(String(medicine.timesPerDay));
      setStartDate(medicine.startDate);
      setDurationText(medicine.durationDays != null ? String(medicine.durationDays) : '');
      setInstructions(medicine.instructions ?? '');
    }
  }, [visible, medicine]);

  const isValid = name.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(startDate);

  async function handleSave(): Promise<void> {
    if (!medicine || !isValid) return;
    setSaving(true);
    try {
      const { dosage, dosageUnit } = parseDosage(dosageAmount);
      const freq = Math.max(1, parseInt(timesPerDayText, 10) || medicine.timesPerDay);
      const durationDays = durationText.trim() ? parseInt(durationText, 10) || null : null;
      const endDate = durationDays
        ? format(addDays(parseISO(startDate), durationDays - 1), 'yyyy-MM-dd')
        : null;

      updateMedicine(medicine.id, {
        name: name.trim(),
        strength: strength.trim() || null,
        dosage,
        dosageUnit,
        timesPerDay: freq,
        durationDays,
        startDate,
        endDate,
        instructions: instructions.trim() || null,
      });

      const existingTimes = schedules.map((s) => s.timeOfDay);
      const timesOfDay = existingTimes.length === freq ? existingTimes : autoTimes(freq);

      const gs = useSettingsStore.getState();
      const scheduleRows = replaceSchedulesForMedicine(
        medicine.id,
        timesOfDay,
        { type: 'daily' },
        {
          leadMinutes: medicine.leadMinutesOverride ?? gs.notificationLeadMin,
          nagIntervalMinutes: medicine.nagIntervalMinutesOverride ?? gs.reRemindIntervalMin,
          maxNags: medicine.maxNagsOverride ?? gs.maxNags,
        },
      );

      regenerateFutureDoseLogs(medicine.id, { startDate, endDate }, scheduleRows);
      await rescheduleNotificationsForMedicine(medicine.id).catch(() => undefined);

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit medicine" height={680}>
      <View style={styles.flex}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Medicine name *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Amoxicillin"
            accessibilityLabel="Medicine name"
          />
          <Input
            label="Strength"
            value={strength}
            onChangeText={setStrength}
            placeholder="e.g. 500 mg"
            containerStyle={styles.field}
            accessibilityLabel="Medicine strength"
          />
          <Input
            label="Dose amount"
            value={dosageAmount}
            onChangeText={setDosageAmount}
            placeholder="e.g. 1 tablet"
            containerStyle={styles.field}
            accessibilityLabel="Dose amount"
          />
          <Input
            label="Times per day"
            value={timesPerDayText}
            onChangeText={setTimesPerDayText}
            keyboardType="number-pad"
            maxLength={2}
            containerStyle={styles.field}
            accessibilityLabel="Times per day"
          />
          <Input
            label="Start date (YYYY-MM-DD)"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-06-25"
            containerStyle={styles.field}
            accessibilityLabel="Start date"
          />
          <Input
            label="Duration (days) — leave blank for ongoing"
            value={durationText}
            onChangeText={setDurationText}
            keyboardType="number-pad"
            maxLength={4}
            containerStyle={styles.field}
            accessibilityLabel="Duration in days"
          />
          <Input
            label="Instructions"
            value={instructions}
            onChangeText={setInstructions}
            placeholder="e.g. Take with food"
            containerStyle={styles.field}
            accessibilityLabel="Instructions"
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            label="Save changes"
            variant="primary"
            fullWidth
            disabled={!isValid}
            loading={saving}
            onPress={() => void handleSave()}
            accessibilityLabel="Save medicine changes"
          />
          <Button
            label="Cancel"
            variant="ghost"
            fullWidth
            onPress={onClose}
            style={{ marginTop: spacing[2] }}
            accessibilityLabel="Cancel editing"
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
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
});
