import { useState } from 'react';
import { View, Alert, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Screen } from '@/components/Screen';
import { MedicineOverrideSheet } from '@/components/MedicineOverrideSheet';
import { useTheme } from '@/theme';
import { getMedicineById, pauseMedicine, resumeMedicine } from '@/db/queries/medicines';
import { deactivateMedicine } from '@/services/refill-service';
import { useSettingsStore } from '@/store/settings-store';
import { useDoseStore } from '@/store/dose-store';

export default function MedicineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radii } = useTheme();
  const gs = useSettingsStore();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  const medicine = id ? getMedicineById(id) : undefined;

  if (!medicine) {
    return (
      <Screen edges={['top']}>
        <View style={[styles.center, { padding: spacing[6] }]}>
          <Text variant="bodyMedium" color={colors.textSecondary}>
            Medicine not found.
          </Text>
          <Button
            label="Go back"
            variant="ghost"
            onPress={() => router.back()}
            style={{ marginTop: spacing[4] }}
            accessibilityLabel="Go back"
          />
        </View>
      </Screen>
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const daysLeft = medicine.endDate
    ? differenceInDays(parseISO(`${medicine.endDate}T00:00:00`), new Date())
    : null;
  const stockDaysLeft =
    medicine.stockCount != null && medicine.timesPerDay > 0
      ? Math.floor(medicine.stockCount / medicine.timesPerDay)
      : null;

  const isActive = medicine.active === 1;
  const leadMin = medicine.leadMinutesOverride ?? gs.notificationLeadMin;
  const nagMin = medicine.nagIntervalMinutesOverride ?? gs.reRemindIntervalMin;
  const maxNags = medicine.maxNagsOverride ?? gs.maxNags;
  const snoozeMin = medicine.snoozeDurationMinOverride ?? gs.snoozeDurationMin;
  const hasOverride =
    medicine.leadMinutesOverride != null ||
    medicine.nagIntervalMinutesOverride != null ||
    medicine.maxNagsOverride != null ||
    medicine.snoozeDurationMinOverride != null ||
    medicine.quietHoursOverride != null;

  const medicineId = medicine.id;
  const medicineName = medicine.name;

  async function handlePauseResume(): Promise<void> {
    if (isActive) {
      pauseMedicine(medicineId);
    } else {
      resumeMedicine(medicineId);
    }
    useDoseStore.getState().loadForDate(today);
    forceUpdate((n) => n + 1);
  }

  function handleDelete(): void {
    Alert.alert(
      'Delete medication?',
      `This permanently deletes ${medicineName} and all its history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deactivateMedicine(medicineId)
              .then(() => {
                useDoseStore.getState().loadForDate(today);
                router.back();
              })
              .catch(() => undefined);
          },
        },
      ],
    );
  }

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing[8] }}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing[5], paddingTop: spacing[4] }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="headingSmall" style={styles.title}>
            {medicine.name}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Identity card */}
        <View
          style={[
            styles.card,
            {
              marginHorizontal: spacing[5],
              marginTop: spacing[4],
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.xl,
              padding: spacing[4],
            },
          ]}
        >
          <View style={styles.nameRow}>
            <View style={[styles.dot, { backgroundColor: medicine.color }]} />
            <Text variant="headingMedium">{medicine.name}</Text>
            <Badge
              label={isActive ? 'Active' : 'Paused'}
              variant={isActive ? 'success' : 'neutral'}
              size="sm"
            />
          </View>

          <InfoRow label="Dosage" value={`${medicine.dosage} ${medicine.dosageUnit}`} />
          {medicine.strength && <InfoRow label="Strength" value={medicine.strength} />}
          {medicine.form && <InfoRow label="Form" value={medicine.form} />}
          <InfoRow label="Frequency" value={`${medicine.timesPerDay}× daily`} />
          {medicine.instructions && <InfoRow label="Instructions" value={medicine.instructions} />}
          <InfoRow
            label="Started"
            value={format(parseISO(`${medicine.startDate}T00:00:00`), 'd MMM yyyy')}
          />
          {medicine.endDate && (
            <InfoRow
              label="Ends"
              value={`${format(parseISO(`${medicine.endDate}T00:00:00`), 'd MMM yyyy')}${daysLeft != null ? ` (${daysLeft >= 0 ? `${daysLeft}d left` : 'ended'})` : ''}`}
            />
          )}
          {stockDaysLeft != null && (
            <InfoRow
              label="Stock"
              value={`${medicine.stockCount} pills (~${stockDaysLeft}d supply)`}
            />
          )}
        </View>

        {/* Notification overrides */}
        <View
          style={[styles.sectionHeader, { paddingHorizontal: spacing[5], marginTop: spacing[5] }]}
        >
          <Text variant="overline" color={colors.textTertiary}>
            Notification overrides
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setOverrideOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Edit notification overrides for this medicine"
          style={[
            styles.card,
            {
              marginHorizontal: spacing[5],
              marginTop: spacing[2],
              backgroundColor: colors.surface,
              borderColor: hasOverride ? colors.brandPrimary : colors.border,
              borderRadius: radii.xl,
              padding: spacing[4],
            },
          ]}
        >
          <View style={styles.overrideRow}>
            <View style={styles.overrideText}>
              <Text variant="bodyMedium">
                {hasOverride ? 'Custom settings active' : 'Using global settings'}
              </Text>
              <Text variant="caption" color={colors.textTertiary}>
                {`Lead ${leadMin}m · Re-remind ${nagMin}m · Max ${maxNags} · Snooze ${snoozeMin}m`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        </TouchableOpacity>

        {/* Actions */}
        <View style={[styles.actions, { paddingHorizontal: spacing[5], marginTop: spacing[6] }]}>
          <Button
            label={isActive ? 'Pause reminders' : 'Resume reminders'}
            variant="secondary"
            fullWidth
            onPress={() => void handlePauseResume()}
            leftIcon={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
            accessibilityLabel={isActive ? 'Pause reminders for this medicine' : 'Resume reminders'}
          />
          <Button
            label="Delete medication"
            variant="destructive"
            fullWidth
            onPress={handleDelete}
            leftIcon="trash-outline"
            style={{ marginTop: spacing[3] }}
            accessibilityLabel="Permanently delete this medication"
          />
        </View>
      </ScrollView>

      <MedicineOverrideSheet
        medicine={medicine}
        visible={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        onSaved={() => forceUpdate((n) => n + 1)}
      />
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.infoRow, { marginTop: spacing[2] }]}>
      <Text variant="caption" color={colors.textTertiary} style={styles.infoLabel}>
        {label}
      </Text>
      <Text variant="bodySmall" style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center' },
  card: { borderWidth: 1.5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  infoLabel: { width: 96, flexShrink: 0 },
  infoValue: { flex: 1 },
  sectionHeader: { marginBottom: 4 },
  overrideRow: { flexDirection: 'row', alignItems: 'center' },
  overrideText: { flex: 1 },
  actions: {},
});
