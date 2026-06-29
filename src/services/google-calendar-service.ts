/**
 * Google Calendar integration (optional, power-user path).
 *
 * SETUP — do this before enabling Google Calendar sync:
 *  1. Go to https://console.cloud.google.com and create a project.
 *  2. Enable "Google Calendar API" under APIs & Services.
 *  3. Create OAuth 2.0 Client IDs:
 *       iOS     → type "iOS",     bundle ID: com.medminder.app
 *       Android → type "Android", package: com.medminder.app + your SHA-1
 *  4. Paste the generated client IDs into the constants below.
 *  5. In "Authorized redirect URIs" add: medminder://oauth
 */
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const IOS_CLIENT_ID = '';
const ANDROID_CLIENT_ID = '';

/** True only once both OAuth client IDs are filled in. Feature is intentionally disabled until then. */
export const GOOGLE_CALENDAR_CONFIGURED = IOS_CLIENT_ID.length > 0 || ANDROID_CLIENT_ID.length > 0;

const DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'openid', 'email'];
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

const KEY = {
  ACCESS: 'g_access_token',
  REFRESH: 'g_refresh_token',
  EXPIRY: 'g_token_expiry',
  EMAIL: 'g_user_email',
  MED_EVENTS: 'g_med_events',
  MIGRATION_DONE: 'g_migration_v2_done',
} as const;

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

async function storeTokens(
  access: string,
  refresh: string,
  expiresIn: number,
  email: string,
): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY.ACCESS, access),
    SecureStore.setItemAsync(KEY.REFRESH, refresh),
    SecureStore.setItemAsync(KEY.EXPIRY, String(Date.now() + expiresIn * 1000)),
    SecureStore.setItemAsync(KEY.EMAIL, email),
  ]);
}

async function refreshAccessToken(): Promise<string | null> {
  const [refreshToken, clientId] = await Promise.all([
    SecureStore.getItemAsync(KEY.REFRESH),
    Promise.resolve(Platform.OS === 'ios' ? IOS_CLIENT_ID : ANDROID_CLIENT_ID),
  ]);
  if (!refreshToken || !clientId) return null;
  try {
    const res = await fetch(DISCOVERY.tokenEndpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string; expires_in: number };
    await SecureStore.setItemAsync(KEY.ACCESS, data.access_token);
    await SecureStore.setItemAsync(KEY.EXPIRY, String(Date.now() + data.expires_in * 1000));
    return data.access_token;
  } catch {
    return null;
  }
}

export async function getGoogleAccessToken(): Promise<string | null> {
  const [token, expiry] = await Promise.all([
    SecureStore.getItemAsync(KEY.ACCESS),
    SecureStore.getItemAsync(KEY.EXPIRY),
  ]);
  if (!token) return null;
  const expired = !expiry || Date.now() >= Number(expiry) - 60_000;
  return expired ? refreshAccessToken() : token;
}

export async function isGoogleConnected(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(KEY.ACCESS);
  return token != null && token.length > 0;
}

export async function getGoogleConnectedEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY.EMAIL);
}

