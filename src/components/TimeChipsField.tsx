import { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { TimePickerModal } from './TimePickerModal';

interface TimeChipsFieldProps {
  value: string[];
  onChange: (times: string[]) => void;
  error?: string;
}

export function TimeChipsField({ value, onChange, error }: TimeChipsFieldProps) {
  const { colors, spacing, radii } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingTime, setEditingTime] = useState<string | null>(null);

  const removeTime = (time: string): void => onChange(value.filter((t) => t !== time));

  const handleAdd = (): void => {
    setEditingTime(null);
    setPickerOpen(true);
  };

  const handleEdit = (time: string): void => {
    setEditingTime(time);
    setPickerOpen(true);
  };

  const handleConfirm = (selected: string): void => {
    setPickerOpen(false);
    if (editingTime !== null) {
      const updated = value.map((t) => (t === editingTime ? selected : t));
      onChange([...new Set(updated)].sort());
    } else if (!value.includes(selected)) {
      onChange([...value, selected].sort());
    }
    setEditingTime(null);
  };

  const hasError = (error ?? '').length > 0;

  return (
    <View>
      <Text variant="labelLarge" style={{ marginBottom: spacing[1], color: colors.textPrimary }}>
        Dose times *
      </Text>

      <View style={styles.chipsRow}>
        {value.map((time) => (
          <TouchableOpacity
            key={time}
            onPress={() => handleEdit(time)}
            onLongPress={() => removeTime(time)}
            accessibilityRole="button"
            accessibilityLabel={`${time} — tap to edit, long-press to remove`}
            style={[
              styles.chip,
              {
                backgroundColor: colors.brandPrimaryLight,
                borderRadius: radii.full,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[1],
              },
            ]}
          >
            <Text variant="labelSmall" color={colors.brandPrimary}>
              {time}
            </Text>
            <TouchableOpacity
              onPress={() => removeTime(time)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel={`Remove ${time}`}
              accessibilityRole="button"
              style={{ marginLeft: 4 }}
            >
              <Ionicons name="close-circle" size={14} color={colors.brandPrimary} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={handleAdd}
          accessibilityLabel="Add dose time"
          accessibilityRole="button"
          style={[
            styles.addBtn,
            {
              borderColor: hasError ? colors.danger : colors.borderStrong,
              borderRadius: radii.full,
            },
          ]}
        >
          <Ionicons name="add" size={14} color={hasError ? colors.danger : colors.textSecondary} />
          <Text
            variant="labelSmall"
            color={hasError ? colors.danger : colors.textSecondary}
            style={{ marginLeft: 2 }}
          >
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {hasError && (
        <Text variant="caption" color={colors.danger} style={{ marginTop: 4 }}>
          {error}
        </Text>
      )}

      <TimePickerModal
        visible={pickerOpen}
        initial={editingTime ?? '08:00'}
        onConfirm={handleConfirm}
        onCancel={() => {
          setPickerOpen(false);
          setEditingTime(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
