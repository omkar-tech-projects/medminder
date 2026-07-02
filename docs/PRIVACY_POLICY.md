# MedMinder Privacy Policy

**Last updated:** [INSERT DATE BEFORE PUBLISHING]

MedMinder ("the app," "we," "us") is a medication reminder application developed by [YOUR NAME / COMPANY].
This Privacy Policy explains what data the app handles, where it is stored, and your rights.

---

## 1. The short version

- **All your data is stored only on your device.** Nothing is uploaded to any server.
- **We do not collect, transmit, sell, or share any personal data.**
- **No account or login is required.**
- **No advertising or analytics SDKs are included in the app.**

---

## 2. Data stored on your device

MedMinder stores the following information in a local database on your device:

| Category | Examples | Purpose |
|---|---|---|
| Medication details | Medicine name, dosage, form, frequency, start/end dates, timing | Schedule and track reminders |
| Dose history | Taken / missed status, actual taken-at timestamp, scheduled time | Adherence tracking and history log |
| Profile names | Names you enter for yourself and family members | Multi-profile support |
| App preferences | Notification lead time, re-remind interval, quiet hours, theme, language | Personalise the app |

This data is stored in a local SQLite database on your device and **never leaves your device**.

---

## 3. Camera and photo library

If you choose to scan a prescription:

- The camera image is processed **entirely on your device** using Google's on-device ML Kit Text Recognition library.
- The image is **not uploaded** to any server — ours or Google's.
- The prescription image is discarded immediately after text extraction. Only the extracted text (medicine name, dosage, etc.) is retained.

---

## 4. Notifications

MedMinder schedules **local push notifications** on your device using the operating system's notification APIs. We do not use any remote push notification service and do not store notification tokens on any server.

---

## 5. Calendar integration (optional)

If you enable calendar sync, MedMinder creates calendar events on your device's local calendar. No data is sent to any external server through this feature.

---

## 6. Biometric app lock (optional)

If you enable app lock, authentication is handled entirely by iOS Face ID / Touch ID or Android BiometricPrompt. Biometric data is **never accessible to MedMinder**; it is processed solely by your device's operating system.

---

## 7. Data export

You can export all your data as a JSON file via **Settings → Export Data**. This file is saved to your device's local storage. MedMinder has no knowledge of what you do with this file after export.

---

## 8. Third-party SDKs

| SDK | Purpose | Data transmitted externally |
|---|---|---|
| Google ML Kit Text Recognition | On-device OCR for prescription scanning | **None** — fully on-device, no cloud API |
| Expo (React Native framework) | App runtime and native module bridge | None in production release builds |

In production (App Store / Play Store) builds: no analytics, crash reporting, advertising, or remote logging SDKs are active.

---

## 9. Children

MedMinder is not directed at children under the age of 13. We do not knowingly store or process information from children. The app is rated 4+ / Everyone because it contains no objectionable content — it is an organisational tool for medication management.

---

## 10. Security

All sensitive values (such as app lock credentials) are stored in the device's secure enclave (iOS Keychain / Android Keystore) via the operating system's secure storage APIs. Medication data is stored in a local SQLite database protected by your device's standard file-system encryption (enabled when your device has a passcode / PIN).

---

## 11. Your rights

Because we do not collect or store any data on external servers, there is no data held by us to access, correct, or delete. All your data exists only on your device and can be deleted at any time by clearing app data or uninstalling the app. The **Settings → Clear All Data** option permanently removes all medication and history data from the app's database.

---

## 12. Changes to this policy

If we make material changes to this Privacy Policy, we will update the "Last updated" date at the top of this document and, where required by applicable law, notify you within the app.

---

## 13. Contact

If you have questions about this Privacy Policy, please contact:

**[YOUR NAME / COMPANY NAME]**
Email: [YOUR SUPPORT EMAIL]

---

*MedMinder is an organisational tool. It is not a medical device and does not provide medical advice.*
