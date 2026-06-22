import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const medications = sqliteTable('medications', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  dosage: real('dosage').notNull(),
  dosageUnit: text('dosage_unit').notNull(),
  frequency: text('frequency').notNull(),
  timesPerDay: integer('times_per_day').notNull(),
  durationDays: integer('duration_days'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  color: text('color').notNull(),
  notes: text('notes'),
  paused: integer('paused').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  medicationId: text('medication_id')
    .notNull()
    .references(() => medications.id, { onDelete: 'cascade' }),
  timeOfDay: text('time_of_day').notNull(),
  daysOfWeek: text('days_of_week'),
});

export const doseLogs = sqliteTable('dose_logs', {
  id: text('id').primaryKey(),
  medicationId: text('medication_id')
    .notNull()
    .references(() => medications.id, { onDelete: 'cascade' }),
  scheduleId: text('schedule_id').references(() => schedules.id, { onDelete: 'set null' }),
  scheduledAt: text('scheduled_at').notNull(),
  takenAt: text('taken_at'),
  status: text('status').notNull().default('pending'),
  notes: text('notes'),
});

export const reminderJobs = sqliteTable('reminder_jobs', {
  id: text('id').primaryKey(),
  doseLogId: text('dose_log_id')
    .notNull()
    .references(() => doseLogs.id, { onDelete: 'cascade' }),
  expoNotifId: text('expo_notif_id'),
  scheduledFor: text('scheduled_for').notNull(),
  type: text('type').notNull(),
  sent: integer('sent').notNull().default(0),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Medication = typeof medications.$inferSelect;
export type NewMedication = typeof medications.$inferInsert;
export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;
export type DoseLog = typeof doseLogs.$inferSelect;
export type NewDoseLog = typeof doseLogs.$inferInsert;
export type ReminderJob = typeof reminderJobs.$inferSelect;
export type NewReminderJob = typeof reminderJobs.$inferInsert;
export type Setting = typeof settings.$inferSelect;
