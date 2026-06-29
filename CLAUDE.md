# MedMinder — Project Bible

> Single source of truth for every engineer (human or AI) working on this repo.
> Update this file whenever a decision changes. Never let it drift from reality.

---

## App Name

**MedMinder** (working title). Alternatives considered before launch: *DoseCue*, *CuraDose*, *MedRhythm*.

---

## Product Vision

Help users never miss a medication. A user scans or uploads a prescription, AI extracts the
medicine details, the user reviews and confirms, and the app schedules smart local-push
reminders. Every dose is tracked to completion with automatic re-reminders, and the app warns
users before a course ends so they can refill in time. Everything is customisable.

**Guiding principle:** local-first, zero friction, no account required for MVP.

---

## Target Platforms

| Platform | Store |
|---|---|
| iOS 16+ | Apple App Store |
| Android 10+ (API 29+) | Google Play |

Single shared codebase via Expo / React Native.

---

## Dev Build Required

**The prescription capture + analysis flow requires a custom dev build. Do NOT use Expo Go.**

ML Kit text recognition (`@react-native-ml-kit/text-recognition`) is a native module that
Expo Go does not bundle. Expo Go will silently fail or crash on the camera → analyse → review
path.

To build:
```bash
# iOS (requires macOS + Xcode)
npx expo run:ios

# Android (Windows / macOS / Linux)
npx expo run:android

# Or via EAS
eas build --profile development
```

All other app features (home, history, calendar, settings, notifications) continue to work in
Expo Go for early UI iteration.

---

## Core User Flow

```
1. Onboarding          → Greet user, request notification permission
2. Scan / Upload       → Camera or photo library — prescription image
3. OCR Extraction      → ML Kit text recognition (on-device, offline, free)
4. Parser              → prescription-parser.ts maps OCR text → AnalysisResponse schema
5. Review & Edit       → Editable form pre-filled from parser; user corrects / adds lines
6. Confirm & Schedule  → User picks dose times; reminders are written to DB + scheduled
7. Pre-Dose Reminder   → Push notification 5 min before each scheduled dose
8. Dose Response       → "Taken" or "Not yet" from notification or in-app
9. Re-Remind Loop      → Every 5 min until "Taken"; auto-log "missed" after 2 hours
10. Daily History      → Every dose event logged with timestamp and status
11. Refill Warning     → Notification + in-app badge N days before course ends
```

---

## Feature List

### F-01 · Onboarding
- Welcome screen: brief product pitch, key benefit callout
- Request iOS/Android notification permissions
- No account or login required (MVP is entirely local)
- Shown only on first launch; skippable via deep link

### F-02 · Prescription Scanning & OCR Extraction
- Capture via device camera (`expo-camera`) or photo library (`expo-image-picker`)
- On-device OCR via `@react-native-ml-kit/text-recognition` — no network call, no API key
- `src/parsers/prescription-parser.ts` maps raw OCR text → `AnalysisResponse` schema:
  drug name (fuzzy-match against `assets/drug-dictionary.json`), strength, form,
  frequency (Indian shorthand 1-0-1, OD/BD/TDS/QID, "twice daily", etc.),
  timing (a/c, p/c, before/after food), duration (days/weeks/months)
- Per-field and overall confidence scores; `needsReview` flag when confidence < 0.8
  or a scheduling-required field (frequencyPerDay) is absent
- Full-screen loading state during OCR
- Fallback: manual entry form when needsReview or on error
- Multiple medicines in one prescription are each shown as a card
- **Requires dev build** — does not run in Expo Go

### F-03 · Review & Edit
- Pre-filled editable form card per detected medicine
- Validation: dosage must be a positive number, frequency must be a positive integer,
  dates must be valid, name must be non-empty
- User can delete a card, add a blank card ("Add another medicine"), or reorder cards
- Changes are diffed against AI output so errors can be reported (post-MVP telemetry hook)

### F-04 · Scheduling
- Dose time picker per medicine (system time picker, 24 h or 12 h per locale)
- Presets: once daily, twice daily, three times daily, every N hours, custom times
- Start-date picker (default: today)
- Optional: sync reminder events to device calendar (`expo-calendar`)
- Optional (post-MVP): sync to Google Calendar via OAuth

