import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingStep, Input } from '@/components';
import { useProfileStore } from '@/store/profile-store';

export default function OnboardingNameScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const setProfileName = useProfileStore((s) => s.setName);

  const proceed = async (value: string) => {
    if (value.trim().length > 0) {
      await setProfileName(value.trim());
    }
    router.push('/onboarding/phone');
  };

  return (
    <OnboardingStep
      step={2}
      icon="person-outline"
      title={t('onboarding.name.title')}
      body={t('onboarding.name.body')}
      primaryLabel={t('onboarding.name.primary')}
      onPrimary={() => proceed(name)}
      secondaryLabel={t('onboarding.name.skip')}
      onSecondary={() => router.push('/onboarding/phone')}
      skipToEnd={() => router.push('/onboarding/disclaimer')}
      keyboardAware
    >
      <Input
        label={t('onboarding.name.inputLabel')}
        placeholder={t('onboarding.name.inputPlaceholder')}
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void proceed(name)}
        leftIcon="person-outline"
        autoCapitalize="words"
        autoCorrect={false}
        accessibilityLabel={t('onboarding.name.inputA11y')}
      />
    </OnboardingStep>
  );
}
