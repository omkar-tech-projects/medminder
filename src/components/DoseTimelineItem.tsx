import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Text } from './Text';
import { Badge } from './Badge';
import { useTheme } from '@/theme';
import { DOSE_STATUS } from '@/lib/constants';
import type { TodayDose } from '@/repositories/dose-repository';
import type { BadgeVariant } from './Badge';

interface DoseTimelineItemProps {
  dose: TodayDose;
  isLast: boolean;
  onPress?: () => void;
}

const STATUS_BADGE: Record<string, BadgeVariant> = {
  [DOSE_STATUS.TAKEN]: 'success',
  [DOSE_STATUS.MISSED]: 'danger',
  [DOSE_STATUS.PENDING]: 'primary',
  [DOSE_STATUS.SNOOZED]: 'warning',
};

const STATUS_LABEL: Record<string, string> = {
  [DOSE_STATUS.TAKEN]: 'Taken',
  [DOSE_STATUS.MISSED]: 'Missed',
  [DOSE_STATUS.PENDING]: 'Upcoming',
  [DOSE_STATUS.SNOOZED]: 'Snoozed',
};

export function DoseTimelineItem({ dose, isLast, onPress }: DoseTimelineItemProps) {
  const { colors, spacing, radii } = useTheme();
  const isFuture = dose.status === DOSE_STATUS.PENDING || dose.status === DOSE_STATUS.SNOOZED;

  const dotBorderColor = isFuture ? colors.brandPrimary : dose.medicationColor;
  const dotBgColor = isFuture ? colors.brandPrimaryLight : dose.medicationColor;

  const timeLabel = format(parseISO(dose.scheduledAt), 'h:mm a');
  const badgeVariant: BadgeVariant = STATUS_BADGE[dose.status] ?? 'neutral';
  const statusLabel = STATUS_LABEL[dose.status] ?? dose.status;
  const a11yLabel = `${dose.medicationName} ${dose.dosage} at ${timeLabel}, ${statusLabel}`;

  const cardBaseStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: isFuture ? colors.border : 'transparent',
      borderRadius: radii.lg,
      marginBottom: spacing[3],
      shadowColor: colors.shadow,
    },
  ];

  const cardInner = (
    <>
      <View
        style={[styles.accent, { backgroundColor: dose.medicationColor, borderRadius: radii.sm }]}
        accessibilityElementsHidden
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.nameBlock}>
            <Text variant="labelLarge" numberOfLines={1}>{dose.medicationName}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>{dose.dosage}</Text>
          </View>
          <Badge label={statusLabel} variant={badgeVariant} size="sm" />
        </View>
        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing[1] }}>
          {timeLabel}
        </Text>
      </View>
    </>
  );

  return (
    <View style={styles.row}>
      {/* Timeline spine */}
      <View style={styles.spine} accessibilityElementsHidden>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: dotBgColor,
              borderColor: dotBorderColor,
              shadowColor: isFuture ? 'transparent' : dose.medicationColor,
            },
          ]}
        />
        {!isLast && <View style={[styles.line, { backgroundColor: colors.border }]} />}
      </View>

      {/* Card — pressable or static */}
      {onPress != null ? (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          style={cardBaseStyle}
        >
          {cardInner}
        </TouchableOpacity>
      ) : (
        <View accessibilityLabel={a11yLabel} style={cardBaseStyle}>
          {cardInner}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  spine: { width: 28, alignItems: 'center' },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    marginTop: 14,
    zIndex: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  line: { width: 2, flex: 1, marginTop: 2 },
  card: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  accent: { width: 4 },
  content: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  nameBlock: { flex: 1, gap: 1 },
});