### F-05 · Smart Notifications
- Local push notifications via `expo-notifications`
- **Pre-dose reminder**: fires 5 min before scheduled dose time
- **Notification actions**: "Mark Taken" | "Snooze 5 min"
- **Re-remind loop**: fires every 5 min if no "Taken" response received
- **Auto-miss**: after 2 hours past scheduled time, loop stops and dose is logged "missed"
- **Refill warning**: fires N days before `end_date` (configurable, default 3 days)
- Android: uses dedicated notification channels (`dose-reminders`, `refill-alerts`)
- iOS: notification categories registered at startup so action buttons appear

### F-06 · Dose Confirmation
- "Mark Taken" available from: notification action button, home screen dose card, medication detail
- Actual taken-at timestamp is recorded (vs. scheduled time — useful for adherence insight)
- "Missed" is auto-logged; user can also manually mark a past dose as missed or taken

### F-07 · Dose History & Log
- Day view: list of all scheduled doses, colour-coded (taken = green, missed = red, upcoming = grey)
- Week / month calendar heatmap: full green = all taken, yellow = partial, red = all missed
- Per-medication history filterable by date range
- Adherence percentage shown per week and per month

### F-08 · Medication Management
- List of all active medications with colour-coded cards
- Card shows: name, dosage, next dose time, days remaining, refill badge
- Swipe-to-delete (with confirmation) and swipe-to-pause
- Edit medication: any field editable; changing schedule reschedules all future notifications
- Pause: suspends reminders without deleting history

### F-09 · Settings
- Notification lead time (default: 5 min before dose)
- Re-remind interval (default: 5 min; range 1–30 min)
- Quiet hours window (default: 22:00–07:00; notifications silenced)
- Refill warning threshold (default: 3 days before end)
- Theme: light / dark / system
- Language: English (i18n-ready; `i18next` wired up but only EN strings at MVP)
- Export all data as JSON
- Clear all data (requires confirmation)

### F-10 · Refill Warning
- Computed daily by a background task (`expo-task-manager`)
- Trigger condition: `end_date - today <= refill_warning_days` (from settings)
- In-app badge on medication card and dashboard callout card
- Push notification sent once per medication per threshold crossing

---

## Tech Stack

| Layer | Library | Version target | Why |
|---|---|---|---|
| Framework | Expo | SDK 52 | Managed workflow, OTA updates, unified native modules |
| Language | TypeScript | 5.x, `strict: true` | Type safety, better IDE support |
| Navigation | expo-router | v3 | File-based routing, deep links, typed routes |
| Notifications | expo-notifications | latest | Local push, action buttons, channels |
| Camera | expo-camera + expo-image-picker | latest | Prescription capture |
| Database | expo-sqlite + drizzle-orm | latest | Local-first, typed SQL, migrations |
| State | Zustand | 4.x | Minimal boilerplate, no provider wrapping |
| OCR | @react-native-ml-kit/text-recognition | 2.x | On-device, offline, free Rx text extraction |
| Forms | react-hook-form + zod | latest | Schema-driven validation, TS type inference |
| Dates | date-fns | 3.x | Lightweight, tree-shakeable |
| Calendar | expo-calendar | latest | Device calendar sync |
| Calendar (opt) | Google Calendar REST API | v3 | Post-MVP only |
| Animations | react-native-reanimated | 3.x | 60 fps gesture-driven UI |
| Secure storage | expo-secure-store | latest | Sensitive values; never AsyncStorage for secrets |
| Background tasks | expo-task-manager + expo-background-fetch | latest | Daily refill check |
| Styling | React Native StyleSheet + design tokens | — | No heavy UI-lib dependency |

---

## Coding Conventions

### TypeScript
- `strict: true` in `tsconfig.json` — no exceptions, no `@ts-ignore`
- No `any`; use `unknown` + type guards when the type is genuinely unknown at runtime
- All function parameters and return types explicitly annotated
- Zod schemas are the **single source of truth** for runtime shapes; derive TS types with `z.infer`

### Components
- Functional components only — no class components
- One component per file; file size hard limit: **200 lines**
- Props interface named `<ComponentName>Props`, placed directly above the component
- No default exports from barrel/index files; use named exports everywhere
- Co-locate component-specific `StyleSheet` at the bottom of the same file

