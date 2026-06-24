import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Screen,
  AppHeader,
  CalendarMonth,
  CalendarDayList,
  DoseDetailSheet,
  Text,
} from '@/components';
import { useTheme } from '@/theme';
import { useCalendarScreen } from '@/hooks/use-calendar-screen';
import { useDoseConfirmation } from '@/hooks/use-dose-confirmation';
import type { CalendarDose } from '@/hooks/use-calendar-screen';

export default function CalendarScreen() {
  const { colors, spacing } = useTheme();
  const {
    today,
    viewMonth,
    selectedDate,
    setSelectedDate,
    dayStatuses,
    doses,
    refresh,
    prevMonth,
    nextMonth,
    jumpToToday,
  } = useCalendarScreen();

  const { confirmTaken, confirmSkip } = useDoseConfirmation();
  const [sheetDose, setSheetDose] = useState<CalendarDose | null>(null);

  const showTodayButton = selectedDate !== today || selectedDate.slice(0, 7) !== today.slice(0, 7);

  const handleConfirmTaken = (doseLogId: string): void => {
    confirmTaken(doseLogId);
    refresh();
  };

  const handleSkip = (doseLogId: string): void => {
    confirmSkip(doseLogId);
    refresh();
  };

  return (
    <Screen scroll edges={['top']} contentContainerStyle={{ paddingBottom: 48 }}>
      <AppHeader
        title="Calendar"
        rightAction={
          showTodayButton
            ? {
                icon: 'today-outline',
                onPress: jumpToToday,
                accessibilityLabel: 'Jump to today',
              }
            : undefined
        }
      />

      {/* Month grid */}
      <View style={{ paddingTop: spacing[2], paddingBottom: spacing[5] }}>
        <CalendarMonth
          month={viewMonth}
          today={today}
          selectedDate={selectedDate}
          dayStatuses={dayStatuses}
          onDayPress={setSelectedDate}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
        />
      </View>

      {/* Dot legend */}
      <View
        style={[styles.legend, { paddingHorizontal: spacing[5], borderTopColor: colors.border }]}
      >
        <LegendItem color={colors.doseTaken} label="All taken" />
        <LegendItem color={colors.warning} label="Partial" />
        <LegendItem color={colors.doseMissed} label="Missed" />
        <LegendItem color={colors.dosePending} label="Upcoming" />
      </View>

      {/* Day dose list */}
      <View style={{ marginTop: spacing[5] }}>
        <CalendarDayList
          date={selectedDate}
          doses={doses}
          onDosePress={(dose) => setSheetDose(dose)}
          onQuickTaken={handleConfirmTaken}
        />
      </View>

      {/* Detail sheet */}
      <DoseDetailSheet
        dose={sheetDose}
        visible={sheetDose != null}
        onClose={() => setSheetDose(null)}
        onConfirmTaken={(id) => {
          handleConfirmTaken(id);
          setSheetDose(null);
        }}
        onSkip={(id) => {
          handleSkip(id);
          setSheetDose(null);
        }}
        instructions={sheetDose?.instructions}
      />
    </Screen>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="caption" color={colors.textSecondary}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
