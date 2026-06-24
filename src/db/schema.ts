import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  avatarColor: text('avatar_color').notNull().default('#3B82F6'),
  isDefault: integer('is_default').notNull().default(0),
  /** True for the device-owner's profile (the first profile ever created). */
  isPrimary: integer('is_primary').notNull().default(0),
  /** E.164-style string including dial code, e.g. "+919876543210". Informational only. */
  phoneNumber: text('phone_number'),
  /** self | spouse | parent | child | other */
  relationship: text('relationship'),
  /** ISO date string, e.g. "1990-04-15". */
  dateOfBirth: text('date_of_birth'),
  caregiverName: text('caregiver_name'),
  caregiverContact: text('caregiver_contact'),
  caregiverAlertEnabled: integer('caregiver_alert_enabled').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const medicines = sqliteTable('medicines', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  strength: text('strength'),
  form: text('form'),
  instructions: text('instructions'),
  timing: text('timing').notNull().default('any'),
  durationDays: integer('duration_days'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  stockCount: integer('stock_count'),
  active: integer('active').notNull().default(1),
  dosage: real('dosage').notNull(),
  dosageUnit: text('dosage_unit').notNull(),
  timesPerDay: integer('times_per_day').notNull(),
  color: text('color').notNull().default('#3B82F6'),
  calendarSync: integer('calendar_sync').notNull().default(1),
  leadMinutesOverride: integer('lead_minutes_override'),
  nagIntervalMinutesOverride: integer('nag_interval_minutes_override'),
  maxNagsOverride: integer('max_nags_override'),
  snoozeDurationMinOverride: integer('snooze_duration_min_override'),
  quietHoursOverride: integer('quiet_hours_override'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  medicineId: text('medicine_id')
    .notNull()
    .references(() => medicines.id, { onDelete: 'cascade' }),
  timeOfDay: text('time_of_day').notNull(),
  dayPattern: text('day_pattern'),
  leadMinutes: integer('lead_minutes').notNull().default(5),
  nagIntervalMinutes: integer('nag_interval_minutes').notNull().default(5),
  maxNags: integer('max_nags').notNull().default(24),
});

export const doseLogs = sqliteTable('dose_logs', {
  id: text('id').primaryKey(),
  medicineId: text('medicine_id')
    .notNull()
    .references(() => medicines.id, { onDelete: 'cascade' }),
  scheduleId: text('schedule_id').references(() => schedules.id, { onDelete: 'set null' }),
  scheduledAt: text('scheduled_at').notNull(),
  status: text('status').notNull().default('pending'),
  respondedAt: text('responded_at'),
  source: text('source'),
  calendarEventId: text('calendar_event_id'),
  googleCalendarEventId: text('google_calendar_event_id'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Medicine = typeof medicines.$inferSelect;
export type NewMedicine = typeof medicines.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
export type DoseLog = typeof doseLogs.$inferSelect;
export type NewDoseLog = typeof doseLogs.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

// Legacy aliases for any code not yet migrated
export type Medication = Medicine;
export type NewMedication = NewMedicine;
