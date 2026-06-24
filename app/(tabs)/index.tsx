import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ProfileSwitcherSheet } from '@/components/ProfileSwitcherSheet';
import {
  Screen,
  AppHeader,
  Button,
  Card,
  Text,
  EmptyState,
  DoseTimelineItem,
  DoseDetailSheet,
  RefillWarningCard,
  CourseEndModal,
} from '@/components';
import { useTheme } from '@/theme';
import { useHomeScreen } from '@/hooks/use-home-screen';
import { useDoseConfirmation } from '@/hooks/use-dose-confirmation';
import { useRefillWarnings } from '@/hooks/use-refill-warnings';
import type { TodayDose } from '@/repositories/dose-repository';

export default function HomeScreen() {
  const { colors, spacing } = useTheme();
  const { greeting, name, dateLabel, doses, summary, hasMedications } = useHomeScreen();
  const { confirmTaken } = useDoseConfirmation();
  const [selectedDose, setSelectedDose] = useState<TodayDose | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const {
    warnings,
    endedCourses,
    dismiss,
    setRefillReminder,
    load: reloadRefill,
  } = useRefillWarnings();

  const headingText = name.trim().length > 0 ? `${greeting}, ${name}` : greeting;

  return (
    <Screen scroll edges={['top']} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Greeting */}
      <AppHeader
        title={headingText}
        subtitle={dateLabel}
        rightAction={{
          icon: 'person-outline',
          onPress: () => setProfileOpen(true),
          accessibilityLabel: 'Edit profile',
        }}
      />

      {warnings.length > 0 && (
        <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
          {warnings.map((w) => (
            <RefillWarningCard
              key={`${w.medicineId}:${w.type}`}
              warning={w}
              onDismiss={() => dismiss(`${w.medicineId}:${w.type}`)}
              onSetReminder={(d) => setRefillReminder(w.medicineId, w.medicineName, d)}
            />
          ))}
        </View>
      )}

      {endedCourses.length > 0 && endedCourses[0] != null && (
        <CourseEndModal
          medicine={endedCourses[0]}
          onDone={() => reloadRefill()}
          onDismiss={() => dismiss(`${endedCourses[0]!.id}:ended`)}
        />
      )}

      {hasMedications ? (
        <>
          {/* Adherence summary card */}
          <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
            <Card style={styles.summaryCard} elevated={false}>
              <Text variant="overline" color={colors.textTertiary} style={styles.summaryHeading}>
                {"Today's progress"}
              </Text>

              <Text
                variant="bodyMedium"
                color={colors.textSecondary}
                style={styles.summaryLine}
                accessibilityLabel={`${summary.taken} of ${summary.total} doses taken today`}
              >
                <Text variant="headingLarge" color={colors.success}>
                  {summary.taken}
                </Text>{' '}
                of {summary.total} taken
              </Text>

              <View style={styles.statsRow}>
                <StatCell label="Taken" value={summary.taken} color={colors.success} />
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <StatCell label="Upcoming" value={summary.pending} color={colors.brandPrimary} />
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <StatCell label="Missed" value={summary.missed} color={colors.danger} />
              </View>
            </Card>
          </View>

          {/* Timeline */}
          <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
            <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
              {"Today's schedule"}
            </Text>

            <View>
              {doses.map((dose, i) => (
                <DoseTimelineItem
                  key={dose.id}
                  dose={dose}
                  isLast={i === doses.length - 1}
                  onPress={() => setSelectedDose(dose)}
                />
              ))}
            </View>
          </View>
        </>
      ) : (
        /* Empty state — no medicines yet */
        <View style={[styles.emptyWrapper, { paddingHorizontal: spacing[5] }]}>
          <EmptyState
            icon="medical-outline"
            title="No medications yet"
            subtitle="Scan a prescription and we'll set up your reminders automatically."
            action={{ label: 'Scan a prescription', onPress: () => router.push('/capture') }}
          />
        </View>
      )}

      {/* CTAs — always visible */}
      <View style={[styles.ctaBlock, { paddingHorizontal: spacing[5] }]}>
        <Button
          label="Scan a prescription"
          onPress={() => router.push('/capture')}
          variant="primary"
          fullWidth
          leftIcon="scan-outline"
          size="lg"
          accessibilityLabel="Scan a prescription to extract medicine details automatically"
        />
        <Button
          label="Add medicine manually"
          onPress={() => undefined}
          variant="ghost"
          fullWidth
          leftIcon="add-circle-outline"
          style={{ marginTop: spacing[3] }}
          accessibilityLabel="Add a medicine by filling in the details manually"
        />
      </View>

      {/* Dose detail sheet */}
      <DoseDetailSheet
        dose={selectedDose}
        visible={selectedDose != null}
        onClose={() => setSelectedDose(null)}
        onConfirmTaken={(id) => {
          confirmTaken(id);
          setSelectedDose(null);
        }}
        onMedicineSettings={
          selectedDose
            ? () => {
                const mid = selectedDose.medicineId;
                setSelectedDose(null);
                router.push({ pathname: '/medicine/[id]', params: { id: mid } } as never);
              }
            : undefined
        }
      />

      <ProfileSwitcherSheet visible={profileOpen} onClose={() => setProfileOpen(false)} />
    </Screen>
  );
}

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statCell} accessibilityLabel={`${value} ${label}`}>
      <Text variant="headingMedium" color={color}>
        {String(value)}
      </Text>
      <Text variant="caption" color={colors.textTertiary}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionLabel: { marginBottom: 14 },
  summaryCard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    padding: 20,
  },
  summaryHeading: { marginBottom: 8 },
  summaryLine: { marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32 },
  statCell: { alignItems: 'center', gap: 2, flex: 1 },
  emptyWrapper: { marginVertical: 32 },
  ctaBlock: { marginTop: 8 },
});
