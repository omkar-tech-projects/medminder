import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { Text } from './Text';
import { useTheme } from '@/theme';
import { useSettingsStore } from '@/store/settings-store';

interface ThemeSheetProps {
  visible: boolean;
  onClose: () => void;
}

type ThemeOption = { value: 'light' | 'dark' | 'system'; label: string; description: string };

const OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Light', description: 'Always use the light colour scheme' },
  { value: 'dark', label: 'Dark', description: 'Always use the dark colour scheme' },
  { value: 'system', label: 'System', description: 'Follow the device system setting' },
];

export function ThemeSheet({ visible, onClose }: ThemeSheetProps) {
  const { colors, spacing, radii } = useTheme();
  const theme = useSettingsStore((s) => s.theme);
  const update = useSettingsStore((s) => s.update);

  function select(value: 'light' | 'dark' | 'system'): void {
    update('theme', value);
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Theme" height={280}>
      <View style={styles.list}>
        {OPTIONS.map((opt) => {
          const selected = theme === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => select(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={opt.label}
              style={[
                styles.row,
                {
                  borderColor: selected ? colors.brandPrimary : colors.border,
                  borderRadius: radii.lg,
                  paddingHorizontal: spacing[4],
                  paddingVertical: spacing[3],
                  marginBottom: spacing[2],
                  backgroundColor: selected ? colors.brandPrimaryLight : colors.surface,
                },
              ]}
            >
              <View style={styles.rowText}>
                <Text variant="bodyMedium" color={selected ? colors.brandPrimary : undefined}>
                  {opt.label}
                </Text>
                <Text variant="caption" color={colors.textTertiary}>
                  {opt.description}
                </Text>
              </View>
              {selected && (
                <Ionicons name="checkmark-circle" size={20} color={colors.brandPrimary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5 },
  rowText: { flex: 1 },
});
