import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAppLockStore } from '@/store/app-lock-store';

async function tryAuthenticate(unlock: () => void): Promise<void> {
  const { isLocked, biometricEnabled } = useAppLockStore.getState();
  if (!isLocked || !biometricEnabled) return;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock MedMinder',
    fallbackLabel: 'Use passcode',
    disableDeviceFallback: false,
  });
  if (result.success) unlock();
}

export function useAppLock(): void {
  const lock = useAppLockStore((s) => s.lock);
  const unlock = useAppLockStore((s) => s.unlock);
  const isLoaded = useAppLockStore((s) => s.isLoaded);
  const wentToBackground = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    void tryAuthenticate(unlock);
  }, [isLoaded, unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        wentToBackground.current = true;
        lock();
      } else if (state === 'active' && wentToBackground.current) {
        wentToBackground.current = false;
        void tryAuthenticate(unlock);
      }
    });
    return () => sub.remove();
  }, [lock, unlock]);
}
