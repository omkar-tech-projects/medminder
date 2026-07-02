import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { format } from 'date-fns';
import { db } from '../index';
import {
  doseLogs,
  medicines,
  schedules,
  type NewDoseLog,
  type DoseLog,
  type Schedule,
} from '../schema';
import { DOSE_STATUS, DOSE_LOG_GENERATE_DAYS_AHEAD } from '@/lib/constants';
import { newId } from '@/lib/id';
import type { TodayDose, AdherenceSummary } from '@/repositories/dose-repository';
import type { DoseStatus } from '@/types/dose';
import { expandScheduleToSlots, parseDayPattern, computeWindowEnd } from '@/lib/schedule-generator';

// ---------------------------------------------------------------------------
// Basic CRUD
// ---------------------------------------------------------------------------

export function insertDoseLog(data: NewDoseLog): void {
  db.insert(doseLogs).values(data).run();
}

export function updateDoseLogStatus(
  id: string,
  status: DoseStatus,
  respondedAt?: string,
  source?: 'notification' | 'app',
): void {
  db.update(doseLogs)
    .set({ status, respondedAt: respondedAt ?? null, source: source ?? null })
    .where(eq(doseLogs.id, id))
    .run();
}

export function revertDoseLogToPending(id: string): void {
  db.update(doseLogs)
    .set({ status: DOSE_STATUS.PENDING, respondedAt: null, source: null })
    .where(eq(doseLogs.id, id))
    .run();
}

export function getMedicineIdForDoseLog(doseLogId: string): string | null {
  const row = db
    .select({ medicineId: doseLogs.medicineId })
    .from(doseLogs)
    .where(eq(doseLogs.id, doseLogId))
    .get();
  return row?.medicineId ?? null;
}

export function getDoseLogStatus(doseLogId: string): DoseStatus | null {
  const row = db
    .select({ status: doseLogs.status })
    .from(doseLogs)
    .where(eq(doseLogs.id, doseLogId))
    .get();
  return row ? (row.status as DoseStatus) : null;
}

export function setDoseLogCalendarEventId(id: string, eventId: string | null): void {
  db.update(doseLogs).set({ calendarEventId: eventId }).where(eq(doseLogs.id, id)).run();
}

export function setDoseLogGoogleCalendarEventId(id: string, eventId: string | null): void {
  db.update(doseLogs).set({ googleCalendarEventId: eventId }).where(eq(doseLogs.id, id)).run();
}

export function getDoseLogsForMedicine(medicineId: string): DoseLog[] {
  return db.select().from(doseLogs).where(eq(doseLogs.medicineId, medicineId)).all();
}

export function deleteDoseLogsForMedicine(medicineId: string): number {
  const rows = db.delete(doseLogs).where(eq(doseLogs.medicineId, medicineId)).run();
  return rows.changes ?? 0;
}

export function getAllDoseLogsForProfile(profileId: string): DoseLog[] {
  const all = db
    .select()
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(eq(medicines.profileId, profileId))
    .all();
  return all.map((row) => row.dose_logs);
}

export interface OverduePendingDoseWithProfile {
  doseLogId: string;
  medicineId: string;
  medicineName: string;
  scheduledAt: string;
  profileId: string | null;
}

/** Pending logs at or before cutoff, joined with medicine + profile info for caregiver alerts. */
export function getOverduePendingLogsWithProfile(
  cutoffIso: string,
): OverduePendingDoseWithProfile[] {
  const rows = db
    .select({
      id: doseLogs.id,
      medicineId: doseLogs.medicineId,
      medicineName: medicines.name,
      scheduledAt: doseLogs.scheduledAt,
      profileId: medicines.profileId,
    })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(and(eq(doseLogs.status, DOSE_STATUS.PENDING), lte(doseLogs.scheduledAt, cutoffIso)))
    .all();

  return rows.map((r) => ({
    doseLogId: r.id,
    medicineId: r.medicineId,
    medicineName: r.medicineName,
    scheduledAt: r.scheduledAt,
    profileId: r.profileId,
  }));
}

export interface DoseLogWithParams {
  medicineName: string;
  dosage: string;
  scheduledAt: string;
  leadMinutes: number;
  nagIntervalMinutes: number;
  maxNags: number;
}

