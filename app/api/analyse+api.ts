// Server-side only. The ANTHROPIC_API_KEY env var is never sent to the client.
import { analysisResponseSchema } from '../../src/schemas/analysis-schema';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const EXTRACTION_PROMPT = `You are a prescription-reading assistant. Extract every medicine listed in the provided prescription image(s).

Return ONLY valid JSON — no markdown fences, no prose — matching this exact schema:
{
  "medicines": [
    {
      "name": string or null,
      "strength": string or null,
      "form": string or null,
      "dosageAmount": string or null,
      "frequencyPerDay": positive integer or null,
      "specificTimes": ["HH:MM", ...] or null,
      "timing": "before_food" | "after_food" | "with_food" | "any" or null,
      "durationDays": positive integer or null,
      "instructions": string or null,
      "confidence": float 0.0–1.0
    }
  ],
  "overallConfidence": float 0.0–1.0,
  "needsReview": boolean
}

Rules:
- Never invent data. Return null for any field that is missing, illegible, or ambiguous.
- Per-medicine confidence reflects how clearly that medicine's details are readable.
- Set needsReview: true whenever overallConfidence < 0.8, or any medicine.confidence < 0.8, or any required field is null.
- If the image contains no prescription, return: { "medicines": [], "overallConfidence": 0, "needsReview": true }.`;

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface ImageBlock {
  type: 'image';
  source: { type: 'base64'; media_type: 'image/jpeg'; data: string };
}
interface TextBlock {
  type: 'text';
  text: string;
}
type ContentBlock = ImageBlock | TextBlock;

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResp({ error: 'Server not configured — ANTHROPIC_API_KEY is missing' }, 500);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResp({ error: 'Invalid JSON body' }, 400);
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !Array.isArray((body as Record<string, unknown>).images) ||
    (body as { images: unknown[] }).images.length === 0
  ) {
    return jsonResp({ error: '`images` must be a non-empty base64 string array' }, 400);
  }

  const rawImages = (body as { images: unknown[] }).images;
  if (rawImages.some((img) => typeof img !== 'string')) {
    return jsonResp({ error: 'Each item in `images` must be a base64 string' }, 400);
  }
  const images = rawImages as string[];

  const content: ContentBlock[] = [
    ...images.map<ImageBlock>((data) => ({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data },
    })),
    { type: 'text', text: EXTRACTION_PROMPT },
  ];

  let upstream: Response;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content }],
      }),
    });
  } catch (err) {
    return jsonResp({ error: `Anthropic API unreachable: ${String(err)}` }, 502);
  }

  let upstreamJson: unknown;
  try {
    upstreamJson = await upstream.json();
  } catch {
    return jsonResp({ error: 'Anthropic returned a non-JSON response' }, 502);
  }

  if (!upstream.ok) {
    const detail =
      typeof upstreamJson === 'object' && upstreamJson !== null && 'error' in upstreamJson
        ? JSON.stringify((upstreamJson as Record<string, unknown>).error)
        : `status ${upstream.status}`;
    return jsonResp({ error: `Anthropic error: ${detail}` }, 502);
  }

  const textBlock = (upstreamJson as { content?: { type: string; text?: string }[] }).content?.find(
    (b) => b.type === 'text',
  );
  if (!textBlock?.text) {
    return jsonResp({ error: 'No text content in Anthropic response' }, 502);
  }

  // Strip markdown code fences if the model wrapped the JSON
  let rawText = textBlock.text.trim();
  if (rawText.startsWith('```')) {
    rawText = rawText
      .replace(/^```[a-z]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return jsonResp({ error: 'Model returned non-parseable JSON' }, 502);
  }

  const validated = analysisResponseSchema.safeParse(parsed);
  if (!validated.success) {
    return jsonResp(
      { error: 'Model output did not match expected schema', issues: validated.error.issues },
      502,
    );
  }

  return jsonResp(validated.data);
}
