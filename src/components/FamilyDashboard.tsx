import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { Card } from './Card';
import { useTheme } from '@/theme';
import type { AdherenceSummary } from '@/repositories/dose-repository';

interface FamilyDashboardProps {
  summaries: AdherenceSummary[];
  missedNames: string[];
}

export function FamilyDashboard({ summaries, missedNames }: FamilyDashboardProps) {
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();

  const total = summaries.reduce((s, a) => s + a.total, 0);
  const taken = summaries.reduce((s, a) => s + a.taken, 0);
  const missed = summaries.reduce((s, a) => s + a.missed, 0);
  const due = total - taken;

  if (total === 0) return null;

  return (
    <Card style={[styles.card, { padding: spacing[4] }]} elevated={false}>
      <Text variant="overline" color={colors.textTertiary} style={styles.heading}>
        {t('family.dashboardTitle')}
      </Text>

      <View style={styles.statsRow}>
        <DashStat label={t('family.totalDue')} value={due} color={colors.brandPrimary} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <DashStat label={t('family.totalTaken')} value={taken} color={colors.success} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <DashStat label={t('family.totalMissed')} value={missed} color={colors.danger} />
      </View>

      {missedNames.map((name) => (
        <View
          key={name}
          style={[
            styles.missedRow,
            {
              backgroundColor: colors.dangerLight,
              borderRadius: 10,
              padding: spacing[2],
              marginTop: spacing[2],
            },
          ]}
        >
          <Text variant="caption" color={colors.danger}>
            {t('family.missedAlert', { name })}
          </Text>
        </View>
      ))}
    </Card>
  );
}

function DashStat({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
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
  card: { borderWidth: 1 },
  heading: { marginBottom: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  stat: { alignItems: 'center', flex: 1, gap: 2 },
  divider: { width: StyleSheet.hairlineWidth, height: 32 },
  missedRow: {},
});
