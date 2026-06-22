# MedMinder — Architecture

> Living design document. Update when screens, data model, or notification behaviour changes.

---

## Screen Map

```
Root
├── /onboarding                  ← first-launch only
│
└── (tabs)/                      ← persistent tab bar
    ├── / (index)                ← Dashboard — today's doses
    ├── /medications             ← Active medication list
    ├── /history                 ← Dose log (calendar + list)
    └── /settings                ← App preferences

/medication/add/
    ├── scan                     ← Camera / image picker
    ├── processing               ← AI extraction loading
    ├── review                   ← Edit extracted data (one card per medicine)
    └── confirm                  ← Schedule picker + final CTA

/medication/[id]/
    ├── index                    ← Medication detail + upcoming doses
    └── edit                     ← Edit fields + schedule
```

---

## Screen Descriptions

### Dashboard (`/`)
**Purpose:** single-glance view of today's medication schedule.

- Personalised greeting: "Good morning — here's your schedule for today"
- Chronological dose timeline: past doses (taken/missed) + upcoming doses
- Each dose card: medication name, dosage, scheduled time, status chip, "Mark Taken" button
- Refill warning callout card (surfaces medications ending within threshold days)
- FAB: "Add medication" → `/medication/add/scan`
- Empty state: friendly illustration + "Add your first medication" CTA

### Medications (`/medications`)
**Purpose:** manage all active and paused medications.

- Grouped list: Active | Paused | Completed (past end date)
- Each card: colour swatch, name, dosage + unit, next dose time, "X days remaining" or "Ongoing", refill badge
- Swipe left: Delete (with confirmation sheet)
- Swipe right: Pause / Resume
- Tap card → `/medication/[id]`
- FAB: "Add medication"

### History (`/history`)
**Purpose:** review adherence over time.

- Month calendar at top: each day coloured by adherence (green/yellow/red/grey for future)
- Tap a day → dose list for that day below the calendar
- Per-dose row: medication name, scheduled time, actual taken time or "Missed"
- Summary strip: adherence % for current week and current month

### Settings (`/settings`)
**Purpose:** customise all app behaviour.

Sections:
1. **Notifications** — lead time (min), re-remind interval (min), quiet hours from/to
2. **Medications** — refill warning threshold (days)
3. **Appearance** — theme (light/dark/system)
4. **AI** — Claude API key input (masked, stored in expo-secure-store)
5. **Calendar** — toggle device calendar sync; Google Calendar (post-MVP)
6. **Data** — Export JSON, Clear all data

### Scan (`/medication/add/scan`)
- Full-screen camera preview with rounded guide overlay
- Bottom sheet: "Take Photo" | "Choose from Library"
- "Skip — enter manually" text button → `/medication/add/review` with blank card

### Processing (`/medication/add/processing`)
- Full-screen with centred spinner and "Reading your prescription…" copy
- Cancel button → back to Scan
- On AI error → toast + navigate to `/medication/add/review` with blank card + error banner

### Review (`/medication/add/review`)
- Scrollable list of editable medicine cards (one per extracted medicine)
- Card fields: Name, Dosage (numeric), Unit (picker), Frequency (picker), Times/day, Start date, Duration (days), Notes
- Inline Zod validation; inline error messages per field
- Card-level actions: Delete card, Duplicate card
- Bottom: "Add another medicine" | "Confirm all →"

### Confirm (`/medication/add/confirm`)
- Read-only summary of all medicines being added
- Per-medicine: time slot pickers (one picker per times-per-day)
- Device calendar sync toggle (calls `expo-calendar` if granted)
- "Start reminders" CTA → writes to DB, schedules notifications, navigates to Dashboard

### Medication Detail (`/medication/[id]`)
- Header: colour, name, dosage, next dose
- Section: upcoming doses for next 7 days
- Section: recent dose history (last 7 days)
- Edit button → `/medication/[id]/edit`
- Pause / Delete in header menu

---

## Data Model

All data is stored locally in SQLite via drizzle-orm.

