# MedMinder — Manual Test Checklist

Run this checklist before every release. Mark each row ✅ pass / ❌ fail / ⚠️ partial.

> **Device requirement** — most notification tests MUST run on a real device (iOS or Android).
> Simulators and emulators silently drop local notifications or deliver them with wrong timing.
> Onboarding, UI, and data-entry flows may be verified on simulators.

---

## 0 · Environment

| # | Check | iOS | Android |
|---|---|---|---|
| 0.1 | Build is a **dev build** (not Expo Go) — required for camera + OCR | | |
| 0.2 | Device timezone is set to the expected local timezone | | |
| 0.3 | No stale data — clear app data or reinstall before a fresh run | | |

---

## 1 · Onboarding

| # | Check | iOS | Android |
|---|---|---|---|
| 1.1 | First launch shows Welcome → Name → Phone → Notifications → Camera → Disclaimer | | |
| 1.2 | "Skip intro" on step 1 jumps directly to the Disclaimer step | | |
| 1.3 | Step counter (e.g. "3 / 6") increments correctly on every step | | |
| 1.4 | Name entered on step 2 appears in the Home greeting | | |
| 1.5 | Granting notification permission marks step complete; "Not now" skips gracefully | | |
| 1.6 | Granting camera permission marks step complete; "Not now" skips gracefully | | |
| 1.7 | Dismissing the Disclaimer is not possible (no skip button on final step) | | |
| 1.8 | After accepting Disclaimer, app navigates to Home tab (never shows onboarding again) | | |
| 1.9 | Force-close and relaunch — onboarding does NOT repeat | | |

---

## 2 · Prescription Capture & OCR

| # | Check | iOS | Android |
|---|---|---|---|
| 2.1 | Tap "Scan a prescription" — camera opens | | |
| 2.2 | While camera permission is loading, a spinner is shown (not a blank black screen) | | |
| 2.3 | Camera permission denied → PermissionDenied screen with "Open Settings" button | | |
| 2.4 | Take a photo — white flash plays, page counter increments in top pill | | |
| 2.5 | Capture 2+ pages — page count updates; "Done" button appears | | |
| 2.6 | Tap the back arrow with ≥ 1 page — goes to Review pages screen (not back to Home) | | |
| 2.7 | Review pages screen: thumbnail grid shows all pages in order | | |
| 2.8 | Tap ✕ on a thumbnail — page removed; if last page, returns to camera | | |
| 2.9 | "Add more pages" returns to camera; new pages append to grid | | |
| 2.10 | "Discard" clears all pages and returns to Home | | |
| 2.11 | "Analyse prescription" → loading screen with pulsing icon and page count | | |
| 2.12 | **No-image edge case**: navigate directly to /analyse with 0 pages → error screen "Analysis failed" | | |
| 2.13 | Analysis error screen: "Try again" button re-runs analysis; "Go back" returns | | |
| 2.14 | Successful analysis → Review & Edit screen pre-filled with extracted medicines | | |
| 2.15 | **Very long medicine name** (>40 chars) in OCR result — form card displays it without overflow; notification title is truncated | | |

---

## 3 · Review & Edit

| # | Check | iOS | Android |
|---|---|---|---|
| 3.1 | Disclaimer banner is visible and non-dismissable | | |
| 3.2 | Each extracted medicine appears as a separate editable card | | |
| 3.3 | Low-confidence fields are highlighted with an orange warning border | | |
| 3.4 | Medicine name is required — blank name disables Confirm button | | |
| 3.5 | Dose amount is required — blank disables Confirm | | |
| 3.6 | Times/day is required and must be ≥ 1 — 0 or blank disables Confirm | | |
| 3.7 | Duration field: empty = open-ended course; numeric = fixed course | | |
| 3.8 | Start date field: invalid format shows validation error | | |
| 3.9 | "Add another medicine" appends a blank card | | |
| 3.10 | Trash icon removes the card; last card cannot be removed (verify or document) | | |
| 3.11 | "Confirm schedule" button shows a loading spinner while saving | | |
| 3.12 | After confirm: toast "N medicines added!" and navigate to Home tab | | |
| 3.13 | "Retake photo" returns to previous screen without saving | | |
| 3.14 | **Manual entry**: Home → "Add medicine manually" → Review screen with one blank card (no disclaimer about AI) | | |
| 3.15 | Navigate away mid-edit and return — form state is NOT preserved (clean slate) | | |

---

## 4 · Home Screen

