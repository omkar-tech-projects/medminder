import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Screen, AppHeader, ListItem, Text } from '@/components';
import { useTheme } from '@/theme';

const SECTIONS: { title: string; items: { label: string; subtitle: string; icon: React.ComponentProps<typeof ListItem>['leftIcon'] }[] }[] = [
  {
    title: 'Notifications',
    items: [
      { label: 'Reminders', subtitle: 'Lead time, re-remind interval, quiet hours', icon: 'notifications-outline' },
      { label: 'Refill alerts', subtitle: 'Warning threshold before course ends', icon: 'alarm-outline' },
    ],
  },
  {
    title: 'Appearance',
    items: [
      { label: 'Theme', subtitle: 'Light / dark / system', icon: 'contrast-outline' },
    ],
  },
  {
    title: 'Data & Privacy',
    items: [
      { label: 'Claude API key', subtitle: 'Required for prescription scanning', icon: 'key-outline' },
      { label: 'Calendar sync', subtitle: 'Add doses to device calendar', icon: 'calendar-outline' },
      { label: 'Export data', subtitle: 'Download your full history as JSON', icon: 'download-outline' },
      { label: 'Clear all data', subtitle: 'Permanently delete all medications and history', icon: 'trash-outline' },
    ],
  },
];

export default function SettingsScreen() {
  const { colors, spacing } = useTheme();

  return (
    <Screen scroll edges={['top']}>
      <AppHeader title="Settings" />

      {SECTIONS.map(({ title, items }) => (
        <View key={title} style={[styles.section, { paddingHorizontal: spacing[5] }]}>
          <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
            {title}
          </Text>
          <View style={{ gap: 8 }}>
            {items.map((item) => (
              <ListItem
                key={item.label}
                title={item.label}
                subtitle={item.subtitle}
                leftIcon={item.icon}
                showChevron
                onPress={() => undefined}
                destructive={item.label === 'Clear all data'}
              />
            ))}
          </View>
        </View>
      ))}

      {__DEV__ && (
        <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
          <Text variant="overline" color={colors.textTertiary} style={styles.sectionLabel}>
            Developer
          </Text>
          <ListItem
            title="Component Gallery"
            subtitle="Preview all UI components"
            leftIcon="flask-outline"
            showChevron
            onPress={() => router.push('/gallery')}
          />
        </View>
      )}

      <View style={{ height: spacing[8] }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  sectionLabel: { marginBottom: 10 },
});