```typescript
// src/db/schema.ts

export const medications = sqliteTable('medications', {
  id:           text('id').primaryKey(),                // uuid v4
  name:         text('name').notNull(),
  dosage:       real('dosage').notNull(),               // numeric amount
  dosageUnit:   text('dosage_unit').notNull(),          // "mg" | "ml" | "tablet" | "drop" | ...
  frequency:    text('frequency').notNull(),            // "once_daily" | "twice_daily" |
                                                        // "three_times_daily" | "every_n_hours" | "custom"
  timesPerDay:  integer('times_per_day').notNull(),     // 1, 2, 3, ...
  durationDays: integer('duration_days'),               // null = ongoing / no fixed end
  startDate:    text('start_date').notNull(),           // ISO date "YYYY-MM-DD"
  endDate:      text('end_date'),                       // computed; null if ongoing
  color:        text('color').notNull(),                // hex "#RRGGBB"
  notes:        text('notes'),
  paused:       integer('paused').notNull().default(0), // 0 | 1 (boolean)
  createdAt:    text('created_at').notNull(),
  updatedAt:    text('updated_at').notNull(),
});

export const schedules = sqliteTable('schedules', {
  id:           text('id').primaryKey(),
  medicationId: text('medication_id').notNull()
                  .references(() => medications.id, { onDelete: 'cascade' }),
  timeOfDay:    text('time_of_day').notNull(),          // "HH:MM" 24 h
  daysOfWeek:   text('days_of_week'),                  // JSON "[0,1,2,3,4,5,6]" or null = every day
});

export const doseLogs = sqliteTable('dose_logs', {
  id:           text('id').primaryKey(),
  medicationId: text('medication_id').notNull()
                  .references(() => medications.id, { onDelete: 'cascade' }),
  scheduleId:   text('schedule_id')
                  .references(() => schedules.id, { onDelete: 'set null' }),
  scheduledAt:  text('scheduled_at').notNull(),         // ISO datetime
  takenAt:      text('taken_at'),                       // null until confirmed
  status:       text('status').notNull(),               // "pending" | "taken" | "missed" | "snoozed"
  notes:        text('notes'),
});

export const reminderJobs = sqliteTable('reminder_jobs', {
  id:            text('id').primaryKey(),
  doseLogId:     text('dose_log_id').notNull()
                   .references(() => doseLogs.id, { onDelete: 'cascade' }),
  expoNotifId:   text('expo_notif_id'),                 // identifier returned by expo-notifications
  scheduledFor:  text('scheduled_for').notNull(),       // ISO datetime
  type:          text('type').notNull(),                // "pre_dose" | "re_remind" | "refill_warning"
  sent:          integer('sent').notNull().default(0),  // 0 | 1
});

export const settings = sqliteTable('settings', {
  key:   text('key').primaryKey(),
  value: text('value').notNull(),
});
```

### Default Settings Keys

| Key | Default | Type |
|---|---|---|
| `notification_lead_min` | `5` | number |
| `re_remind_interval_min` | `5` | number |
| `quiet_hours_start` | `22:00` | HH:MM string |
| `quiet_hours_end` | `07:00` | HH:MM string |
| `refill_warning_days` | `3` | number |
| `theme` | `system` | `light\|dark\|system` |
| `calendar_sync` | `false` | boolean string |
| `onboarding_done` | `false` | boolean string |

### Relationships

```
medications  ──< schedules    (1 medication : many time-of-day slots)
medications  ──< doseLogs     (1 medication : one dose_log row per scheduled occurrence)
schedules    ──< doseLogs     (which schedule slot generated this log)
doseLogs     ──< reminderJobs (1 dose_log : 1+ notifications — pre-dose + re-reminds)
```

---

## Notification Strategy

### Overview

Notifications are **100% local** (expo-notifications). No push server is needed for MVP.
The app schedules notifications ahead of time and handles response actions in the background.

### Dose Log Generation

