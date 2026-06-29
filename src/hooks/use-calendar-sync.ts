import { useCallback } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { useMedicationStore } from '@/store/medication-store';
import type { DoseLog, Medicine } from '@/db/schema';
import { setDoseLogCalendarEventId, getDoseLogsForMedicine } from '@/db/queries/dose-logs';
import { setMedicineCalendarSync } from '@/db/queries/medicines';
import { getSchedulesForMedicine } from '@/db/queries/schedules';
import {
  createDoseCalendarEvent,
  deleteDoseCalendarEvent,
} from '@/services/device-calendar-service';
import { syncMedicineToGoogle, unsyncMedicineFromGoogle } from '@/services/google-calendar-service';
import type { DoseEventParams } from '@/services/device-calendar-service';

interface MedicineMeta {
  name: string;
  dosage: string;
  instructions: string | null;
}

async function syncLogToDevice(log: DoseLog, meta: DoseEventParams): Promise<void> {
  if (log.calendarEventId) return;
  const eventId = await createDoseCalendarEvent(meta);
  if (eventId) setDoseLogCalendarEventId(log.id, eventId);
}

async function desyncLogFromDevice(log: DoseLog): Promise<void> {
  if (log.calendarEventId) {
    await deleteDoseCalendarEvent(log.calendarEventId);
    setDoseLogCalendarEventId(log.id, null);
  }
}

function buildGoogleSyncParams(med: Medicine) {
  const schedules = getSchedulesForMedicine(med.id);
  return {
    medicine: {
      id: med.id,
      name: med.name,
      dosage: med.dosage,
      dosageUnit: med.dosageUnit,
      durationDays: med.durationDays ?? null,
      startDate: med.startDate,
    },
    scheduleTimes: schedules.map((s) => ({
      timeOfDay: s.timeOfDay,
      leadMinutes: s.leadMinutes,
    })),
  };
}

export function useCalendarSync() {
  const calendarSync = useSettingsStore((s) => s.calendarSync);
  const googleCalendarEnabled = useSettingsStore((s) => s.googleCalendarEnabled);

  const syncAfterSave = useCallback(
    async (medId: string, medicine: MedicineMeta, createdLogs: DoseLog[]): Promise<void> => {
      if (!calendarSync) return;

      // Device calendar: one event per dose log
      await Promise.all(
        createdLogs.map(async (log) => {
          const meta: DoseEventParams = {
            medicineName: medicine.name,
            dosage: medicine.dosage,
            scheduledAt: log.scheduledAt,
            instructions: medicine.instructions,
          };
          await syncLogToDevice(log, meta);
        }),
      );

      // Google Calendar: one RRULE recurring event per dose time
      if (googleCalendarEnabled) {
        const med = useMedicationStore.getState().medications.find((m) => m.id === medId);
        if (med) {
          const { medicine: syncParams, scheduleTimes } = buildGoogleSyncParams(med);
          await syncMedicineToGoogle(syncParams, scheduleTimes);
        }
      }
    },
    [calendarSync, googleCalendarEnabled],
  );

  const syncAll = useCallback(async (): Promise<void> => {
    const meds = useMedicationStore.getState().medications;
    await Promise.all(
      meds
        .filter((m) => m.calendarSync === 1)
        .map(async (m) => {
          // Device calendar
          const logs = getDoseLogsForMedicine(m.id).filter((l) => l.status === 'pending');
          const dosage = `${m.dosage} ${m.dosageUnit}`;
          await Promise.all(
            logs.map((log) =>
              syncLogToDevice(log, {
                medicineName: m.name,
                dosage,
                scheduledAt: log.scheduledAt,
                instructions: m.instructions ?? null,
              }),
            ),
          );

          // Google Calendar
          if (googleCalendarEnabled) {
            const { medicine: syncParams, scheduleTimes } = buildGoogleSyncParams(m);
            await syncMedicineToGoogle(syncParams, scheduleTimes);
          }
        }),
    );
  }, [googleCalendarEnabled]);

  const desyncAll = useCallback(async (): Promise<void> => {
    const meds = useMedicationStore.getState().medications;
    await Promise.all(
      meds.map(async (m) => {
        const logs = getDoseLogsForMedicine(m.id);
        await Promise.all(logs.map(desyncLogFromDevice));
        if (googleCalendarEnabled) {
          await unsyncMedicineFromGoogle(m.id);
        }
      }),
    );
  }, [googleCalendarEnabled]);

  const syncMedicineToggle = useCallback(
    async (medId: string, enabled: boolean): Promise<void> => {
      setMedicineCalendarSync(medId, enabled);
      useMedicationStore.getState().load();
      if (!enabled) {
        const logs = getDoseLogsForMedicine(medId);
        await Promise.all(logs.map(desyncLogFromDevice));
        if (googleCalendarEnabled) {
          await unsyncMedicineFromGoogle(medId);
        }
        return;
      }
      if (!calendarSync) return;
      const med = useMedicationStore.getState().medications.find((m) => m.id === medId);
      if (!med) return;

      // Device calendar
      const logs = getDoseLogsForMedicine(medId).filter((l) => l.status === 'pending');
      const dosage = `${med.dosage} ${med.dosageUnit}`;
      await Promise.all(
        logs.map(async (log) => {
          await syncLogToDevice(log, {
            medicineName: med.name,
            dosage,
            scheduledAt: log.scheduledAt,
            instructions: med.instructions ?? null,
          });
        }),
      );

      // Google Calendar
      if (googleCalendarEnabled) {
        const { medicine: syncParams, scheduleTimes } = buildGoogleSyncParams(med);
        await syncMedicineToGoogle(syncParams, scheduleTimes);
      }
    },
    [calendarSync, googleCalendarEnabled],
  );

  return { syncAfterSave, syncAll, desyncAll, syncMedicineToggle };
}
