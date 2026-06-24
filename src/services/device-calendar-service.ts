import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { addMinutes, parseISO } from 'date-fns';

const CALENDAR_TITLE = 'MedMinder';
const CALENDAR_COLOR = '#6366F1';
const EVENT_DURATION_MIN = 15;

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

async function getOrCreateMedMinderCalendar(): Promise<string | null> {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const existing = calendars.find((c) => c.title === CALENDAR_TITLE);
    if (existing) return existing.id;

    let source: Calendar.Source;
    if (Platform.OS === 'ios') {
      const defaultCal = await Calendar.getDefaultCalendarAsync();
      source = defaultCal.source;
    } else {
      const writable = calendars.find((c) => c.allowsModifications);
      if (!writable) return null;
      source = writable.source;
    }

    return await Calendar.createCalendarAsync({
      title: CALENDAR_TITLE,
      entityType: Calendar.EntityTypes.EVENT,
      color: CALENDAR_COLOR,
      source,
      name: 'medminder',
      ownerAccount: Platform.OS === 'android' ? 'local' : undefined,
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  } catch {
    return null;
  }
}

function buildEventDetails(params: DoseEventParams, calendarId: string) {
  const start = parseISO(params.scheduledAt);
  const end = addMinutes(start, EVENT_DURATION_MIN);
  return {
    calendarId,
    title: `${params.medicineName} — ${params.dosage}`,
    startDate: start,
    endDate: end,
    notes: params.instructions ?? undefined,
    alarms: [] as never[],
  };
}

export async function createDoseCalendarEvent(params: DoseEventParams): Promise<string | null> {
  const { status } = await Calendar.getCalendarPermissionsAsync();
  if (status !== 'granted') return null;

  const calId = await getOrCreateMedMinderCalendar();
  if (!calId) return null;

  try {
    return await Calendar.createEventAsync(calId, buildEventDetails(params, calId));
  } catch {
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
      title: `${params.medicineName} — ${params.dosage}`,
      startDate: start,
      endDate: addMinutes(start, EVENT_DURATION_MIN),
      notes: params.instructions ?? undefined,
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
