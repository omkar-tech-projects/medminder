import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingStep } from '@/components';

export default function OnboardingIntroScreen() {
  const { t } = useTranslation();
  return (
    <OnboardingStep
      step={1}
      icon="medical-outline"
      title={t('onboarding.welcome.title')}
      body={t('onboarding.welcome.body')}
      primaryLabel={t('onboarding.welcome.primary')}
      onPrimary={() => router.push('/onboarding/name')}
      secondaryLabel={t('onboarding.welcome.skip')}
      onSecondary={() => router.push('/onboarding/disclaimer')}
    />
  );
}
