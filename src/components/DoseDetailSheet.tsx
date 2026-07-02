import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { format, parseISO, isPast } from 'date-fns';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Text } from './Text';
import { Badge } from './Badge';
import { useTheme } from '@/theme';
import { DOSE_STATUS } from '@/lib/constants';
import { getDoseDisplayStatus, DISPLAY_STATUS_BADGE, DISPLAY_STATUS_LABEL } from '@/lib/dose-display';
import type { TodayDose } from '@/repositories/dose-repository';

interface DoseDetailSheetProps {
  dose: TodayDose | null;
  visible: boolean;
  onClose: () => void;
  onConfirmTaken: (doseLogId: string) => void;
  /** When provided, allows reverting a taken dose back to pending. */
  onRevertToPending?: (doseLogId: string) => void;
  /** When provided, shows a "Skip dose" button instead of "No, not yet" */
  onSkip?: (doseLogId: string) => void;
  instructions?: string | null;
  onMedicineSettings?: () => void;
}

export function DoseDetailSheet({
  dose,
  visible,
  onClose,
  onConfirmTaken,
  onRevertToPending,
  onSkip,
  instructions,
  onMedicineSettings,
}: DoseDetailSheetProps) {
  const { colors, spacing } = useTheme();

  if (!dose) return null;

  const displayStatus = getDoseDisplayStatus(dose.status, dose.scheduledAt);
  const badgeVariant = DISPLAY_STATUS_BADGE[displayStatus];
  const statusLabel = DISPLAY_STATUS_LABEL[displayStatus];

  const scheduledTime = format(parseISO(dose.scheduledAt), 'h:mm a');
  const isOverdue = dose.status === DOSE_STATUS.PENDING && isPast(parseISO(dose.scheduledAt));
  const canConfirm = dose.status === DOSE_STATUS.PENDING || dose.status === DOSE_STATUS.MISSED;
  const isTaken = dose.status === DOSE_STATUS.TAKEN;
  const canRevert = isTaken && onRevertToPending != null;

  const respondedTime =
    dose.respondedAt != null ? format(parseISO(dose.respondedAt), 'h:mm a') : null;

  const hasInstructions = instructions != null && instructions.trim().length > 0;

  let sheetHeight: number;
  if (canRevert) {
    sheetHeight = hasInstructions ? 420 : 370;
  } else if (canConfirm) {
    sheetHeight = onSkip != null
      ? hasInstructions ? 460 : 400
      : hasInstructions ? 400 : 360;
  } else {
    sheetHeight = hasInstructions ? 360 : 300;
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={dose.medicationName}
      height={sheetHeight}
    >
      <View style={styles.meta}>
        <Text variant="bodyMedium" color={colors.textSecondary}>
          {dose.dosage}
        </Text>
        <View style={styles.timeRow}>
          <Text variant="bodySmall" color={colors.textTertiary}>
            Scheduled {scheduledTime}
          </Text>
          {isOverdue && (
            <Text variant="bodySmall" color={colors.danger} style={{ marginLeft: spacing[2] }}>
              · Overdue
            </Text>
          )}
        </View>

        <View style={[styles.statusRow, { marginTop: spacing[3] }]}>
          <Badge label={statusLabel} variant={badgeVariant} />
          {isTaken && respondedTime != null && (
            <Text variant="caption" color={colors.textSecondary} style={{ marginLeft: spacing[2] }}>
              at {respondedTime}
            </Text>
          )}
        </View>

        {hasInstructions && (
          <View
            style={[
              styles.instructionsBox,
              { backgroundColor: colors.backgroundSecondary, marginTop: spacing[3] },
            ]}
          >
            <Text variant="overline" color={colors.textTertiary} style={styles.instructionsLabel}>
              Instructions
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary}>
              {instructions}
            </Text>
          </View>
        )}
      </View>

      {canRevert ? (
        /* Taken — offer a way to undo */
        <View style={styles.actions}>
          <Button
            label="Mark as not taken"
            onPress={() => {
              onRevertToPending!(dose.id);
              onClose();
            }}
            variant="destructive"
            fullWidth
            leftIcon="close-circle-outline"
            accessibilityLabel={`Mark ${dose.medicationName} as not taken`}
          />
          <Button
            label="Close"
            onPress={onClose}
            variant="ghost"
            fullWidth
            style={{ marginTop: spacing[2] }}
            accessibilityLabel="Close dose details"
          />
        </View>
      ) : canConfirm ? (
        <View style={styles.actions}>
          <Button
            label="Yes, taken"
            onPress={() => {
              onConfirmTaken(dose.id);
              onClose();
            }}
            variant="primary"
            fullWidth
            leftIcon="checkmark-circle-outline"
            accessibilityLabel={`Mark ${dose.medicationName} as taken`}
          />
          {onSkip != null ? (
            <Button
              label="Skip this dose"
              onPress={() => {
                onSkip(dose.id);
                onClose();
              }}
              variant="ghost"
              fullWidth
              style={{ marginTop: spacing[2] }}
              accessibilityLabel={`Skip this dose of ${dose.medicationName}`}
            />
          ) : (
            <Button
              label="No, not yet"
              onPress={onClose}
              variant="ghost"
              fullWidth
              style={{ marginTop: spacing[2] }}
              accessibilityLabel="Dismiss — the reminder will continue"
            />
          )}
        </View>
      ) : (
        <Button
          label="Close"
          onPress={onClose}
          variant="secondary"
          fullWidth
          accessibilityLabel="Close dose details"
        />
      )}

      {onMedicineSettings != null && (
        <TouchableOpacity
          onPress={onMedicineSettings}
          style={{ alignSelf: 'center', marginTop: spacing[3] }}
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Open medicine settings"
        >
          <Text variant="caption" color={colors.brandPrimary}>
            Medicine settings
          </Text>
        </TouchableOpacity>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  meta: { marginBottom: 20 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  instructionsBox: { borderRadius: 8, padding: 12 },
  instructionsLabel: { marginBottom: 4 },
  actions: {},
});