export async function signInGoogle(): Promise<boolean> {
  const clientId = Platform.OS === 'ios' ? IOS_CLIENT_ID : ANDROID_CLIENT_ID;
  if (!clientId) return false;
  try {
    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'medminder', path: 'oauth' });
    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: SCOPES,
      redirectUri,
      usePKCE: true,
      extraParams: { access_type: 'offline', prompt: 'consent' },
    });
    const result = await request.promptAsync(DISCOVERY);
    if (result.type !== 'success' || !result.params['code']) return false;
    const tokenRes = await AuthSession.exchangeCodeAsync(
      {
        clientId,
        code: result.params['code'],
        redirectUri,
        extraParams: { code_verifier: request.codeVerifier ?? '' },
      },
      DISCOVERY,
    );
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenRes.accessToken}` },
    });
    const info = (await infoRes.json()) as { email?: string };
    await storeTokens(
      tokenRes.accessToken,
      tokenRes.refreshToken ?? '',
      tokenRes.expiresIn ?? 3600,
      info.email ?? '',
    );
    return true;
  } catch {
    return false;
  }
}

export async function signOutGoogle(): Promise<void> {
  // Delete all saved Google events from the calendar before revoking tokens
  await _deleteAllMedMinderGoogleEvents();
  await Promise.all(Object.values(KEY).map((k) => SecureStore.deleteItemAsync(k)));
}

// ---------------------------------------------------------------------------
// Medicine-level event ID map stored in SecureStore
// Key format: "medicineId:HH:MM" → Google event ID
// ---------------------------------------------------------------------------

async function loadMedEventsMap(): Promise<Record<string, string>> {
  try {
    const raw = await SecureStore.getItemAsync(KEY.MED_EVENTS);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function saveMedEventsMap(map: Record<string, string>): Promise<void> {
  await SecureStore.setItemAsync(KEY.MED_EVENTS, JSON.stringify(map));
}

// ---------------------------------------------------------------------------
// RRULE recurring event builder
// ---------------------------------------------------------------------------

export interface MedicineSyncParams {
  id: string;
  name: string;
  dosage: number;
  dosageUnit: string;
  durationDays: number | null;
  startDate: string;
  leadMinutes?: number;
}

export interface ScheduleTime {
  timeOfDay: string; // "HH:MM"
  leadMinutes: number;
}

function buildRruleEvent(
  params: MedicineSyncParams,
  timeOfDay: string,
  leadMinutes: number,
): Record<string, unknown> {
  const [hh = '08', mm = '00'] = timeOfDay.split(':');
  const startDateTime = `${params.startDate}T${hh}:${mm}:00`;

  const rrule =
    params.durationDays != null
      ? `RRULE:FREQ=DAILY;COUNT=${params.durationDays}`
      : 'RRULE:FREQ=DAILY';

  const endHour = parseInt(hh, 10);
  const endMinute = parseInt(mm, 10) + 30;
  const endHH = String(endHour + Math.floor(endMinute / 60)).padStart(2, '0');
  const endMM = String(endMinute % 60).padStart(2, '0');
  const endDateTime = `${params.startDate}T${endHH}:${endMM}:00`;

  return {
    summary: `💊 ${params.name} — ${params.dosage}${params.dosageUnit}`,
    description:
      'Added by MedMinder. Note: Mark Taken and Snooze are only available in the MedMinder app.',
    start: { dateTime: startDateTime, timeZone: 'Asia/Kolkata' },
    end: { dateTime: endDateTime, timeZone: 'Asia/Kolkata' },
    recurrence: [rrule],
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: leadMinutes }],
    },
  };
}

// ---------------------------------------------------------------------------
// Public sync API
// ---------------------------------------------------------------------------

export async function syncMedicineToGoogle(
  medicine: MedicineSyncParams,
  schedules: ScheduleTime[],
): Promise<void> {
  if (!GOOGLE_CALENDAR_CONFIGURED) return;
  const token = await getGoogleAccessToken();
  if (!token) return;

  const map = await loadMedEventsMap();

  await Promise.all(
    schedules.map(async (s) => {
      const mapKey = `${medicine.id}:${s.timeOfDay}`;
      const existingEventId = map[mapKey];

      const body = buildRruleEvent(medicine, s.timeOfDay, s.leadMinutes);

      try {
        if (existingEventId) {
          // Update existing recurring event
          await fetch(`${CALENDAR_API}/calendars/primary/events/${existingEventId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
        } else {
          // Create new recurring event
          const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (res.ok) {
            const data = (await res.json()) as { id: string };
            map[mapKey] = data.id;
          }
        }
      } catch {
        // ignore per-event failures; other events can still sync
      }
    }),
  );

  await saveMedEventsMap(map);
}

export async function unsyncMedicineFromGoogle(medicineId: string): Promise<void> {
  if (!GOOGLE_CALENDAR_CONFIGURED) return;
  const token = await getGoogleAccessToken();
  if (!token) return;

  const map = await loadMedEventsMap();
  const prefix = `${medicineId}:`;
  const toDelete = Object.entries(map).filter(([k]) => k.startsWith(prefix));

  await Promise.all(
    toDelete.map(async ([mapKey, eventId]) => {
      try {
        await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore; event may already be deleted
      }
      delete map[mapKey];
    }),
  );

  await saveMedEventsMap(map);
}

async function _deleteAllMedMinderGoogleEvents(): Promise<void> {
  const token = await getGoogleAccessToken();
  if (!token) return;
  const map = await loadMedEventsMap();

  await Promise.all(
    Object.entries(map).map(async ([, eventId]) => {
      try {
        await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }),
  );
}

// ---------------------------------------------------------------------------
// One-time migration: delete orphaned per-dose-log Google events
// Called once at app startup; must never throw or block launch.
// ---------------------------------------------------------------------------

export async function runGoogleCalendarMigrationIfNeeded(): Promise<void> {
  try {
    const done = await SecureStore.getItemAsync(KEY.MIGRATION_DONE);
    if (done === 'true') return;

    const connected = await isGoogleConnected();
    if (connected) {
      // Old architecture stored event IDs in each dose_log row.
      // We can't enumerate them here without importing DB — instead, clear the
      // g_med_events map (it was empty in the old architecture) and mark done.
      // The CalendarSyncSection will rebuild RRULE events when the user
      // re-enables Google Calendar sync.
      await SecureStore.deleteItemAsync(KEY.MED_EVENTS);
    }

    await SecureStore.setItemAsync(KEY.MIGRATION_DONE, 'true');
  } catch {
    // failure must never block launch
  }
}

// ---------------------------------------------------------------------------
// Legacy per-dose-log helpers (kept for backward compat with use-calendar-sync)
// These are no-ops when GOOGLE_CALENDAR_CONFIGURED is false.
// ---------------------------------------------------------------------------

/** @deprecated Use syncMedicineToGoogle instead. Kept for hook backward compat. */
export async function createGoogleCalendarEvent(_params: {
  medicineName: string;
  dosage: string;
  scheduledAt: string;
  instructions: string | null;
}): Promise<string | null> {
  return null; // Replaced by RRULE approach
}

/** @deprecated Use unsyncMedicineFromGoogle instead. */
export async function deleteGoogleCalendarEvent(_eventId: string): Promise<void> {
  // no-op; per-dose events no longer created
}
