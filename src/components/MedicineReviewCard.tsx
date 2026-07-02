import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { Badge } from './Badge';
import { useTheme } from '@/theme';
import type { MedicineExtraction } from '@/schemas/analysis-schema';
import type { BadgeVariant } from './Badge';

export interface MedicineReviewCardProps {
  medicine: MedicineExtraction;
  index: number;
}

interface FieldRowProps {
  label: string;
  value: string | null | undefined;
  notDetectedA11y: string;
}

function FieldRow({ label, value, notDetectedA11y }: FieldRowProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityLabel={`${label}: ${value ?? notDetectedA11y}`}>
      <Text variant="labelSmall" color={colors.textTertiary} style={styles.rowLabel}>
        {label}
      </Text>
      <Text
        variant="bodySmall"
        color={value ? colors.textPrimary : colors.textTertiary}
        style={styles.rowValue}
      >
        {value ?? '—'}
      </Text>
    </View>
  );
}

export function MedicineReviewCard({ medicine, index }: MedicineReviewCardProps) {
  const { colors, spacing, radii } = useTheme();
  const { t } = useTranslation();

  const confidenceBadge = (c: number): { label: string; variant: BadgeVariant } => {
    if (c >= 0.8) return { label: t('medicineReview.highConfidence'), variant: 'success' };
    if (c >= 0.6) return { label: t('medicineReview.checkDetails'), variant: 'warning' };
    return { label: t('medicineReview.lowConfidence'), variant: 'danger' };
  };

  const formatTiming = (timing: MedicineExtraction['timing']): string => {
    if (!timing || timing === 'any') return t('medicineReview.timingAny');
    const labels: Record<Exclude<NonNullable<typeof timing>, 'any'>, string> = {
      before_food: t('medicineReview.timingBefore'),
      after_food: t('medicineReview.timingAfter'),
      with_food: t('medicineReview.timingWith'),
    };
    return labels[timing];
  };

  const badge = confidenceBadge(medicine.confidence);
  const subtitle = [medicine.strength, medicine.form].filter(Boolean).join(' · ');
  const frequencyText =
    medicine.frequencyPerDay != null
      ? t('medicineReview.frequencyText', { n: medicine.frequencyPerDay })
      : null;
  const timesText = medicine.specificTimes?.join(', ') ?? null;
  const durationText =
    medicine.durationDays != null
      ? t('medicineReview.durationText', { n: medicine.durationDays })
      : null;
  const notDetectedA11y = t('medicineReview.notDetectedA11y');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.xl,
          padding: spacing[4],
        },
      ]}
    >
      {/* Header: name + confidence */}
      <View style={[styles.header, { marginBottom: spacing[3] }]}>
        <View style={{ flex: 1, marginRight: spacing[2] }}>
          <Text variant="overline" color={colors.textTertiary}>
            {t('medicineReview.cardTitle', { n: index + 1 })}
          </Text>
          <Text variant="headingSmall">{medicine.name ?? t('medicineReview.unknownName')}</Text>
          {subtitle.length > 0 && (
            <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
              {subtitle}
            </Text>
          )}
        </View>
        <Badge label={badge.label} variant={badge.variant} size="sm" />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={{ marginTop: spacing[3] }}>
        <FieldRow
          label={t('medicineReview.fieldDosage')}
          value={medicine.dosageAmount}
          notDetectedA11y={notDetectedA11y}
        />
        <FieldRow
          label={t('medicineReview.fieldFrequency')}
          value={frequencyText}
          notDetectedA11y={notDetectedA11y}
        />
        {timesText != null && (
          <FieldRow
            label={t('medicineReview.fieldTimes')}
            value={timesText}
            notDetectedA11y={notDetectedA11y}
          />
        )}
        <FieldRow
          label={t('medicineReview.fieldTiming')}
          value={formatTiming(medicine.timing)}
          notDetectedA11y={notDetectedA11y}
        />
        <FieldRow
          label={t('medicineReview.fieldDuration')}
          value={durationText}
          notDetectedA11y={notDetectedA11y}
        />
        {medicine.instructions != null && (
          <FieldRow
            label={t('medicineReview.fieldNotes')}
            value={medicine.instructions}
            notDetectedA11y={notDetectedA11y}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  divider: { height: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 5,
  },
  rowLabel: { flex: 0.38, marginRight: 8 },
  rowValue: { flex: 0.62, textAlign: 'right' },
});
