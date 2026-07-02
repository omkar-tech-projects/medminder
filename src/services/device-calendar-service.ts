import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import { addMinutes, parseISO } from 'date-fns';

const CALENDAR_TITLE = 'MedMinder';
const CALENDAR_COLOR = '#2A9D8F';
const EVENT_DURATION_MIN = 30;

export interface DoseEventParams {
  medicineName: string;
  dosage: string;
  scheduledAt: string;
  instructions: string | null;
}

export async function requestDeviceCalendarPermission(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Requests calendar permission, finds or creates the MedMinder calendar.
 * Returns { calendarId, calendarName } on success.
 * Returns null if permission is denied (caller shows "go to Settings" prompt).
 * Throws an Error with a user-readable message if permission is granted but calendar
 * creation fails on all strategies (caller should show an Alert with the message).
 */
export async function connectDeviceCalendar(): Promise<{
  calendarId: string;
  calendarName: string;
} | null> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return null;

  // May throw — caller should catch and show an error Alert.
  const calId = await getOrCreateMedMinderCalendar();

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const cal = calendars.find((c) => c.id === calId);
  const calName = cal?.title ?? CALENDAR_TITLE;

  if (__DEV__) console.log(`[calendar] connected: "${calName}" id=${calId}`);
  return { calendarId: calId, calendarName: calName };
}

/**
 * Finds the existing MedMinder calendar or creates one using the best available
 * source on this device. On Android, tries three strategies in order:
 *   1. Google/CalDAV account  → events sync automatically to Google Calendar
 *   2. Local account          → works on most stock Android; may fail on Samsung
 *   3. Any writable source    → Samsung/OEM fallback
 * Throws with a user-readable message if all strategies fail.
 */
