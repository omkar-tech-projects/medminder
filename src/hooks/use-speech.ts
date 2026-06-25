import * as Speech from 'expo-speech';
import { useSettingsStore } from '@/store/settings-store';

export function speakText(text: string): void {
  const { voiceAnnounceDoses } = useSettingsStore.getState();
  if (!voiceAnnounceDoses) return;
  Speech.speak(text, { language: 'en-US', rate: 0.9, pitch: 1.0 });
}

export function stopSpeaking(): void {
  void Speech.stop();
}
