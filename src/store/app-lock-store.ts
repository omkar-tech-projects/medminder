import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const LOCK_ENABLED_KEY = 'medminder_app_lock_enabled';

type AppLockState = {
  isLocked: boolean;
  biometricEnabled: boolean;
  isLoaded: boolean;
  load: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  lock: () => void;
  unlock: () => void;
};

export const useAppLockStore = create<AppLockState>((set, get) => ({
  isLocked: false,
  biometricEnabled: false,
  isLoaded: false,

  async load() {
    const stored = await SecureStore.getItemAsync(LOCK_ENABLED_KEY);
    const biometricEnabled = stored === 'true';
    set({ biometricEnabled, isLocked: biometricEnabled, isLoaded: true });
  },

  async setBiometricEnabled(enabled) {
    await SecureStore.setItemAsync(LOCK_ENABLED_KEY, String(enabled));
    set({ biometricEnabled: enabled, isLocked: enabled });
  },

  lock() {
    if (get().biometricEnabled) set({ isLocked: true });
  },

  unlock() {
    set({ isLocked: false });
  },
}));
