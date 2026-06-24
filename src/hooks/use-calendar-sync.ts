import { useCallback } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { useMedicationStore } from '@/store/medication-store';
import type { DoseLog } from '@/db/schema';
import {
  setDoseLogCalendarEventId,
  setDoseLogGoogleCalendarEventId,
  getDoseLogsForMedicine,
} from '@/db/queries/dose-logs';
import { setMedicineCalendarSync } from '@/db/queries/medicines';
import {
  createDoseCalendarEvent,
  deleteDoseCalendarEvent,
} from '@/services/device-calendar-service';
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from '@/services/google-calendar-service';
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

async function syncLogToGoogle(log: DoseLog, meta: DoseEventParams): Promise<void> {
  if (log.googleCalendarEventId) return;
  const eventId = await createGoogleCalendarEvent(meta);
  if (eventId) setDoseLogGoogleCalendarEventId(log.id, eventId);
}

async function desyncLog(log: DoseLog): Promise<void> {
  if (log.calendarEventId) {
    await deleteDoseCalendarEvent(log.calendarEventId);
    setDoseLogCalendarEventId(log.id, null);
  }
  if (log.googleCalendarEventId) {
    await deleteGoogleCalendarEvent(log.googleCalendarEventId);
    setDoseLogGoogleCalendarEventId(log.id, null);
  }
}

export function useCalendarSync() {
  const calendarSync = useSettingsStore((s) => s.calendarSync);
  const googleCalendarEnabled = useSettingsStore((s) => s.googleCalendarEnabled);

  const syncAfterSave = useCallback(
    async (medId: string, medicine: MedicineMeta, createdLogs: DoseLog[]): Promise<void> => {
      if (!calendarSync) return;
      await Promise.all(
        createdLogs.map(async (log) => {
          const meta: DoseEventParams = {
            medicineName: medicine.name,
            dosage: medicine.dosage,
            scheduledAt: log.scheduledAt,
            instructions: medicine.instructions,
          };
          await syncLogToDevice(log, meta);
          if (googleCalendarEnabled) await syncLogToGoogle(log, meta);
        }),
      );
    },
    [calendarSync, googleCalendarEnabled],
  );

  const syncAll = useCallback(async (): Promise<void> => {
    const meds = useMedicationStore.getState().medications;
    await Promise.all(
      meds
        .filter((m) => m.calendarSync === 1)
        .map(async (m) => {
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
        }),
    );
  }, []);

  const desyncAll = useCallback(async (): Promise<void> => {
    const meds = useMedicationStore.getState().medications;
    await Promise.all(
      meds.map(async (m) => {
        const logs = getDoseLogsForMedicine(m.id);
        await Promise.all(logs.map(desyncLog));
      }),
    );
  }, []);

  const syncMedicineToggle = useCallback(
    async (medId: string, enabled: boolean): Promise<void> => {
      setMedicineCalendarSync(medId, enabled);
      useMedicationStore.getState().load();
      if (!enabled) {
        const logs = getDoseLogsForMedicine(medId);
        await Promise.all(logs.map(desyncLog));
        return;
      }
      if (!calendarSync) return;
      const med = useMedicationStore.getState().medications.find((m) => m.id === medId);
      if (!med) return;
      const logs = getDoseLogsForMedicine(medId).filter((l) => l.status === 'pending');
      const dosage = `${med.dosage} ${med.dosageUnit}`;
      await Promise.all(
        logs.map(async (log) => {
          const meta: DoseEventParams = {
            medicineName: med.name,
            dosage,
            scheduledAt: log.scheduledAt,
            instructions: med.instructions ?? null,
          };
          await syncLogToDevice(log, meta);
          if (googleCalendarEnabled) await syncLogToGoogle(log, meta);
        }),
      );
    },
    [calendarSync, googleCalendarEnabled],
  );

  return { syncAfterSave, syncAll, desyncAll, syncMedicineToggle };
}