| # | Check | iOS | Android |
|---|---|---|---|
| 4.1 | Empty state (no medicines): EmptyState card with "Scan a prescription" button | | |
| 4.2 | With medicines: "Today's progress" summary card shows Taken / Upcoming / Missed counts | | |
| 4.3 | Timeline shows doses sorted by scheduled time | | |
| 4.4 | Dose card: name truncates cleanly for a 60-char medicine name | | |
| 4.5 | Tapping a dose card opens DoseDetailSheet | | |
| 4.6 | DoseDetailSheet "Mark taken" updates card status to green immediately | | |
| 4.7 | Refill warning card appears when `end_date - today ≤ refillWarningDays` | | |
| 4.8 | Course-ended modal appears for medicines whose end_date has passed | | |

---

## 5 · Notifications

> All notification tests must be performed on a **real device**. Simulators will not reliably fire local notifications.

| # | Check | iOS | Android |
|---|---|---|---|
| 5.1 | Permission prompt appears on first launch (onboarding step) | | |
| 5.2 | Permission denied: no notifications are scheduled (no errors thrown) | | |
| 5.3 | Lead reminder fires N minutes before dose time (check with 1–2 min lead) | | |
| 5.4 | Notification includes medicine name (≤40 chars) and dose amount | | |
| 5.5 | Action buttons "Mark Taken" and "Snooze 5 min" appear on notification | | |
| 5.6 | "Mark Taken" from notification: dose marked taken; nag chain cancelled; Home updates on next open | | |
| 5.7 | "Snooze 5 min" from notification: new notification fires ~5 min later; original chain cancelled | | |
| 5.8 | Re-remind loop: if no action taken, notifications fire every `reRemindIntervalMin` | | |
| 5.9 | Auto-miss: after 2 hours past dose time with no action, dose is auto-logged "missed" | | |
| 5.10 | Quiet hours: a dose scheduled inside the quiet window fires after quiet-end time | | |
| 5.11 | Quiet hours: a snooze that would land inside the quiet window is shifted to quiet-end | | |
| 5.12 | Sound off: notification is silent (no sound) | | |
| 5.13 | Refill warning notification fires N days before end_date | | |
| 5.14 | **App killed mid nag-chain**: kill app while nag chain is running; nags continue firing; "Mark Taken" from notification: relaunch → dose is marked taken | | |
| 5.15 | **Timezone change**: change device timezone to +5:30 → UTC; dose notifications must not shift to wrong time (requires reschedule via Settings or app relaunch) | | |
| 5.16 | Android: notifications appear in correct channels (dose-reminders, refill-alerts) | | |
| 5.17 | iOS: notification categories registered; action buttons appear without app running | | |

---

## 6 · History & Calendar

| # | Check | iOS | Android |
|---|---|---|---|
| 6.1 | History tab shows today's doses by default | | |
| 6.2 | Doses colour-coded: green = taken, red = missed, grey = upcoming | | |
| 6.3 | Calendar heatmap: fully green day = all taken, yellow = partial, red = all missed | | |
| 6.4 | Tapping a past day filters the list to that date | | |
| 6.5 | Adherence percentage accurate for the week and month views | | |

---

## 7 · Medication Management

| # | Check | iOS | Android |
|---|---|---|---|
| 7.1 | Medications tab lists all active medicines | | |
| 7.2 | Medicine card shows name, dose, next time, days remaining, refill badge if applicable | | |
| 7.3 | Swipe-to-delete shows confirmation; confirmed delete removes medicine + cancels all notifications | | |
| 7.4 | Swipe-to-pause suspends reminders; timeline shows doses as skipped | | |
| 7.5 | Edit medicine: changing times reschedules future notifications | | |
| 7.6 | Very long medicine name displays without overflow on medicine card | | |

---

## 8 · Settings

| # | Check | iOS | Android |
|---|---|---|---|
| 8.1 | Notification lead time change → notifications rescheduled (verify with a near-future dose) | | |
| 8.2 | Re-remind interval change → new interval applied to next dose's nag chain | | |
| 8.3 | Quiet hours toggle: enable 22:00–07:00; doses during that window shift to 07:00 | | |
| 8.4 | Sound toggle off → next notification is silent | | |
| 8.5 | "Announce doses aloud" on → TTS reads upcoming dose name at reminder time | | |
| 8.6 | Theme: Light / Dark / System each take effect immediately | | |
| 8.7 | Export data: JSON file shared via system sheet; content is valid JSON with medicines + logs | | |
| 8.8 | Clear all data: confirmation required; after clear, Home shows empty state | | |
| 8.9 | Reset all settings: defaults restored; verify notification lead reverts to 5 min | | |
| 8.10 | Privacy policy screen: opens from Settings; all 8 sections readable; back arrow closes | | |
| 8.11 | App lock off → no biometric prompt on launch or foreground | | |
| 8.12 | App lock on → biometric / passcode prompt on app launch | | |
| 8.13 | App lock on → background the app; return → prompt fires again | | |
| 8.14 | App lock: cancel the prompt → app stays locked; "Unlock" button retries | | |

