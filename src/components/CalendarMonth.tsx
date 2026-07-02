import { View, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { format, getDay, getDaysInMonth, startOfMonth } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/theme';
import type { DayAdherence } from '@/hooks/use-calendar-screen';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const H_PAD = 20;

interface CalendarMonthProps {
  month: Date;
  today: string;
  selectedDate: string;
  dayStatuses: Record<string, DayAdherence>;
  onDayPress: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function dotColor(a: DayAdherence, colors: ReturnType<typeof useTheme>['colors']): string | null {
  if (a.total === 0) return null;
  if (a.taken === a.total) return colors.doseTaken;
  if (a.taken > 0) return colors.warning;
  if (a.missed > 0) return colors.doseMissed;
  return colors.dosePending;
}

interface DayCellProps {
  day: number;
  dateStr: string;
  isToday: boolean;
  isSelected: boolean;
  adherence: DayAdherence | undefined;
  cellWidth: number;
  onPress: () => void;
}

function DayCell({
  day,
  dateStr,
  isToday,
  isSelected,
  adherence,
  cellWidth,
  onPress,
}: DayCellProps) {
  const { colors } = useTheme();
  const dot = adherence != null ? dotColor(adherence, colors) : null;

  const bg = isSelected ? colors.brandPrimary : isToday ? colors.brandPrimaryLight : 'transparent';
  const numColor = isSelected
    ? colors.textInverse
    : isToday
      ? colors.brandPrimary
      : colors.textPrimary;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${dateStr}${isToday ? ', today' : ''}`}
      accessibilityState={{ selected: isSelected }}
      style={[styles.cell, { width: cellWidth, height: cellWidth + 10 }]}
    >
      <View style={[styles.dayCircle, { backgroundColor: bg, borderRadius: 9999 }]}>
        <Text variant="bodySmall" color={numColor} style={styles.dayNum}>
          {String(day)}
        </Text>
      </View>
      {dot != null && <View style={[styles.dot, { backgroundColor: dot }]} />}
    </TouchableOpacity>
  );
}

export function CalendarMonth({
  month,
  today,
  selectedDate,
  dayStatuses,
  onDayPress,
  onPrevMonth,
  onNextMonth,
}: CalendarMonthProps) {
  const { colors, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const cellWidth = Math.floor((width - H_PAD * 2) / 7);

  const firstDay = startOfMonth(month);
  // Monday-first: Sunday (0) maps to position 6, Mon (1) → 0, etc.
  const startOffset = (getDay(firstDay) + 6) % 7;
  const daysInMonth = getDaysInMonth(month);
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const monthLabel = format(month, 'MMMM yyyy');

  return (
    <View style={[styles.container, { paddingHorizontal: H_PAD }]}>
      {/* Month navigation header */}
      <View style={[styles.header, { marginBottom: spacing[3] }]}>
        <TouchableOpacity
          onPress={onPrevMonth}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Previous month"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text variant="headingSmall" color={colors.textPrimary}>
          {monthLabel}
        </Text>
        <TouchableOpacity
          onPress={onNextMonth}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Next month"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Weekday labels */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <View key={i} style={[styles.weekCell, { width: cellWidth }]}>
            <Text variant="caption" color={colors.textTertiary} style={styles.weekLabel}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - startOffset + 1;
          if (dayNum < 1 || dayNum > daysInMonth) {
            return (
              <View key={i} style={[styles.cell, { width: cellWidth, height: cellWidth + 10 }]} />
            );
          }
          const dateStr = `${format(month, 'yyyy-MM')}-${String(dayNum).padStart(2, '0')}`;
          return (
            <DayCell
              key={i}
              day={dayNum}
              dateStr={dateStr}
              isToday={dateStr === today}
              isSelected={dateStr === selectedDate}
              adherence={dayStatuses[dateStr]}
              cellWidth={cellWidth}
              onPress={() => onDayPress(dateStr)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekCell: { alignItems: 'center' },
  weekLabel: { textTransform: 'uppercase', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 },
  dayCircle: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontVariant: ['tabular-nums'] },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
});