When a medication is confirmed (or the app launches / foregrounds), the app generates
`dose_log` rows for the next **14 days** and schedules the corresponding notifications.
A daily background task (`expo-background-fetch`) extends this window to keep it rolling.

```
confirmMedication(medication, schedules)
  → generateDoseLogs(medication, schedules, fromDate=today, days=14)
      → for each (date × schedule slot):
          INSERT dose_log { status: "pending", scheduledAt }
          schedulePreDoseReminder(doseLog)
            → scheduledFor = scheduledAt - 5 min
            INSERT reminder_job { type: "pre_dose", scheduledFor }
            expo-notifications.scheduleNotificationAsync({ ... })
```

### Pre-Dose Reminder

**Fires:** `scheduledAt - leadTimeMinutes` (default 5 min).

**Payload:**
```json
{ "doseLogId": "<uuid>", "type": "pre_dose" }
```

**Notification content:**
- Title: "Time for your [MedicationName]"
- Body: "[Dosage][Unit] · scheduled [HH:MM]"
- Actions: **"Mark Taken"** | **"Snooze 5 min"**

**On "Mark Taken":**
1. Update `dose_logs.status = "taken"`, `taken_at = now()`
2. Cancel all `reminder_jobs` linked to this `dose_log`

**On "Snooze 5 min":**
1. Update `dose_logs.status = "snoozed"`
2. Schedule a new `re_remind` job for `now() + reRemindIntervalMin`

### Re-Remind Loop

- Each re-remind fires the same notification UI as the pre-dose reminder
- User can "Mark Taken" or "Snooze" again
- Loop terminates when:
  - User taps "Mark Taken" (status → taken), OR
  - 2 hours have elapsed since `scheduledAt` → status auto-set to "missed", all jobs cancelled
- The 2-hour cap is enforced by the background task, not by a scheduled notification,
  to avoid excessive notification registration on iOS

### Quiet Hours

Before scheduling any notification, check whether `scheduledFor` falls within quiet hours.
If it does, delay the notification to `quiet_hours_end` on the same day.
The dose is still logged at its original `scheduledAt`; only the push fires later.

### Refill Warning

**Trigger:** `end_date - today <= refill_warning_days` (evaluated daily at 08:00 by background task)

**Behaviour:**
- A `reminder_job` with `type = "refill_warning"` is inserted once per medication per threshold crossing
- Notification: "Your [MedicationName] supply ends in X days — time to refill"
- Tapping notification deep-links to `/medication/[id]`
- Once sent, a `sent = 1` flag prevents duplicate daily notifications

### Android Setup

```typescript
// Must run before first notification, ideally in app _layout.tsx
await Notifications.setNotificationChannelAsync('dose-reminders', {
  name: 'Dose Reminders',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 250, 250, 250],
  sound: 'default',
});

await Notifications.setNotificationChannelAsync('refill-alerts', {
  name: 'Refill Alerts',
  importance: Notifications.AndroidImportance.DEFAULT,
});
```

Android 12+ (API 31+) requires `SCHEDULE_EXACT_ALARM` permission for exact-time notifications.
expo-notifications handles the permission request; we must request it during onboarding.

### iOS Setup

Notification action categories must be registered before any notification that uses them:

```typescript
await Notifications.setNotificationCategoryAsync('dose-action', [
  { identifier: 'MARK_TAKEN', buttonTitle: 'Mark Taken', options: { isDestructive: false } },
  { identifier: 'SNOOZE',     buttonTitle: 'Snooze 5 min', options: { isDestructive: false } },
]);
```

---

## State Management

### Zustand Stores

**`useMedicationStore`** (`src/store/medication-store.ts`)
```typescript
{
  medications: Medication[]
  // derived
  activeMedications: Medication[]
  pausedMedications: Medication[]
  // actions
  loadAll: () => Promise<void>
  add: (data: NewMedication) => Promise<void>
  update: (id: string, data: Partial<Medication>) => Promise<void>
  remove: (id: string) => Promise<void>
  pause: (id: string) => Promise<void>
  resume: (id: string) => Promise<void>
}
```

