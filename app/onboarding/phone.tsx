import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { OnboardingStep, Input } from '@/components';
import { CountryCodePicker } from '@/components/CountryCodePicker';
import { DEFAULT_COUNTRY, type CountryCode } from '@/lib/country-codes';
import { setPrimaryProfilePhone } from '@/store/profile-store';

export default function OnboardingPhoneScreen() {
  const { t } = useTranslation();
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [nationalNumber, setNationalNumber] = useState('');

  function proceed(save: boolean): void {
    if (save && nationalNumber.trim().length > 0) {
      setPrimaryProfilePhone(`${country.dialCode}${nationalNumber.trim()}`);
    }
    router.push('/onboarding/notifications');
  }

  return (
    <OnboardingStep
      step={3}
      icon="call-outline"
      title={t('onboardingPhone.title')}
      body={t('onboardingPhone.body')}
      primaryLabel={t('onboardingPhone.primary')}
      onPrimary={() => proceed(true)}
      secondaryLabel={t('onboardingPhone.skip')}
      onSecondary={() => proceed(false)}
      keyboardAware
    >
      <View style={styles.row}>
        <CountryCodePicker value={country} onChange={setCountry} />
        <View style={styles.numberInput}>
          <Input
            placeholder={t('onboardingPhone.placeholder')}
            value={nationalNumber}
            onChangeText={setNationalNumber}
            keyboardType="phone-pad"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => proceed(true)}
            accessibilityLabel={t('onboardingPhone.label')}
          />
        </View>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  numberInput: { flex: 1 },
});
