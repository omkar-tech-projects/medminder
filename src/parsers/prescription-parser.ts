import type { AnalysisResponse, MedicineExtraction } from '@/schemas/analysis-schema';
import DRUG_DICT_RAW from '../../assets/drug-dictionary.json';

interface DrugEntry {
  name: string;
  aliases: string[];
}
const DRUG_DICT = DRUG_DICT_RAW as DrugEntry[];

// ---------------------------------------------------------------------------
// Fuzzy string matching — Dice coefficient on character bigrams.
// ---------------------------------------------------------------------------
function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bg = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const k = a.slice(i, i + 2);
    bg.set(k, (bg.get(k) ?? 0) + 1);
  }
  let hits = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const k = b.slice(i, i + 2);
    const n = bg.get(k) ?? 0;
    if (n > 0) {
      bg.set(k, n - 1);
      hits++;
    }
  }
  return (2 * hits) / (a.length + b.length - 2);
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const MATCH_THRESHOLD = 0.5;

function matchDrug(token: string): { name: string; score: number } | null {
  const n = normalize(token);
  if (n.length < 3) return null;
  let best = 0;
  let bestName = '';
  for (const entry of DRUG_DICT) {
    for (const candidate of [entry.name, ...entry.aliases]) {
      const score = dice(n, normalize(candidate));
      if (score > best) {
        best = score;
        bestName = entry.name;
      }
    }
  }
  return best >= MATCH_THRESHOLD ? { name: bestName, score: best } : null;
}

// ---------------------------------------------------------------------------
// Field extractors
// ---------------------------------------------------------------------------
interface FreqResult {
  frequencyPerDay: number;
  specificTimes: string[];
}

const DASH_RE = /\b([01])-([01])-([01])\b/;
const FREQ_TABLE: { re: RegExp; result: FreqResult }[] = [
  {
    re: /\bqid\b|four\s+times/i,
    result: { frequencyPerDay: 4, specificTimes: ['08:00', '12:00', '16:00', '20:00'] },
  },
  {
    re: /\btds\b|\bthrice\b|three\s+times/i,
    result: { frequencyPerDay: 3, specificTimes: ['08:00', '14:00', '20:00'] },
  },
  {
    re: /\bbd\b|\btwice\b|two\s+times|\bb\.i\.d/i,
    result: { frequencyPerDay: 2, specificTimes: ['08:00', '20:00'] },
  },
  {
    re: /\bod\b|\bonce\b|\bdaily\b|\bo\.d/i,
    result: { frequencyPerDay: 1, specificTimes: ['08:00'] },
  },
];

function parseFrequency(text: string): (FreqResult & { confidence: number }) | null {
  const dash = DASH_RE.exec(text);
  if (dash) {
    const slots = [dash[1], dash[2], dash[3]];
    const allTimes = ['08:00', '14:00', '20:00'];
    const active = allTimes.filter((_, i) => slots[i] === '1');
    if (active.length > 0)
      return { frequencyPerDay: active.length, specificTimes: active, confidence: 1.0 };
  }
  const every = /every\s+(\d+)\s*h(?:ours?)?/i.exec(text);
  if (every) {
    const n = parseInt(every[1]!, 10);
    const freq = Math.max(1, Math.round(24 / n));
    const times: string[] = [];
    for (let i = 0; i < freq; i++) {
      const h = Math.round(8 + (16 * i) / Math.max(freq - 1, 1)) % 24;
      times.push(`${String(h).padStart(2, '0')}:00`);
    }
    return { frequencyPerDay: freq, specificTimes: times, confidence: 0.85 };
  }
  for (const { re, result } of FREQ_TABLE) {
    if (re.test(text)) return { ...result, confidence: 1.0 };
  }
  return null;
}

function parseStrength(text: string): string | null {
  const m = /([\d.]+)\s*(mg|ml|mcg|g\b|IU|%)/i.exec(text);
  if (!m) return null;
  return `${m[1] ?? ''}${(m[2] ?? '').toLowerCase()}`;
}

function parseForm(text: string): string | null {
  const m =
    /\b(tab(?:let)?s?|cap(?:sule)?s?|syrup|drops?|gel|cream|inj(?:ection)?|ointment|susp(?:ension)?|liquid)\b/i.exec(
      text,
    );
  if (!m) return null;
  const raw = (m[1] ?? '').toLowerCase();
  if (raw.startsWith('tab')) return 'tablet';
  if (raw.startsWith('cap')) return 'capsule';
  if (raw.startsWith('inj')) return 'injection';
  if (raw.startsWith('susp')) return 'suspension';
  return raw.replace(/s$/, '');
}

function parseTiming(text: string): MedicineExtraction['timing'] | null {
  if (/\ba\/c\b|before\s+food|before\s+meal|empty\s+stomach/i.test(text)) return 'before_food';
  if (/\bp\/c\b|after\s+food|after\s+meal|after\s+eating/i.test(text)) return 'after_food';
  if (/with\s+food|with\s+meal/i.test(text)) return 'with_food';
  return null;
}

