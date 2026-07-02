import { useEffect, useState } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/theme';

interface TimePickerModalProps {
  visible: boolean;
  initial?: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

function fmt(n: number): string {
  return String(n).padStart(2, '0');
}

export function TimePickerModal({
  visible,
  initial = '08:00',
  onConfirm,
  onCancel,
}: TimePickerModalProps) {
  const { colors, spacing } = useTheme();

  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (visible) {
      const parts = initial.split(':');
      const h = parseInt(parts[0] ?? '8', 10);
      const m = parseInt(parts[1] ?? '0', 10);
      setHour(isNaN(h) ? 8 : h % 24);
      setMinute((Math.round((isNaN(m) ? 0 : m) / 5) * 5) % 60);
    }
  }, [visible, initial]);

  const adjHour = (d: number): void => setHour((prev) => (prev + d + 24) % 24);
  const adjMin = (d: number): void => setMinute((prev) => (prev + d * 5 + 60) % 60);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onCancel}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text variant="headingSmall" align="center" style={{ marginBottom: spacing[4] }}>
            Select dose time
          </Text>

          <View style={styles.pickerRow}>
            <View style={styles.col}>
              <TouchableOpacity
                onPress={() => adjHour(1)}
                hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
                accessibilityRole="button"
                accessibilityLabel="Increase hour"
              >
                <Ionicons name="chevron-up" size={30} color={colors.brandPrimary} />
              </TouchableOpacity>
              <View
                style={[
                  styles.numBox,
                  { backgroundColor: colors.brandPrimaryLight, borderColor: colors.brandPrimary },
                ]}
              >
                <Text
                  variant="headingLarge"
                  color={colors.brandPrimary}
                  align="center"
                  style={styles.numText}
                >
                  {fmt(hour)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => adjHour(-1)}
                hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
                accessibilityRole="button"
                accessibilityLabel="Decrease hour"
              >
                <Ionicons name="chevron-down" size={30} color={colors.brandPrimary} />
              </TouchableOpacity>
              <Text
                variant="caption"
                color={colors.textTertiary}
                align="center"
                style={{ marginTop: 4 }}
              >
                Hour
              </Text>
            </View>

            <Text variant="headingLarge" color={colors.textPrimary} style={styles.colon}>
              :
            </Text>

            <View style={styles.col}>
              <TouchableOpacity
                onPress={() => adjMin(1)}
                hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
                accessibilityRole="button"
                accessibilityLabel="Increase minute"
              >
                <Ionicons name="chevron-up" size={30} color={colors.brandPrimary} />
              </TouchableOpacity>
              <View
                style={[
                  styles.numBox,
                  { backgroundColor: colors.brandPrimaryLight, borderColor: colors.brandPrimary },
                ]}
              >
                <Text
                  variant="headingLarge"
                  color={colors.brandPrimary}
                  align="center"
                  style={styles.numText}
                >
                  {fmt(minute)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => adjMin(-1)}
                hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
                accessibilityRole="button"
                accessibilityLabel="Decrease minute"
              >
                <Ionicons name="chevron-down" size={30} color={colors.brandPrimary} />
              </TouchableOpacity>
              <Text
                variant="caption"
                color={colors.textTertiary}
                align="center"
                style={{ marginTop: 4 }}
              >
                Min
              </Text>
            </View>
          </View>

          <Text
            variant="caption"
            color={colors.textTertiary}
            align="center"
            style={{ marginTop: spacing[3] }}
          >
            {`24-hour format  ·  ${fmt(hour)}:${fmt(minute)}`}
          </Text>

          <View style={[styles.btnRow, { borderTopColor: colors.border, marginTop: spacing[4] }]}>
            <TouchableOpacity
              style={styles.btn}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel time selection"
            >
              <Text variant="labelLarge" color={colors.textSecondary}>
                Cancel
              </Text>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.btn}
              onPress={() => onConfirm(`${fmt(hour)}:${fmt(minute)}`)}
              accessibilityRole="button"
              accessibilityLabel="Confirm time"
            >
              <Text variant="labelLarge" color={colors.brandPrimary}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 0,
    width: '100%',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  col: { alignItems: 'center', gap: 10, minWidth: 88 },
  numBox: {
    width: 80,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
  },
  numText: { fontSize: 34, lineHeight: 40 },
  colon: { fontSize: 32, marginHorizontal: 12, marginBottom: 28 },
  btnRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
    paddingBottom: 4,
  },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  divider: { width: StyleSheet.hairlineWidth, marginVertical: 10 },
});
