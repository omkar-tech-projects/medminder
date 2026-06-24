import { Stack } from 'expo-router';

export default function AnalyseLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />;
}