/** Joins dose_logs → medicines → schedules so the caller can reschedule notifications. */
export function getDoseLogWithParams(id: string): DoseLogWithParams | null {
  const rows = db
    .select({
      scheduledAt: doseLogs.scheduledAt,
      medicineName: medicines.name,
      dosageNum: medicines.dosage,
      dosageUnit: medicines.dosageUnit,
      leadMinutes: schedules.leadMinutes,
      nagIntervalMinutes: schedules.nagIntervalMinutes,
      maxNags: schedules.maxNags,
    })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .leftJoin(schedules, eq(doseLogs.scheduleId, schedules.id))
    .where(eq(doseLogs.id, id))
    .all();

  const row = rows[0];
  if (!row) return null;
  return {
    medicineName: row.medicineName,
    dosage: `${row.dosageNum} ${row.dosageUnit}`,
    scheduledAt: row.scheduledAt,
    leadMinutes: row.leadMinutes ?? 5,
    nagIntervalMinutes: row.nagIntervalMinutes ?? 5,
    maxNags: row.maxNags ?? 24,
  };
}

// ---------------------------------------------------------------------------
// Calendar queries
// ---------------------------------------------------------------------------

export interface DayAdherence {
  total: number;
  taken: number;
  missed: number;
  pending: number;
}

/** Single query returning per-day adherence counts for an entire month. */
export function getMonthAdherence(
  monthStart: string,
  monthEnd: string,
  profileId?: string | null,
): Record<string, DayAdherence> {
  const rows = db
    .select({
      date: sql<string>`substr(${doseLogs.scheduledAt}, 1, 10)`,
      total: sql<number>`count(*)`,
      taken: sql<number>`sum(case when ${doseLogs.status} = 'taken' then 1 else 0 end)`,
      missed: sql<number>`sum(case when ${doseLogs.status} = 'missed' then 1 else 0 end)`,
      pending: sql<number>`sum(case when ${doseLogs.status} = 'pending' then 1 else 0 end)`,
    })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(
      and(
        gte(doseLogs.scheduledAt, `${monthStart}T00:00:00`),
        lte(doseLogs.scheduledAt, `${monthEnd}T23:59:59`),
        profileId != null ? eq(medicines.profileId, profileId) : undefined,
      ),
    )
    .groupBy(sql`substr(${doseLogs.scheduledAt}, 1, 10)`)
    .all();

  return Object.fromEntries(
    rows.map((r) => [
      r.date,
      { total: r.total, taken: r.taken, missed: r.missed, pending: r.pending },
    ]),
  );
}

export interface CalendarDose extends TodayDose {
  instructions: string | null;
}

