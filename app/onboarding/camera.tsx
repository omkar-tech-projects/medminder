import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingStep } from '@/components';
import { requestCameraPermission } from '@/lib/permissions';

export default function OnboardingCameraScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const allow = async () => {
    setLoading(true);
    await requestCameraPermission();
    setLoading(false);
    router.push('/onboarding/disclaimer');
  };

  return (
    <OnboardingStep
      step={5}
      icon="camera-outline"
      title={t('onboarding.camera.title')}
      body={t('onboarding.camera.body')}
      primaryLabel={t('onboarding.camera.allow')}
      onPrimary={allow}
      primaryLoading={loading}
      secondaryLabel={t('onboarding.camera.notNow')}
      onSecondary={() => router.push('/onboarding/disclaimer')}
    />
  );
}
