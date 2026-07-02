import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button } from '@/components';
import { MedicineFormCard } from '@/components/MedicineFormCard';
import { useTheme } from '@/theme';
import { useMedicineForm } from '@/hooks/use-medicine-form';

export default function ReviewScreen() {
  const { colors, spacing, radii } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    form,
    fields,
    appendBlank,
    removeField,
    handleConfirm,
    originalMeds,
    extractionFailed,
    isValid,
    isSubmitting,
  } = useMedicineForm();

  if (fields.length === 0) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Text variant="bodyMedium" color={colors.textSecondary}>
          {t('review.noMedicines')}
        </Text>
        <Button
          label={t('review.goBack')}
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
        <Text variant="headingSmall">{t('review.title')}</Text>
        <Text variant="caption" color={colors.textTertiary}>
          {t('review.medicineCount', { count: fields.length })}
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
        {/* Extraction failure banner — shown when OCR ran but found zero medicines */}
        {extractionFailed && (
          <View
            style={[
              styles.disclaimer,
              {
                backgroundColor: colors.dangerLight,
                borderColor: colors.danger,
                borderRadius: radii.lg,
                padding: spacing[4],
                marginBottom: spacing[3],
              },
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <View style={styles.disclaimerRow}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={colors.danger}
                style={{ marginRight: spacing[2], marginTop: 1 }}
              />
              <Text variant="bodySmall" color={colors.dangerDark} style={{ flex: 1 }}>
                {t('review.extractionWarning')}
              </Text>
            </View>
          </View>
        )}

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
              {t('review.disclaimer')}
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
          label={t('review.addAnother')}
          onPress={appendBlank}
          variant="secondary"
          fullWidth
          leftIcon="add-circle-outline"
          accessibilityLabel={t('review.addAnotherA11y')}
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
          label={t('review.confirmSchedule')}
          onPress={handleConfirm}
          variant="primary"
          fullWidth
          size="lg"
          leftIcon="checkmark-circle-outline"
          disabled={!isValid || isSubmitting}
          loading={isSubmitting}
          accessibilityLabel={t('review.confirmA11y')}
        />
        <Button
          label={t('review.retakePhoto')}
          onPress={() => router.back()}
          variant="ghost"
          fullWidth
          leftIcon="camera-outline"
          style={{ marginTop: spacing[2] }}
          accessibilityLabel={t('review.retakeA11y')}
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
