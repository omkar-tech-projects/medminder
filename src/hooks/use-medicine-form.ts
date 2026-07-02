import { useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addDays, parseISO } from 'date-fns';
import { router } from 'expo-router';
import {
  reviewFormSchema,
  type ReviewFormValues,
  type MedicineFormValues,
  TIMING_LABELS,
} from '@/schemas/medicine-form-schema';
import type { MedicineExtraction } from '@/schemas/analysis-schema';
import { MEDICATION_COLORS } from '@/lib/constants';
import { newId } from '@/lib/id';
import { useAnalysisStore } from '@/store/analysis-store';
import { useCaptureStore } from '@/store/capture-store';
import { useToast } from '@/store/ui-store';
import { useProfileStore } from '@/store/profile-store';
import { clearAllPages } from '@/lib/image-pipeline';
import { insertMedicine } from '@/db/queries/medicines';
import { replaceSchedulesForMedicine } from '@/db/queries/schedules';
import type { DayPattern } from '@/lib/schedule-generator';
import { regenerateFutureDoseLogs } from '@/db/queries/dose-logs';
import { hasExactAlarmPermission } from '@/services/notification-service';
import { rescheduleAllFutureNotifications } from '@/services/reschedule-service';
import { Alert, Linking, Platform } from 'react-native';
import { scheduleRefillWarningForMedicine } from '@/services/refill-service';
import { useSettingsStore } from '@/store/settings-store';
import { useCalendarSync } from '@/hooks/use-calendar-sync';

const AUTO_TIMES: Partial<Record<number, string[]>> = {
  1: ['08:00'],
  2: ['08:00', '20:00'],
  3: ['08:00', '14:00', '20:00'],
  4: ['08:00', '12:00', '16:00', '20:00'],
};

function autoTimes(freq: number): string[] {
  const preset = AUTO_TIMES[freq];
  if (preset) return preset;
  return Array.from({ length: freq }, (_, i) => {
    const hour = Math.round(6 + (12 * i) / freq) % 24;
    return `${String(hour).padStart(2, '0')}:00`;
  });
}

function aiToForm(med: MedicineExtraction): MedicineFormValues {
  const freq = med.frequencyPerDay ?? 1;
  return {
    name: med.name ?? '',
    strength: med.strength ?? '',
    form: med.form ?? '',
    dosageAmount: med.dosageAmount ?? '',
    frequencyPerDay: freq,
    specificTimes: med.specificTimes ?? autoTimes(freq),
    timing: med.timing ?? 'any',
    durationDays: med.durationDays ?? null,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    stockCount: null,
    instructions: med.instructions ?? '',
    dayPattern: med.dayPattern ?? null,
  };
}

function blankMed(): MedicineFormValues {
  return {
    name: '',
    strength: '',
    form: '',
    dosageAmount: '',
    frequencyPerDay: 1,
    specificTimes: ['08:00'],
    timing: 'any',
    durationDays: null,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    stockCount: null,
    instructions: '',
    dayPattern: null,
  };
}

export function parseDosageAmount(raw: string): { dosage: number; dosageUnit: string } {
  const m = /^(\d+(?:\.\d+)?)\s*(.*)$/.exec(raw.trim());
  if (m) {
    const n = parseFloat(m[1] ?? '1');
    const unit = (m[2] ?? 'dose').trim() || 'dose';
    return { dosage: isNaN(n) ? 1 : n, dosageUnit: unit };
  }
  return { dosage: 1, dosageUnit: raw.trim() || 'dose' };
}

function buildTimingLabel(timing: MedicineFormValues['timing']): string | null {
  return timing !== 'any' ? TIMING_LABELS[timing] : null;
}

