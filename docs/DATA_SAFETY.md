# MedMinder — Store Privacy Questionnaire Answers

> Complete answers for both Apple App Store privacy labels and Google Play Data Safety.
> All answers reflect MedMinder's local-first architecture: no data leaves the device.

---

## Apple App Store — Privacy Nutrition Labels

Navigate to **App Store Connect → Your App → App Privacy**.

### Question: Does your app collect data?

**Answer: No** — select **"Data Not Collected"**.

Apple's definition: data is only "collected" if it leaves the device and is accessible to you (the developer). Because MedMinder stores everything locally and transmits nothing to any server, the correct answer is **Data Not Collected**.

> Reference: developer.apple.com/app-store/app-privacy-details/#data-collection

---

## Google Play Console — Data Safety Section

Navigate to **Play Console → Your App → Store presence → Data safety**.

### 1. Does your app collect or share any of the required user data types?

**Answer: No**

Because MedMinder does not transmit any data to external servers, select **"No"** to both:
- "Does your app collect any of these data types?"
- "Does your app share any of these data types with third parties?"

### 2. Is all of the app's data encrypted in transit?

Not applicable — no data is transmitted.

### 3. Do you provide a way for users to request that their data is deleted?

**Answer: Yes**

Users can delete all data via **Settings → Clear All Data**. State this in the Play Console form and in your privacy policy.

### 4. Full Data Safety form — detailed type-by-type answers

| Data type | Collected? | Why |
|---|---|---|
| Name | No | Profile names are stored locally only |
| Email address | No | Not collected |
| Phone number | No | Family member phone numbers (optional) are stored locally only |
| Health and fitness — health info | No | Medication details stored locally only, not transmitted |
| App interactions | No | No analytics SDK |
| Crash logs | No | No crash reporting SDK in production |
| Device or other IDs | No | Not collected |
| Location | No | Not collected |
| Financial info | No | Not collected |
| Contacts | No | Not collected |
| Photos / videos | No | Prescription images are processed on-device and discarded; not stored or transmitted |
| Audio files | No | Not collected |
| Calendar events | No | Events are written to the device calendar only; not transmitted |

### 5. Does your app use required permissions that access sensitive data?

**Answer: Yes** — explain each permission honestly:

| Permission | Why it is needed |
|---|---|
| Camera | Scanning prescription images; image processed on-device, never uploaded |
| Photo library / media images | Importing prescription photos; processed on-device, never uploaded |
| Calendar read/write | Creating dose reminder events in the device's local calendar |
| Notifications | Sending dose reminders and refill warnings as local push notifications |
| Biometrics / fingerprint | Optional app lock using Face ID or fingerprint |
| Background tasks (fetch) | Running a once-daily check to detect medicines whose course is ending soon |
| Exact alarms | Scheduling dose reminders at precise times |
| Boot completed | Rescheduling reminders after device restart |

### 6. Does your app contain ads?

**Answer: No**

### 7. Data safety summary statement (shown to users)

> "MedMinder stores all your data — medication details, dose history, preferences — on your device only. No data is shared with or transmitted to external servers. No account is required."

---

## Content Rating — Google Play (IARC questionnaire)

Navigate to **Play Console → Your App → Store presence → Content rating**.

Answer each IARC question as follows:

| Question | Answer |
|---|---|
| Violence | No |
| Sexual content | No |
| Profanity or crude humour | No |
| Controlled substances | No (the app helps organise medicine; it does not promote substance use) |
| Gambling | No |
| User interaction / social features | Yes — family member profiles (local only, no social network) |
| Location sharing | No |
| Digital purchases | No |
| Unrestricted internet access | No |
| Personal info from users under 13 | No |

**Expected rating: Everyone / 4+**

---

## Content Rating — Apple App Store

Navigate to **App Store Connect → Your App → App Information → Content Rights**.

| Question | Answer |
|---|---|
| Cartoon or fantasy violence | None |
| Realistic violence | None |
| Sexual content | None |
| Profanity | None |
| Mature/suggestive themes | None |
| Horror / fear themes | None |
| Medical/treatment information | Yes — the app displays user-entered medication names and doses. This does not constitute medical advice. |
| Alcohol, tobacco, drugs | None — the app tracks prescribed medications but does not promote substance use |
| Gambling | None |

**Expected rating: 4+**
