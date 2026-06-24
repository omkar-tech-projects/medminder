import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme';
import type { ActiveFilters, RangeKey } from '@/hooks/use-history-screen';
import type { Medicine } from '@/db/schema';
import type { DoseStatus } from '@/types/dose';

interface HistoryFiltersProps {
  filters: ActiveFilters;
  medicines: Medicine[];
  onRangeChange: (key: RangeKey) => void;
  onStatusChange: (status: DoseStatus | null) => void;
  onMedicineChange: (id: string | null) => void;
}

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'all', label: 'All time' },
];

const STATUSES: { key: DoseStatus | null; label: string }[] = [
  { key: null, label: 'All' },
  { key: 'taken', label: 'Taken' },
  { key: 'missed', label: 'Missed' },
  { key: 'skipped', label: 'Skipped' },
];

interface PillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}

function Pill({ label, selected, onPress, color }: PillProps) {
  const { colors, radii } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? (color ?? colors.brandPrimary) : colors.backgroundSecondary,
          borderColor: selected ? (color ?? colors.brandPrimary) : colors.border,
          borderRadius: radii.full,
        },
      ]}
    >
      <Text variant="caption" color={selected ? colors.textInverse : colors.textSecondary}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function HistoryFilters({
  filters,
  medicines,
  onRangeChange,
  onStatusChange,
  onMedicineChange,
}: HistoryFiltersProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { paddingBottom: spacing[2] }]}>
      {/* Date range */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { paddingHorizontal: spacing[5] }]}
      >
        {RANGES.map((r) => (
          <Pill
            key={r.key}
            label={r.label}
            selected={filters.rangeKey === r.key}
            onPress={() => onRangeChange(r.key)}
          />
        ))}
      </ScrollView>

      {/* Status */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { paddingHorizontal: spacing[5] }]}
        style={{ marginTop: spacing[2] }}
      >
        {STATUSES.map((s) => (
          <Pill
            key={s.key ?? 'all'}
            label={s.label}
            selected={filters.status === s.key}
            onPress={() => onStatusChange(s.key)}
            color={
              s.key === 'taken'
                ? colors.doseTaken
                : s.key === 'missed'
                  ? colors.doseMissed
                  : s.key === 'skipped'
                    ? colors.doseSnoozed
                    : undefined
            }
          />
        ))}
      </ScrollView>

      {/* Medicines */}
      {medicines.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.row, { paddingHorizontal: spacing[5] }]}
          style={{ marginTop: spacing[2] }}
        >
          <Pill
            label="All medicines"
            selected={filters.medicineId === null}
            onPress={() => onMedicineChange(null)}
          />
          {medicines.map((m) => (
            <Pill
              key={m.id}
              label={m.name}
              selected={filters.medicineId === m.id}
              onPress={() => onMedicineChange(m.id)}
              color={m.color}
            />
          ))}
        </ScrollView>
      )}

      <View style={[styles.divider, { backgroundColor: colors.border, marginTop: spacing[3] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  row: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  divider: { height: StyleSheet.hairlineWidth },
});
