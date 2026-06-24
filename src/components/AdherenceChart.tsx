import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Text } from './Text';
import { useTheme } from '@/theme';
import type { AdherenceTrendPoint } from '@/db/queries/history';

interface AdherenceChartProps {
  trend7: AdherenceTrendPoint[];
  trend30: AdherenceTrendPoint[];
}

type Period = '7d' | '30d';

const BAR_MAX_H = 72;
const H_PAD = 20;

function barColor(
  point: AdherenceTrendPoint,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  if (point.total === 0) return colors.backgroundTertiary;
  if (point.adhPct >= 80) return colors.doseTaken;
  if (point.adhPct >= 50) return colors.warning;
  return colors.doseMissed;
}

interface BarProps {
  point: AdherenceTrendPoint;
  barWidth: number;
  showLabel: boolean;
  is30: boolean;
}

function Bar({ point, barWidth, showLabel, is30 }: BarProps) {
  const { colors, radii } = useTheme();
  const barH = point.total > 0 ? Math.max(Math.round((point.adhPct / 100) * BAR_MAX_H), 3) : 2;
  const color = barColor(point, colors);
  const label = is30 ? '' : format(parseISO(`${point.date}T00:00:00`), 'EEE');

  return (
    <View style={[styles.barCol, { width: barWidth }]}>
      <View style={[styles.track, { height: BAR_MAX_H }]}>
        <View
          style={[
            styles.fill,
            {
              height: barH,
              backgroundColor: color,
              borderRadius: radii.sm,
              width: Math.max(barWidth - (is30 ? 2 : 4), 2),
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text variant="caption" color={colors.textTertiary} align="center" style={styles.barLabel}>
          {label}
        </Text>
      )}
    </View>
  );
}

export function AdherenceChart({ trend7, trend30 }: AdherenceChartProps) {
  const [period, setPeriod] = useState<Period>('7d');
  const { colors, spacing, radii } = useTheme();
  const { width } = useWindowDimensions();

  const trend = period === '7d' ? trend7 : trend30;
  const chartWidth = width - H_PAD * 2;
  const barWidth = Math.floor(chartWidth / trend.length);
  const is30 = period === '30d';

  const avgAdh =
    trend.filter((p) => p.total > 0).reduce((sum, p) => sum + p.adhPct, 0) /
    Math.max(trend.filter((p) => p.total > 0).length, 1);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          borderColor: colors.border,
          marginHorizontal: spacing[5],
          marginBottom: spacing[4],
          padding: spacing[4],
        },
      ]}
    >
      <View style={[styles.header, { marginBottom: spacing[3] }]}>
        <Text variant="labelLarge" color={colors.textPrimary}>
          Adherence trend
        </Text>
        <View
          style={[
            styles.tabs,
            { backgroundColor: colors.backgroundTertiary, borderRadius: radii.md },
          ]}
        >
          {(['7d', '30d'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              accessibilityRole="tab"
              accessibilityState={{ selected: period === p }}
              accessibilityLabel={`${p === '7d' ? '7 day' : '30 day'} view`}
              style={[
                styles.tab,
                { borderRadius: radii.sm },
                period === p && { backgroundColor: colors.surface },
              ]}
            >
              <Text
                variant="caption"
                color={period === p ? colors.brandPrimary : colors.textTertiary}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.chart, { height: BAR_MAX_H + (is30 ? 4 : 20) }]}>
        {trend.map((point) => (
          <Bar key={point.date} point={point} barWidth={barWidth} showLabel={!is30} is30={is30} />
        ))}
      </View>

      <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing[2] }}>
        {`Avg ${Math.round(avgAdh)}% over last ${period === '7d' ? '7' : '30'} days`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tabs: { flexDirection: 'row', padding: 2 },
  tab: { paddingHorizontal: 10, paddingVertical: 4 },
  chart: { flexDirection: 'row', alignItems: 'flex-end' },
  barCol: { alignItems: 'center' },
  track: { justifyContent: 'flex-end', width: '100%' },
  fill: {},
  barLabel: { marginTop: 4, fontSize: 9 },
});
