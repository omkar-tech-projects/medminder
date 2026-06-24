export const APP_NAME = 'MedMinder';
export const DB_NAME = 'medminder.db';
export const ANTHROPIC_API_KEY_STORE_KEY = 'ANTHROPIC_API_KEY';
export const CLAUDE_MODEL = 'claude-sonnet-4-6';

export const NOTIFICATION_CHANNELS = {
  DOSE_REMINDERS: 'dose-reminders',
  REFILL_ALERTS: 'refill-alerts',
} as const;

export const NOTIFICATION_CATEGORY = 'dose-action';

export const NOTIFICATION_ACTIONS = {
  MARK_TAKEN: 'MARK_TAKEN',
  SNOOZE: 'SNOOZE',
} as const;

export const DOSE_STATUS = {
  PENDING: 'pending',
  TAKEN: 'taken',
  MISSED: 'missed',
  SKIPPED: 'skipped',
} as const;

export const FREQUENCY = {
  ONCE_DAILY: 'once_daily',
  TWICE_DAILY: 'twice_daily',
  THREE_TIMES_DAILY: 'three_times_daily',
  EVERY_N_HOURS: 'every_n_hours',
  CUSTOM: 'custom',
} as const;

export const MEDICATION_COLORS = [
  '#3B82F6',
  '#14B8A6',
  '#A855F7',
  '#EC4899',
  '#F97316',
  '#EAB308',
  '#84CC16',
  '#06B6D4',
] as const;

export const DOSE_REMINDER_RE_REMIND_CAP_HOURS = 2;
export const DOSE_LOG_GENERATE_DAYS_AHEAD = 14;
