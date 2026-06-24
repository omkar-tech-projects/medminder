import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { TIMING_LABELS, type MedicineFormValues } from '@/schemas/medicine-form-schema';

type Timing = MedicineFormValues['timing'];

const OPTIONS: Timing[] = ['before_food', 'after_food', 'with_food', 'any'];

interface TimingSelectorProps {
  value: Timing;
  onChange: (value: Timing) => void;
}

export function TimingSelector({ value, onChange }: TimingSelectorProps) {
  const { colors, spacing, radii } = useTheme();

  return (
    <View>
      <Text variant="labelLarge" style={{ marginBottom: spacing[1], color: colors.textPrimary }}>
        Relative to food
      </Text>
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const active = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={TIMING_LABELS[opt]}
              style={[
                styles.pill,
                {
                  backgroundColor: active ? colors.brandPrimary : colors.backgroundTertiary,
                  borderRadius: radii.full,
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1],
                },
              ]}
            >
              <Text variant="labelSmall" color={active ? colors.textInverse : colors.textSecondary}>
                {TIMING_LABELS[opt]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {},
});
