import { useCallback, useState } from 'react';
import { Share, Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { format, subDays } from 'date-fns';
import { getExportRows, getOverallStats } from '@/db/queries/history';
import type { ActiveFilters, RangeKey } from './use-history-screen';

const RANGE_DAYS: Record<RangeKey, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
};

function buildCsv(filters: ActiveFilters): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  const days = RANGE_DAYS[filters.rangeKey];
  const startDate =
    days != null ? format(subDays(new Date(), days - 1), 'yyyy-MM-dd') : '2000-01-01';
  const stats = getOverallStats();
  const rows = getExportRows(startDate, today);

  const meta = [
    '# MedMinder Adherence Report',
    `# Generated: ${today}`,
    `# Period: ${filters.rangeKey === 'all' ? 'All time' : `Last ${filters.rangeKey}`}`,
    `# Overall Adherence: ${stats.adhPct}% (taken / taken+missed)`,
    `# Current Streak: ${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}`,
    `# Taken: ${stats.totalTaken}  |  Missed: ${stats.totalMissed}  |  Skipped: ${stats.totalSkipped}`,
    '#',
    'Date,Medicine,Dosage,Scheduled Time,Status,Taken At',
  ].join('\n');

  const dataRows = rows.map((r) =>
    [r.date, `"${r.medicine}"`, `"${r.dosage}"`, r.scheduledTime, r.status, r.takenAt].join(','),
  );

  return [meta, ...dataRows].join('\n');
}

export function useExport() {
  const [exporting, setExporting] = useState(false);

  const exportReport = useCallback(async (filters: ActiveFilters): Promise<void> => {
    setExporting(true);
    try {
      const csv = buildCsv(filters);
      const filename = `medminder-${format(new Date(), 'yyyy-MM-dd')}.csv`;

      if (Platform.OS === 'ios') {
        const file = new File(Paths.document, filename);
        file.write(csv);
        await Share.share({ url: file.uri, title: filename });
      } else {
        await Share.share({ message: csv, title: filename });
      }
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportReport, exporting };
}
