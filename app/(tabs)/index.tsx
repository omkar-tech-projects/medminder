import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const { colors, spacing, textPresets } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: spacing[4] }]}>
        <Text style={[textPresets.headingLarge, { color: colors.textPrimary }]}>
          Good morning
        </Text>
        <Text style={[textPresets.bodyMedium, { color: colors.textSecondary, marginTop: spacing[1] }]}>
          Here's your schedule for today
        </Text>
      </View>

      <View style={[styles.placeholder, { margin: spacing[4] }]}>
        <Text style={[textPresets.bodyMedium, { color: colors.textTertiary, textAlign: 'center' }]}>
          Dose timeline — coming soon
        </Text>
      </View>
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
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
