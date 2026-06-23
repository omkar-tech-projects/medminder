import { View, StyleSheet } from 'react-native';
import { Screen, AppHeader, EmptyState, Card, Badge, Text } from '@/components';
import { useTheme } from '@/theme';
import { format } from 'date-fns';

export default function HomeScreen() {
  const { colors, spacing } = useTheme();
  const today = format(new Date(), 'EEEE, MMMM d');

  return (
    <Screen scroll edges={['top']}>
      <AppHeader
        title="Good morning"
        subtitle={today}
        rightAction={{
          icon: 'add',
          onPress: () => undefined,
          accessibilityLabel: 'Add medication',
        }}
      />

      <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
        <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
          Today's doses
        </Text>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            {[
              { label: 'Taken', value: '0', color: colors.success },
              { label: 'Upcoming', value: '0', color: colors.brandPrimary },
              { label: 'Missed', value: '0', color: colors.danger },
            ].map(({ label, value, color }) => (
              <View key={label} style={styles.summaryCell}>
                <Text variant="displaySmall" color={color}>{value}</Text>
                <Text variant="caption" color={colors.textSecondary}>{label}</Text>
              </View>
            ))}
          </View>
        </Card>
      </View>

      <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
        <View style={styles.sectionRow}>
          <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
            Schedule
          </Text>
          <Badge label="0 doses" variant="neutral" size="sm" />
        </View>

        <EmptyState
          icon="medical-outline"
          title="No medications yet"
          subtitle="Scan a prescription or add a medication manually to get started."
          action={{ label: 'Add medication', onPress: () => undefined }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionLabel: { marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  summaryCard: { padding: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryCell: { alignItems: 'center', gap: 4 },
});
