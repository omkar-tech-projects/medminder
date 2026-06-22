import * as SecureStore from 'expo-secure-store';
import { ANTHROPIC_API_KEY_STORE_KEY, CLAUDE_MODEL } from '@/lib/constants';
import { aiResponseSchema, type AiResponse } from '@/types/medication';

const EXTRACTION_PROMPT = `You are a medical prescription parser. Extract every medication listed in the image.
Return ONLY a valid JSON object matching this schema — no prose, no markdown fences:

{
  "medications": [
    {
      "name": string,
      "dosage": number,
      "dosage_unit": string,
      "frequency": string,
      "times_per_day": number,
      "duration_days": number | null,
      "special_instructions": string | null
    }
  ]
}

If the image does not contain a readable prescription, return: { "medications": [] }`;

export async function extractMedicationsFromImage(base64Image: string): Promise<AiResponse> {
  const apiKey = await SecureStore.getItemAsync(ANTHROPIC_API_KEY_STORE_KEY);
  if (!apiKey) {
    throw new Error('Claude API key not configured. Please add it in Settings.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
            },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as { content: Array<{ type: string; text: string }> };
  const text = data.content.find((c) => c.type === 'text')?.text ?? '{"medications":[]}';

  const parsed: unknown = JSON.parse(text);
  return aiResponseSchema.parse(parsed);
}
