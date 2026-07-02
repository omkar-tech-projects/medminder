// MedMinder User Guide PDF Generator
// Runs with: node docs/generate-user-guide.mjs
// Outputs:   docs/MedMinder-User-Guide.pdf

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'MedMinder-User-Guide.pdf');

// Brand colours (from src/theme/colors.ts light palette)
const BRAND   = '#2156DA';  // brand500
const ACCENT  = '#138A5E';  // green700
const WARN    = '#C77700';  // amber700
const DARK    = '#14223A';  // navy900
const MID     = '#4E617A';  // navy400
const LIGHT   = '#F4F7FB';  // cool25
const AMBER_BG= '#FBEFD9';  // amber100
const WHITE   = '#FFFFFF';

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 56.69;   // ~20mm
const TEXT_W = A4_W - MARGIN * 2;

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: MARGIN, bottom: MARGIN + 20, left: MARGIN, right: MARGIN },
  info: {
    Title: 'MedMinder User Guide',
    Author: 'MedMinder',
    Subject: 'Complete guide to using MedMinder',
    Keywords: 'medication, reminder, health, prescription',
  },
  autoFirstPage: false,
});

const stream = fs.createWriteStream(OUT);
doc.pipe(stream);

// ─── Helpers ─────────────────────────────────────────────────────────────────

let pageNum = 0;

function addPage() {
  doc.addPage();
  pageNum++;
}

function footer() {
  if (pageNum < 2) return;
  const y = A4_H - MARGIN + 8;
  doc.save()
     .fontSize(9).fillColor(MID).font('Helvetica')
     .text(String(pageNum), MARGIN, y, { width: TEXT_W, align: 'center' })
     .restore();
}

function h1(text) {
  doc.fontSize(22).fillColor(BRAND).font('Helvetica-Bold')
     .text(text, { paragraphGap: 6 });
  doc.moveDown(0.3);
  doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + TEXT_W, doc.y)
     .strokeColor(BRAND).lineWidth(1.5).stroke();
  doc.moveDown(0.6);
}

function h2(text) {
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor(BRAND).font('Helvetica-Bold').text(text);
  doc.moveDown(0.3);
}

function h3(text) {
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor(DARK).font('Helvetica-Bold').text(text);
  doc.moveDown(0.2);
}

function body(text, opts = {}) {
  doc.fontSize(11).fillColor(DARK).font('Helvetica')
     .text(text, { lineGap: 5, ...opts });
  doc.moveDown(0.3);
}

function step(n, text) {
  const label = `${n}.  `;
  const indent = MARGIN + 20;
  const w = TEXT_W - 20;
  doc.save();
  doc.fontSize(11).fillColor(BRAND).font('Helvetica-Bold').text(String(n) + '.', MARGIN, doc.y, { continued: true, width: 20 });
  doc.font('Helvetica').fillColor(DARK).text('  ' + text, { lineGap: 5, width: w });
  doc.restore();
  doc.moveDown(0.2);
}

function tipBox(type, text) {
  const colours = {
    NOTE:    { bg: '#EAF0FD', border: BRAND,  label: 'NOTE:' },
    TIP:     { bg: '#E4F4EC', border: ACCENT, label: 'TIP:' },
    WARNING: { bg: AMBER_BG,  border: WARN,   label: 'WARNING:' },
  };
  const c = colours[type] || colours['NOTE'];

  const startY = doc.y;
  const boxH = 50;  // estimate; will wrap
  doc.save();

  // Draw background + left border after we know text height
  const textY = startY + 10;
  doc.fontSize(10).font('Helvetica-Oblique').fillColor(DARK);
  const measured = doc.heightOfString(`${c.label} ${text}`, { width: TEXT_W - 16 });
  const finalH = measured + 20;

  doc.rect(MARGIN, startY, TEXT_W, finalH).fill(c.bg);
  doc.rect(MARGIN, startY, 3, finalH).fill(c.border);

  doc.fillColor(MID).font('Helvetica-BoldOblique').fontSize(10)
     .text(c.label, MARGIN + 10, textY, { continued: true, width: TEXT_W - 16 });
  doc.font('Helvetica-Oblique').fillColor(DARK)
     .text(' ' + text, { lineGap: 4, width: TEXT_W - 16 });

  doc.restore();
  doc.y = startY + finalH + 10;
  doc.moveDown(0.3);
}