async function getOrCreateMedMinderCalendar(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

  if (__DEV__) {
    console.log('[calendar] enumerating device calendars:');
    for (const c of calendars) {
      console.log(
        `  id=${c.id} title="${c.title}" source.name="${c.source?.name ?? '?'}"` +
          ` source.type="${c.source?.type ?? '?'}" allowsMod=${String(c.allowsModifications)}` +
          ` isPrimary=${String(c.isPrimary ?? false)}`,
      );
    }
  }

  // Re-use the calendar created on a previous connect (handles reconnect after disconnect).
  const existing = calendars.find((c) => c.title === CALENDAR_TITLE && c.allowsModifications);
  if (existing) {
    if (__DEV__) console.log(`[calendar] reusing existing id=${existing.id}`);
    return existing.id;
  }

  if (Platform.OS === 'ios') {
    const defaultCal = await Calendar.getDefaultCalendarAsync();
    const id = await Calendar.createCalendarAsync({
      title: CALENDAR_TITLE,
      entityType: Calendar.EntityTypes.EVENT,
      color: CALENDAR_COLOR,
      source: defaultCal.source,
      name: 'medminder',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    if (__DEV__) console.log(`[calendar] created iOS calendar id=${id}`);
    return id;
  }

  // ── Android: try strategies in order ────────────────────────────────────────

  // Strategy 1: Google / CalDAV source — events sync to Google Calendar automatically.
  // On Android, Google calendars report source.type = 'com.google'; check both.
  const googleCal = calendars.find(
    (c) =>
      c.allowsModifications &&
      (c.source?.type === Calendar.SourceType.CALDAV ||
        (c.source?.type as string) === 'com.google' ||
        (c.source?.name ?? '').includes('@')),
  );
  if (googleCal?.source) {
    try {
      const id = await Calendar.createCalendarAsync({
        title: CALENDAR_TITLE,
        entityType: Calendar.EntityTypes.EVENT,
        color: CALENDAR_COLOR,
        source: googleCal.source,
        name: 'medminder',
        ownerAccount: googleCal.source.name, // Google email address
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
      if (__DEV__)
        console.log(
          `[calendar] created Google-backed calendar id=${id} account="${googleCal.source.name}"`,
        );
      return id;
    } catch (e) {
      if (__DEV__) console.warn('[calendar] Google-source creation failed, trying local:', e);
    }
  }

  // Strategy 2: Local account — works on most stock Android; Samsung may reject.
  try {
    const id = await Calendar.createCalendarAsync({
      title: CALENDAR_TITLE,
      entityType: Calendar.EntityTypes.EVENT,
      color: CALENDAR_COLOR,
      source: { isLocalAccount: true, name: 'MedMinder', type: Calendar.SourceType.LOCAL },
      name: 'medminder',
      ownerAccount: 'local',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    if (__DEV__) console.log(`[calendar] created local calendar id=${id}`);
    return id;
  } catch (e) {
    if (__DEV__) console.warn('[calendar] local source creation failed, trying OEM fallback:', e);
  }

  // Strategy 3: Any writable calendar's source — Samsung / OEM fallback.
  const anyWritable = calendars.find((c) => c.allowsModifications);
  if (anyWritable?.source) {
    try {
      const id = await Calendar.createCalendarAsync({
        title: CALENDAR_TITLE,
        entityType: Calendar.EntityTypes.EVENT,
        color: CALENDAR_COLOR,
        source: anyWritable.source,
        name: 'medminder',
        ownerAccount: anyWritable.source.name,
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });
      if (__DEV__)
        console.log(
          `[calendar] created calendar via OEM fallback id=${id} account="${anyWritable.source.name}"`,
        );
      return id;
    } catch (e) {
      console.error('[calendar] all creation strategies failed:', e);
      throw new Error(
        `Could not create a MedMinder calendar on this device. ` +
          `Check that your Calendar app has at least one account configured, then try again. (${String(e)})`,
      );
    }
  }

  throw new Error(
    'No writable calendar found on this device. ' +
      'Please add a Google or local calendar account and try again.',
  );
}

// relativeOffset is in minutes; −5 fires 5 min before dose time, 0 fires at dose time.
// Samsung/OEM local calendars honour these as OS-level alarms without needing calendar sync.
const EVENT_ALARMS = [{ relativeOffset: -5 }, { relativeOffset: 0 }];

function buildEventDetails(params: DoseEventParams, calendarId: string) {
  const start = parseISO(params.scheduledAt);
  const end = addMinutes(start, EVENT_DURATION_MIN);
  return {
    calendarId,
    title: `Take ${params.medicineName} — ${params.dosage}`,
    startDate: start,
    endDate: end,
    notes: params.instructions ?? undefined,
    alarms: EVENT_ALARMS,
  };
}

/**
 * Creates a calendar event for a dose. Pass the persisted calendarId from
 * settings to avoid re-querying the calendar list on every call. Falls back
 * to getOrCreateMedMinderCalendar if calendarId is omitted.
 */

export async function createDoseCalendarEvent(
  params: DoseEventParams,
  calendarId?: string,
): Promise<string | null> {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  if (status !== 'granted') return null;

  try {
    const calId = calendarId ?? (await getOrCreateMedMinderCalendar());
    const details = buildEventDetails(params, calId);
    const eventId = await Calendar.createEventAsync(calId, details);
    if (__DEV__) {
      console.log(
        `[calendar] event created id=${eventId} alarms=${JSON.stringify(details.alarms)}`,
      );
    }
    return eventId;
  } catch (err) {
    console.error('[calendar] createDoseCalendarEvent failed:', err);
    return null;
  }
}

export async function updateDoseCalendarEvent(
  eventId: string,
  params: DoseEventParams,
): Promise<void> {
  try {
    const start = parseISO(params.scheduledAt);
    await Calendar.updateEventAsync(eventId, {
      title: `Take ${params.medicineName} — ${params.dosage}`,
      startDate: start,
      endDate: addMinutes(start, EVENT_DURATION_MIN),
      notes: params.instructions ?? undefined,
      alarms: EVENT_ALARMS,
    });
  } catch {
    // event may have been deleted by the user
  }
}

export async function deleteDoseCalendarEvent(eventId: string): Promise<void> {
  try {
    await Calendar.deleteEventAsync(eventId);
  } catch {
    // event may already be gone
  }
}
