import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const CREATE_TABLES = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    avatar_color TEXT NOT NULL DEFAULT '#3B82F6',
    is_default INTEGER NOT NULL DEFAULT 0,
    caregiver_name TEXT,
    caregiver_contact TEXT,
    caregiver_alert_enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS medicines (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    strength TEXT,
    form TEXT,
    instructions TEXT,
    timing TEXT NOT NULL DEFAULT 'any'
      CHECK(timing IN ('before_food','after_food','with_food','any')),
    duration_days INTEGER,
    start_date TEXT NOT NULL,
    end_date TEXT,
    stock_count INTEGER,
    active INTEGER NOT NULL DEFAULT 1,
    dosage REAL NOT NULL,
    dosage_unit TEXT NOT NULL,
    times_per_day INTEGER NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY NOT NULL,
    medicine_id TEXT NOT NULL
      REFERENCES medicines(id) ON DELETE CASCADE,
    time_of_day TEXT NOT NULL,
    day_pattern TEXT,
    lead_minutes INTEGER NOT NULL DEFAULT 5,
    nag_interval_minutes INTEGER NOT NULL DEFAULT 5,
    max_nags INTEGER NOT NULL DEFAULT 24
  );

  CREATE TABLE IF NOT EXISTS dose_logs (
    id TEXT PRIMARY KEY NOT NULL,
    medicine_id TEXT NOT NULL
      REFERENCES medicines(id) ON DELETE CASCADE,
    schedule_id TEXT
      REFERENCES schedules(id) ON DELETE SET NULL,
    scheduled_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK(status IN ('pending','taken','skipped','missed')),
    responded_at TEXT,
    source TEXT
      CHECK(source IN ('notification','app'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;

const sqlite = openDatabaseSync('medminder.db', { enableChangeListener: true });
sqlite.execSync(CREATE_TABLES);

const MIGRATIONS = [
  `ALTER TABLE medicines ADD COLUMN calendar_sync INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE dose_logs ADD COLUMN calendar_event_id TEXT`,
  `ALTER TABLE dose_logs ADD COLUMN google_calendar_event_id TEXT`,
  `ALTER TABLE medicines ADD COLUMN lead_minutes_override INTEGER`,
  `ALTER TABLE medicines ADD COLUMN nag_interval_minutes_override INTEGER`,
  `ALTER TABLE medicines ADD COLUMN max_nags_override INTEGER`,
  `ALTER TABLE medicines ADD COLUMN snooze_duration_min_override INTEGER`,
  `ALTER TABLE medicines ADD COLUMN quiet_hours_override INTEGER`,
  // Multi-profile support
  `CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, avatar_color TEXT NOT NULL DEFAULT '#3B82F6', is_default INTEGER NOT NULL DEFAULT 0, caregiver_name TEXT, caregiver_contact TEXT, caregiver_alert_enabled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `ALTER TABLE medicines ADD COLUMN profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE`,
  // Seed the default profile and assign all existing medicines to it
  `INSERT OR IGNORE INTO profiles (id, name, avatar_color, is_default, caregiver_alert_enabled, created_at, updated_at) VALUES ('profile:default', 'Me', '#3B82F6', 1, 0, datetime('now'), datetime('now'))`,
  `UPDATE medicines SET profile_id = 'profile:default' WHERE profile_id IS NULL`,
  // Family & phone number support
  `ALTER TABLE profiles ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE profiles ADD COLUMN phone_number TEXT`,
  `ALTER TABLE profiles ADD COLUMN relationship TEXT`,
  `ALTER TABLE profiles ADD COLUMN date_of_birth TEXT`,
  // The default profile is always the primary/owner profile
  `UPDATE profiles SET is_primary = 1 WHERE id = 'profile:default'`,
];
for (const stmt of MIGRATIONS) {
  try {
    sqlite.execSync(stmt);
  } catch {
    // column already exists — safe to ignore
  }
}

export const db = drizzle(sqlite, { schema });

export type Database = typeof db;
