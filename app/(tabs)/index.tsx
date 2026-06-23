import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import {
  Screen, AppHeader, Button, Card, Text, EmptyState, DoseTimelineItem,
} from '@/components';
import { useTheme } from '@/theme';
import { useHomeScreen } from '@/hooks/use-home-screen';

export default function HomeScreen() {
  const { colors, spacing } = useTheme();
  const { greeting, name, dateLabel, doses, summary, hasMedications } = useHomeScreen();

  const headingText = name.trim().length > 0 ? `${greeting}, ${name}` : greeting;

  return (
    <Screen scroll edges={['top']} contentContainerStyle={{ paddingBottom: 48 }}>

      {/* Greeting */}
      <AppHeader
        title={headingText}
        subtitle={dateLabel}
        rightAction={{
          icon: 'person-outline',
          onPress: () => undefined,
          accessibilityLabel: 'Profile',
        }}
      />

      {hasMedications ? (
        <>
          {/* Adherence summary card */}
          <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
            <Card style={styles.summaryCard} elevated={false}>
              <Text variant="overline" color={colors.textTertiary} style={styles.summaryHeading}>
                Today's progress
              </Text>

              <Text
                variant="bodyMedium"
                color={colors.textSecondary}
                style={styles.summaryLine}
                accessibilityLabel={`${summary.taken} of ${summary.total} doses taken today`}
              >
                <Text variant="headingLarge" color={colors.success}>{summary.taken}</Text>
                {' '}of {summary.total} taken
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
              Today's schedule
            </Text>

            <View>
              {doses.map((dose, i) => (
                <DoseTimelineItem
                  key={dose.id}
                  dose={dose}
                  isLast={i === doses.length - 1}
                  onPress={() => undefined}
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
            action={{ label: 'Scan a prescription', onPress: () => router.push('/capture/index') }}
          />
        </View>
      )}

      {/* CTAs — always visible */}
      <View style={[styles.ctaBlock, { paddingHorizontal: spacing[5] }]}>
        <Button
          label="Scan a prescription"
          onPress={() => router.push('/capture/index')}
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

    </Screen>
  );
}

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statCell} accessibilityLabel={`${value} ${label}`}>
      <Text variant="headingMedium" color={color}>{String(value)}</Text>
      <Text variant="caption" color={colors.textTertiary}>{label}</Text>
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
