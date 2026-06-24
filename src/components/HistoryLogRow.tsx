import { View, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Text } from './Text';
import { Badge } from './Badge';
import { useTheme } from '@/theme';
import { DOSE_STATUS } from '@/lib/constants';
import type { HistoryDose } from '@/db/queries/history';
import type { BadgeVariant } from './Badge';

interface HistoryLogRowProps {
  dose: HistoryDose;
}

const STATUS_BADGE: Record<string, BadgeVariant> = {
  [DOSE_STATUS.TAKEN]: 'success',
  [DOSE_STATUS.MISSED]: 'danger',
  [DOSE_STATUS.SKIPPED]: 'warning',
};

const STATUS_LABEL: Record<string, string> = {
  [DOSE_STATUS.TAKEN]: 'Taken',
  [DOSE_STATUS.MISSED]: 'Missed',
  [DOSE_STATUS.SKIPPED]: 'Skipped',
};

export function HistoryLogRow({ dose }: HistoryLogRowProps) {
  const { colors, spacing, radii } = useTheme();
  const scheduledTime = format(parseISO(dose.scheduledAt), 'h:mm a');
  const takenTime =
    dose.respondedAt != null && dose.status === DOSE_STATUS.TAKEN
      ? format(parseISO(dose.respondedAt), 'h:mm a')
      : null;

  return (
    <View
      style={[
        styles.row,
        {
          paddingVertical: spacing[3],
          paddingHorizontal: spacing[4],
          borderBottomColor: colors.border,
        },
      ]}
      accessibilityLabel={`${dose.medicineName} ${dose.dosage}, ${STATUS_LABEL[dose.status] ?? dose.status} at ${scheduledTime}`}
    >
      <View
        style={[styles.dot, { backgroundColor: dose.medicineColor, borderRadius: radii.full }]}
      />

      <View style={styles.info}>
        <View style={styles.topLine}>
          <Text
            variant="bodyMedium"
            color={colors.textPrimary}
            numberOfLines={1}
            style={styles.name}
          >
            {dose.medicineName}
          </Text>
          <Badge
            label={STATUS_LABEL[dose.status] ?? dose.status}
            variant={STATUS_BADGE[dose.status] ?? 'neutral'}
            size="sm"
          />
        </View>
        <View style={styles.bottomLine}>
          <Text variant="caption" color={colors.textTertiary}>
            {dose.dosage}
          </Text>
          <Text variant="caption" color={colors.textTertiary} style={styles.sep}>
            ·
          </Text>
          <Text variant="caption" color={colors.textTertiary}>
            {scheduledTime}
          </Text>
          {takenTime != null && takenTime !== scheduledTime && (
            <>
              <Text variant="caption" color={colors.textTertiary} style={styles.sep}>
                →
              </Text>
              <Text variant="caption" color={colors.doseTaken}>
                {takenTime}
              </Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 10, height: 10, marginRight: 12, flexShrink: 0 },
  info: { flex: 1 },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  name: { flex: 1 },
  bottomLine: { flexDirection: 'row', alignItems: 'center' },
  sep: { marginHorizontal: 4 },
});
