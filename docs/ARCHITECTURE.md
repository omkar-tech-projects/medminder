# MedMinder — Architecture

## Prescription Analysis Pipeline

All analysis runs **on-device** with no network calls.

```
Image URI(s)
     │
     ▼
@react-native-ml-kit/text-recognition
     │  TextRecognition.recognize(uri)
     │  → result.text  (raw OCR string)
     ▼
src/parsers/prescription-parser.ts :: parsePrescription(ocrText)
     │
     ├─ Drug name   → Dice-coefficient fuzzy match vs assets/drug-dictionary.json
     ├─ Strength    → regex /([\d.]+)\s*(mg|ml|mcg|g|IU|%)/i
     ├─ Form        → regex for tablet|capsule|syrup|drops|injection|...
     ├─ Frequency   → Indian shorthand (1-0-1, 0-0-1, OD/BD/TDS/QID)
     │                + English ("twice daily", "every 8 hours")
     ├─ Timing      → a/c → before_food | p/c → after_food | with food → with_food
     └─ Duration    → N days / N weeks (* 7) / N months (* 30)
     │
     ▼
AnalysisResponse  (src/schemas/analysis-schema.ts)
  { medicines[], overallConfidence, needsReview }
     │
     ▼
app/capture/review.tsx  →  Review & Edit screen
```

### Drug dictionary

`assets/drug-dictionary.json` — array of `{ name, aliases[] }` entries for common Indian
brands and generics. To add entries:

```json
{ "name": "Generic Name", "aliases": ["Brand1", "Brand2"] }
```

Fuzzy-match threshold is 0.7 Dice coefficient. Tokens shorter than 3 chars are skipped.

### Confidence scoring

- Each matched field contributes its score (1.0 for regex hits; Dice score for drug names).
- `confidence` per medicine = mean of matched-field scores.
- `needsReview = true` when `overallConfidence < 0.8` OR any medicine has `confidence < 0.8`
  OR `frequencyPerDay === null` (cannot schedule without this field).

---

## Data Model

```
profiles ──┐
           │ 1:N
medicines ─┼──┐
           │  │ 1:N
schedules ─┘  │
              │ 1:N
dose_logs ────┘
settings (key/value)
```

- Deleting a profile cascades to medicines → schedules → dose_logs (ON DELETE CASCADE).
- `activeProfileId` persisted in SecureStore for fast cold-start reads.
- All query functions accept optional `profileId?: string | null`; null = no filter.

---

## Notification architecture

```
scheduleNotificationsForDoseLog
  ├─ index 0      = lead reminder  (doseTime − leadMinutes)
  ├─ index 1..N   = nag chain      (doseTime + i * nagIntervalMinutes)
  └─ identifier scheme: "${doseLogId}:${index}"

cancelNotificationsForDoseLog(doseLogId)
  └─ prefix-cancels all identifiers starting with "${doseLogId}:"

scheduleSnoozeNotification
  └─ identifier: "${doseLogId}:snooze"
     fires at now + snoozeDurationMin (read live from settingsStore at response time)
```

On `MARK_TAKEN`: cancel entire chain → mark dose taken.
On `SNOOZE`: cancel entire chain → schedule single snooze notification.
On default tap (open app): nag chain continues; no action needed.

---

## State stores

| Store | Domain | Key decisions |
|---|---|---|
| `useProfileStore` | profiles, active profile | activeProfileId persisted in SecureStore |
| `useMedicationStore` | active medicines list | scoped by activeProfileId on load |
| `useDoseStore` | today's dose timeline | scoped by activeProfileId + date |
| `useSettingsStore` | all settings | persisted in SQLite settings table |
| `useAnalysisStore` | OCR result in flight | cleared after review confirmation |
| `useCaptureStore` | image pages | cleared after review confirmation |

---

## Build requirements

| Scenario | Command | Notes |
|---|---|---|
| Android dev build | `npx expo run:android` | Requires Android Studio + emulator |
| iOS dev build | `npx expo run:ios` | Requires macOS + Xcode |
| EAS dev build | `eas build --profile development` | Works on Windows for Android |
| Expo Go | `npx expo start` | Camera/OCR flow broken — use for UI iteration only |
