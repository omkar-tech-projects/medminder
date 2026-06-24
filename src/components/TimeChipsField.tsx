import { useState, useRef } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface TimeChipsFieldProps {
  value: string[];
  onChange: (times: string[]) => void;
  error?: string;
}

export function TimeChipsField({ value, onChange, error }: TimeChipsFieldProps) {
  const { colors, spacing, radii } = useTheme();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const removeTime = (time: string) => onChange(value.filter((t) => t !== time));

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (!TIME_RE.test(trimmed)) {
      setDraftError('Enter a valid time (HH:MM)');
      return;
    }
    if (value.includes(trimmed)) {
      setDraftError('That time is already added');
      return;
    }
    onChange([...value, trimmed].sort());
    setDraft('');
    setDraftError('');
    setAdding(false);
  };

  const cancelDraft = () => {
    setDraft('');
    setDraftError('');
    setAdding(false);
  };

  const startAdding = () => {
    setAdding(true);
    setDraft('');
    setDraftError('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const hasError = (error ?? '').length > 0;

  return (
    <View>
      <Text variant="labelLarge" style={{ marginBottom: spacing[1], color: colors.textPrimary }}>
        Dose times *
      </Text>

      <View style={styles.chipsRow}>
        {value.map((time) => (
          <View
            key={time}
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
          </View>
        ))}

        {adding ? (
          <View
            style={[
              styles.chip,
              {
                backgroundColor: colors.inputBackground,
                borderRadius: radii.full,
                borderWidth: 1,
                borderColor: colors.inputBorderFocus,
                paddingHorizontal: spacing[2],
                paddingVertical: spacing[1],
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={(t) => {
                setDraft(t);
                setDraftError('');
              }}
              onSubmitEditing={commitDraft}
              onBlur={cancelDraft}
              placeholder="08:00"
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={{ fontSize: 13, color: colors.inputText, minWidth: 44 }}
              accessibilityLabel="New dose time"
            />
          </View>
        ) : (
          <TouchableOpacity
            onPress={startAdding}
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
            <Ionicons
              name="add"
              size={14}
              color={hasError ? colors.danger : colors.textSecondary}
            />
            <Text
              variant="labelSmall"
              color={hasError ? colors.danger : colors.textSecondary}
              style={{ marginLeft: 2 }}
            >
              Add
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {(draftError || hasError) && (
        <Text variant="caption" color={colors.danger} style={{ marginTop: 4 }}>
          {draftError || error}
        </Text>
      )}
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
