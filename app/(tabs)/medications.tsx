import { useEffect, useState } from 'react';
import { FlatList, TouchableOpacity, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Screen, AppHeader, EmptyState, Badge, Text } from '@/components';
import { useTheme } from '@/theme';
import { useProfileStore } from '@/store/profile-store';
import { getActiveMedicines } from '@/db/queries/medicines';
import type { Medicine } from '@/db/schema';

function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  return differenceInDays(parseISO(endDate), new Date());
}

interface MedicineCardProps {
  medicine: Medicine;
}

function MedicineCard({ medicine }: MedicineCardProps) {
  const { colors, spacing, radii } = useTheme();
  const days = daysRemaining(medicine.endDate);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/medicine/${medicine.id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`View ${medicine.name} details`}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing[4],
          marginBottom: spacing[3],
          borderLeftWidth: 4,
          borderLeftColor: medicine.color,
        },
      ]}
    >
      <View style={styles.cardRow}>
        <View style={styles.cardMain}>
          <Text variant="bodyMedium">{medicine.name}</Text>
          <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
            {`${medicine.dosage} ${medicine.dosageUnit} · ${medicine.timesPerDay}×/day`}
          </Text>
          {medicine.startDate && (
            <Text variant="caption" color={colors.textTertiary}>
              {`Started ${format(parseISO(medicine.startDate), 'd MMM yyyy')}`}
            </Text>
          )}
        </View>
        <View style={styles.cardBadges}>
          {days !== null && days <= 7 && days >= 0 && (
            <Badge variant={days <= 3 ? 'danger' : 'warning'} label={`${days}d left`} />
          )}
          {days !== null && days < 0 && <Badge variant="neutral" label="Ended" />}
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textTertiary}
            style={{ marginTop: 2 }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MedicationsScreen() {
  const { colors, spacing } = useTheme();
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const [meds, setMeds] = useState<Medicine[]>([]);

  useEffect(() => {
    setMeds(getActiveMedicines(activeProfileId));
  }, [activeProfileId]);

  return (
    <Screen edges={['top']}>
      <AppHeader
        title="Medicines"
        rightContent={
          <TouchableOpacity
            onPress={() => router.push('/capture' as never)}
            accessibilityRole="button"
            accessibilityLabel="Add medicine"
            style={{ padding: spacing[1] }}
          >
            <Ionicons name="add" size={26} color={colors.brandPrimary} />
          </TouchableOpacity>
        }
      />
      <FlatList
        data={meds}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MedicineCard medicine={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: spacing[5], paddingBottom: spacing[8] },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="medkit-outline"
            title="No medicines yet"
            subtitle="Scan a prescription or add a medicine manually to get started."
            action={{ label: 'Add medicine', onPress: () => router.push('/capture' as never) }}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 16 },
  card: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardMain: { flex: 1 },
  cardBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
