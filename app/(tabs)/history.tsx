import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, SectionList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  AppHeader,
  EmptyState,
  AdherenceStats,
  AdherenceChart,
  HistoryFilters,
  HistoryLogRow,
  Text,
} from '@/components';
import { ViewingAsBanner } from '@/components/ViewingAsBanner';
import { useTheme } from '@/theme';
import { useHistoryScreen } from '@/hooks/use-history-screen';
import { useExport } from '@/hooks/use-export';
import type { HistorySection } from '@/hooks/use-history-screen';
import type { HistoryDose } from '@/db/queries/history';

function SectionHeader({ section }: { section: HistorySection }) {
  const { colors, spacing } = useTheme();
  const pct = section.total > 0 ? Math.round((section.taken / section.total) * 100) : null;
  const pctColor =
    pct == null
      ? colors.textTertiary
      : pct >= 80
        ? colors.doseTaken
        : pct >= 50
          ? colors.warning
          : colors.doseMissed;

  return (
    <View
      style={[
        styles.sectionHeader,
        {
          backgroundColor: colors.background,
          paddingHorizontal: spacing[5],
          paddingVertical: spacing[2],
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Text variant="labelLarge" color={colors.textSecondary}>
        {section.dateLabel}
      </Text>
      {pct != null && (
        <Text variant="caption" color={pctColor}>
          {`${pct}%`}
        </Text>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const { colors, spacing } = useTheme();
  const { sections, stats, trend7, trend30, medicines, loading, filters, updateFilter, refresh } =
    useHistoryScreen();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const { exportReport, exporting } = useExport();
  const handleExport = useCallback(() => void exportReport(filters), [exportReport, filters]);

  const ListHeader = (
    <View>
      <ViewingAsBanner />
      <AppHeader
        title="History"
        rightContent={
          <TouchableOpacity
            onPress={handleExport}
            disabled={exporting}
            accessibilityLabel="Export report"
            accessibilityRole="button"
            style={[styles.exportBtn, { backgroundColor: colors.brandPrimaryLight }]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            ) : (
              <Ionicons name="share-outline" size={20} color={colors.brandPrimary} />
            )}
          </TouchableOpacity>
        }
      />

      {stats != null && stats.total > 0 && <AdherenceStats stats={stats} />}
      {trend7.length > 0 && trend30.length > 0 && (
        <AdherenceChart trend7={trend7} trend30={trend30} />
      )}

      <HistoryFilters
        filters={filters}
        medicines={medicines}
        onRangeChange={(key) => updateFilter('rangeKey', key)}
        onStatusChange={(s) => updateFilter('status', s)}
        onMedicineChange={(id) => updateFilter('medicineId', id)}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
        {ListHeader}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <SectionList<HistoryDose, HistorySection>
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HistoryLogRow dose={item} />}
        renderSectionHeader={({ section }) => <SectionHeader section={section} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={{ paddingTop: spacing[8] }}>
            <EmptyState
              icon="time-outline"
              title="No history yet"
              subtitle="Your completed doses will appear here."
            />
          </View>
        }
        onRefresh={refresh}
        refreshing={loading}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: 80 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  exportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
