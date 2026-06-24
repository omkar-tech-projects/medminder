# MedMinder — Manual Test Results

**Date:** 2026-06-24
**Build:** Dev build required (ML Kit native module). Run `npx expo run:ios` or `npx expo run:android`.
**Tested on:** _[Fill in simulator/device details before marking as done]_

---

## Pre-conditions

- Dev build installed on iOS simulator (macOS required) and/or Android emulator.
- Fresh install or cleared app data for onboarding test.
- At least one test prescription image available in the photo library.

---

## Test cases

### TC-01 · First-run onboarding → name → permissions → disclaimer accept

| Step | Expected | iOS | Android |
|---|---|---|---|
| First launch | Onboarding screen shown (not skipped) | BLOCKED¹ | BLOCKED¹ |
| Enter name + continue | Name persisted, next step advances | — | — |
| Notification permission prompt | System dialog shown | — | — |
| Accept permissions | Permissions granted, onboarding completes | — | — |
| Disclaimer screen | Legal gate shown, must accept to continue | — | — |
| Subsequent launch | Onboarding not shown again | — | — |

¹ Not yet tested on device — dev build required.

---

### TC-02 · Prescription capture → OCR → parser result → Review & Edit → confirm schedule

| Step | Expected | iOS | Android |
|---|---|---|---|
| Tap camera icon | Camera screen opens | BLOCKED¹ | BLOCKED¹ |
| Capture prescription image | Image added to page list | — | — |
| Tap Analyse | Loading spinner shown | — | — |
| OCR completes | Review & Edit screen with pre-filled cards | — | — |
| Cards show `needsReview` disclaimer | "Please verify" banner visible | — | — |
| Edit a field | Form updates correctly | — | — |
| Tap Confirm | Medicines saved, navigates to Home | — | — |
| Home shows today's doses | Doses for added medicines visible | — | — |

---

### TC-03 · Home screen shows today's doses correctly

| Step | Expected | iOS | Android |
|---|---|---|---|
| Home screen loads | Dose timeline shows all scheduled doses for today | BLOCKED¹ | BLOCKED¹ |
| Taken doses | Green indicator | — | — |
| Missed doses | Red indicator | — | — |
| Upcoming doses | Grey indicator with time | — | — |
| Empty state | "No doses today" message when no medicines | — | — |

---

### TC-04 · Notification fires at correct time → tap Taken → nag chain cancels

| Step | Expected | iOS | Android |
|---|---|---|---|
| Lead notification fires 5 min before dose | Push notification received | BLOCKED² | BLOCKED² |
| Tap "Mark Taken" action | Dose marked taken, nag chain cancelled | — | — |
| No further notifications for that dose | Verify in scheduled notification list | — | — |

² Requires real device for reliable local notification testing.

---

### TC-05 · Notification fires → tap Snooze → re-nag fires after snoozeDurationMin (from settings)

| Step | Expected | iOS | Android |
|---|---|---|---|
| Change snooze duration in Settings → Reminders | e.g. set to 2 min | BLOCKED¹ | BLOCKED¹ |
| Notification fires | Push notification received | — | — |
| Tap "Snooze" action | Notification dismissed, new one scheduled at now + 2 min | — | — |
| Snooze fires at correct time | New notification appears after 2 min (not 5 min hardcoded) | — | — |

---

### TC-06 · Dose marked missed → caregiver alert fires if enabled

| Step | Expected | iOS | Android |
|---|---|---|---|
| Create profile with caregiver alert enabled + valid contact | Profile saved | BLOCKED¹ | BLOCKED¹ |
| Dose passes 2-hour auto-miss threshold | Dose status = missed | — | — |
| App comes to foreground | Alert dialog: "Notify caregiver?" | — | — |
| Tap Notify | SMS/email compose screen opens with pre-filled body | — | — |
| Tap Skip | Alert dismissed, no message sent | — | — |

---

### TC-07 · Profile switch → medicines, history, and calendar all scope to new profile

