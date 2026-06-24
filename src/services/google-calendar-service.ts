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
import { addMinutes, parseISO } from 'date-fns';
import type { DoseEventParams } from './device-calendar-service';

const IOS_CLIENT_ID = '';
const ANDROID_CLIENT_ID = '';

const DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const SCOPES = ['https://www.googleapis.com/auth/calendar', 'openid', 'email'];
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

const KEY = {
  ACCESS: 'g_access_token',
  REFRESH: 'g_refresh_token',
  EXPIRY: 'g_token_expiry',
  EMAIL: 'g_user_email',
} as const;

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
  await Promise.all(Object.values(KEY).map((k) => SecureStore.deleteItemAsync(k)));
}

function buildGoogleEvent(params: DoseEventParams): Record<string, unknown> {
  const start = parseISO(params.scheduledAt);
  const end = addMinutes(start, 15);
  return {
    summary: `${params.medicineName} — ${params.dosage}`,
    description: params.instructions ?? '',
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    reminders: { useDefault: false, overrides: [] },
  };
}

export async function createGoogleCalendarEvent(params: DoseEventParams): Promise<string | null> {
  const token = await getGoogleAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGoogleEvent(params)),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id: string };
    return data.id;
  } catch {
    return null;
  }
}

export async function updateGoogleCalendarEvent(
  eventId: string,
  params: DoseEventParams,
): Promise<void> {
  const token = await getGoogleAccessToken();
  if (!token) return;
  try {
    await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGoogleEvent(params)),
    });
  } catch {
    // ignore
  }
}

export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
  const token = await getGoogleAccessToken();
  if (!token) return;
  try {
    await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // ignore
  }
}
