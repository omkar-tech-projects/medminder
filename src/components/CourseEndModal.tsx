import { useState } from 'react';
import { View, Modal, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '@/theme';
import { deactivateMedicine, extendCourse } from '@/services/refill-service';
import { useSettingsStore } from '@/store/settings-store';
import { useDoseStore } from '@/store/dose-store';
import { format } from 'date-fns';
import type { Medicine } from '@/db/schema';

const EXTEND_OPTIONS = [
  { days: 7, label: '+7 days' },
  { days: 14, label: '+14 days' },
  { days: 30, label: '+30 days' },
] as const;

interface CourseEndModalProps {
  medicine: Medicine;
  onDone: () => void;
  onDismiss: () => void;
}

export function CourseEndModal({ medicine, onDone, onDismiss }: CourseEndModalProps) {
  const [busy, setBusy] = useState(false);
  const { colors, spacing, radii } = useTheme();
  const refillWarningDays = useSettingsStore((s) => s.refillWarningDays);

  async function handleDeactivate(): Promise<void> {
    setBusy(true);
    await deactivateMedicine(medicine.id).catch(() => undefined);
    useDoseStore.getState().loadForDate(format(new Date(), 'yyyy-MM-dd'));
    setBusy(false);
    onDone();
  }

  async function handleExtend(days: number): Promise<void> {
    setBusy(true);
    await extendCourse(medicine, days, refillWarningDays).catch(() => undefined);
    useDoseStore.getState().loadForDate(format(new Date(), 'yyyy-MM-dd'));
    setBusy(false);
    onDone();
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onDismiss} accessibilityLabel="Dismiss">
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]} />
      </TouchableWithoutFeedback>

      <View style={styles.centeredContainer} pointerEvents="box-none">
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderRadius: radii['2xl'],
              padding: spacing[6],
              marginHorizontal: spacing[5],
            },
          ]}
        >
          <View
            style={[styles.dot, { backgroundColor: medicine.color, marginBottom: spacing[3] }]}
          />

          <Text variant="headingSmall" style={{ marginBottom: spacing[1] }}>
            Course ended
          </Text>
          <Text
            variant="bodyMedium"
            color={colors.textSecondary}
            style={{ marginBottom: spacing[1] }}
          >
            {medicine.name}
          </Text>
          <Text variant="caption" color={colors.textTertiary} style={{ marginBottom: spacing[5] }}>
            {`Ended on ${medicine.endDate ?? 'unknown date'}`}
          </Text>

          <Button
            label="Mark as completed"
            variant="primary"
            fullWidth
            onPress={() => void handleDeactivate()}
            disabled={busy}
            accessibilityLabel="Mark this medicine course as completed and stop reminders"
          />

          <Text
            variant="overline"
            color={colors.textTertiary}
            style={{ marginTop: spacing[5], marginBottom: spacing[2] }}
          >
            Extend course
          </Text>
          <View style={styles.extendRow}>
            {EXTEND_OPTIONS.map(({ days, label }) => (
              <TouchableOpacity
                key={days}
                onPress={() => void handleExtend(days)}
                disabled={busy}
                accessibilityLabel={`Extend course by ${days} days`}
                accessibilityRole="button"
                style={[
                  styles.extendBtn,
                  {
                    borderColor: colors.brandPrimary,
                    borderRadius: radii.lg,
                    paddingVertical: spacing[2],
                    flex: 1,
                  },
                ]}
              >
                <Text variant="labelLarge" color={colors.brandPrimary} align="center">
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={onDismiss}
            accessibilityLabel="Remind me later"
            accessibilityRole="button"
            style={{ marginTop: spacing[4], alignSelf: 'center' }}
          >
            <Text variant="caption" color={colors.textTertiary}>
              Remind me later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { width: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
  dot: { width: 28, height: 28, borderRadius: 14 },
  extendRow: { flexDirection: 'row', gap: 8 },
  extendBtn: { borderWidth: 1, alignItems: 'center' },
});
