import { format, addDays, parseISO, subDays } from 'date-fns';
import { getAllMedicines, getEndedCourses, updateMedicine } from '@/db/queries/medicines';
import { getSchedulesForMedicine } from '@/db/queries/schedules';
import { getDoseLogsForMedicine, regenerateFutureDoseLogs } from '@/db/queries/dose-logs';
import { useSettingsStore } from '@/store/settings-store';
import {
  scheduleRefillWarningNotification,
  scheduleRefillReminderNotification,
  scheduleNotificationsForDoseLog,
  cancelNotificationsForDoseLog,
  cancelRefillNotificationsForMedicine,
} from '@/services/notification-service';
import { deleteDoseCalendarEvent } from '@/services/device-calendar-service';
import { deleteGoogleCalendarEvent } from '@/services/google-calendar-service';
import type { Medicine } from '@/db/schema';

export async function scheduleRefillWarningForMedicine(
  medicine: Medicine,
  refillWarningDays: number,
): Promise<void> {
  if (!medicine.endDate) return;
  const endDate = parseISO(`${medicine.endDate}T00:00:00`);
  const triggerDate = subDays(endDate, refillWarningDays);
  triggerDate.setHours(9, 0, 0, 0);
  if (triggerDate > new Date()) {
    await scheduleRefillWarningNotification({
      medicineId: medicine.id,
      medicineName: medicine.name,
      endDate: medicine.endDate,
      triggerDate,
    });
  } else {
    // Threshold already passed — cancel push, in-app banner shows it instead
    await cancelRefillNotificationsForMedicine(medicine.id);
  }
}

export async function runRefillCheck(refillWarningDays: number): Promise<void> {
  const active = getAllMedicines().filter((m) => m.active === 1);
  await Promise.all(
    active.map((m) =>
      scheduleRefillWarningForMedicine(m, refillWarningDays).catch(() => undefined),
    ),
  );
}

export async function scheduleRefillReminder(
  medicineId: string,
  medicineName: string,
  daysFromNow: number,
): Promise<void> {
  const remindAt = addDays(new Date(), daysFromNow);
  remindAt.setHours(9, 0, 0, 0);
  await scheduleRefillReminderNotification({ medicineId, medicineName, remindAt });
}

export async function deactivateMedicine(medicineId: string): Promise<void> {
  updateMedicine(medicineId, { active: 0 });
  await cancelRefillNotificationsForMedicine(medicineId);
  const logs = getDoseLogsForMedicine(medicineId).filter((l) => l.status === 'pending');
  await Promise.all(
    logs.map(async (l) => {
      await cancelNotificationsForDoseLog(l.id).catch(() => undefined);
      if (l.calendarEventId) {
        await deleteDoseCalendarEvent(l.calendarEventId).catch(() => undefined);
      }
      if (l.googleCalendarEventId) {
        await deleteGoogleCalendarEvent(l.googleCalendarEventId).catch(() => undefined);
      }
    }),
  );
}

export async function extendCourse(
  medicine: Medicine,
  additionalDays: number,
  refillWarningDays: number,
): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const baseDate =
    medicine.endDate && medicine.endDate >= today
      ? parseISO(`${medicine.endDate}T00:00:00`)
      : new Date();
  const newEndDate = format(addDays(baseDate, additionalDays), 'yyyy-MM-dd');

  updateMedicine(medicine.id, { active: 1, endDate: newEndDate });

  const scheduleRows = getSchedulesForMedicine(medicine.id);
  const newLogs = regenerateFutureDoseLogs(
    medicine.id,
    { startDate: medicine.startDate, endDate: newEndDate },
    scheduleRows,
  );

  const {
    notificationLeadMin,
    reRemindIntervalMin,
    maxNags: globalMaxNags,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
    notificationSoundEnabled,
  } = useSettingsStore.getState();

  await Promise.all(
    newLogs.map((log) => {
      const sch = scheduleRows.find((s) => s.id === log.scheduleId);
      return scheduleNotificationsForDoseLog({
        doseLogId: log.id,
        medicineName: medicine.name,
        dosage: `${medicine.dosage} ${medicine.dosageUnit}`,
        scheduledAt: log.scheduledAt,
        leadMinutes: medicine.leadMinutesOverride ?? sch?.leadMinutes ?? notificationLeadMin,
        nagIntervalMinutes:
          medicine.nagIntervalMinutesOverride ?? sch?.nagIntervalMinutes ?? reRemindIntervalMin,
        maxNags: medicine.maxNagsOverride ?? sch?.maxNags ?? globalMaxNags,
        quietHoursEnabled:
          medicine.quietHoursOverride != null
            ? medicine.quietHoursOverride === 1
            : quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
        soundEnabled: notificationSoundEnabled,
      }).catch(() => undefined);
    }),
  );

  await scheduleRefillWarningForMedicine({ ...medicine, endDate: newEndDate }, refillWarningDays);
}

export { getEndedCourses };
