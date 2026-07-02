import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme';
import type { OverallStats } from '@/db/queries/history';

interface AdherenceStatsProps {
  stats: OverallStats;
}

interface StatChipProps {
  value: string;
  label: string;
  valueColor: string;
}

function StatChip({ value, label, valueColor }: StatChipProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.chip}>
      <Text variant="displaySmall" color={valueColor} style={styles.value}>
        {value}
      </Text>
      <Text variant="caption" color={colors.textTertiary} align="center">
        {label}
      </Text>
    </View>
  );
}

export function AdherenceStats({ stats }: AdherenceStatsProps) {
  const { colors, spacing } = useTheme();

  const adherenceColor =
    stats.adhPct >= 80 ? colors.doseTaken : stats.adhPct >= 50 ? colors.warning : colors.doseMissed;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRadius: 20,
          borderColor: colors.border,
          padding: spacing[5],
          marginHorizontal: spacing[5],
          marginBottom: spacing[4],
        },
      ]}
    >
      <View style={styles.row}>
        <StatChip value={`${stats.adhPct}%`} label="Adherence" valueColor={adherenceColor} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <StatChip
          value={String(stats.currentStreak)}
          label={`Day streak`}
          valueColor={stats.currentStreak > 0 ? colors.warning : colors.textTertiary}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <StatChip value={String(stats.totalTaken)} label="Taken" valueColor={colors.doseTaken} />
      </View>

      <View style={[styles.miniRow, { marginTop: spacing[3] }]}>
        <Text variant="caption" color={colors.textTertiary}>
          <Text variant="caption" color={colors.doseMissed}>
            {stats.totalMissed}
          </Text>
          {' missed'}
        </Text>
        <Text variant="caption" color={colors.textTertiary} style={styles.dot}>
          ·
        </Text>
        <Text variant="caption" color={colors.textTertiary}>
          <Text variant="caption" color={colors.doseSnoozed}>
            {stats.totalSkipped}
          </Text>
          {' skipped'}
        </Text>
        <Text variant="caption" color={colors.textTertiary} style={styles.dot}>
          ·
        </Text>
        <Text variant="caption" color={colors.textTertiary}>
          {stats.total} total
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: { flex: 1, alignItems: 'center', gap: 4 },
  value: { fontVariant: ['tabular-nums'] },
  divider: { width: StyleSheet.hairlineWidth, height: 40, marginHorizontal: 8 },
  miniRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  dot: { opacity: 0.4 },
});
