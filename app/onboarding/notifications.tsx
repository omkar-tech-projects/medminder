import { useState } from 'react';
import { router } from 'expo-router';
import { OnboardingStep } from '@/components';
import { requestNotificationPermission } from '@/lib/permissions';

export default function OnboardingNotificationsScreen() {
  const [loading, setLoading] = useState(false);

  const allow = async () => {
    setLoading(true);
    await requestNotificationPermission();
    setLoading(false);
    router.push('/onboarding/camera');
  };

  return (
    <OnboardingStep
      step={3}
      icon="notifications-outline"
      title="Reminders that actually help"
      body="MedMinder nudges you before each dose and checks in if you haven't marked it taken — so you never lose track, even on busy days."
      primaryLabel="Allow notifications"
      onPrimary={allow}
      primaryLoading={loading}
      secondaryLabel="Not now"
      onSecondary={() => router.push('/onboarding/camera')}
      skipToEnd={() => router.push('/onboarding/disclaimer')}
    />
  );
}
