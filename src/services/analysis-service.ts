import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { analysisResponseSchema, type AnalysisResponse } from '@/schemas/analysis-schema';

const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1_500;

function getBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  // Auto-detect the Expo dev server address (includes port, e.g. "192.168.1.5:8081")
  const hostUri = (Constants.expoConfig?.hostUri as string | undefined) ?? 'localhost:8081';
  return `http://${hostUri}`;
}

async function toBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyseImages(uris: string[]): Promise<AnalysisResponse> {
  const images = await Promise.all(uris.map(toBase64));
  const url = `${getBaseUrl()}/api/analyse`;

  let lastError: Error = new Error('Analysis failed');

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images }),
        },
        TIMEOUT_MS,
      );

      const json: unknown = await response.json();

      if (!response.ok) {
        const msg =
          typeof json === 'object' && json !== null && 'error' in json
            ? String((json as Record<string, unknown>).error)
            : `Server error ${response.status}`;
        throw new Error(msg);
      }

      const validated = analysisResponseSchema.safeParse(json);
      if (!validated.success) {
        throw new Error('Unexpected response format from server');
      }

      return validated.data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_BASE_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError;
}
