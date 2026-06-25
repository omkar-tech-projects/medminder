import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingStep } from '@/components';
import { requestNotificationPermission } from '@/lib/permissions';

export default function OnboardingNotificationsScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const allow = async () => {
    setLoading(true);
    await requestNotificationPermission();
    setLoading(false);
    router.push('/onboarding/camera');
  };

  return (
    <OnboardingStep
      step={4}
      icon="notifications-outline"
      title={t('onboarding.notifications.title')}
      body={t('onboarding.notifications.body')}
      primaryLabel={t('onboarding.notifications.allow')}
      onPrimary={allow}
      primaryLoading={loading}
      secondaryLabel={t('onboarding.notifications.notNow')}
      onSecondary={() => router.push('/onboarding/camera')}
      skipToEnd={() => router.push('/onboarding/disclaimer')}
    />
  );
}