function checkIfNewPageNeeded(estimatedHeight = 80) {
  if (doc.y + estimatedHeight > A4_H - MARGIN - 20) {
    footer();
    addPage();
  }
}

// ─── TOC data ────────────────────────────────────────────────────────────────
const sections = [
  { num: 1,  title: 'Getting started' },
  { num: 2,  title: 'Adding your medicines' },
  { num: 3,  title: 'Your daily reminders' },
  { num: 4,  title: 'Home screen' },
  { num: 5,  title: 'Medicines list tab' },
  { num: 6,  title: 'Calendar tab' },
  { num: 7,  title: 'History tab' },
  { num: 8,  title: 'Family and caregiver screen' },
  { num: 9,  title: 'Settings' },
  { num: 10, title: 'Course completion and refills' },
  { num: 11, title: 'Troubleshooting' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — COVER
// ═══════════════════════════════════════════════════════════════════════════════
addPage();

// Background band
doc.rect(0, 0, A4_W, 340).fill(BRAND);

// App name
doc.fontSize(52).fillColor(WHITE).font('Helvetica-Bold')
   .text('MedMinder', MARGIN, 120, { width: TEXT_W, align: 'center' });

// Tagline
doc.fontSize(18).fillColor('#D5E1FB').font('Helvetica')
   .text('Never miss a medicine', MARGIN, 190, { width: TEXT_W, align: 'center' });

// Version
doc.fontSize(12).fillColor('#AABBF7').font('Helvetica')
   .text('User Guide  |  Version 1.0', MARGIN, 240, { width: TEXT_W, align: 'center' });

// Decorative line
doc.moveTo(MARGIN + 60, 300).lineTo(A4_W - MARGIN - 60, 300)
   .strokeColor(WHITE).lineWidth(0.5).stroke();

// Below band — intro blurb
doc.fontSize(12).fillColor(MID).font('Helvetica')
   .text(
     'This guide explains every feature and screen in MedMinder. ' +
     'No technical knowledge required.',
     MARGIN, 370, { width: TEXT_W, align: 'center', lineGap: 6 }
   );

// Disclaimer box on cover
doc.moveDown(2);
tipBox('WARNING',
  'MedMinder is a reminder tool only. It does not provide medical advice. ' +
  'Always verify medicines and dosages with your doctor or pharmacist before ' +
  'starting any treatment.'
);

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — TABLE OF CONTENTS
// ═══════════════════════════════════════════════════════════════════════════════
footer();
addPage();

doc.fontSize(20).fillColor(BRAND).font('Helvetica-Bold')
   .text('Table of Contents', { paragraphGap: 4 });
doc.moveDown(0.3);
doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + TEXT_W, doc.y)
   .strokeColor(BRAND).lineWidth(1.5).stroke();
doc.moveDown(1);

for (const s of sections) {
  const label = `Section ${s.num} — ${s.title}`;
  doc.fontSize(12).fillColor(DARK).font('Helvetica')
     .text(label, MARGIN, doc.y, { continued: false, width: TEXT_W - 30 });
  doc.moveDown(0.55);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — GETTING STARTED
// ═══════════════════════════════════════════════════════════════════════════════
footer();
addPage();

h1('Section 1 — Getting started');

h2('What MedMinder does');
body(
  'MedMinder is a personal medication reminder app. It helps you remember to take your medicines ' +
  'on time, every time. You photograph your prescription, the app reads the details, and it ' +
  'automatically sets up dose reminders for each medicine. Every dose you take or miss is recorded ' +
  'so you can track your adherence over time.'
);
body(
  'Everything is stored only on your phone. MedMinder has no account, no login, and never sends ' +
  'your health data to the internet.'
);

tipBox('WARNING',
  'MedMinder is a reminder tool — not a medical app. It does not check for drug interactions, ' +
  'validate doses, or give medical advice. Always follow your doctor\'s or pharmacist\'s instructions. ' +
  'If the app reads a prescription incorrectly, correct the details yourself before confirming.'
);

h2('First-run onboarding');
body('When you open MedMinder for the first time, you will be guided through six short steps.');

h3('Step 1 — Welcome');
body('Read the brief overview of what MedMinder does, then tap "Get started".');

h3('Step 2 — Your name');
body('Enter your first name. This is used in the daily greeting on the Home screen. It is stored only on your device and never shared. Tap "Skip" to leave it blank.');

h3('Step 3 — Your phone number');
body('Enter your phone number. This helps family members identify which profile belongs to you. Stored on-device only. You can skip this step.');

h3('Step 4 — Notification permission');
body('Tap "Allow notifications" so MedMinder can remind you to take your medicines. If you tap "Not now", the app will still work but you will not receive reminders. You can grant permission later in your phone Settings.');

h3('Step 5 — Camera permission');
body('Tap "Allow camera access" so you can photograph prescriptions. If you tap "Not now", you can still add medicines manually. You can grant permission later in your phone Settings.');

h3('Step 6 — Disclaimer (required)');
body('Read the safety disclaimer carefully. Tap "I understand and accept" to continue. This step cannot be skipped.');

tipBox('NOTE',
  'Onboarding only appears on the very first launch. Afterwards it is not shown again. ' +
  'You can update your name and phone number at any time from the Family tab.'
);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — ADDING MEDICINES
// ═══════════════════════════════════════════════════════════════════════════════
footer();
addPage();

h1('Section 2 — Adding your medicines');

h2('Option A — Scan a prescription');
body('This is the fastest way to add a medicine. The app reads the text from your prescription photo using on-device AI — no internet connection needed.');

h3('How to scan');
step(1, 'On the Home screen, tap "Scan a prescription", or on the Medicines tab, tap the + icon and choose "Scan prescription".');
step(2, 'Point your camera at the prescription so the text is clearly visible and well-lit.');
step(3, 'Tap the large white shutter button to take the photo. A brief white flash confirms the capture.');
step(4, 'If the prescription has more than one page, tap "Add more pages" and photograph each page.');
step(5, 'When all pages are captured, tap "Done" (top right).');
step(6, 'The app analyses the photo. This takes up to 30 seconds. A loading screen is shown while it works.');
step(7, 'The Review screen appears, pre-filled with the medicines detected.');

h3('Confidence colours on the Review screen');
body('Each medicine card has a confidence badge:');
body('- Green badge ("High confidence") — the app is confident about this field. Still check it.');
body('- Amber badge ("Check details") — the app detected something but is less certain. Review carefully.');
body('- Red badge ("Low confidence") — the app was not sure. You must verify and possibly correct this field.');

tipBox('WARNING',
  'AI extraction can make mistakes. Always compare every field on the Review screen with your ' +
  'actual prescription before tapping "Confirm schedule". Your doctor or pharmacist is the ' +
  'authoritative source for dosage and instructions.'
);

h2('Option B — Add a medicine manually');
body('If you do not have a prescription to photograph, or want to add a medicine directly:');
step(1, 'On the Home screen, tap "Add medicine manually".');
step(2, 'An empty Review screen opens with one blank medicine card.');
step(3, 'Fill in the fields — medicine name and start date are required; all others are optional but recommended.');
step(4, 'Tap "Confirm schedule" when done.');

h2('The Review and Edit screen — field guide');
body('Each medicine card contains these fields:');

h3('Medicine name (required)');
body('The drug name as it appears on your prescription, e.g. "Amoxicillin".');

h3('Strength');
body('The concentration of the drug, e.g. "500 mg". If not on the prescription, leave blank.');

h3('Form');
body('The physical form of the medicine, e.g. "tablet", "capsule", "syrup". Leave blank if unsure.');

h3('Dose amount (required)');
body('How much you take per dose, e.g. "1 tablet", "5 ml".');

h3('Times per day (required)');
body('How many times a day you take this medicine, e.g. "2" for twice daily.');

h3('Duration (days)');
body('The total number of days the course lasts, e.g. "7" for one week. Leave blank for an ongoing medicine with no end date.');

h3('Start date (required)');
body('The date you begin taking the medicine. Format: YYYY-MM-DD (e.g. 2026-06-26). Defaults to today.');

h3('Stock (pills)');
body('How many tablets or capsules you currently have. Used to calculate when you will run out and warn you in advance. Optional.');

h3('Instructions');
body('Any special instructions, e.g. "Take with food", "Avoid sunlight". Optional.');

h3('Editing and removing medicines');
body('To remove a medicine from the list before confirming, tap the X button on its card. To add a second medicine to the same session, tap "Add another medicine".');

h2('Confirming the schedule');
body('When you are satisfied all details are correct, tap "Confirm schedule". The app saves the medicines, creates dose times based on the frequency, and schedules all your reminders. You are then taken to the Home screen where the doses appear in today\'s timeline.');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — REMINDERS
// ═══════════════════════════════════════════════════════════════════════════════
footer();
addPage();

h1('Section 3 — Your daily reminders');

h2('When reminders fire');
body('MedMinder schedules two kinds of alerts for each dose:');
body('1. A lead reminder fires before the scheduled dose time (default: 5 minutes in advance). This gives you time to prepare.');
body('2. An on-time reminder fires exactly at the dose time if you have not already marked it taken.');

tipBox('TIP',
  'You can change the lead time (and many other reminder settings) in Settings > Notifications > Reminders. ' +
  'For example, set a lead time of 15 minutes if you need more preparation time.'
);

h2('The notification — what you see');
body('Each reminder notification shows:');
body('- The medicine name and dose amount.');
body('- Two action buttons: "Mark Taken" and "Snooze 5 min" (snooze duration is adjustable in settings).');
body('Tap the notification to open the app directly to the dose detail sheet.');

h2('Marking a dose taken');
body('You can mark a dose taken in three ways:');
body('1. Tap "Mark Taken" on the notification without opening the app.');
body('2. Tap the notification to open the dose detail sheet, then tap "Mark taken".');
body('3. On the Home screen, tap the dose card and confirm from the detail sheet.');
body('The app records the exact time you marked it taken (which may differ slightly from the scheduled time). This is used in your adherence history.');

h2('Snoozing a dose');
body('Tap "Snooze 5 min" on the notification (or the equivalent button in the dose detail sheet). A new reminder fires after the snooze duration, which defaults to 5 minutes. You can change this in Settings > Notifications > Reminders > Snooze duration.');

h2('The re-remind (nag) chain');
body('If you do not respond to the reminder, MedMinder continues sending reminders at regular intervals (default: every 5 minutes) up to a maximum count (default: 24 reminders = 2 hours at 5-minute intervals).');
body('If the maximum is reached and you still have not responded, the dose is automatically recorded as "Missed".');

h2('What "missed" means');
body('A dose is marked missed when:');
body('- The re-remind chain exhausted its maximum retries without a response, OR');
body('- You manually mark a past dose as missed from the History or Calendar tab.');
body('Missed doses appear in red on the Home screen, History tab, and Calendar tab. They are included in your adherence percentage calculations.');

h2('Quiet hours');
body('You can set a quiet hours window (e.g. 22:00 to 07:00) in Settings > Notifications > Reminders. Any reminder that would fire during this window is held and fires at the end of the quiet period instead of waking you up.');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — HOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
footer();
addPage();

h1('Section 4 — Home screen');

body('The Home screen is the first thing you see when you open MedMinder. It gives you an at-a-glance view of today\'s medicines.');

h2('The greeting');
body('At the top you see a personalised greeting (e.g. "Good morning, Alex") followed by today\'s date. Tap the person icon in the top-right to switch between profiles or edit your profile name.');

h2('Refill warnings and course-end alerts');
body('If any medicine is about to run out of pills or is near its end date, a warning card appears at the top of the Home screen. See Section 10 for full details.');

h2('Today\'s progress card');
body('A summary card shows three numbers: Taken (green), Upcoming (blue), Missed (red). These update in real time as you confirm doses throughout the day.');

h2('Today\'s schedule (dose timeline)');
body('Below the summary, each dose for today appears as a card in chronological order. Each card shows:');
body('- Medicine name and dose amount.');
body('- Scheduled time.');
body('- Status chip: Taken (green), Upcoming (blue), Missed (red), Snoozed (amber).');
body('Tap any dose card to open the dose detail sheet where you can mark it taken, skip it, or navigate to the medicine\'s full detail page.');

h2('Scan and Add buttons');
body('At the bottom of the screen (always visible, even when medicines exist):');
body('- "Scan a prescription" — tap to open the camera and scan a new prescription.');
body('- "Add medicine manually" — tap to open a blank Review screen and add a medicine by typing the details.');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — MEDICINES LIST TAB
// ═══════════════════════════════════════════════════════════════════════════════
footer();
addPage();

h1('Section 5 — Medicines list tab');

body('The Medicines tab (second icon in the tab bar) shows all your active medicines.');

h2('Medicine cards');
body('Each card shows:');
body('- A colour stripe on the left (each medicine gets a unique colour).');
body('- Medicine name in bold.');
body('- Dose amount, strength, and frequency, e.g. "1 tablet · 500 mg · 2x/day".');
body('- The date the medicine was started.');
body('- A badge on the right if the medicine is close to ending.');

h2('Days-remaining badge');
body('- If 4 to 7 days remain: an amber badge shows "Xd left".');
body('- If 3 or fewer days remain: a red badge shows "Xd left".');
body('- If the course has ended: a grey badge shows "Ended".');
body('No badge is shown for ongoing medicines (no end date) or medicines with more than 7 days remaining.');

h2('Adding a medicine from the Medicines tab');
body('Tap the + icon in the top-right corner. A dialog asks:');
body('- "Scan prescription" — opens the camera.');
body('- "Add manually" — opens a blank Review screen.');

h2('Viewing medicine details');
body('Tap any medicine card to open the Medicine Detail screen. This shows all fields for the medicine, scheduled dose times, days remaining, stock level, and notification override settings.');

h2('Editing a medicine');
step(1, 'Open the Medicine Detail screen for the medicine.');
step(2, 'Tap the pencil icon in the top-right corner.');
step(3, 'An edit sheet slides up. Change any field.');
step(4, 'Tap "Save changes". The schedule and future reminders are updated automatically.');

tipBox('NOTE',
  'Changing the number of times per day resets the dose times to automatic defaults ' +
  '(e.g. 08:00 and 20:00 for twice daily). If you want custom times, you will need to ' +
  'set per-medicine overrides after saving.'
);

h2('Pausing and resuming reminders');
body('On the Medicine Detail screen, tap "Pause reminders" to suspend all future notifications for this medicine without deleting it or its history. Tap "Resume reminders" to reactivate them.');

h2('Deleting a medicine');
body('On the Medicine Detail screen, tap "Delete medication" (red button). A confirmation dialog appears — this action permanently removes the medicine and all its dose history and cannot be undone.');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — CALENDAR TAB
// ═══════════════════════════════════════════════════════════════════════════════
footer();
addPage();

h1('Section 6 — Calendar tab');

body('The Calendar tab (third icon) lets you browse your doses day by day with a monthly overview.');

h2('Month grid');
body('The top section shows the current month. Each day that has doses shows a coloured dot:');
body('- Green dot — all doses for that day were taken.');
body('- Amber/yellow dot — some doses taken, some missed or pending.');
body('- Red dot — all doses for that day were missed.');
body('- Blue dot — upcoming (future date with scheduled doses).');
body('A dot legend at the bottom of the calendar explains the colours.');

h2('Navigating between months');
body('Tap the left or right arrows to move to the previous or next month. If you have navigated away from today\'s month, a "Jump to today" button appears in the top-right corner — tap it to return.');

h2('Day view');
body('Tap any date to select it. The list below the calendar updates to show all doses scheduled for that day, with their status and scheduled time.');
body('Tap any dose in the day list to open the dose detail sheet, where you can mark it taken or skip it. You can also tap the green tick button directly on a dose row to quickly mark it taken without opening the sheet.');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — HISTORY TAB
// ═══════════════════════════════════════════════════════════════════════════════
footer();
addPage();

h1('Section 7 — History tab');

body('The History tab (fourth icon) shows a detailed log of every dose and your overall adherence statistics.');

h2('Adherence statistics');
body('At the top of the tab, summary cards show:');
body('- Total doses scheduled, taken, missed, and skipped for the selected period.');
body('- Adherence percentage (taken / total scheduled).');
body('- A 7-day and 30-day trend chart showing your adherence over time.');

h2('Daily dose log');
body('Below the statistics, doses are grouped by day. Each row shows:');
body('- Medicine name and dose amount.');
body('- Scheduled time.');
body('- Actual taken-at time (if marked taken).');
body('- Status: Taken (green), Missed (red), Skipped (grey), Upcoming (blue).');

h2('Filtering');
body('Use the filter bar above the log to narrow the view:');
body('- Date range: Last 7 days, Last 30 days, Last 90 days, or All time.');
body('- Medicine: Show only doses for one specific medicine.');
body('- Status: Show only Taken, Missed, Skipped, or Upcoming doses.');

h2('Exporting history');
body('Tap the share icon (top-right) to export your dose history as a JSON file. On Android the file is shared directly. On iOS it is saved to your Documents folder and the system share sheet opens so you can send it via email, AirDrop, or any other app.');

tipBox('TIP',
  'You can share your exported history file with your doctor or pharmacist to show your ' +
  'medication adherence over time. The JSON file includes medicine names, scheduled times, ' +
  'and taken/missed status for every dose in the selected date range.'
);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — FAMILY & CAREGIVER
// ═══════════════════════════════════════════════════════════════════════════════
footer();
addPage();

h1('Section 8 — Family and caregiver screen');

body('The Family tab (fifth icon) lets you manage medicines for family members — for example, a parent managing their child\'s medicines, or a caregiver looking after an elderly relative.');

h2('What the Family screen is for');
body('MedMinder supports multiple profiles on a single device. Each profile has its own medicines, schedules, dose history, and settings. You can switch between profiles instantly.');

h2('Adding a family member');
step(1, 'Tap the person-with-plus icon in the top-right of the Family screen, or the "Add family member" button at the bottom.');
step(2, 'Enter the person\'s name (required), phone number (optional), relationship (e.g. Parent, Child, Spouse), date of birth (optional), and choose a colour for their profile card.');
step(3, 'Optionally, enable caregiver alerts: enter a caregiver\'s name and contact (phone or email). When a dose is missed, the app will prompt you to notify the caregiver.');
step(4, 'Tap "Save".');

h2('The caregiver dashboard');
body('The top of the Family screen shows a summary card labelled "Everyone today" with the total doses due, taken, and missed across all profiles. Any profile that has a missed dose is called out by name.');

h2('Switching to a family member\'s profile');
body('Tap the card of any family member. All other tabs immediately show that person\'s medicines, doses, history, and calendar. The app is now operating "as" that person.');

h2('The "Viewing as" banner');
body('When you are viewing another person\'s profile, a blue banner at the top of every screen shows "Viewing [Name]\'s medicines". Tap the "Back to my profile" button on the banner to return to your own profile instantly.');

h2('Editing or removing a family member');
body('On the Family screen, each profile card has:');
body('- Edit button — tap to open the edit form and change their name, phone number, relationship, date of birth, colour, or caregiver contact.');
body('- Remove button — tap to permanently delete this person\'s profile, all their medicines, and all their history. A confirmation dialog is shown. This cannot be undone.');

tipBox('NOTE',
  'You cannot delete the last remaining profile (your own). There must always be at least one profile.'
);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9 — SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════
footer();
addPage();

h1('Section 9 — Settings');

body('The Settings tab (sixth icon, cog symbol) lets you customise how MedMinder behaves.');

h2('Profiles & Caregivers');
body('Tap "Manage profiles" to open the profile switcher sheet. From here you can switch to any profile, or tap the edit icon next to a profile to update their details.');

h2('Notifications — Reminders');
body('Tap "Reminders" to open the notification settings sheet. Available options:');

h3('Lead time (minutes before dose)');
body('How many minutes before the scheduled dose time the first reminder fires. Default: 5 minutes. Range: 1 to 60 minutes.');

h3('Re-remind interval (minutes)');
body('If you do not respond to a reminder, another one fires after this many minutes. Default: 5 minutes. Range: 1 to 60 minutes.');

h3('Max reminders per dose');
body('How many reminders fire before the dose is auto-marked missed. Default: 24 (which equals 2 hours at 5-minute intervals). Range: 1 to 96.');

h3('Snooze duration (minutes)');
body('How long the "Snooze" action delays a reminder. Default: 5 minutes. Range: 1 to 60 minutes.');

h3('Quiet hours');
body('Enable this toggle and set a start and end time (in HH:MM format). Reminders that would fire during the quiet window are held until the window ends.');

h3('Sound');
body('Toggle whether a sound plays with each reminder. Default: on.');

h3('Announce doses aloud');
body('When enabled, the app uses your phone\'s text-to-speech to read upcoming doses aloud. Useful for hands-free use. Default: off.');

h2('Notifications — Refill alerts');
body('Tap "Refill alerts" to configure:');
body('- Course end warning: how many days before a course ends to show a refill warning. Default: 3 days.');
body('- Low stock warning: how many days of supply remaining to trigger a low-stock alert. Default: 5 days.');

h2('Appearance — Theme');
body('Choose between Light, Dark, or System (follows your phone\'s setting). The change applies immediately.');

h2('Calendar sync');
body('Optionally sync dose reminders to your phone\'s device calendar (iOS or Android). Toggle the switch to enable. A permission request will appear if calendar access has not been granted yet.');

h2('Security — App lock');
body('Enable biometric or passcode lock so the app requires authentication every time it is opened. Uses your phone\'s built-in Face ID, Touch ID, or fingerprint — MedMinder never sees or stores your biometric data.');

h2('Data & Privacy');

h3('Export data');
body('Exports all your medicines and dose logs as a JSON file. On Android the share sheet opens. On iOS the file is saved to Documents and the share sheet opens.');

h3('Privacy policy');
body('Opens the full privacy policy, which explains exactly what data is stored on your device and confirms that nothing is ever sent to a server.');

h3('Reset all settings');
body('Restores every notification and appearance setting to its factory default. Your medicine data and dose history are not affected.');

h3('Clear all data');
body('Permanently deletes all medicines and dose history for the active profile. Settings are not affected. This cannot be undone — a confirmation dialog is shown first.');

tipBox('WARNING',
  '"Clear all data" only affects the currently active profile. Switch to each profile before clearing ' +
  'if you want to wipe data for multiple people.'
);

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10 — COURSE COMPLETION & REFILLS
// ═══════════════════════════════════════════════════════════════════════════════
footer();
addPage();

h1('Section 10 — Course completion and refills');

h2('How the app detects a course ending');
body('When you add a medicine with a duration (e.g. 7 days), MedMinder calculates an end date. A background task runs daily and checks whether any medicine\'s end date is approaching.');

h2('Refill warning');
body('When the number of days remaining on a course is at or below the refill warning threshold (default: 3 days), MedMinder:');
body('- Shows a warning card at the top of the Home screen.');
body('- Shows a badge on the medicine card in the Medicines tab.');
body('- Fires a push notification (once per medicine per threshold crossing).');
body('You can dismiss the warning card after reading it. You can also tap "Set reminder" on the card to schedule a reminder to pick up the prescription on a specific day.');

h2('Low stock warning');
body('If you entered a pill count when adding the medicine, the app tracks how many pills remain based on the doses you have confirmed as taken. When the estimated supply drops below the low-stock threshold (default: 5 days\' worth), the same warning cards, badges, and notifications appear.');

h2('The end-of-course notification');
body('On the day a course ends (or the day after), a course-end modal appears the next time you open the app. It lists the medicine and asks what you want to do. Options typically include dismissing the notice (which marks the medicine as inactive).');

h2('Marking a medicine inactive');
body('Go to Medicine Detail and tap "Delete medication" to permanently remove it, or "Pause reminders" to suspend it without losing history. There is no separate "mark inactive" button at this time — pausing is the closest equivalent.');

h2('Extending a course');
body('Go to Medicine Detail, tap the pencil icon to open the edit sheet, and increase the duration in days (or clear it entirely for an ongoing medicine). Tap "Save changes" — the end date, dose log, and notifications are all updated automatically.');

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11 — TROUBLESHOOTING
// ═══════════════════════════════════════════════════════════════════════════════
footer();
addPage();

h1('Section 11 — Troubleshooting');

h2('Notifications not appearing');
step(1, 'Go to your phone\'s Settings app.');
step(2, 'Find MedMinder in the app list.');
step(3, 'Tap "Notifications" and make sure notifications are allowed.');
step(4, 'Check that the "Dose reminders" and "Refill alerts" channels are not blocked (Android only).');
step(5, 'In the MedMinder app, go to Settings > Notifications > Reminders and check that quiet hours are not covering the entire day.');
step(6, 'On Android, check that battery optimisation is not killing the app in the background (Settings > Battery > App optimisation > MedMinder > "Don\'t optimise").');

tipBox('NOTE',
  'Notifications cannot be tested on an Android emulator or iOS simulator. Always test on a real device.'
);

h2('OCR extracted the wrong medicine name or dosage');
body('This is expected sometimes — prescription text varies greatly in font and layout. Always check every field on the Review screen before confirming. Tap any field to edit it. If the name is wrong, type the correct name. If strength or frequency is wrong, correct it there. The corrected values are what the app uses — the AI suggestion is just a starting point.');

h2('The app does not recognise a medicine name');
body('MedMinder does its best to match extracted text against a built-in medicine dictionary. If a name is not recognised, it still appears — just without any additional information. You can type the correct name manually. This does not affect reminder scheduling.');

h2('How to export your data as a backup');
step(1, 'Go to Settings > Data & Privacy > Export data.');
step(2, 'The app creates a JSON file named medminder-export-YYYY-MM-DD.json.');
step(3, 'On Android: the system share sheet opens — save it to Drive, email it, or copy to a folder.');
step(4, 'On iOS: the file is saved to your Documents folder and the share sheet opens.');
step(5, 'Store the file somewhere safe. It contains all your medicine and dose history for the active profile.');

h2('How to clear data without resetting onboarding');
body('Go to Settings > Data & Privacy > Clear all data. This deletes medicines and dose history for the active profile only. Onboarding is NOT shown again — it only appears on a fresh install. Your settings (notification preferences, theme, etc.) are also not affected by this action. Use "Reset all settings" if you want to restore notification defaults.');

h2('The app is asking for permissions again');
body('If you denied a permission during onboarding and now want to grant it, you must do so in your phone\'s Settings app — the app cannot show the system dialog a second time once it has been permanently denied. Go to Settings > Apps > MedMinder > Permissions.');

tipBox('TIP',
  'For any issue not covered here, use the in-app feedback option or file a report on the project\'s ' +
  'GitHub page listed in the App Store / Play Store listing.'
);

// ─── Final footer on last page ────────────────────────────────────────────────
footer();

// ─── Finalise ─────────────────────────────────────────────────────────────────
doc.end();

stream.on('finish', () => {
  const stat = fs.statSync(OUT);
  console.log('PDF written to:', OUT);
  console.log('File size:', (stat.size / 1024).toFixed(1), 'KB');
});

stream.on('error', (err) => {
  console.error('Stream error:', err);
  process.exit(1);
});
