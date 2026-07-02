import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Text } from './Text';
import { Badge } from './Badge';
import { useTheme } from '@/theme';
import { getDoseDisplayStatus, DISPLAY_STATUS_BADGE, DISPLAY_STATUS_LABEL } from '@/lib/dose-display';
import type { TodayDose } from '@/repositories/dose-repository';

interface DoseTimelineItemProps {
  dose: TodayDose;
  isLast: boolean;
  onPress?: () => void;
}

export function DoseTimelineItem({ dose, isLast, onPress }: DoseTimelineItemProps) {
  const { colors, spacing } = useTheme();

  const displayStatus = getDoseDisplayStatus(dose.status, dose.scheduledAt);
  const isFuture = displayStatus === 'upcoming';
  const badgeVariant = DISPLAY_STATUS_BADGE[displayStatus];
  const statusLabel = DISPLAY_STATUS_LABEL[displayStatus];

  const dotBorderColor = isFuture ? colors.brandPrimary : dose.medicationColor;
  const dotBgColor = isFuture ? colors.brandPrimaryLight : dose.medicationColor;

  const timeLabel = format(parseISO(dose.scheduledAt), 'h:mm a');
  const a11yLabel = `${dose.medicationName} ${dose.dosage} at ${timeLabel}, ${statusLabel}`;

  const cardBaseStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: isFuture ? colors.border : 'transparent',
      borderRadius: 16,
      marginBottom: spacing[3],
      shadowColor: 'rgba(15,27,45,1)',
    },
  ];

  const cardInner = (
    <>
      <View
        style={[styles.accent, { backgroundColor: dose.medicationColor, borderRadius: 4 }]}
        accessibilityElementsHidden
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.nameBlock}>
            {/* numberOfLines removed — allow long names to wrap to a second line */}
            <Text variant="labelLarge">{dose.medicationName}</Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {dose.dosage}
            </Text>
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