/** Like getTodayDoses but also returns per-medicine instructions. */
export function getCalendarDayDoses(date: string, profileId?: string | null): CalendarDose[] {
  const rows = db
    .select({
      id: doseLogs.id,
      medicineId: doseLogs.medicineId,
      profileId: medicines.profileId,
      medicationName: medicines.name,
      medicationColor: medicines.color,
      dosageNum: medicines.dosage,
      dosageUnit: medicines.dosageUnit,
      scheduledAt: doseLogs.scheduledAt,
      status: doseLogs.status,
      respondedAt: doseLogs.respondedAt,
      instructions: medicines.instructions,
    })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(
      and(
        gte(doseLogs.scheduledAt, `${date}T00:00:00`),
        lte(doseLogs.scheduledAt, `${date}T23:59:59`),
      ),
    )
    .orderBy(doseLogs.scheduledAt)
    .all();

  return rows
    .filter((r) => profileId == null || r.profileId === profileId)
    .map((r) => ({
      id: r.id,
      medicineId: r.medicineId,
      medicationName: r.medicationName,
      medicationColor: r.medicationColor,
      dosage: `${r.dosageNum} ${r.dosageUnit}`,
      scheduledAt: r.scheduledAt,
      status: r.status as DoseStatus,
      respondedAt: r.respondedAt,
      instructions: r.instructions ?? null,
    }));
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getRawLogsForDate(date: string): DoseLog[] {
  return db
    .select()
    .from(doseLogs)
    .where(
      and(
        gte(doseLogs.scheduledAt, `${date}T00:00:00`),
        lte(doseLogs.scheduledAt, `${date}T23:59:59`),
      ),
    )
    .all();
}

export function getTodayDoses(date: string, profileId?: string | null): TodayDose[] {
  const rows = db
    .select({
      id: doseLogs.id,
      medicineId: doseLogs.medicineId,
      profileId: medicines.profileId,
      medicationName: medicines.name,
      medicationColor: medicines.color,
      dosageNum: medicines.dosage,
      dosageUnit: medicines.dosageUnit,
      scheduledAt: doseLogs.scheduledAt,
      status: doseLogs.status,
      respondedAt: doseLogs.respondedAt,
    })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(
      and(
        gte(doseLogs.scheduledAt, `${date}T00:00:00`),
        lte(doseLogs.scheduledAt, `${date}T23:59:59`),
      ),
    )
    .orderBy(doseLogs.scheduledAt)
    .all();

  return rows
    .filter((r) => profileId == null || r.profileId === profileId)
    .map((r) => ({
      id: r.id,
      medicineId: r.medicineId,
      medicationName: r.medicationName,
      medicationColor: r.medicationColor,
      dosage: `${r.dosageNum} ${r.dosageUnit}`,
      scheduledAt: r.scheduledAt,
      status: r.status as DoseStatus,
      respondedAt: r.respondedAt,
    }));
}

export function getTodayAdherenceSummaryForProfile(profileId: string): AdherenceSummary {
  const today = format(new Date(), 'yyyy-MM-dd');
  return getAdherenceSummary(today, profileId);
}

export function getAdherenceSummary(date: string, profileId?: string | null): AdherenceSummary {
  const rows = db
    .select({ status: doseLogs.status, profileId: medicines.profileId })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(
      and(
        gte(doseLogs.scheduledAt, `${date}T00:00:00`),
        lte(doseLogs.scheduledAt, `${date}T23:59:59`),
      ),
    )
    .all()
    .filter((r) => profileId == null || r.profileId === profileId);

  let taken = 0;
  let missed = 0;
  let pending = 0;
  for (const r of rows) {
    if (r.status === DOSE_STATUS.TAKEN) taken++;
    else if (r.status === DOSE_STATUS.MISSED) missed++;
    else pending++;
  }
  return { taken, missed, pending, total: rows.length };
}

export function getLogsForDateRange(medicineId: string, start: string, end: string): DoseLog[] {
  return db
    .select()
    .from(doseLogs)
    .where(
      and(
        eq(doseLogs.medicineId, medicineId),
        gte(doseLogs.scheduledAt, `${start}T00:00:00`),
        lte(doseLogs.scheduledAt, `${end}T23:59:59`),
      ),
    )
    .orderBy(doseLogs.scheduledAt)
    .all();
}

// ---------------------------------------------------------------------------
// Schedule generation
// ---------------------------------------------------------------------------

/**
 * Pre-generates dose_log rows for the next rolling window.
 *
 * windowStart is inclusive; any existing pending logs in that window are
 * deleted first so this function is safe to call on create AND on edit.
 *
 * Pass the Schedule rows returned by replaceSchedulesForMedicine so both
 * operations can be composed in a single transaction-like block by the caller.
 */
export function regenerateFutureDoseLogs(
  medicineId: string,
  medicine: { startDate: string; endDate: string | null },
  scheduleRows: Schedule[],
  windowStart?: string,
): DoseLog[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const start = windowStart ?? today;
  const windowEnd = computeWindowEnd(new Date(), DOSE_LOG_GENERATE_DAYS_AHEAD);

  // Delete future PENDING logs only — leave taken/missed/skipped history intact
  db.delete(doseLogs)
    .where(
      and(
        eq(doseLogs.medicineId, medicineId),
        eq(doseLogs.status, DOSE_STATUS.PENDING),
        gte(doseLogs.scheduledAt, `${start}T00:00:00`),
      ),
    )
    .run();

  const inserted: DoseLog[] = [];

  for (const sch of scheduleRows) {
    const dayPattern = parseDayPattern(sch.dayPattern);
    const slots = expandScheduleToSlots({
      startDate: medicine.startDate,
      endDate: medicine.endDate,
      timesOfDay: [sch.timeOfDay],
      dayPattern,
      windowStart: start,
      windowEnd,
    });

    for (const scheduledAt of slots) {
      const row: NewDoseLog = {
        id: newId('dl'),
        medicineId,
        scheduleId: sch.id,
        scheduledAt,
        status: DOSE_STATUS.PENDING,
        respondedAt: null,
        source: null,
      };
      db.insert(doseLogs).values(row).run();
      inserted.push(row as DoseLog);
    }
  }

  return inserted;
}

export interface PendingDoseForReschedule {
  doseLogId: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  scheduledAt: string;
  leadMinutesOverride: number | null;
  nagIntervalMinutesOverride: number | null;
  maxNagsOverride: number | null;
  quietHoursOverride: number | null;
}

/** Returns pending dose logs scheduled between fromIso and toIso (inclusive). */
export function getPendingDoseLogsInWindow(fromIso: string, toIso: string): PendingDoseForReschedule[] {
  const rows = db
    .select({
      doseLogId: doseLogs.id,
      medicineId: doseLogs.medicineId,
      medicineName: medicines.name,
      dosageNum: medicines.dosage,
      dosageUnit: medicines.dosageUnit,
      scheduledAt: doseLogs.scheduledAt,
      leadMinutesOverride: medicines.leadMinutesOverride,
      nagIntervalMinutesOverride: medicines.nagIntervalMinutesOverride,
      maxNagsOverride: medicines.maxNagsOverride,
      quietHoursOverride: medicines.quietHoursOverride,
    })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(
      and(
        eq(doseLogs.status, DOSE_STATUS.PENDING),
        gte(doseLogs.scheduledAt, fromIso),
        lte(doseLogs.scheduledAt, toIso),
      ),
    )
    .all();

  return rows.map((r) => ({
    doseLogId: r.doseLogId,
    medicineId: r.medicineId,
    medicineName: r.medicineName,
    dosage: `${r.dosageNum} ${r.dosageUnit}`,
    scheduledAt: r.scheduledAt,
    leadMinutesOverride: r.leadMinutesOverride ?? null,
    nagIntervalMinutesOverride: r.nagIntervalMinutesOverride ?? null,
    maxNagsOverride: r.maxNagsOverride ?? null,
    quietHoursOverride: r.quietHoursOverride ?? null,
  }));
}

/** Returns all pending future dose logs joined with per-medicine override columns. */
export function getPendingDoseLogsWithParams(fromIso: string): PendingDoseForReschedule[] {
  const rows = db
    .select({
      doseLogId: doseLogs.id,
      medicineId: doseLogs.medicineId,
      medicineName: medicines.name,
      dosageNum: medicines.dosage,
      dosageUnit: medicines.dosageUnit,
      scheduledAt: doseLogs.scheduledAt,
      leadMinutesOverride: medicines.leadMinutesOverride,
      nagIntervalMinutesOverride: medicines.nagIntervalMinutesOverride,
      maxNagsOverride: medicines.maxNagsOverride,
      quietHoursOverride: medicines.quietHoursOverride,
    })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(and(eq(doseLogs.status, DOSE_STATUS.PENDING), gte(doseLogs.scheduledAt, fromIso)))
    .all();

  return rows.map((r) => ({
    doseLogId: r.doseLogId,
    medicineId: r.medicineId,
    medicineName: r.medicineName,
    dosage: `${r.dosageNum} ${r.dosageUnit}`,
    scheduledAt: r.scheduledAt,
    leadMinutesOverride: r.leadMinutesOverride ?? null,
    nagIntervalMinutesOverride: r.nagIntervalMinutesOverride ?? null,
    maxNagsOverride: r.maxNagsOverride ?? null,
    quietHoursOverride: r.quietHoursOverride ?? null,
  }));
}

/**
 * @deprecated Use regenerateFutureDoseLogs instead.
 * Kept for backward-compatibility until all callers are migrated.
 */
export function generateDoseLogsForMedicine(
  medicineId: string,
  startDate: string,
  timesOfDay: string[],
  durationDays: number | null,
): void {
  const today = format(new Date(), 'yyyy-MM-dd');
  const windowEnd = computeWindowEnd(new Date(), DOSE_LOG_GENERATE_DAYS_AHEAD);
  const endDate = durationDays
    ? format(
        new Date(new Date(startDate).getTime() + (durationDays - 1) * 86_400_000),
        'yyyy-MM-dd',
      )
    : null;

  const slots = expandScheduleToSlots({
    startDate,
    endDate,
    timesOfDay,
    dayPattern: { type: 'daily' },
    windowStart: today,
    windowEnd,
  });

  for (const scheduledAt of slots) {
    db.insert(doseLogs)
      .values({
        id: newId('dl'),
        medicineId,
        scheduleId: null,
        scheduledAt,
        status: DOSE_STATUS.PENDING,
        respondedAt: null,
        source: null,
      })
      .run();
  }
}
