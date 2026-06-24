import { useState } from 'react';
import { router } from 'expo-router';
import { OnboardingStep, Input } from '@/components';
import { useProfileStore } from '@/store/profile-store';

export default function OnboardingNameScreen() {
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
      title="What should we call you?"
      body="We'll use your name in daily greetings. It stays on your device and is never shared."
      primaryLabel="Continue"
      onPrimary={() => proceed(name)}
      secondaryLabel="Skip"
      onSecondary={() => router.push('/onboarding/phone')}
      skipToEnd={() => router.push('/onboarding/disclaimer')}
      keyboardAware
    >
      <Input
        label="Your name"
        placeholder="e.g. Alex"
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void proceed(name)}
        leftIcon="person-outline"
        autoCapitalize="words"
        autoCorrect={false}
        accessibilityLabel="Enter your name"
      />
    </OnboardingStep>
  );
}
