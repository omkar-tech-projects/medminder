import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '../index';
import { doseLogs, type NewDoseLog } from '../schema';

export function getDoseLogsForDate(date: string) {
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;
  return db
    .select()
    .from(doseLogs)
    .where(and(gte(doseLogs.scheduledAt, start), lte(doseLogs.scheduledAt, end)))
    .all();
}

export function updateDoseLogStatus(
  id: string,
  status: 'pending' | 'taken' | 'missed' | 'snoozed',
  takenAt?: string,
) {
  return db
    .update(doseLogs)
    .set({ status, takenAt: takenAt ?? null })
    .where(eq(doseLogs.id, id))
    .run();
}

export function insertDoseLog(data: NewDoseLog) {
  return db.insert(doseLogs).values(data).run();
}
