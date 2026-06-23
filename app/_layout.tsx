import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // expo-notifications remote push was removed from Expo Go in SDK 53+.
    // Dynamic import so a throw during module load doesn't crash the layout.
    import('@/lib/notifications')
      .then(({ configureNotificationHandler, setupNotificationChannels, setupNotificationCategories }) => {
        configureNotificationHandler();
        void setupNotificationChannels();
        void setupNotificationCategories();
      })
      .catch(() => {
        // Silently skip notification setup when running in Expo Go.
      });
  }, []);

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
