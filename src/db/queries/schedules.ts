import { eq } from 'drizzle-orm';
import { db } from '../index';
import { schedules, type NewSchedule, type Schedule } from '../schema';
import { newId } from '@/lib/id';
import { serializeDayPattern, type DayPattern } from '@/lib/schedule-generator';

export function insertSchedule(data: NewSchedule): void {
  db.insert(schedules).values(data).run();
}

export function getSchedulesForMedicine(medicineId: string): Schedule[] {
  return db.select().from(schedules).where(eq(schedules.medicineId, medicineId)).all();
}

export function deleteSchedulesForMedicine(medicineId: string): void {
  db.delete(schedules).where(eq(schedules.medicineId, medicineId)).run();
}

/**
 * Atomically replaces all schedules for a medicine:
 * deletes existing rows, inserts one row per time-of-day, returns the new rows.
 *
 * Call this whenever the user confirms or edits a medicine — the caller then
 * passes the returned rows straight into regenerateFutureDoseLogs.
 */
export function replaceSchedulesForMedicine(
  medicineId: string,
  timesOfDay: string[],
  dayPattern: DayPattern,
  opts: { leadMinutes?: number; nagIntervalMinutes?: number; maxNags?: number } = {},
): Schedule[] {
  deleteSchedulesForMedicine(medicineId);

  const { leadMinutes = 5, nagIntervalMinutes = 5, maxNags = 24 } = opts;

  const patternJson = serializeDayPattern(dayPattern);
  const inserted: Schedule[] = [];

  for (const time of timesOfDay) {
    const row: NewSchedule = {
      id: newId('sch'),
      medicineId,
      timeOfDay: time,
      dayPattern: patternJson,
      leadMinutes,
      nagIntervalMinutes,
      maxNags,
    };
    db.insert(schedules).values(row).run();
    inserted.push(row as Schedule);
  }

  return inserted;
}
