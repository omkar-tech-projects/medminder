import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import { useDoseStore } from '@/store/dose-store';
import { getProfileById } from '@/db/queries/profiles';
import { canSendCaregiverAlert, sendCaregiverAlert } from '@/services/caregiver-alert-service';
import type { OverduePendingDoseWithProfile } from '@/db/queries/dose-logs';

async function handleCaregiverAlerts(missed: OverduePendingDoseWithProfile[]): Promise<void> {
  if (missed.length === 0) return;

  // Group missed medicines by profileId so one Alert fires per profile.
  const byProfile = new Map<string, string[]>();
  for (const m of missed) {
    if (!m.profileId) continue;
    const existing = byProfile.get(m.profileId) ?? [];
    existing.push(m.medicineName);
    byProfile.set(m.profileId, existing);
  }

  for (const [profileId, medicineNames] of byProfile) {
    const profile = getProfileById(profileId);
    if (!profile || !canSendCaregiverAlert(profile)) continue;

    const caregiverName = profile.caregiverName ?? 'caregiver';
    const meds = medicineNames.join(', ');

    await new Promise<void>((resolve) => {
      Alert.alert(
        'Missed dose alert',
        `${profile.name} missed: ${meds}.\nNotify ${caregiverName}?`,
        [
          { text: 'Skip', style: 'cancel', onPress: () => resolve() },
          {
            text: 'Notify',
            onPress: () => {
              void sendCaregiverAlert(profile, meds).finally(() => resolve());
            },
          },
        ],
      );
    });
  }
}

export function useAutoMiss(): void {
  useEffect(() => {
    const check = (): void => {
      const missed = useDoseStore.getState().processAutoMisses();
      void handleCaregiverAlerts(missed).catch(() => undefined);
    };

    check();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') check();
    });

    return () => sub.remove();
  }, []);
}
