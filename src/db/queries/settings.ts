import { eq } from 'drizzle-orm';
import { db } from '../index';
import { settings } from '../schema';

export const DEFAULT_SETTINGS = {
  notification_lead_min: '5',
  re_remind_interval_min: '5',
  max_nags: '24',
  snooze_duration_min: '5',
  quiet_hours_enabled: 'true',
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
  notification_sound_enabled: 'true',
  voice_announce_doses: 'false',
  refill_warning_days: '3',
  low_stock_warning_days: '3',
  theme: 'system',
  calendar_sync: 'false',
  google_calendar_enabled: 'false',
  device_calendar_id: '',
  device_calendar_name: '',
  onboarding_done: 'false',
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;

export function getSetting(key: SettingKey): string {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? DEFAULT_SETTINGS[key];
}

export function setSetting(key: SettingKey, value: string) {
  return db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

export function getAllSettings(): Record<string, string> {
  const rows = db.select().from(settings).all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
