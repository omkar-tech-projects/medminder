import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Badge } from './Badge';
import { useTheme } from '@/theme';
import type { MedicineExtraction } from '@/schemas/analysis-schema';
import type { BadgeVariant } from './Badge';

export interface MedicineReviewCardProps {
  medicine: MedicineExtraction;
  index: number;
}

function confidenceBadge(c: number): { label: string; variant: BadgeVariant } {
  if (c >= 0.8) return { label: 'High confidence', variant: 'success' };
  if (c >= 0.6) return { label: 'Check details', variant: 'warning' };
  return { label: 'Low confidence', variant: 'danger' };
}

function formatTiming(t: MedicineExtraction['timing']): string {
  if (!t || t === 'any') return 'Any time';
  const labels: Record<Exclude<NonNullable<typeof t>, 'any'>, string> = {
    before_food: 'Before food',
    after_food: 'After food',
    with_food: 'With food',
  };
  return labels[t];
}

interface FieldRowProps {
  label: string;
  value: string | null | undefined;
}

function FieldRow({ label, value }: FieldRowProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityLabel={`${label}: ${value ?? 'not detected'}`}>
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
  const badge = confidenceBadge(medicine.confidence);

  const subtitle = [medicine.strength, medicine.form].filter(Boolean).join(' · ');
  const frequencyText =
    medicine.frequencyPerDay != null ? `${medicine.frequencyPerDay}× daily` : null;
  const timesText = medicine.specificTimes?.join(', ') ?? null;
  const durationText = medicine.durationDays != null ? `${medicine.durationDays} days` : null;

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
            Medicine {index + 1}
          </Text>
          <Text variant="headingSmall">{medicine.name ?? 'Unknown medicine'}</Text>
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
        <FieldRow label="Dosage" value={medicine.dosageAmount} />
        <FieldRow label="Frequency" value={frequencyText} />
        {timesText != null && <FieldRow label="Times" value={timesText} />}
        <FieldRow label="Timing" value={formatTiming(medicine.timing)} />
        <FieldRow label="Duration" value={durationText} />
        {medicine.instructions != null && <FieldRow label="Notes" value={medicine.instructions} />}
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
