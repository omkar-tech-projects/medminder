import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ProfileSwitcherSheet } from '@/components/ProfileSwitcherSheet';
import { ViewingAsBanner } from '@/components/ViewingAsBanner';
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
import { useAnalysisStore } from '@/store/analysis-store';
import { useDoseStore } from '@/store/dose-store';
import type { TodayDose } from '@/repositories/dose-repository';

export default function HomeScreen() {
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();
  const { greeting, name, dateLabel, doses, summary, hasMedications } = useHomeScreen();
  const { confirmTaken } = useDoseConfirmation();
  const revertToPending = useDoseStore((s) => s.revertToPending);
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

  const handleAddManually = () => {
    useAnalysisStore.getState().reset();
    router.push('/review');
  };

  return (
    <Screen scroll edges={['top']} contentContainerStyle={{ paddingBottom: 48 }}>
      <ViewingAsBanner />
      {/* Greeting */}
      <AppHeader
        title={headingText}
        subtitle={dateLabel}
        rightAction={{
          icon: 'person-outline',
          onPress: () => setProfileOpen(true),
          accessibilityLabel: t('home.editProfileA11y'),
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
                {t('home.todayProgress')}
              </Text>

              <Text
                variant="bodyMedium"
                color={colors.textSecondary}
                style={styles.summaryLine}
                accessibilityLabel={t('home.takenStatA11y', {
                  taken: summary.taken,
                  total: summary.total,
                })}
              >
                <Text variant="headingLarge" color={colors.success}>
                  {summary.taken}
                </Text>{' '}
                {t('home.ofTaken', { total: summary.total })}
              </Text>

              <View style={styles.statsRow}>
                <StatCell
                  label={t('doseStatus.taken')}
                  value={summary.taken}
                  color={colors.success}
                />
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <StatCell
                  label={t('doseStatus.pending')}
                  value={summary.pending}
                  color={colors.brandPrimary}
                />
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <StatCell
                  label={t('doseStatus.missed')}
                  value={summary.missed}
                  color={colors.danger}
                />
              </View>
            </Card>
          </View>

          {/* Timeline */}
          <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
            <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
              {t('home.todaySchedule')}
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
            title={t('home.noMedicationsTitle')}
            subtitle={t('home.noMedicationsSubtitle')}
          />
        </View>
      )}

      {/* CTAs — always visible */}
      <View style={[styles.ctaBlock, { paddingHorizontal: spacing[5] }]}>
        <Button
          label={t('home.scanPrescription')}
          onPress={() => router.push('/capture')}
          variant="primary"
          fullWidth
          leftIcon="scan-outline"
          size="lg"
          accessibilityLabel={t('home.scanPrescriptionA11y')}
        />
        <Button
          label={t('home.addManually')}
          onPress={handleAddManually}
          variant="ghost"
          fullWidth
          leftIcon="add-circle-outline"
          style={{ marginTop: spacing[3] }}
          accessibilityLabel={t('home.addManuallyA11y')}
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
        onRevertToPending={(id) => {
          revertToPending(id);
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
      <Text variant="caption" color={colors.textTertiary} numberOfLines={1} adjustsFontSizeToFit>
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
