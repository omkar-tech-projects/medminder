import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useTheme } from '@/theme';

export default function NotFoundScreen() {
  const { colors, spacing, textPresets } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[textPresets.headingMedium, { color: colors.textPrimary }]}>
          Screen not found
        </Text>
        <Link href="/" style={{ marginTop: spacing[4] }}>
          <Text style={[textPresets.bodyMedium, { color: colors.brandPrimary }]}>
            Go to Home
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
