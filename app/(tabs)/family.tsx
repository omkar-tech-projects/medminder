import { useState, useCallback } from 'react';
import { View, ScrollView, Alert, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, AppHeader, Button, EmptyState } from '@/components';
import { FamilyDashboard } from '@/components/FamilyDashboard';
import { FamilyMemberCard } from '@/components/FamilyMemberCard';
import { FamilyMemberFormSheet } from '@/components/FamilyMemberFormSheet';
import { useTheme } from '@/theme';
import { useProfileStore } from '@/store/profile-store';
import { getTodayAdherenceSummaryForProfile, getTodayDoses } from '@/db/queries/dose-logs';
import { getActiveMedicineCount } from '@/db/queries/medicines';
import { format } from 'date-fns';
import type { Profile } from '@/db/schema';
import type { AdherenceSummary } from '@/repositories/dose-repository';

interface ProfileData {
  profile: Profile;
  adherence: AdherenceSummary;
  medicineCount: number;
  nextDoseTime: string | null;
}

function loadProfileData(profile: Profile): ProfileData {
  const adherence = getTodayAdherenceSummaryForProfile(profile.id);
  const medicineCount = getActiveMedicineCount(profile.id);
  const today = format(new Date(), 'yyyy-MM-dd');
  const doses = getTodayDoses(today, profile.id);
  const nextDose = doses.find((d) => d.status === 'pending');
  return { profile, adherence, medicineCount, nextDoseTime: nextDose?.scheduledAt ?? null };
}

export default function FamilyScreen() {
  const { spacing } = useTheme();
  const { t } = useTranslation();
  const { profiles, activeProfileId, setActiveProfile } = useProfileStore();
  const [profileData, setProfileData] = useState<ProfileData[]>([]);
  const [formTarget, setFormTarget] = useState<Profile | 'new' | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setProfileData(profiles.map(loadProfileData));
  }, [profiles]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function handleManageProfile(profileId: string): Promise<void> {
    await setActiveProfile(profileId);
  }

  function handleDeleteConfirm(profile: Profile): void {
    const store = useProfileStore.getState();
    if (store.profiles.length <= 1) return;
    Alert.alert(
      t('family.deleteConfirmTitle', { name: profile.name }),
      t('family.deleteConfirmMessage', { name: profile.name }),
      [
        { text: t('family.deleteConfirmCancel'), style: 'cancel' },
        {
          text: t('family.deleteConfirmButton'),
          style: 'destructive',
          onPress: () => {
            store.deleteProfile(profile.id);
            refresh();
          },
        },
      ],
    );
  }

  const summaries = profileData.map((d) => d.adherence);
  const missedNames = profileData.filter((d) => d.adherence.missed > 0).map((d) => d.profile.name);

  return (
    <Screen edges={['top']}>
      <AppHeader
        title={t('family.title')}
        rightAction={{
          icon: 'person-add-outline',
          onPress: () => setFormTarget('new'),
          accessibilityLabel: t('family.addMember'),
        }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: spacing[5], paddingBottom: spacing[8] },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              refresh();
              setRefreshing(false);
            }}
          />
        }
      >
        {/* Caregiver dashboard — cross-profile summary */}
        {summaries.length > 0 && (
          <View style={{ marginBottom: spacing[4] }}>
            <FamilyDashboard summaries={summaries} missedNames={missedNames} />
          </View>
        )}

        {profiles.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={t('family.noMembers')}
            subtitle={t('family.noMembersSubtitle')}
            action={{ label: t('family.addMember'), onPress: () => setFormTarget('new') }}
          />
        ) : (
          <>
            {profileData.map((d) => (
              <FamilyMemberCard
                key={d.profile.id}
                profile={d.profile}
                adherence={d.adherence}
                activeMedicineCount={d.medicineCount}
                nextDoseTime={d.nextDoseTime}
                isActive={d.profile.id === activeProfileId}
                onPress={() => void handleManageProfile(d.profile.id)}
                onEdit={() => setFormTarget(d.profile)}
                onDelete={() => handleDeleteConfirm(d.profile)}
              />
            ))}

            <Button
              label={t('family.addMember')}
              variant="ghost"
              fullWidth
              leftIcon="person-add-outline"
              onPress={() => setFormTarget('new')}
              style={{ marginTop: spacing[2] }}
              accessibilityLabel={t('family.addMember')}
            />
          </>
        )}
      </ScrollView>

      {formTarget != null && (
        <FamilyMemberFormSheet
          target={formTarget}
          visible={formTarget != null}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            refresh();
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8 },
});
