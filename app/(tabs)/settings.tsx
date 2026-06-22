import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

export default function SettingsScreen() {
  const { colors, spacing, textPresets, radii } = useTheme();

  const sections = [
    { label: 'Notifications', description: 'Lead time, re-remind interval, quiet hours' },
    { label: 'Medications', description: 'Refill warning threshold' },
    { label: 'Appearance', description: 'Light / dark / system theme' },
    { label: 'AI', description: 'Claude API key' },
    { label: 'Calendar', description: 'Device calendar sync' },
    { label: 'Data', description: 'Export or clear all data' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing[4] }]}>
        <Text style={[textPresets.headingLarge, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing[4] }}
        showsVerticalScrollIndicator={false}
      >
        {sections.map(({ label, description }) => (
          <View
            key={label}
            style={[
              styles.row,
              {
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                padding: spacing[4],
                marginBottom: spacing[3],
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[textPresets.labelLarge, { color: colors.textPrimary }]}>{label}</Text>
            <Text
              style={[textPresets.bodySmall, { color: colors.textSecondary, marginTop: spacing[1] }]}
            >
              {description}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  row: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
});
