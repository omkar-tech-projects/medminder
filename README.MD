# MedMinder
> Never miss a dose. A cross-platform medication reminder app built with
React Native & Expo — smart notifications, on-device prescription
scanning, calendar sync, and family profiles.
## Features
- **Smart reminders** — pre-dose + on-time alerts, snooze, and
escalating follow-up nudges for missed doses
- **Same-time handling** — separate notifications for multiple
medicines scheduled at the same minute
- **Prescription scanning** — on-device OCR (ML Kit) reads a
prescription photo; no image ever leaves the phone
- **Calendar sync** — adds doses to the device / Google calendar
- **Family profiles** — manage medicines for multiple people
- **Adherence tracking** — history and progress at a glance
- **Privacy first** — offline-first local storage + biometric app lock
## Tech stack
React Native · Expo · TypeScript · expo-router ·
expo-notifications · expo-sqlite + Drizzle ORM · Zustand ·
expo-calendar · ML Kit (on-device OCR)
## Getting started
```bash
npm install
npx expo start
```
Build a release APK/AAB with EAS: `eas build -p android`
## Status
Actively developed · preparing for Play Store & App Store release
## License
MIT — see LICENSE