export function useMedicineForm() {
  const result = useAnalysisStore((s) => s.result);
  const resetAnalysis = useAnalysisStore((s) => s.reset);
  const pages = useCaptureStore((s) => s.pages);
  const clearCapture = useCaptureStore((s) => s.clear);
  const toast = useToast();
  const { syncAfterSave } = useCalendarSync();

  const defaultMeds = useMemo(
    () => (result?.medicines.length ? result.medicines.map(aiToForm) : [blankMed()]),
    // Snapshot at mount only — intentional empty dep array
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { medicines: defaultMeds },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'medicines' });

  // Run initial validation so button state reflects actual validity from mount
  useEffect(() => {
    void form.trigger();
  }, [form]);

  const handleConfirm = form.handleSubmit(async (data) => {
    const activeProfileId = useProfileStore.getState().activeProfileId;
    try {
      for (const [i, med] of data.medicines.entries()) {
        const medId = newId('med');
        const { dosage, dosageUnit } = parseDosageAmount(med.dosageAmount);
        const color = MEDICATION_COLORS[i % MEDICATION_COLORS.length] ?? '#3B82F6';
        const endDate = med.durationDays
          ? format(addDays(parseISO(med.startDate), med.durationDays - 1), 'yyyy-MM-dd')
          : null;

        const now = new Date().toISOString();
        insertMedicine({
          id: medId,
          profileId: activeProfileId,
          name: med.name,
          strength: med.strength || null,
          form: med.form || null,
          instructions: med.instructions || null,
          timing: med.timing,
          dosage,
          dosageUnit,
          timesPerDay: med.frequencyPerDay,
          durationDays: med.durationDays,
          startDate: med.startDate,
          endDate,
          stockCount: med.stockCount ?? null,
          active: 1,
          color,
          createdAt: now,
          updatedAt: now,
        });

        if (endDate) {
          const refillWarningDays = useSettingsStore.getState().refillWarningDays;
          await scheduleRefillWarningForMedicine(
            {
              id: medId,
              profileId: activeProfileId,
              name: med.name,
              endDate,
              startDate: med.startDate,
              stockCount: med.stockCount ?? null,
              active: 1,
              color,
              dosage,
              dosageUnit,
              timesPerDay: med.frequencyPerDay,
              strength: med.strength || null,
              form: med.form || null,
              instructions: med.instructions || null,
              timing: med.timing,
              durationDays: med.durationDays,
              calendarSync: 1,
              leadMinutesOverride: null,
              nagIntervalMinutesOverride: null,
              maxNagsOverride: null,
              snoozeDurationMinOverride: null,
              quietHoursOverride: null,
              createdAt: now,
              updatedAt: now,
            },
            refillWarningDays,
          ).catch(() => undefined);
        }

        const {
          notificationLeadMin,
          reRemindIntervalMin,
          maxNags: globalMaxNags,
        } = useSettingsStore.getState();

        let dayPattern: DayPattern = { type: 'daily' };
        if (med.dayPattern) {
          try {
            dayPattern = JSON.parse(med.dayPattern) as DayPattern;
          } catch {
            // malformed JSON — fall back to daily
          }
        }

        const scheduleRows = replaceSchedulesForMedicine(medId, med.specificTimes, dayPattern, {
          leadMinutes: notificationLeadMin,
          nagIntervalMinutes: reRemindIntervalMin,
          maxNags: globalMaxNags,
        });

        const createdLogs = regenerateFutureDoseLogs(
          medId,
          { startDate: med.startDate, endDate },
          scheduleRows,
        );

        const dosageLabel = `${dosage} ${dosageUnit}`;
        // Bypass the 60-second debounce so the newly added medicine is scheduled
        // immediately even if the user saves within 60 s of app launch.
        await rescheduleAllFutureNotifications();
        await syncAfterSave(
          medId,
          { name: med.name, dosage: dosageLabel, instructions: med.instructions || null },
          createdLogs,
        ).catch(() => undefined);
      }

      // On Android 12 (API 31-32), warn the user if exact alarms aren't granted so
      // they know reminders may arrive late and how to fix it.
      if (Platform.OS === 'android') {
        const exactOk = await hasExactAlarmPermission();
        if (!exactOk) {
          Alert.alert(
            'Allow Timed Reminders',
            'To receive dose reminders at the right time, please open Settings and enable "Alarms & reminders" for MedMinder.',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Open Settings', onPress: () => void Linking.openSettings() },
            ],
          );
        }
      }

      clearAllPages(pages.map((p) => p.uri));
      clearCapture();
      resetAnalysis();
      const n = data.medicines.length;
      toast.success(`${n} medicine${n !== 1 ? 's' : ''} added!`);
      router.replace('/(tabs)');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save medicines');
    }
  });

  return {
    form,
    fields,
    appendBlank: () => append(blankMed()),
    removeField: remove,
    handleConfirm,
    originalMeds: result?.medicines ?? [],
    // True when a scan was run but yielded zero recognised medicines.
    extractionFailed: result !== null && result !== undefined && result.medicines.length === 0,
    isValid: form.formState.isValid,
    isSubmitting: form.formState.isSubmitting,
  };
}

// Exported for reference — tells callers how timing maps to display text
export { buildTimingLabel };
