import '@/lib/i18n';
import { useEffect, useState } from 'react';
import { View, useColorScheme, AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { ToastContainer } from '@/components';
import { AppLockScreen } from '@/components/AppLockScreen';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useAppLockStore } from '@/store/app-lock-store';
import { useNotificationHandler } from '@/hooks/use-notification-handler';
import { useAutoMiss } from '@/hooks/use-auto-miss';
import { useAppLock } from '@/hooks/use-app-lock';
import { runRefillCheck } from '@/services/refill-service';
import { runGoogleCalendarMigrationIfNeeded } from '@/services/google-calendar-service';
import { scheduleWindowNotifications } from '@/services/reschedule-service';
import { useSettingsStore } from '@/store/settings-store';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Load settings synchronously before the first render so the theme preference
  // (light/dark/system) is available immediately and avoids a flash of wrong colours
  // on Android when useColorScheme() returns null on the very first render.
  useState(() => {
    useSettingsStore.getState().load();
  });

  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  useNotificationHandler();
  useAutoMiss();
  useAppLock();

  useEffect(() => {
    const refillWarningDays = useSettingsStore.getState().refillWarningDays;
    void runRefillCheck(refillWarningDays).catch(() => undefined);
    void runGoogleCalendarMigrationIfNeeded().catch(() => undefined);
    // Arm the notification window on first launch.
    void scheduleWindowNotifications().catch(() => undefined);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        // Re-arm rolling window whenever app comes to foreground so tomorrow's
        // doses always have alarms ready.
        void scheduleWindowNotifications().catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, []);

  const isOnboardingLoaded = useOnboardingStore((s) => s.isLoaded);
  const hasOnboarded = useOnboardingStore((s) => s.hasOnboarded);
  const loadOnboarding = useOnboardingStore((s) => s.load);

  const isLockLoaded = useAppLockStore((s) => s.isLoaded);
  const isLocked = useAppLockStore((s) => s.isLocked);
  const loadAppLock = useAppLockStore((s) => s.load);

  const isLoaded = isOnboardingLoaded && isLockLoaded && (fontsLoaded ?? false);

  useEffect(() => {
    void loadOnboarding();
    void loadAppLock();
  }, [loadOnboarding, loadAppLock]);

  useEffect(() => {
    if (!isLoaded) return;
    void SplashScreen.hideAsync();
  }, [isLoaded]);

  // Redirect to onboarding when not yet completed
  useEffect(() => {
    if (!isLoaded) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!hasOnboarded && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [isLoaded, hasOnboarded, segments, router]);

  // expo-notifications remote push was removed from Expo Go in SDK 53+.
  // Dynamic import so a throw during module load doesn't crash the layout.
  useEffect(() => {
    import('@/lib/notifications')
      .then(
        ({
          configureNotificationHandler,
          setupNotificationChannels,
          setupNotificationCategories,
        }) => {
          configureNotificationHandler();
          void setupNotificationChannels();
          void setupNotificationCategories();
        },
      )
      .catch((err: unknown) => {
        if (__DEV__) console.warn('[notifications] setup failed:', err);
      });
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen
          name="capture"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="analyse"
          options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="review"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="privacy"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="gallery"
          options={{ headerShown: true, title: 'Component Gallery', presentation: 'modal' }}
        />
        <Stack.Screen
          name="debug"
          options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="medicine/[id]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <ToastContainer />
      <AppLockScreen visible={isLocked} />
    </View>
  );
}