### File Responsibilities
- A file does exactly one of: define a component, define a hook, define a query, or define a utility
- No mixing of, e.g., DB queries and React hooks in the same file

### State Management
- Zustand stores: one store per domain (`medications`, `doses`, `settings`)
- No business logic inside components — extract to `src/hooks/`
- DB reads/writes live in `src/db/queries/`; hooks call those queries and update the store

### Naming
| Thing | Convention |
|---|---|
| Files | `kebab-case.tsx` / `kebab-case.ts` |
| Components | `PascalCase` |
| Functions / variables | `camelCase` |
| Constants | `SCREAMING_SNAKE_CASE` |
| Zustand stores | `use<Domain>Store` |
| Zod schemas | `<entity>Schema` |
| Drizzle tables | `camelCase` (e.g., `medications`, `doseLogs`) |

### Comments
- Default: no comments
- Allowed only for: non-obvious invariants, platform workarounds, subtle domain rules
- Never describe what the code does; only describe why it does it this way

### Error Handling
- Validate at boundaries only: user input (Zod), external APIs (try/catch + typed error)
- Do not add defensive null checks for values that internal contracts guarantee are non-null
- AI API errors must always surface a user-facing fallback (manual entry, retry button)

---

## Definition of Done

A feature is **DONE** when **all** of the following are true:

| # | Criterion |
|---|---|
| 1 | All acceptance criteria for the feature (Fx above) are implemented |
| 2 | `tsc --noEmit` passes with zero errors |
| 3 | `expo lint` passes with zero warnings |
| 4 | Happy path manually verified on **both** iOS simulator and Android emulator |
| 5 | Empty state, loading state, and error state are implemented and verified |
| 6 | No regressions in previously completed features |
| 7 | Any notification scheduling verified on a **real device** (simulators do not reliably fire local notifications) |
| 8 | All interactive elements have `accessibilityLabel` props |
| 9 | No hardcoded strings — all user-visible text goes through the i18n layer |

---

## Non-Goals (MVP)

- Server-side account sync or cloud backup
- Multiple user profiles on a single device
- Drug interaction checking or clinical validation
- Pharmacy integration or e-prescriptions
- Apple Watch / Wear OS companion apps
- Barcode scanning of medicine packaging (nice-to-have, post-MVP)
- Automated E2E test suite (manual testing at MVP; add Detox in v2)

---

## Google Calendar Setup

To enable the Google Calendar direct-sync toggle in Settings:

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com) and create a new project (e.g. "MedMinder").
2. Under **APIs & Services → Library**, enable **Google Calendar API**.
3. Under **APIs & Services → OAuth consent screen**, configure the app:
   - User type: External
   - App name: MedMinder
   - Scopes: `../auth/calendar.events`
4. Under **APIs & Services → Credentials**, create two OAuth 2.0 Client IDs:
   - **Android**: type = Android, package = `com.medminder.app`, SHA-1 = output of `./gradlew signingReport`
   - **iOS**: type = iOS, bundle ID = `com.medminder.app`
5. Paste the Client IDs into `src/services/google-calendar-service.ts`:
   ```ts
   const IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
   const ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
   ```
6. Add `medminder://oauth` to the authorised redirect URIs.
7. Rebuild the app (`npx expo run:android` / `npx expo run:ios`).

Google Calendar sync creates **recurring RRULE events** (one per dose time per medicine) — not individual dose-log events. This avoids calendar clutter. Note: "Mark Taken" and "Snooze" actions are only available in the MedMinder app, not from Google Calendar.

---

## Drug Database (`assets/drug-database.json`)

- Hand-authored list of ~220 generic drug entries covering ~2 000+ recognisable name variants.
- Schema: `{ brandName, genericName, aliases[], commonStrengths[], forms[] }` — one entry per generic.
- Weighted toward Indian OPD prescriptions (dermatology, GP, endocrinology, cardiology).
- Deduplication key for future CSV merge: `genericName` (normalised, case-insensitive).
- Fuzzy lookup in `src/parsers/drug-db.ts` uses Dice coefficient on character bigrams; threshold 0.55.
- Data is curated manually; not sourced from any proprietary database.