**`useDoseStore`** (`src/store/dose-store.ts`)
```typescript
{
  selectedDate: string           // ISO date
  dosesForDate: DoseLog[]
  // actions
  setDate: (date: string) => void
  loadForDate: (date: string) => Promise<void>
  markTaken: (doseLogId: string) => Promise<void>
  markMissed: (doseLogId: string) => Promise<void>
  snooze: (doseLogId: string) => Promise<void>
}
```

**`useSettingsStore`** (`src/store/settings-store.ts`)
```typescript
{
  notificationLeadMin: number
  reRemindIntervalMin: number
  quietHoursStart: string
  quietHoursEnd: string
  refillWarningDays: number
  theme: 'light' | 'dark' | 'system'
  calendarSync: boolean
  // actions
  load: () => Promise<void>
  update: (key: SettingKey, value: string) => Promise<void>
}
```

### Data Flow

```
User action (tap "Mark Taken")
  → useDoseStore.markTaken(doseLogId)
    → src/db/queries/dose-logs.ts → UPDATE dose_logs SET status="taken" ...
    → src/lib/notifications.ts → cancelPendingReminders(doseLogId)
    → store.dosesForDate updated
      → DoseCard re-renders with "Taken" status
```

---

## AI Integration (Claude API)

### Prescription Parsing Request

```typescript
// src/lib/ai.ts

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
      },
      {
        type: 'text',
        text: EXTRACTION_PROMPT,  // see below
      },
    ],
  }],
});
```

### Extraction Prompt

```
You are a medical prescription parser. Extract every medication listed in the image.
Return ONLY a valid JSON object matching this schema — no prose, no markdown fences:

{
  "medications": [
    {
      "name": string,              // generic or brand name as written
      "dosage": number,            // numeric value only
      "dosage_unit": string,       // "mg" | "ml" | "tablet" | "capsule" | "drop" | "patch" | other
      "frequency": string,         // "once_daily" | "twice_daily" | "three_times_daily" | "every_n_hours" | "custom"
      "times_per_day": number,     // 1 / 2 / 3 / ...
      "duration_days": number | null,  // null if ongoing or not specified
      "special_instructions": string | null
    }
  ]
}

If the image does not contain a readable prescription, return: { "medications": [] }
```

### Response Validation

```typescript
const extractedMedicationSchema = z.object({
  name: z.string().min(1),
  dosage: z.number().positive(),
  dosage_unit: z.string().min(1),
  frequency: z.enum(['once_daily', 'twice_daily', 'three_times_daily', 'every_n_hours', 'custom']),
  times_per_day: z.number().int().positive(),
  duration_days: z.number().int().positive().nullable(),
  special_instructions: z.string().nullable(),
});

const aiResponseSchema = z.object({
  medications: z.array(extractedMedicationSchema),
});
```

If validation throws, navigate to Review with blank card and show error banner.

### API Key Storage

- User provides their own Anthropic API key in Settings
- Stored exclusively in `expo-secure-store` under key `ANTHROPIC_API_KEY`
- Never stored in SQLite, AsyncStorage, or logged
- Post-MVP option: replace with a backend proxy so the key never touches the device

---

## Calendar Integration

### Device Calendar (`expo-calendar`)

