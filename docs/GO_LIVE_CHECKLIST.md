# MedMinder — Go-Live Checklist

Work through this top-to-bottom in order. Each section depends on the previous one.

---

## 0 · Missing Dependencies ✅ DONE

~~Install before building:~~

```bash
npx expo install expo-background-fetch expo-task-manager
```

Both packages are now in `package.json` at `~56.0.19`.

---

## 1 · Code Quality Gates ✅ DONE

- [x] `npx tsc --noEmit` exits 0
- [x] `npx expo lint` exits 0 (zero warnings)
- [x] `npx jest` — 97/97 tests pass
- [ ] Scan for `console.log` in production paths before final submission: `grep -r "console.log" src/`

---

## 2 · Assets ✅ DONE — Branded assets generated

All 6 brand-spec assets are in `assets/images/`. Generated from `MedMinder Brand.dc.html`:
two-tone tilted capsule (40° from vertical, white left / `#C8DEFF` right), pulse rings, seam line,
squircle icon tile, two-color wordmark, and Play Store feature graphic.

| File | Size | Spec |
|---|---|---|
| `assets/images/icon.png` | 1024 × 1024 px, no alpha | Blue gradient squircle bg, capsule + rings |
| `assets/images/splash.png` | 1284 × 2778 px, `#FFFFFF` bg | Squircle icon, "Med"(ink)+"Minder"(blue) wordmark, tagline, spinner |
| `assets/images/adaptive-icon.png` | 1024 × 1024 px, transparent bg | White two-tone capsule (Android composites over `#2156DA`) |
| `assets/images/favicon.png` | 196 × 196 px | Blue gradient bg, two-tone capsule |
| `assets/images/notification-icon.png` | 96 × 96 px, white on transparent | Monochrome white capsule (Android status-bar) |
| `assets/images/feature-graphic.png` | 1024 × 500 px | Google Play feature graphic: gradient, headline, phone mockup |

The Play Store also requires a **512 × 512 px app icon PNG** uploaded directly in Play Console
(separate from the APK/AAB). Export a 512 px crop from `icon.png` before step 11.

---

## 3 · App.json — Fill Placeholders

- [ ] Replace `REPLACE_WITH_EAS_PROJECT_ID` (two places) — get it from step 5 below
- [ ] Update `version` if you want to start at a different number than `1.0.0`
- [ ] Confirm `ios.bundleIdentifier` = `com.medminder.app`
- [ ] Confirm `android.package` = `com.medminder.app`

---

## 4 · Accounts — Create If Not Already Done

### Apple Developer
- [ ] Enrol at developer.apple.com ($99/year individual or $299/year organisation)
- [ ] Create an App ID at developer.apple.com/account/resources/identifiers
  - Bundle ID: `com.medminder.app` (explicit, not wildcard)
  - Capabilities to enable: Push Notifications, Sign In with Apple (not needed for MVP)
- [ ] Note your **Team ID** (10-character code, top right in developer.apple.com)

### App Store Connect
- [ ] Go to appstoreconnect.apple.com → My Apps → +
- [ ] Create new app: platform iOS, name "MedMinder", bundle ID `com.medminder.app`
- [ ] Note the **App ID** (numeric, shown in App Information)

### Google Play Console
- [ ] Register at play.google.com/console ($25 one-time)
- [ ] Create app: name "MedMinder", free, app category Medical
- [ ] Note the package name confirmation screen

---

## 5 · EAS Setup

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Log in with your Expo account (create one at expo.dev if needed)
eas login

# Initialise EAS for this project — this writes the projectId into app.json
eas init

# After init, replace REPLACE_WITH_EAS_PROJECT_ID in app.json with the real value
```

---

## 6 · eas.json — Fill Placeholders

After completing step 4 and 5, update `eas.json`:

```json
"ios": {
  "appleId": "your-apple-id@email.com",
  "ascAppId": "YOUR_NUMERIC_APP_STORE_CONNECT_APP_ID",
  "appleTeamId": "YOUR_10_CHAR_TEAM_ID"
}
```

For Android, set up the Google Play API service account:
1. Play Console → Setup → API access → Link to a Google Cloud project
2. Create a service account with "Release manager" role
3. Download the JSON key → save as `google-play-key.json` in the project root
4. **Add `google-play-key.json` to `.gitignore` immediately** — never commit credentials

---

## 7 · Signing Credentials

EAS can manage all signing for you (recommended):

```bash
# iOS — EAS creates and stores Distribution Certificate + App Store Provisioning Profile
eas credentials --platform ios

