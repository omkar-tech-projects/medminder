import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingStep, Text } from '@/components';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useTheme } from '@/theme';

export default function OnboardingDisclaimerScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const complete = useOnboardingStore((s) => s.complete);
  const { colors, spacing, radii } = useTheme();

  const disclaimerText = t('onboarding.disclaimer.text');

  const accept = async () => {
    setLoading(true);
    await complete(new Date().toISOString());
    router.replace('/(tabs)');
  };

  return (
    <OnboardingStep
      step={6}
      icon="shield-checkmark-outline"
      iconColor={colors.warning}
      title={t('onboarding.disclaimer.title')}
      body={t('onboarding.disclaimer.body')}
      primaryLabel={t('onboarding.disclaimer.accept')}
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
        accessibilityLabel={disclaimerText}
      >
        <Text variant="bodyMedium" color={colors.textPrimary} style={styles.disclaimerText}>
          {disclaimerText}
        </Text>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1 },
  disclaimerText: { lineHeight: 22 },
});
