import { useState } from 'react';
import { router } from 'expo-router';
import { OnboardingStep } from '@/components';
import { requestCameraPermission } from '@/lib/permissions';

export default function OnboardingCameraScreen() {
  const [loading, setLoading] = useState(false);

  const allow = async () => {
    setLoading(true);
    await requestCameraPermission();
    setLoading(false);
    router.push('/onboarding/disclaimer');
  };

  return (
    <OnboardingStep
      step={4}
      icon="camera-outline"
      title="Scan your prescriptions"
      body="The fastest way to add medicines is to photograph your prescription. Your images are processed on-device and are never stored or shared."
      primaryLabel="Allow camera access"
      onPrimary={allow}
      primaryLoading={loading}
      secondaryLabel="Not now"
      onSecondary={() => router.push('/onboarding/disclaimer')}
    />
  );
}
