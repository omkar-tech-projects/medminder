import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { OnboardingStep, Text } from '@/components';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useTheme } from '@/theme';

const DISCLAIMER =
  'MedMinder helps you remember your medicines. It does not provide medical advice. ' +
  'AI reading of a prescription can be wrong — always check the details against your ' +
  'actual prescription and your pharmacist before relying on them.';

export default function OnboardingDisclaimerScreen() {
  const [loading, setLoading] = useState(false);
  const complete = useOnboardingStore((s) => s.complete);
  const { colors, spacing, radii } = useTheme();

  const accept = async () => {
    setLoading(true);
    await complete(new Date().toISOString());
    router.replace('/(tabs)');
  };

  return (
    <OnboardingStep
      step={5}
      icon="shield-checkmark-outline"
      iconColor={colors.warning}
      title="One important thing"
      body="Please read the following before you continue."
      primaryLabel="I understand and accept"
      onPrimary={accept}
      primaryLoading={loading}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: colors.warningLight,
            borderColor: colors.warning,
            borderRadius: radii.lg,
            padding: spacing[5],
          },
        ]}
        accessibilityRole="text"
        accessibilityLabel={DISCLAIMER}
      >
        <Text variant="bodyMedium" color={colors.textPrimary} style={styles.disclaimerText}>
          {DISCLAIMER}
        </Text>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1 },
  disclaimerText: { lineHeight: 22 },
});