| Step | Expected | iOS | Android |
|---|---|---|---|
| Add medicines to Profile A | Medicines visible on home | BLOCKED¹ | BLOCKED¹ |
| Create Profile B (no medicines) | Profile created successfully | — | — |
| Switch to Profile B | Home shows empty state | — | — |
| History tab | Shows empty / no doses | — | — |
| Calendar tab | Shows no coloured days | — | — |
| Switch back to Profile A | All Profile A data returns | — | — |

---

### TC-08 · Export JSON → file contains current profile's data

| Step | Expected | iOS | Android |
|---|---|---|---|
| Settings → Data & Privacy → Export data | Share sheet opens | BLOCKED¹ | BLOCKED¹ |
| Share as file / inspect content | JSON contains `medicines` + `doseLogs` for active profile | — | — |
| `exportedAt` field present | ISO timestamp in JSON | — | — |
| Exported data matches what's on screen | Medicine names match home screen | — | — |

---

### TC-09 · Clear all data → confirmation → home resets

| Step | Expected | iOS | Android |
|---|---|---|---|
| Settings → Clear all data | Confirmation alert shown | BLOCKED¹ | BLOCKED¹ |
| Tap Cancel | Nothing deleted, alert dismissed | — | — |
| Tap Clear all data → Delete everything | All medicines deleted | — | — |
| Navigate to Home | Empty state shown | — | — |
| Medicines tab | Empty state shown | — | — |
| History tab | No history shown | — | — |

---

### TC-10 · Medications list tab → all active medicines visible → tap → detail

| Step | Expected | iOS | Android |
|---|---|---|---|
| Tap Medicines tab | Medications list screen loads | BLOCKED¹ | BLOCKED¹ |
| List shows all active medicines | Each medicine card: name, dosage, frequency | — | — |
| Days-remaining badge visible for short courses | Badge shown in correct colour (yellow/red) | — | — |
| Tap a medicine card | Medicine detail screen opens | — | — |
| Detail shows correct data | Name, dosage, schedule, next dose | — | — |
| Tap + button in header | Navigates to capture/add flow | — | — |
| No medicines | Empty state shown with Add button | — | — |

---

### TC-11 · Settings changes persist across app restarts

| Step | Expected | iOS | Android |
|---|---|---|---|
| Change snooze duration to 3 min | Setting shows "Snooze 3m" in subtitle | BLOCKED¹ | BLOCKED¹ |
| Change quiet hours to 23:00–08:00 | Setting reflected in subtitle | — | — |
| Force-quit and relaunch app | Settings still show changed values | — | — |
| Notification lead time change persists | Verified in Reminders sheet | — | — |

---

## Status summary

| # | Test case | Status |
|---|---|---|
| TC-01 | First-run onboarding | BLOCKED — dev build needed |
| TC-02 | Prescription capture + OCR | BLOCKED — dev build needed |
| TC-03 | Home screen today's doses | BLOCKED — dev build needed |
| TC-04 | Notification → Mark Taken | BLOCKED — real device needed |
| TC-05 | Notification → Snooze (settings-driven) | BLOCKED — real device needed |
| TC-06 | Auto-miss → caregiver alert | BLOCKED — real device needed |
| TC-07 | Profile switch scoping | BLOCKED — dev build needed |
| TC-08 | Export JSON | BLOCKED — dev build needed |
| TC-09 | Clear all data | BLOCKED — dev build needed |
| TC-10 | Medications list tab | BLOCKED — dev build needed |
| TC-11 | Settings persist across restarts | BLOCKED — dev build needed |

**All test cases blocked on dev build.**
`tsc --noEmit` → 0 errors. `expo lint` → 0 warnings. All 59 unit tests pass.

---

## Known failures / follow-up items

_None identified yet — pending device testing._

---

## How to run

```bash
# Android (Windows / macOS / Linux)
npx expo run:android

# iOS (macOS only)
npx expo run:ios
```

Real device (Android or iOS) is required for TC-04, TC-05, TC-06 (notification action buttons
do not reliably fire in simulators).