1. Request `CALENDAR` permission during Confirm screen (only if user toggled sync on)
2. Find or create a calendar named "MedMinder" on the default calendar source
3. For each schedule slot, create a recurring event:
   - Title: "[MedicationName] — [Dosage][Unit]"
   - Start: `scheduledAt - 5 min` (so the device's own reminder fires)
   - Duration: 5 minutes
4. Store `calendarEventId` alongside the schedule row (add column in future migration)
5. On medication delete/pause, remove the corresponding calendar events

### Google Calendar (post-MVP)

- OAuth 2.0 via `expo-auth-session`
- Google Calendar REST API v3
- Same event structure as device calendar
- Refresh token stored in `expo-secure-store`

---

## Folder Structure

```
e:\Medicine reminder app\
│
├── app/                              # expo-router file-system routes
│   ├── _layout.tsx                   # Root: ThemeProvider, DB init, notification setup
│   ├── onboarding.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Tab bar (Dashboard, Medications, History, Settings)
│   │   ├── index.tsx                 # Dashboard
│   │   ├── medications.tsx           # Medication list
│   │   ├── history.tsx               # Dose log
│   │   └── settings.tsx
│   └── medication/
│       ├── add/
│       │   ├── scan.tsx
│       │   ├── processing.tsx
│       │   ├── review.tsx
│       │   └── confirm.tsx
│       └── [id]/
│           ├── index.tsx             # Medication detail
│           └── edit.tsx
│
├── src/
│   ├── components/
│   │   ├── ui/                       # Button, Input, Card, Badge, Modal, Spinner, Toast
│   │   ├── dose/                     # DoseCard, DoseTimeline, DoseStatusChip
│   │   ├── medication/               # MedicationCard, MedicationForm, ColorPicker
│   │   └── notification/             # PermissionBanner, QuietHoursPicker
│   │
│   ├── db/
│   │   ├── index.ts                  # SQLite connection singleton
│   │   ├── schema.ts                 # Drizzle table definitions (source of truth)
│   │   ├── migrations/               # Auto-generated by drizzle-kit
│   │   └── queries/
│   │       ├── medications.ts        # CRUD for medications table
│   │       ├── dose-logs.ts          # CRUD + status updates for dose_logs
│   │       ├── schedules.ts          # CRUD for schedules
│   │       ├── reminder-jobs.ts      # Insert, cancel, mark-sent for reminder_jobs
│   │       └── settings.ts           # Get/set for settings table
│   │
│   ├── hooks/
│   │   ├── use-medications.ts        # Wraps useMedicationStore + queries
│   │   ├── use-dose-logs.ts          # Wraps useDoseStore + queries
│   │   ├── use-notification-response.ts  # Handles notification tap/action
│   │   └── use-settings.ts           # Wraps useSettingsStore + queries
│   │
│   ├── lib/
│   │   ├── ai.ts                     # Claude API client + extraction function
│   │   ├── notifications.ts          # Schedule, cancel, channel setup
│   │   ├── dose-generator.ts         # Generate dose_log rows for N days ahead
│   │   ├── calendar.ts               # expo-calendar helpers
│   │   ├── date-utils.ts             # Wrappers around date-fns
│   │   └── constants.ts              # SCREAMING_SNAKE_CASE app-wide constants
│   │
│   ├── store/
│   │   ├── medication-store.ts
│   │   ├── dose-store.ts
│   │   └── settings-store.ts
│   │
│   └── types/
│       ├── medication.ts             # Medication, NewMedication, Schedule, ...
│       ├── dose.ts                   # DoseLog, ReminderJob, DoseStatus, ...
│       └── notification.ts           # NotificationPayload, NotificationType, ...
│
├── assets/
│   ├── fonts/
│   └── images/
│
├── docs/
│   └── ARCHITECTURE.md               # this file
│
├── CLAUDE.md
├── app.json
├── tsconfig.json
├── drizzle.config.ts
├── babel.config.js
└── package.json
```

---

## Open Questions / Deferred Decisions

| # | Question | Default for MVP | Revisit when |
|---|---|---|---|
| 1 | API key: user-provided vs. proxy backend | User-provided (expo-secure-store) | v2 / if we add accounts |
| 2 | Google Calendar sync | Deferred (device calendar only) | Post-MVP |
| 3 | Barcode scan of medicine packaging | Deferred | v2 |
| 4 | Multiple user profiles on one device | Deferred | v2 / family use case |
| 5 | Offline-first sync + conflict resolution | N/A (local-only) | When backend is added |
| 6 | Automated E2E tests (Detox / Maestro) | Manual testing | Before App Store submission |
| 7 | Medication interaction checking | Out of scope | If clinical features added |
