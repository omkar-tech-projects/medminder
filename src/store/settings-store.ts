import { create } from 'zustand';
import { getSetting, setSetting, DEFAULT_SETTINGS, type SettingKey } from '@/db/queries/settings';

type SettingsState = {
  notificationLeadMin: number;
  reRemindIntervalMin: number;
  maxNags: number;
  snoozeDurationMin: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  notificationSoundEnabled: boolean;
  refillWarningDays: number;
  lowStockWarningDays: number;
  theme: 'light' | 'dark' | 'system';
  calendarSync: boolean;
  googleCalendarEnabled: boolean;
  onboardingDone: boolean;
  load: () => void;
  update: (key: SettingKey, value: string) => void;
  resetToDefaults: () => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  notificationLeadMin: 5,
  reRemindIntervalMin: 5,
  maxNags: 24,
  snoozeDurationMin: 5,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  notificationSoundEnabled: true,
  refillWarningDays: 3,
  lowStockWarningDays: 3,
  theme: 'system',
  calendarSync: false,
  googleCalendarEnabled: false,
  onboardingDone: false,

  load() {
    set({
      notificationLeadMin: Number(getSetting('notification_lead_min')),
      reRemindIntervalMin: Number(getSetting('re_remind_interval_min')),
      maxNags: Number(getSetting('max_nags')),
      snoozeDurationMin: Number(getSetting('snooze_duration_min')),
      quietHoursEnabled: getSetting('quiet_hours_enabled') !== 'false',
      quietHoursStart: getSetting('quiet_hours_start'),
      quietHoursEnd: getSetting('quiet_hours_end'),
      notificationSoundEnabled: getSetting('notification_sound_enabled') !== 'false',
      refillWarningDays: Number(getSetting('refill_warning_days')),
      lowStockWarningDays: Number(getSetting('low_stock_warning_days')),
      theme: getSetting('theme') as 'light' | 'dark' | 'system',
      calendarSync: getSetting('calendar_sync') === 'true',
      googleCalendarEnabled: getSetting('google_calendar_enabled') === 'true',
      onboardingDone: getSetting('onboarding_done') === 'true',
    });
  },

  update(key, value) {
    setSetting(key, value);
    get().load();
  },

  resetToDefaults() {
    (Object.entries(DEFAULT_SETTINGS) as [SettingKey, string][]).forEach(([key, value]) => {
      setSetting(key, value);
    });
    get().load();
  },
}));
