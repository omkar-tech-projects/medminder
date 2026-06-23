import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Screen, Text, Button, Card, Input, Badge, ListItem,
  EmptyState, BottomSheet, AppHeader,
} from '@/components';
import { useToast } from '@/store/ui-store';
import { useTheme } from '@/theme';

export default function GalleryScreen() {
  const { colors, spacing } = useTheme();
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [loadingBtn, setLoadingBtn] = useState(false);

  const simulateLoad = () => {
    setLoadingBtn(true);
    setTimeout(() => setLoadingBtn(false), 2000);
  };

  const sep = <View style={[styles.sep, { backgroundColor: colors.border }]} />;

  return (
    <Screen scroll edges={['bottom']} contentContainerStyle={{ paddingBottom: 48 }}>

      {/* ── Typography ── */}
      <AppHeader title="Component Gallery" subtitle="Design system preview" />
      {sep}
      <Section label="Typography">
        {(['displayLarge', 'displaySmall', 'headingLarge', 'headingMedium', 'headingSmall',
          'bodyLarge', 'bodyMedium', 'bodySmall', 'labelLarge', 'labelSmall', 'caption', 'overline'] as const).map((v) => (
          <Text key={v} variant={v}>{v}</Text>
        ))}
      </Section>
      {sep}

      {/* ── Buttons ── */}
      <Section label="Buttons">
        <View style={styles.row}>
          <Button label="Primary" onPress={() => undefined} />
          <Button label="Secondary" onPress={() => undefined} variant="secondary" />
          <Button label="Ghost" onPress={() => undefined} variant="ghost" />
        </View>
        <View style={styles.row}>
          <Button label="Destructive" onPress={() => undefined} variant="destructive" size="sm" />
          <Button label="Loading" onPress={simulateLoad} loading={loadingBtn} size="sm" />
          <Button label="Disabled" onPress={() => undefined} disabled size="sm" />
        </View>
        <Button label="Full-width primary" onPress={() => undefined} fullWidth leftIcon="add" />
      </Section>
      {sep}

      {/* ── Badges ── */}
      <Section label="Badges">
        <View style={styles.row}>
          {(['success', 'danger', 'warning', 'info', 'neutral', 'primary'] as const).map((v) => (
            <Badge key={v} label={v} variant={v} />
          ))}
        </View>
        <View style={styles.row}>
          <Badge label="small" variant="success" size="sm" />
          <Badge label="Taken" variant="success" />
          <Badge label="Missed" variant="danger" />
          <Badge label="3 days left" variant="warning" />
        </View>
      </Section>
      {sep}

      {/* ── Inputs ── */}
      <Section label="Inputs">
        <Input label="Medication name" placeholder="e.g. Metformin 500mg" value={inputVal} onChangeText={setInputVal} leftIcon="medical-outline" />
        <Input label="Dosage" placeholder="e.g. 1 tablet" hint="How much to take per dose" leftIcon="flask-outline" />
        <Input label="With error" placeholder="Required" error="This field is required" />
        <Input placeholder="No label, right icon" rightIcon="eye-outline" secureTextEntry />
      </Section>
      {sep}

      {/* ── Cards ── */}
      <Section label="Cards">
        <Card>
          <Text variant="headingSmall">Metformin 500mg</Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 4 }}>
            Next dose at 08:00 · 28 days remaining
          </Text>
        </Card>
        <Card onPress={() => undefined} elevated={false} style={{ borderColor: colors.brandPrimary }}>
          <Text variant="labelLarge" color={colors.brandPrimary}>Tappable card</Text>
        </Card>
      </Section>
      {sep}

      {/* ── List Items ── */}
      <Section label="List Items">
        <ListItem title="Notifications" subtitle="Manage reminder settings" leftIcon="notifications-outline" showChevron onPress={() => undefined} />
        <ListItem title="Taken · 08:03" right={<Badge label="Taken" variant="success" size="sm" />} />
        <ListItem title="Delete medication" leftIcon="trash-outline" onPress={() => undefined} destructive />
        <ListItem title="Disabled item" subtitle="Cannot interact" leftIcon="lock-closed-outline" disabled />
      </Section>
      {sep}

      {/* ── Empty State ── */}
      <Section label="Empty State">
        <EmptyState
          icon="medical-outline"
          title="No medications yet"
          subtitle="Scan a prescription or add one manually."
          action={{ label: 'Add medication', onPress: () => undefined }}
        />
      </Section>
      {sep}

      {/* ── Toast ── */}
      <Section label="Toast / Snackbar">
        <View style={styles.row}>
          <Button label="Success" variant="ghost" size="sm" onPress={() => toast.success('Dose marked as taken!')} />
          <Button label="Error" variant="ghost" size="sm" onPress={() => toast.error('Failed to save.')} />
          <Button label="Warning" variant="ghost" size="sm" onPress={() => toast.warning('Refill due in 2 days.')} />
          <Button label="Info" variant="ghost" size="sm" onPress={() => toast.info('Reminder set for 8:00 AM.')} />
        </View>
      </Section>
      {sep}

      {/* ── Bottom Sheet ── */}
      <Section label="Bottom Sheet">
        <Button label="Open Bottom Sheet" onPress={() => setSheetOpen(true)} variant="secondary" fullWidth />
        <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Example Sheet">
          <Text variant="bodyMedium" color={colors.textSecondary}>
            Drag down or tap the backdrop to dismiss. Use this for contextual actions,
            pickers, and confirmations.
          </Text>
          <Button
            label="Close"
            onPress={() => setSheetOpen(false)}
            variant="primary"
            fullWidth
            style={{ marginTop: spacing[5] }}
          />
        </BottomSheet>
      </Section>

    </Screen>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.section, { paddingHorizontal: spacing[5] }]}>
      <Text variant="overline" color={colors.textTertiary} style={styles.secLabel}>{label}</Text>
      <View style={styles.secContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sep: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  section: { paddingVertical: 20 },
  secLabel: { marginBottom: 14 },
  secContent: { gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
});
