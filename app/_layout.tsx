import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { ToastContainer } from '@/components';
import { useOnboardingStore } from '@/store/onboarding-store';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

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
      router.replace('/onboarding/index');
    }
  }, [isLoaded, hasOnboarded, segments, router]);

  // expo-notifications remote push was removed from Expo Go in SDK 53+.
  // Dynamic import so a throw during module load doesn't crash the layout.
  useEffect(() => {
    import('@/lib/notifications')
      .then(({ configureNotificationHandler, setupNotificationChannels, setupNotificationCategories }) => {
        configureNotificationHandler();
        void setupNotificationChannels();
        void setupNotificationCategories();
      })
      .catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen
          name="gallery"
          options={{ headerShown: true, title: 'Component Gallery', presentation: 'modal' }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <ToastContainer />
    </View>
  );
}
