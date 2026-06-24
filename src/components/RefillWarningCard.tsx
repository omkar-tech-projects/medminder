import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/theme';
import type { RefillWarning } from '@/hooks/use-refill-warnings';

const REMINDER_OPTIONS = [3, 7, 14] as const;

interface RefillWarningCardProps {
  warning: RefillWarning;
  onDismiss: () => void;
  onSetReminder: (daysFromNow: number) => Promise<void>;
}

export function RefillWarningCard({ warning, onDismiss, onSetReminder }: RefillWarningCardProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [setting, setSetting] = useState(false);
  const { colors, spacing, radii } = useTheme();

  const isEndingSoon = warning.type === 'ending-soon';
  const accentColor = isEndingSoon ? colors.warning : colors.danger;

  const title = isEndingSoon
    ? warning.daysLeft === 0
      ? 'Course ends today'
      : warning.daysLeft === 1
        ? 'Course ends tomorrow'
        : `Course ends in ${warning.daysLeft} days`
    : `~${warning.stockDaysLeft} day${warning.stockDaysLeft !== 1 ? 's' : ''} of stock left`;

  const subtitle = isEndingSoon
    ? `Your course of ${warning.medicineName} ends on ${warning.endDate}.`
    : `${warning.medicineName} — time to refill.`;

  async function handleReminder(days: number): Promise<void> {
    setSetting(true);
    await onSetReminder(days).catch(() => undefined);
    setSetting(false);
    setShowOptions(false);
    onDismiss();
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: accentColor,
          borderRadius: radii.xl,
          padding: spacing[4],
          marginBottom: spacing[3],
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: warning.medicineColor }]} />
          <View style={styles.titleBlock}>
            <Text variant="labelLarge" color={accentColor}>
              {title}
            </Text>
            <Text variant="caption" color={colors.textSecondary}>
              {subtitle}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          accessibilityLabel="Dismiss warning"
          accessibilityRole="button"
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="close" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {showOptions ? (
        <View style={[styles.optionsRow, { marginTop: spacing[3] }]}>
          {REMINDER_OPTIONS.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => void handleReminder(d)}
              disabled={setting}
              accessibilityLabel={`Set reminder in ${d} days`}
              accessibilityRole="button"
              style={[
                styles.optionBtn,
                {
                  borderColor: colors.brandPrimary,
                  borderRadius: radii.md,
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1],
                },
              ]}
            >
              <Text variant="caption" color={colors.brandPrimary}>
                {`In ${d}d`}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setShowOptions(false)}
            accessibilityLabel="Cancel"
            accessibilityRole="button"
          >
            <Text variant="caption" color={colors.textTertiary}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setShowOptions(true)}
          accessibilityLabel="Set refill reminder"
          accessibilityRole="button"
          style={[styles.reminderBtn, { marginTop: spacing[2] }]}
        >
          <Ionicons name="alarm-outline" size={13} color={colors.brandPrimary} />
          <Text variant="caption" color={colors.brandPrimary} style={{ marginLeft: 4 }}>
            Set refill reminder
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3, marginRight: 8 },
  titleBlock: { flex: 1 },
  optionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionBtn: { borderWidth: 1 },
  reminderBtn: { flexDirection: 'row', alignItems: 'center' },
});
