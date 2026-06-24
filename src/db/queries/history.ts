import { and, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { format, parseISO, subDays } from 'date-fns';
import { db } from '../index';
import { doseLogs, medicines } from '../schema';
import { DOSE_STATUS } from '@/lib/constants';
import type { DoseStatus } from '@/types/dose';

export interface HistoryDose {
  id: string;
  medicineId: string;
  medicineName: string;
  medicineColor: string;
  dosage: string;
  scheduledAt: string;
  status: DoseStatus;
  respondedAt: string | null;
}

export interface AdherenceTrendPoint {
  date: string;
  total: number;
  taken: number;
  missed: number;
  adhPct: number;
}

export interface OverallStats {
  totalTaken: number;
  totalMissed: number;
  totalSkipped: number;
  total: number;
  adhPct: number;
  currentStreak: number;
}

export interface ExportRow {
  date: string;
  medicine: string;
  dosage: string;
  scheduledTime: string;
  status: string;
  takenAt: string;
}

export interface HistoryFilters {
  medicineId?: string;
  status?: DoseStatus;
  startDate?: string;
  endDate?: string;
  profileId?: string | null;
}

export function getHistoryLog(filters: HistoryFilters = {}): HistoryDose[] {
  const conditions = [ne(doseLogs.status, DOSE_STATUS.PENDING)];
  if (filters.medicineId) conditions.push(eq(doseLogs.medicineId, filters.medicineId));
  if (filters.status) conditions.push(eq(doseLogs.status, filters.status));
  if (filters.startDate)
    conditions.push(gte(doseLogs.scheduledAt, `${filters.startDate}T00:00:00`));
  if (filters.endDate) conditions.push(lte(doseLogs.scheduledAt, `${filters.endDate}T23:59:59`));
  if (filters.profileId != null) conditions.push(eq(medicines.profileId, filters.profileId));

  const rows = db
    .select({
      id: doseLogs.id,
      medicineId: doseLogs.medicineId,
      medicineName: medicines.name,
      medicineColor: medicines.color,
      dosageNum: medicines.dosage,
      dosageUnit: medicines.dosageUnit,
      scheduledAt: doseLogs.scheduledAt,
      status: doseLogs.status,
      respondedAt: doseLogs.respondedAt,
    })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(and(...conditions))
    .orderBy(desc(doseLogs.scheduledAt))
    .limit(500)
    .all();

  return rows.map((r) => ({
    id: r.id,
    medicineId: r.medicineId,
    medicineName: r.medicineName,
    medicineColor: r.medicineColor,
    dosage: `${r.dosageNum} ${r.dosageUnit}`,
    scheduledAt: r.scheduledAt,
    status: r.status as DoseStatus,
    respondedAt: r.respondedAt,
  }));
}

export function getAdherenceTrend(days: number, profileId?: string | null): AdherenceTrendPoint[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');

  const rows = db
    .select({
      date: sql<string>`substr(${doseLogs.scheduledAt}, 1, 10)`,
      total: sql<number>`count(*)`,
      taken: sql<number>`sum(case when ${doseLogs.status} = 'taken' then 1 else 0 end)`,
      missed: sql<number>`sum(case when ${doseLogs.status} = 'missed' then 1 else 0 end)`,
    })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(
      and(
        ne(doseLogs.status, DOSE_STATUS.PENDING),
        gte(doseLogs.scheduledAt, `${startDate}T00:00:00`),
        lte(doseLogs.scheduledAt, `${today}T23:59:59`),
        profileId != null ? eq(medicines.profileId, profileId) : undefined,
      ),
    )
    .groupBy(sql`substr(${doseLogs.scheduledAt}, 1, 10)`)
    .orderBy(sql`substr(${doseLogs.scheduledAt}, 1, 10)`)
    .all();

  const byDate = new Map(rows.map((r) => [r.date, r]));
  return Array.from({ length: days }, (_, i) => {
    const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
    const r = byDate.get(date);
    if (!r || r.total === 0) return { date, total: 0, taken: 0, missed: 0, adhPct: 0 };
    const adhPct = r.taken + r.missed > 0 ? Math.round((r.taken / (r.taken + r.missed)) * 100) : 0;
    return { date, total: r.total, taken: r.taken, missed: r.missed, adhPct };
  });
}

function computeStreak(profileId?: string | null): number {
  const takenDates = db
    .select({ date: sql<string>`substr(${doseLogs.scheduledAt}, 1, 10)` })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(
      and(
        eq(doseLogs.status, DOSE_STATUS.TAKEN),
        profileId != null ? eq(medicines.profileId, profileId) : undefined,
      ),
    )
    .groupBy(sql`substr(${doseLogs.scheduledAt}, 1, 10)`)
    .orderBy(desc(sql`substr(${doseLogs.scheduledAt}, 1, 10)`))
    .limit(365)
    .all()
    .map((r) => r.date);

  if (takenDates.length === 0) return 0;
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const set = new Set(takenDates);
  if (!set.has(today) && !set.has(yesterday)) return 0;
  let streak = 0;
  let date = set.has(today) ? today : yesterday;
  while (set.has(date)) {
    streak++;
    date = format(subDays(parseISO(date), 1), 'yyyy-MM-dd');
  }
  return streak;
}

export function getOverallStats(profileId?: string | null): OverallStats {
  const row = db
    .select({
      total: sql<number>`count(*)`,
      taken: sql<number>`sum(case when ${doseLogs.status} = 'taken' then 1 else 0 end)`,
      missed: sql<number>`sum(case when ${doseLogs.status} = 'missed' then 1 else 0 end)`,
      skipped: sql<number>`sum(case when ${doseLogs.status} = 'skipped' then 1 else 0 end)`,
    })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(
      and(
        ne(doseLogs.status, DOSE_STATUS.PENDING),
        profileId != null ? eq(medicines.profileId, profileId) : undefined,
      ),
    )
    .get();

  const taken = row?.taken ?? 0;
  const missed = row?.missed ?? 0;
  const adhPct = taken + missed > 0 ? Math.round((taken / (taken + missed)) * 100) : 0;
  return {
    totalTaken: taken,
    totalMissed: missed,
    totalSkipped: row?.skipped ?? 0,
    total: row?.total ?? 0,
    adhPct,
    currentStreak: computeStreak(profileId),
  };
}

export function getExportRows(startDate: string, endDate: string): ExportRow[] {
  return db
    .select({
      scheduledAt: doseLogs.scheduledAt,
      medicineName: medicines.name,
      dosageNum: medicines.dosage,
      dosageUnit: medicines.dosageUnit,
      status: doseLogs.status,
      respondedAt: doseLogs.respondedAt,
    })
    .from(doseLogs)
    .innerJoin(medicines, eq(doseLogs.medicineId, medicines.id))
    .where(
      and(
        ne(doseLogs.status, DOSE_STATUS.PENDING),
        gte(doseLogs.scheduledAt, `${startDate}T00:00:00`),
        lte(doseLogs.scheduledAt, `${endDate}T23:59:59`),
      ),
    )
    .orderBy(doseLogs.scheduledAt)
    .all()
    .map((r) => ({
      date: r.scheduledAt.slice(0, 10),
      medicine: r.medicineName,
      dosage: `${r.dosageNum} ${r.dosageUnit}`,
      scheduledTime: r.scheduledAt.slice(11, 16),
      status: r.status,
      takenAt: r.respondedAt ? r.respondedAt.slice(11, 16) : '',
    }));
}
