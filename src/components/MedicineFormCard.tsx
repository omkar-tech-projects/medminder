import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { Input } from './Input';
import { Badge } from './Badge';
import { TimeChipsField } from './TimeChipsField';
import { TimingSelector } from './TimingSelector';
import type { ReviewFormValues } from '@/schemas/medicine-form-schema';
import type { MedicineExtraction } from '@/schemas/analysis-schema';

export interface MedicineFormCardProps {
  index: number;
  control: Control<ReviewFormValues>;
  errors: FieldErrors<ReviewFormValues>;
  originalMed?: MedicineExtraction;
  onRemove: () => void;
}

function WarnWrap({ warn, children }: { warn: boolean; children: React.ReactNode }) {
  const { colors, radii } = useTheme();
  if (!warn) return <>{children}</>;
  return (
    <View
      style={{ borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.warning, padding: 2 }}
    >
      {children}
    </View>
  );
}

export function MedicineFormCard({
  index,
  control,
  errors,
  originalMed,
  onRemove,
}: MedicineFormCardProps) {
  const { colors, spacing, radii } = useTheme();
  const e = errors.medicines?.[index];
  const lowConf = (originalMed?.confidence ?? 1) < 0.7;
  // A field is flagged when AI extracted null for it
  const aiNull = (f: keyof MedicineExtraction) => originalMed != null && originalMed[f] === null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: lowConf ? colors.warning : colors.border,
          borderRadius: radii.xl,
          padding: spacing[4],
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { marginBottom: spacing[3] }]}>
        <View style={styles.headerLeft}>
          <Text variant="overline" color={colors.textTertiary}>
            Medicine {index + 1}
          </Text>
          {lowConf && (
            <View style={{ marginTop: 2 }}>
              <Badge label="Low confidence — check all fields" variant="warning" size="sm" />
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove medicine ${index + 1}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Name */}
      <WarnWrap warn={aiNull('name')}>
        <Controller
          control={control}
          name={`medicines.${index}.name`}
          render={({ field }) => (
            <Input
              label="Medicine name *"
              placeholder="e.g. Amoxicillin"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={e?.name?.message}
              containerStyle={styles.field}
              accessibilityLabel="Medicine name"
            />
          )}
        />
      </WarnWrap>

      {/* Strength + Form */}
      <View style={styles.row}>
        <WarnWrap warn={aiNull('strength')}>
          <Controller
            control={control}
            name={`medicines.${index}.strength`}
            render={({ field }) => (
              <Input
                label="Strength"
                placeholder="500mg"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                containerStyle={styles.halfField}
              />
            )}
          />
        </WarnWrap>
        <WarnWrap warn={aiNull('form')}>
          <Controller
            control={control}
            name={`medicines.${index}.form`}
            render={({ field }) => (
              <Input
                label="Form"
                placeholder="tablet"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                containerStyle={styles.halfField}
              />
            )}
          />
        </WarnWrap>
      </View>

      {/* Dosage Amount + Frequency */}
      <View style={styles.row}>
        <WarnWrap warn={aiNull('dosageAmount')}>
          <Controller
            control={control}
            name={`medicines.${index}.dosageAmount`}
            render={({ field }) => (
              <Input
                label="Dose amount *"
                placeholder="1 tablet"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={e?.dosageAmount?.message}
                containerStyle={styles.halfField}
              />
            )}
          />
        </WarnWrap>
        <WarnWrap warn={aiNull('frequencyPerDay')}>
          <Controller
            control={control}
            name={`medicines.${index}.frequencyPerDay`}
            render={({ field }) => (
              <Input
                label="Times/day *"
                placeholder="2"
                value={field.value === 0 ? '' : String(field.value)}
                onChangeText={(t) => {
                  const n = parseInt(t, 10);
                  field.onChange(isNaN(n) ? 0 : n);
                }}
                onBlur={field.onBlur}
                keyboardType="numeric"
                error={e?.frequencyPerDay?.message}
                containerStyle={styles.halfField}
              />
            )}
          />
        </WarnWrap>
      </View>

      {/* Dose times */}
      <View
        style={[
          styles.field,
          aiNull('specificTimes')
            ? { borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.warning, padding: 6 }
            : undefined,
        ]}
      >
        <Controller
          control={control}
          name={`medicines.${index}.specificTimes`}
          render={({ field }) => (
            <TimeChipsField
              value={field.value}
              onChange={field.onChange}
              error={
                e?.specificTimes?.message ??
                (e?.specificTimes as { message?: string } | undefined)?.message
              }
            />
          )}
        />
      </View>

      {/* Timing relative to food */}
      <View style={styles.field}>
        <Controller
          control={control}
          name={`medicines.${index}.timing`}
          render={({ field }) => <TimingSelector value={field.value} onChange={field.onChange} />}
        />
      </View>

      {/* Duration + Start date */}
      <View style={styles.row}>
        <Controller
          control={control}
          name={`medicines.${index}.durationDays`}
          render={({ field }) => (
            <Input
              label="Duration (days)"
              placeholder="Ongoing"
              value={field.value == null ? '' : String(field.value)}
              onChangeText={(t) => {
                if (!t.trim()) {
                  field.onChange(null);
                  return;
                }
                const n = parseInt(t, 10);
                field.onChange(isNaN(n) ? null : n);
              }}
              onBlur={field.onBlur}
              keyboardType="numeric"
              error={e?.durationDays?.message}
              containerStyle={styles.halfField}
            />
          )}
        />
        <Controller
          control={control}
          name={`medicines.${index}.startDate`}
          render={({ field }) => (
            <Input
              label="Start date *"
              placeholder="YYYY-MM-DD"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={e?.startDate?.message}
              containerStyle={styles.halfField}
            />
          )}
        />
      </View>

      {/* Stock count */}
      <Controller
        control={control}
        name={`medicines.${index}.stockCount`}
        render={({ field }) => (
          <Input
            label="Current stock (pills) — optional"
            placeholder="Leave blank to skip tracking"
            value={field.value == null ? '' : String(field.value)}
            onChangeText={(t) => {
              if (!t.trim()) {
                field.onChange(null);
                return;
              }
              const n = parseInt(t, 10);
              field.onChange(isNaN(n) ? null : n);
            }}
            onBlur={field.onBlur}
            keyboardType="number-pad"
            error={e?.stockCount?.message}
            containerStyle={styles.field}
            accessibilityLabel="Current pill stock count"
          />
        )}
      />

      {/* Instructions */}
      <Controller
        control={control}
        name={`medicines.${index}.instructions`}
        render={({ field }) => (
          <Input
            label="Instructions"
            placeholder="e.g. Take with water"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            multiline
            numberOfLines={2}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLeft: { flex: 1, marginRight: 12 },
  field: { marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  halfField: { flex: 1 },
});
