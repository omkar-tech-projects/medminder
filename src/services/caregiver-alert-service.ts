import { Alert, Linking, Platform } from 'react-native';
import type { Profile } from '@/db/schema';

export function canSendCaregiverAlert(profile: Profile): boolean {
  return (
    profile.caregiverAlertEnabled === 1 &&
    profile.caregiverContact != null &&
    profile.caregiverContact.trim().length > 0
  );
}

function buildUrl(contact: string, personName: string, medicineNames: string): string {
  const body = `${personName} missed a dose of ${medicineNames}. Please check in if possible.`;
  if (contact.includes('@')) {
    return (
      `mailto:${contact}` +
      `?subject=${encodeURIComponent(`Missed dose – ${personName}`)}` +
      `&body=${encodeURIComponent(body)}`
    );
  }
  const sep = Platform.OS === 'ios' ? '&' : '?';
  return `sms:${contact}${sep}body=${encodeURIComponent(body)}`;
}

export async function sendCaregiverAlert(profile: Profile, medicineNames: string): Promise<void> {
  const contact = profile.caregiverContact?.trim();
  if (!contact) return;
  const url = buildUrl(contact, profile.name, medicineNames);
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    Alert.alert(
      'Cannot send alert',
      'Unable to open a messaging app. Please verify the caregiver contact in profile settings.',
    );
  }
}
