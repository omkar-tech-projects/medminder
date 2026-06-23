import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY = 'medminder_onboarding_v1';

interface StoredOnboarding {
  hasOnboarded: boolean;
  disclaimerAcceptedAt: string | null;
}

type OnboardingState = {
  hasOnboarded: boolean;
  disclaimerAcceptedAt: string | null;
  isLoaded: boolean;
  load: () => Promise<void>;
  complete: (disclaimerAcceptedAt: string) => Promise<void>;
  reset: () => Promise<void>;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasOnboarded: false,
  disclaimerAcceptedAt: null,
  isLoaded: false,

  async load() {
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw != null) {
      const stored = JSON.parse(raw) as StoredOnboarding;
      set({ hasOnboarded: stored.hasOnboarded, disclaimerAcceptedAt: stored.disclaimerAcceptedAt });
    }
    set({ isLoaded: true });
  },

  async complete(disclaimerAcceptedAt: string) {
    const stored: StoredOnboarding = { hasOnboarded: true, disclaimerAcceptedAt };
    await SecureStore.setItemAsync(KEY, JSON.stringify(stored));
    set({ hasOnboarded: true, disclaimerAcceptedAt });
  },

  async reset() {
    await SecureStore.deleteItemAsync(KEY);
    set({ hasOnboarded: false, disclaimerAcceptedAt: null, isLoaded: true });
  },
}));
