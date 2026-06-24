import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button } from '@/components';
import { MedicineFormCard } from '@/components/MedicineFormCard';
import { useTheme } from '@/theme';
import { useMedicineForm } from '@/hooks/use-medicine-form';

const DISCLAIMER =
  'You are responsible for verifying that every detail below matches your actual prescription. ' +
  'AI extraction can be wrong. Check with your pharmacist before starting any course of medication.';

export default function ReviewScreen() {
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    form,
    fields,
    appendBlank,
    removeField,
    handleConfirm,
    originalMeds,
    isValid,
    isSubmitting,
  } = useMedicineForm();

  if (fields.length === 0) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Text variant="bodyMedium" color={colors.textSecondary}>
          No medicines to review.
        </Text>
        <Button
          label="Go back"
          onPress={() => router.back()}
          variant="ghost"
          style={{ marginTop: spacing[4] }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + spacing[2],
            paddingHorizontal: spacing[5],
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text variant="headingSmall">Verify medicines</Text>
        <Text variant="caption" color={colors.textTertiary}>
          {fields.length} medicine{fields.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { padding: spacing[5], paddingBottom: insets.bottom + 140 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Persistent disclaimer — non-dismissable */}
        <View
          style={[
            styles.disclaimer,
            {
              backgroundColor: colors.warningLight,
              borderColor: colors.warning,
              borderRadius: radii.lg,
              padding: spacing[4],
              marginBottom: spacing[5],
            },
          ]}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <View style={styles.disclaimerRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={colors.warning}
              style={{ marginRight: spacing[2], marginTop: 1 }}
            />
            <Text variant="bodySmall" color={colors.warningDark} style={{ flex: 1 }}>
              {DISCLAIMER}
            </Text>
          </View>
        </View>

        {/* Editable medicine cards */}
        {fields.map((field, index) => (
          <MedicineFormCard
            key={field.id}
            index={index}
            control={form.control}
            errors={form.formState.errors}
            originalMed={originalMeds[index]}
            onRemove={() => removeField(index)}
          />
        ))}

        {/* Add another medicine */}
        <Button
          label="Add another medicine"
          onPress={appendBlank}
          variant="secondary"
          fullWidth
          leftIcon="add-circle-outline"
          accessibilityLabel="Add a medicine manually"
        />
      </ScrollView>

      {/* Bottom action bar */}
      <View
        style={[
          styles.actions,
          {
            paddingHorizontal: spacing[5],
            paddingBottom: insets.bottom + spacing[4],
            paddingTop: spacing[4],
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Button
          label="Confirm schedule"
          onPress={handleConfirm}
          variant="primary"
          fullWidth
          size="lg"
          leftIcon="checkmark-circle-outline"
          disabled={!isValid || isSubmitting}
          accessibilityLabel="Confirm medicines and set up reminders"
        />
        <Button
          label="Retake photo"
          onPress={() => router.back()}
          variant="ghost"
          fullWidth
          leftIcon="camera-outline"
          style={{ marginTop: spacing[2] }}
          accessibilityLabel="Go back and retake the prescription photo"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: {},
  disclaimer: { borderWidth: 1 },
  disclaimerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  actions: { borderTopWidth: StyleSheet.hairlineWidth },
});
