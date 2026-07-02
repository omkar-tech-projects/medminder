import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Text } from './Text';
import { Badge } from './Badge';
import { useTheme } from '@/theme';
import { getDoseDisplayStatus, DISPLAY_STATUS_BADGE, DISPLAY_STATUS_LABEL } from '@/lib/dose-display';
import type { CalendarDose } from '@/hooks/use-calendar-screen';

interface CalendarDayListProps {
  date: string;
  doses: CalendarDose[];
  onDosePress: (dose: CalendarDose) => void;
  onQuickTaken: (doseLogId: string) => void;
}

interface DoseRowProps {
  dose: CalendarDose;
  onPress: () => void;
  onQuickTaken: () => void;
}

function DoseRow({ dose, onPress, onQuickTaken }: DoseRowProps) {
  const { colors, spacing, radii } = useTheme();
  const timeLabel = format(parseISO(dose.scheduledAt), 'h:mm a');

  const displayStatus = getDoseDisplayStatus(dose.status, dose.scheduledAt);
  const badgeVariant = DISPLAY_STATUS_BADGE[displayStatus];
  const statusLabel = DISPLAY_STATUS_LABEL[displayStatus];

  // Show badge for every status except "upcoming" (which is shown inline via time label)
  const showBadge = displayStatus !== 'upcoming';
  // Only show the quick action for past-pending doses, not future ones
  const showQuickTaken = displayStatus === 'yetToTake';

  return (
    // Outer View owns border/radius/overflow so the accent bar clips correctly.
    // The main row content and the quick-action button are siblings at this level
    // so they are never nested touchables — fixing the 2-3 tap registration issue.
    <View style={[styles.row, { borderColor: colors.border, borderRadius: radii.lg }]}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${dose.medicationName} ${dose.dosage} at ${timeLabel}, ${statusLabel}`}
        style={styles.rowMain}
      >
        <View
          style={[styles.accent, { backgroundColor: dose.medicationColor, borderRadius: radii.sm }]}
        />
        <View style={styles.info}>
          <View style={styles.topLine}>
            {/* No numberOfLines — allow long names to wrap fully without ellipsis */}
            <Text variant="labelLarge" style={styles.name}>
              {dose.medicationName}
            </Text>
            {showBadge && (
              <Badge label={statusLabel} variant={badgeVariant} size="sm" />
            )}
          </View>
          <Text variant="caption" color={colors.textSecondary}>
            {dose.dosage} · {timeLabel}
          </Text>
        </View>
        <View style={[styles.chevronBox, { marginLeft: spacing[2] }]}>
          <Text variant="caption" color={colors.textTertiary}>
            {'›'}
          </Text>
        </View>
      </TouchableOpacity>

      {showQuickTaken && (
        // Sibling of rowMain — not nested — so each tap reliably hits only this button.
        // Neutral/outline style so it reads as an action, not a "Taken" status badge.
        <TouchableOpacity
          onPress={onQuickTaken}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${dose.medicationName} as taken`}
          style={[
            styles.quickBtn,
            { borderColor: colors.border, borderRadius: radii.md, marginRight: spacing[2] },
          ]}
        >
          <Text variant="labelSmall" color={colors.textSecondary}>
            Mark taken
          </Text>
        </TouchableOpacity>
      )}
    </View>
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
  },
  // flex:1 so it fills all horizontal space except the quick-action button
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  accent: { width: 4, alignSelf: 'stretch' },
  info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 3 },
  topLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: { flex: 1 },
  quickBtn: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  chevronBox: { paddingRight: 12 },
});