function parseDuration(text: string): number | null {
  // "x 30 days" / "× 30 days" / "for 30 days" / "30 days"
  const day = /(?:x|×|for)?\s*(\d+)\s*day/i.exec(text);
  if (day) return parseInt(day[1]!, 10);
  const week = /(?:x|×|for)?\s*(\d+)\s*week/i.exec(text);
  if (week) return parseInt(week[1]!, 10) * 7;
  const month = /(?:x|×|for)?\s*(\d+)\s*month/i.exec(text);
  if (month) return parseInt(month[1]!, 10) * 30;
  return null;
}

// ---------------------------------------------------------------------------
// Main parser — segments OCR text into per-medicine blocks by drug-name hits.
// ---------------------------------------------------------------------------
interface MedAccum {
  name: string;
  nameScore: number;
  strength: string | null;
  form: string | null;
  dosageAmount: string | null;
  frequencyPerDay: number | null;
  specificTimes: string[] | null;
  timing: MedicineExtraction['timing'] | null;
  durationDays: number | null;
  fieldScores: number[];
}

function accum(name: string, score: number): MedAccum {
  return {
    name,
    nameScore: score,
    strength: null,
    form: null,
    dosageAmount: null,
    frequencyPerDay: null,
    specificTimes: null,
    timing: null,
    durationDays: null,
    fieldScores: [score],
  };
}

function finalise(a: MedAccum): MedicineExtraction {
  const avg = a.fieldScores.reduce((s, v) => s + v, 0) / a.fieldScores.length;
  return {
    name: a.name,
    strength: a.strength,
    form: a.form,
    dosageAmount: a.dosageAmount ?? a.strength,
    frequencyPerDay: a.frequencyPerDay,
    specificTimes: a.specificTimes,
    timing: a.timing,
    durationDays: a.durationDays,
    instructions: null,
    confidence: Math.round(avg * 100) / 100,
  };
}

// Indian OPD numbered advice pattern: "1. DrugName ..." or "1) DrugName ..."
const NUMBERED_LINE_RE = /^\d+[\.\)]\s+/;

export function parsePrescription(ocrText: string): AnalysisResponse {
  if (__DEV__) {
    console.warn('[PrescriptionParser] OCR input:\n', ocrText);
  }

  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => {
      // Strip leading list numbers from Indian OPD advice format
      const stripped = l.trim().replace(NUMBERED_LINE_RE, '');
      return stripped;
    })
    .filter(Boolean);

  if (__DEV__) {
    console.warn('[PrescriptionParser] Processed lines:', lines);
  }

  const medicines: MedicineExtraction[] = [];
  let current: MedAccum | null = null;

  for (const line of lines) {
    // Check every word token for a drug-name match.
    let foundMatch: ReturnType<typeof matchDrug> = null;
    for (const token of line.split(/[\s,./]+/)) {
      const hit = matchDrug(token);
      if (__DEV__ && hit) {
        console.warn(
          `[PrescriptionParser] Drug match: "${token}" → "${hit.name}" (score=${hit.score.toFixed(2)})`,
        );
      }
      if (hit) {
        foundMatch = hit;
        break;
      }
    }
    if (foundMatch) {
      if (current) medicines.push(finalise(current));
      current = accum(foundMatch.name, foundMatch.score);
    }
    if (!current) continue;

    const str = parseStrength(line);
    if (str && !current.strength) {
      current.strength = str;
      current.fieldScores.push(1.0);
    }

    const form = parseForm(line);
    if (form && !current.form) {
      current.form = form;
      current.fieldScores.push(1.0);
    }

    const freq = parseFrequency(line);
    if (freq && !current.frequencyPerDay) {
      current.frequencyPerDay = freq.frequencyPerDay;
      current.specificTimes = freq.specificTimes;
      current.fieldScores.push(freq.confidence);
    }

    const timing = parseTiming(line);
    if (timing && !current.timing) {
      current.timing = timing;
      current.fieldScores.push(1.0);
    }

    const dur = parseDuration(line);
    if (dur && !current.durationDays) {
      current.durationDays = dur;
      current.fieldScores.push(1.0);
    }
  }

  if (current) medicines.push(finalise(current));

  if (medicines.length === 0) {
    if (__DEV__) console.warn('[PrescriptionParser] No medicines detected.');
    return { medicines: [], overallConfidence: 0, needsReview: true };
  }

  const overallConfidence =
    Math.round((medicines.reduce((s, m) => s + m.confidence, 0) / medicines.length) * 100) / 100;
  // needsReview when confidence is uncertain OR a medicine is missing fields required to schedule it.
  const needsReview =
    overallConfidence < 0.8 ||
    medicines.some((m) => m.confidence < 0.8 || !m.name || m.frequencyPerDay === null);

  if (__DEV__) {
    console.warn(
      '[PrescriptionParser] Result:',
      JSON.stringify({ medicines, overallConfidence, needsReview }, null, 2),
    );
  }

  return { medicines, overallConfidence, needsReview };
}
