import { router } from 'expo-router';
import { OnboardingStep } from '@/components';

export default function OnboardingIntroScreen() {
  return (
    <OnboardingStep
      step={1}
      icon="medical-outline"
      title="Never miss a dose"
      body="Photograph your prescription and MedMinder sets up reminders automatically — tracking every dose and alerting you when it's time to refill."
      primaryLabel="Get started"
      onPrimary={() => router.push('/onboarding/name')}
      secondaryLabel="Skip intro"
      onSecondary={() => router.push('/onboarding/disclaimer')}
    />
  );
}
