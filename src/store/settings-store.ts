import { create } from 'zustand';
import { getSetting, setSetting, type SettingKey } from '@/db/queries/settings';

type SettingsState = {
  notificationLeadMin: number;
  reRemindIntervalMin: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  refillWarningDays: number;
  theme: 'light' | 'dark' | 'system';
  calendarSync: boolean;
  onboardingDone: boolean;
  load: () => void;
  update: (key: SettingKey, value: string) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  notificationLeadMin: 5,
  reRemindIntervalMin: 5,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  refillWarningDays: 3,
  theme: 'system',
  calendarSync: false,
  onboardingDone: false,

  load() {
    set({
      notificationLeadMin: Number(getSetting('notification_lead_min')),
      reRemindIntervalMin: Number(getSetting('re_remind_interval_min')),
      quietHoursStart: getSetting('quiet_hours_start'),
      quietHoursEnd: getSetting('quiet_hours_end'),
      refillWarningDays: Number(getSetting('refill_warning_days')),
      theme: getSetting('theme') as 'light' | 'dark' | 'system',
      calendarSync: getSetting('calendar_sync') === 'true',
      onboardingDone: getSetting('onboarding_done') === 'true',
    });
  },

  update(key, value) {
    setSetting(key, value);
    this.load();
  },
}));
