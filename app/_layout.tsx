import { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ToastContainer } from '@/components';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useNotificationHandler } from '@/hooks/use-notification-handler';
import { useAutoMiss } from '@/hooks/use-auto-miss';
import { runRefillCheck } from '@/services/refill-service';
import { useSettingsStore } from '@/store/settings-store';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

  useNotificationHandler();
  useAutoMiss();

  useEffect(() => {
    const refillWarningDays = useSettingsStore.getState().refillWarningDays;
    void runRefillCheck(refillWarningDays).catch(() => undefined);
  }, []);

  const isLoaded = useOnboardingStore((s) => s.isLoaded);
  const hasOnboarded = useOnboardingStore((s) => s.hasOnboarded);
  const loadOnboarding = useOnboardingStore((s) => s.load);

  useEffect(() => {
    void loadOnboarding();
  }, [loadOnboarding]);

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
      .catch(() => {});
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
    </View>
  );
}
