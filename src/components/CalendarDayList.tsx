import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Text } from './Text';
import { Badge } from './Badge';
import { useTheme } from '@/theme';
import { DOSE_STATUS } from '@/lib/constants';
import type { CalendarDose } from '@/hooks/use-calendar-screen';
import type { BadgeVariant } from './Badge';

interface CalendarDayListProps {
  date: string;
  doses: CalendarDose[];
  onDosePress: (dose: CalendarDose) => void;
  onQuickTaken: (doseLogId: string) => void;
}

const STATUS_BADGE: Record<string, BadgeVariant> = {
  [DOSE_STATUS.TAKEN]: 'success',
  [DOSE_STATUS.MISSED]: 'danger',
  [DOSE_STATUS.PENDING]: 'primary',
  [DOSE_STATUS.SKIPPED]: 'warning',
};

const STATUS_LABEL: Record<string, string> = {
  [DOSE_STATUS.TAKEN]: 'Taken',
  [DOSE_STATUS.MISSED]: 'Missed',
  [DOSE_STATUS.PENDING]: 'Upcoming',
  [DOSE_STATUS.SKIPPED]: 'Skipped',
};

interface DoseRowProps {
  dose: CalendarDose;
  onPress: () => void;
  onQuickTaken: () => void;
}

function DoseRow({ dose, onPress, onQuickTaken }: DoseRowProps) {
  const { colors, spacing, radii } = useTheme();
  const timeLabel = format(parseISO(dose.scheduledAt), 'h:mm a');
  const isPending = dose.status === DOSE_STATUS.PENDING;
  const isOverdue =
    isPending && isPast(parseISO(dose.scheduledAt)) && !isToday(parseISO(dose.scheduledAt));
  const badgeVariant: BadgeVariant = STATUS_BADGE[dose.status] ?? 'neutral';
  const statusLabel = STATUS_LABEL[dose.status] ?? dose.status;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${dose.medicationName} ${dose.dosage} at ${timeLabel}, ${statusLabel}`}
      style={[styles.row, { borderColor: colors.border, borderRadius: radii.lg }]}
    >
      <View
        style={[styles.accent, { backgroundColor: dose.medicationColor, borderRadius: radii.sm }]}
      />
      <View style={styles.info}>
        <View style={styles.topLine}>
          <Text variant="labelLarge" numberOfLines={1} style={styles.name}>
            {dose.medicationName}
          </Text>
          <Badge
            label={isOverdue ? 'Overdue' : statusLabel}
            variant={isOverdue ? 'danger' : badgeVariant}
            size="sm"
          />
        </View>
        <Text variant="caption" color={colors.textSecondary}>
          {dose.dosage} · {timeLabel}
        </Text>
      </View>
      {isPending && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onQuickTaken();
          }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${dose.medicationName} as taken`}
          style={[
            styles.quickBtn,
            { backgroundColor: colors.successLight, borderRadius: radii.md },
          ]}
        >
          <Text variant="labelSmall" color={colors.successDark}>
            Taken
          </Text>
        </TouchableOpacity>
      )}
      <View style={[styles.chevronBox, { marginLeft: spacing[2] }]}>
        <Text variant="caption" color={colors.textTertiary}>
          {'›'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function CalendarDayList({ date, doses, onDosePress, onQuickTaken }: CalendarDayListProps) {
  const { colors, spacing } = useTheme();
  const dateLabel = format(parseISO(`${date}T00:00:00`), 'EEEE, MMMM d');

  return (
    <View style={[styles.container, { paddingHorizontal: spacing[5] }]}>
      <Text variant="overline" color={colors.textTertiary} style={styles.heading}>
        {dateLabel}
      </Text>

      {doses.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="bodySmall" color={colors.textTertiary}>
            No doses scheduled
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {doses.map((dose) => (
            <DoseRow
              key={dose.id}
              dose={dose}
              onPress={() => onDosePress(dose)}
              onQuickTaken={() => onQuickTaken(dose.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  heading: { marginBottom: 12 },
  list: { gap: 8 },
  empty: { paddingVertical: 24, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 0,
  },
  accent: { width: 4, alignSelf: 'stretch' },
  info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 3 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1 },
  quickBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  chevronBox: { paddingRight: 12 },
});
