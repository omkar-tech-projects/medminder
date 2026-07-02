import { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import {
  getHistoryLog,
  getAdherenceTrend,
  getOverallStats,
  type HistoryDose,
  type HistoryFilters,
  type AdherenceTrendPoint,
  type OverallStats,
} from '@/db/queries/history';
import { formatDisplayDate } from '@/lib/date-utils';
import { getAllMedicines } from '@/db/queries/medicines';
import { useProfileStore } from '@/store/profile-store';
import type { Medicine } from '@/db/schema';
import type { DoseStatus } from '@/types/dose';

export type RangeKey = '7d' | '30d' | '90d' | 'all';

export interface HistorySection {
  date: string;
  dateLabel: string;
  taken: number;
  total: number;
  data: HistoryDose[];
}

export interface ActiveFilters {
  rangeKey: RangeKey;
  medicineId: string | null;
  status: DoseStatus | null;
}

const RANGE_DAYS: Record<RangeKey, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
};

function buildDateFilter(rangeKey: RangeKey): { startDate?: string; endDate?: string } {
  const days = RANGE_DAYS[rangeKey];
  if (days == null) return {};
  return {
    startDate: format(subDays(new Date(), days - 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  };
}

function groupByDate(doses: HistoryDose[]): HistorySection[] {
  const map = new Map<string, HistoryDose[]>();
  for (const d of doses) {
    const date = d.scheduledAt.slice(0, 10);
    const list = map.get(date) ?? [];
    list.push(d);
    map.set(date, list);
  }
  return Array.from(map.entries()).map(([date, data]) => {
    const taken = data.filter((d) => d.status === 'taken').length;
    return {
      date,
      dateLabel: formatDisplayDate(`${date}T00:00:00`),
      taken,
      total: data.length,
      data,
    };
  });
}

export function useHistoryScreen() {
  const activeProfileId = useProfileStore((s) => s.activeProfileId);

  const [filters, setFilters] = useState<ActiveFilters>({
    rangeKey: '7d',
    medicineId: null,
    status: null,
  });
  const [sections, setSections] = useState<HistorySection[]>([]);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const [trend7, setTrend7] = useState<AdherenceTrendPoint[]>([]);
  const [trend30, setTrend30] = useState<AdherenceTrendPoint[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback((): void => {
    setLoading(true);
    const dateFilter = buildDateFilter(filters.rangeKey);
    const q: HistoryFilters = {
      ...dateFilter,
      medicineId: filters.medicineId ?? undefined,
      status: filters.status ?? undefined,
      profileId: activeProfileId,
    };
    const doses = getHistoryLog(q);
    setSections(groupByDate(doses));
    setStats(getOverallStats(activeProfileId));
    setTrend7(getAdherenceTrend(7, activeProfileId));
    setTrend30(getAdherenceTrend(30, activeProfileId));
    setMedicines(getAllMedicines(activeProfileId));
    setLoading(false);
  }, [filters, activeProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFilter = useCallback(
    <K extends keyof ActiveFilters>(key: K, value: ActiveFilters[K]): void => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  return {
    sections,
    stats,
    trend7,
    trend30,
    medicines,
    loading,
    filters,
    updateFilter,
    refresh: load,
  };
}
