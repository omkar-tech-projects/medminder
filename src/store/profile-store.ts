import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const PROFILE_STORE_KEY = 'medminder_user_profile';

interface Profile {
  name: string;
}

type ProfileState = {
  name: string;
  isLoaded: boolean;
  load: () => Promise<void>;
  setName: (name: string) => Promise<void>;
};

export const useProfileStore = create<ProfileState>((set) => ({
  name: '',
  isLoaded: false,

  async load() {
    const raw = await SecureStore.getItemAsync(PROFILE_STORE_KEY);
    const profile: Profile = raw != null ? (JSON.parse(raw) as Profile) : { name: '' };
    set({ name: profile.name, isLoaded: true });
  },

  async setName(name: string) {
    const profile: Profile = { name };
    await SecureStore.setItemAsync(PROFILE_STORE_KEY, JSON.stringify(profile));
    set({ name });
  },
}));
