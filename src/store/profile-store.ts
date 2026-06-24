import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import {
  getAllProfiles,
  getPrimaryProfile,
  insertProfile,
  updateProfile as updateProfileRecord,
  deleteProfile as deleteProfileRecord,
  DEFAULT_PROFILE_ID,
} from '@/db/queries/profiles';
import type { Profile, NewProfile } from '@/db/schema';
import { newId } from '@/lib/id';

const ACTIVE_PROFILE_KEY = 'medminder_active_profile_id';

type ProfileState = {
  profiles: Profile[];
  activeProfileId: string;
  primaryProfileId: string;
  /** Backward-compat: name of the active profile. */
  name: string;
  isLoaded: boolean;
  load: () => Promise<void>;
  setActiveProfile: (id: string) => Promise<void>;
  setName: (name: string) => void;
  createProfile: (
    name: string,
    avatarColor: string,
    extra?: Partial<
      Pick<
        NewProfile,
        | 'phoneNumber'
        | 'relationship'
        | 'dateOfBirth'
        | 'caregiverName'
        | 'caregiverContact'
        | 'caregiverAlertEnabled'
      >
    >,
  ) => Profile;
  updateProfile: (id: string, data: Partial<NewProfile>) => void;
  deleteProfile: (id: string) => void;
};

function deriveName(profiles: Profile[], activeId: string): string {
  return profiles.find((p) => p.id === activeId)?.name ?? '';
}

function derivePrimaryId(profiles: Profile[]): string {
  return profiles.find((p) => p.isPrimary === 1)?.id ?? DEFAULT_PROFILE_ID;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  activeProfileId: DEFAULT_PROFILE_ID,
  primaryProfileId: DEFAULT_PROFILE_ID,
  name: '',
  isLoaded: false,

  async load() {
    const profiles = getAllProfiles();
    const storedId = await SecureStore.getItemAsync(ACTIVE_PROFILE_KEY);
    const activeProfileId =
      storedId != null && profiles.some((p) => p.id === storedId)
        ? storedId
        : (profiles[0]?.id ?? DEFAULT_PROFILE_ID);
    set({
      profiles,
      activeProfileId,
      primaryProfileId: derivePrimaryId(profiles),
      name: deriveName(profiles, activeProfileId),
      isLoaded: true,
    });
  },

  async setActiveProfile(id) {
    await SecureStore.setItemAsync(ACTIVE_PROFILE_KEY, id);
    const { profiles } = get();
    set({ activeProfileId: id, name: deriveName(profiles, id) });
  },

  setName(name) {
    const { activeProfileId } = get();
    updateProfileRecord(activeProfileId, { name });
    const profiles = getAllProfiles();
    set({ profiles, name });
  },

  createProfile(name, avatarColor, extra = {}) {
    const now = new Date().toISOString();
    const profile: Profile = {
      id: newId('prof'),
      name,
      avatarColor,
      isDefault: 0,
      isPrimary: 0,
      phoneNumber: extra.phoneNumber ?? null,
      relationship: extra.relationship ?? null,
      dateOfBirth: extra.dateOfBirth ?? null,
      caregiverName: extra.caregiverName ?? null,
      caregiverContact: extra.caregiverContact ?? null,
      caregiverAlertEnabled: extra.caregiverAlertEnabled ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    insertProfile(profile);
    const profiles = getAllProfiles();
    set({ profiles });
    return profile;
  },

  updateProfile(id, data) {
    updateProfileRecord(id, data);
    const { activeProfileId } = get();
    const profiles = getAllProfiles();
    set({
      profiles,
      primaryProfileId: derivePrimaryId(profiles),
      name: deriveName(profiles, activeProfileId),
    });
  },

  deleteProfile(id) {
    const { profiles, activeProfileId } = get();
    if (profiles.length <= 1) return;
    deleteProfileRecord(id);
    const remaining = getAllProfiles();
    let newActiveId = activeProfileId;
    if (activeProfileId === id) {
      newActiveId = remaining[0]?.id ?? DEFAULT_PROFILE_ID;
      void SecureStore.setItemAsync(ACTIVE_PROFILE_KEY, newActiveId);
    }
    set({
      profiles: remaining,
      activeProfileId: newActiveId,
      primaryProfileId: derivePrimaryId(remaining),
      name: deriveName(remaining, newActiveId),
    });
  },
}));

/** Convenience: set phone number on the primary profile (called from onboarding). */
export function setPrimaryProfilePhone(phoneNumber: string): void {
  const primary = getPrimaryProfile();
  if (primary == null) return;
  updateProfileRecord(primary.id, { phoneNumber });
  useProfileStore.setState((s) => ({
    profiles: getAllProfiles(),
    name: s.name,
  }));
}