---

## 9 · Multi-Profile (Family)

| # | Check | iOS | Android |
|---|---|---|---|
| 9.1 | Add family member; switch profile; home shows that member's medicines only | | |
| 9.2 | Dose history is isolated per profile — no cross-profile leakage | | |
| 9.3 | "Viewing as…" banner appears when not on own profile | | |
| 9.4 | Delete family member: confirmation → medicines and history removed | | |
| 9.5 | Caregiver alert: when a family member misses a dose, alert offers "Skip / Notify" | | |

---

## 10 · Accessibility

| # | Check | iOS | Android |
|---|---|---|---|
| 10.1 | VoiceOver / TalkBack: all interactive controls announced with meaningful labels | | |
| 10.2 | Switch components announce checked / unchecked state | | |
| 10.3 | App lock screen: `accessibilityViewIsModal=true`; focus trapped inside overlay | | |
| 10.4 | Dose timeline: each item announces "Medicine name, dosage, time, status" | | |
| 10.5 | Large text (iOS Larger Text / Android Font Size): no clipping or layout overflow | | |
| 10.6 | High-contrast mode (iOS Increase Contrast): all text meets 4.5:1 ratio visually | | |
| 10.7 | Disclaimer banner on Review screen announced as "alert" role | | |

---

## 11 · Edge Cases

| # | Check | iOS | Android |
|---|---|---|---|
| 11.1 | **DST spring-forward**: set dose at 02:30 local (a non-existent time on spring-forward day); app handles gracefully (slot does not duplicate or disappear) | | |
| 11.2 | **DST fall-back**: 01:30 exists twice; dose fires exactly once | | |
| 11.3 | **Timezone change (UTC → UTC+5:30)**: existing scheduled notifications show at the correct local time after reschedule; if they don't, rescheduling in Settings fixes them | | |
| 11.4 | **Killed mid nag-chain** (see 5.14) | | |
| 11.5 | **Very long medicine name (60+ chars)**: form card, home timeline, notification all display without crash or overflow | | |
| 11.6 | **Zero medicines**: confirm button disabled on Review screen with 0 cards | | |
| 11.7 | **Open-ended course** (no duration): medicine appears in timeline indefinitely; no refill warning | | |
| 11.8 | **Single-dose course** (1 day, 1 time): one notification scheduled; no nag chain after dose | | |
| 11.9 | **iOS 64-notification cap**: adding a medicine with maxNags=24 uses 25 slots per dose; with >2 doses the cap fills fast — verify that at least the next 2 doses' notifications are scheduled | | |
| 11.10 | **No camera permission + manual entry**: "Add medicine manually" on Home works without any camera permission | | |
| 11.11 | **App in background when dose fires**: notification appears; action buttons work; reopening app shows updated status | | |
| 11.12 | **Rapid profile switch**: switch profiles 5× quickly; home shows correct medicine list each time | | |

---

## 12 · Known Limitations (document, do not fail)

| # | Limitation | Workaround |
|---|---|---|
| 12.1 | **Timezone change** does not auto-reschedule existing notifications | User must save Settings → Reminders to trigger reschedule |
| 12.2 | **iOS 64-notification cap**: with >2 doses and maxNags=24, only the next ~2 doses have full nag coverage | Reduce maxNags in Notification Settings, or rely on the auto-miss mechanism |
| 12.3 | **Multiple notification responses lost after kill**: if user dismisses several nags while app is killed, only the last response is replayed on relaunch | Auto-miss after 2h acts as safety net |
| 12.4 | **Voice confirm** requires iOS VoiceControl or Android Voice Access (no in-app STT) | "Announce doses aloud" (TTS) provides one-way audio feedback |
| 12.5 | **Calendar sync** requires device calendar permission; not available offline for Google Calendar | Device calendar sync works offline; Google Calendar is post-MVP |

---

## Sign-off

| Role | Name | Date | Signature |
|---|---|---|---|
| Dev | | | |
| QA | | | |
| Release | | | |