# Android — EAS generates and stores an upload keystore
eas credentials --platform android
```

**Critical for Android:** The upload keystore that EAS generates (or you provide) must be kept safe forever. If you lose it and don't have Google Play App Signing enabled, you cannot update the app. Enable **Google Play App Signing** in Play Console → Setup → App signing — this means Google holds the final signing key and your upload key is just for authentication.

---

## 8 · Verify on Real Devices

*(Simulators/emulators do not reliably fire local notifications — verify on hardware.)*

- [ ] Test on real **iOS device** (iPhone running iOS 16+):
  - [ ] Onboarding + notification permission prompt appears
  - [ ] Prescription camera scan works (requires dev build, not Expo Go)
  - [ ] Dose reminder fires at scheduled time
  - [ ] "Mark Taken" action button appears in the notification
  - [ ] Re-remind fires after snooze
  - [ ] Refill warning fires correctly
  - [ ] Face ID lock works
- [ ] Test on real **Android device** (Android 10+, API 29+):
  - [ ] Same flow as iOS
  - [ ] Notification channels appear in device settings (dose-reminders, refill-alerts)
  - [ ] Exact alarm permission granted (Android 12+ shows a system prompt)
  - [ ] POST_NOTIFICATIONS permission granted (Android 13+ shows system prompt)

---

## 9 · Build

```bash
# iOS production build (uploads to EAS, then you can submit from there)
eas build --platform ios --profile production

# Android production build (AAB for Play Store)
eas build --platform android --profile production

# Build both at once
eas build --platform all --profile production
```

Build takes ~15–30 min (iOS longer if Xcode cloud is busy). Monitor at expo.dev/accounts/[username]/projects/medminder/builds.

---

## 10 · iOS — App Store Connect Submission

### In App Store Connect (before submitting):
- [ ] **App Information:** Name, subtitle, category (Health & Fitness → Medical), age rating (4+)
- [ ] **Pricing:** Free
- [ ] **Privacy Policy URL:** `https://REPLACE_WITH_URL` — must be live before submission
- [ ] **Support URL:** your support page or email link
- [ ] **App Privacy:** Select "Data Not Collected" (see `docs/DATA_SAFETY.md`)
- [ ] **Screenshots:** 6.7-inch required (see `docs/STORE_LISTING.md` for sizes and scenes)
- [ ] **Description, keywords, what's new:** copy from `docs/STORE_LISTING.md`
- [ ] **Export compliance:** Answer "No" (no encryption beyond standard HTTPS / OS-provided)
- [ ] **Review notes:** Leave a note: "No login required. Use the 'Add manually' button on the Review screen to test without a camera. All data is local."

### Submit the build:
```bash
# If using EAS Submit:
eas submit --platform ios --profile production

# Or manually: App Store Connect → TestFlight tab → + button → select the build from EAS
```

### TestFlight first:
- [ ] Add yourself as an internal tester
- [ ] Install via TestFlight, run through all features
- [ ] Fix any issues, rebuild, resubmit to TestFlight
- [ ] When satisfied → App Store Connect → Distribution → Submit for Review

---

## 11 · Android — Google Play Submission

### In Play Console (before submitting):
- [ ] **Store listing:** Title, descriptions, screenshots, feature graphic (copy from `docs/STORE_LISTING.md`)
- [ ] **App icon:** 512 × 512 px PNG (separate from the adaptive icon in the build)
- [ ] **Content rating:** Complete the IARC questionnaire (answers in `docs/DATA_SAFETY.md`)
- [ ] **Data safety:** Answer all questions "No" (see `docs/DATA_SAFETY.md`)
- [ ] **Privacy policy URL:** same URL as iOS — must be live
- [ ] **Target audience:** 18+ (adults managing their own and family health)
- [ ] **Category:** Medical

### Submit the AAB:
```bash
# Via EAS Submit (submits to internal testing track):
eas submit --platform android --profile production
```

Or manually: Play Console → Testing → Internal testing → Create new release → Upload AAB.

### Internal Testing → Closed Testing → Production:
1. **Internal testing:** Add your own Google account; install via Play Console link. Test everything.
2. **Closed testing (Alpha):** Optional; add 3–10 external testers.
3. **Production:** Promote the release. Play reviews most new apps; allow 3–7 days.

---

## 12 · Privacy Policy — Host It

The text is in `docs/PRIVACY_POLICY.md`. It needs a publicly reachable HTTPS URL.

**Easiest option — GitHub Pages:**
1. Create a public GitHub repo (e.g., `medminder-privacy`)
2. Add the privacy policy as `index.md` or `index.html`
3. Enable GitHub Pages → your URL will be `https://[username].github.io/medminder-privacy`

**Other options:** Notion public page, Carrd, simple Vercel/Netlify static site.

Before you submit to either store, visit the URL in a browser and confirm it loads.

---

## 13 · Post-Launch

- [ ] Monitor App Store and Play Console for review status emails
- [ ] Respond to early user reviews promptly
- [ ] Monitor for crash reports (add Sentry or similar before v1.1 if traffic justifies it)
- [ ] After initial release is stable, set up **EAS Update** for OTA JS patches:
  ```bash
  eas update --channel production --message "Fix dose reminder edge case"
  ```
- [ ] Plan v1.1: E2E tests (Detox), barcode scanning, Apple Watch complication

---

## Quick Reference — Key Values

| Key | Value |
|---|---|
| iOS Bundle ID | `com.medminder.app` |
| Android Package | `com.medminder.app` |
| App name | MedMinder |
| Version | 1.0.0 |
| iOS build number | 1 |
| Android version code | 1 |
| Brand blue | `#2156DA` |
| App background | `#F4F7FB` |
| EAS project ID | (fill after `eas init`) |
