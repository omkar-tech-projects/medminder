import type { AnalysisResponse, MedicineExtraction } from '@/schemas/analysis-schema';
import { lookupDrug } from './drug-db';

// ---------------------------------------------------------------------------
// Field extractors
// ---------------------------------------------------------------------------
interface FreqResult {
  frequencyPerDay: number;
  specificTimes: string[];
}

// N-N-N Indian dose pattern e.g. "0-0-1", "1-1-1", "1-0-1"
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
    /\b(tab(?:let)?s?|cap(?:sule)?s?|syrup|drops?|gel|cream|inj(?:ection)?|ointment|susp(?:ension)?|liquid|solution|lotion|foam)\b/i.exec(
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

interface TimingResult {
  timing: MedicineExtraction['timing'] | null;
  instructions: string | null;
}

function parseTiming(text: string): TimingResult {
  if (/\ba\/c\b|before\s+food|before\s+meal|empty\s+stomach/i.test(text))
    return { timing: 'before_food', instructions: null };
  if (/\bp\/c\b|after\s+food|after\s+meal|after\s+eating/i.test(text))
    return { timing: 'after_food', instructions: null };
  if (/with\s+food|with\s+meal/i.test(text)) return { timing: 'with_food', instructions: null };
  if (/\bh\/s\b|bedtime|hs\b|at\s+night|h\.s\b/i.test(text))
    return { timing: null, instructions: 'Take at bedtime' };
  return { timing: null, instructions: null };
}

function parseDuration(text: string): number | null {
  const day = /(?:x|×|for)?\s*(\d+)\s*(?:\/7\b|day)/i.exec(text);
  if (day) return parseInt(day[1]!, 10);
  const week = /(?:x|×|for)?\s*(\d+)\s*week/i.exec(text);
  if (week) return parseInt(week[1]!, 10) * 7;
  const month = /(?:x|×|for)?\s*(\d+)\s*month/i.exec(text);
  if (month) return parseInt(month[1]!, 10) * 30;
  return null;
}

// ---------------------------------------------------------------------------
// Pre-processing helpers
// ---------------------------------------------------------------------------

// Rx / Advice section header patterns
const RX_SECTION_RE = /^(?:advice|rx\b|prescription|medications?|drugs?|treatment)[\s:]/i;

// Strip Indian prescription form prefixes: "Tab.", "Cap.", "Syr.", "T.", "Inj."
const FORM_PREFIX_RE = /^(?:tab\.?|cap\.?|syr\.?|t\.|inj\.?|oint\.?)\s*/i;

// Indian OPD numbered advice pattern: "1. DrugName ..." or "1) DrugName ..."
const NUMBERED_LINE_RE = /^\d+[\.\)]\s+/;

// ---------------------------------------------------------------------------
// Accumulator
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
  instructions: string | null;
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
    instructions: null,
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
    instructions: a.instructions,
    confidence: Math.round(avg * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------
export function parsePrescription(ocrText: string): AnalysisResponse {
  if (__DEV__) {
    console.warn('[PrescriptionParser] OCR input:\n', ocrText);
  }

  const rawLines = ocrText.split(/\r?\n/);

  // Find the Rx / Advice section — only parse lines within it.
  // If no section header is found, parse the whole text.
  let parseFrom = 0;
  for (let i = 0; i < rawLines.length; i++) {
    if (RX_SECTION_RE.test(rawLines[i]!.trim())) {
      parseFrom = i + 1;
      if (__DEV__) {
        console.warn(`[PrescriptionParser] Rx section starts at line ${i}: "${rawLines[i]}"`);
      }
      break;
    }
  }

  const lines = rawLines
    .slice(parseFrom)
    .map((l) => {
      let s = l.trim();
      s = s.replace(NUMBERED_LINE_RE, ''); // strip "1. " / "1) "
      s = s.replace(FORM_PREFIX_RE, ''); // strip "Tab." / "Cap." etc.
      return s;
    })
    .filter(Boolean);

  if (__DEV__) {
    console.warn('[PrescriptionParser] Processed lines:', lines);
  }

  const medicines: MedicineExtraction[] = [];
  let current: MedAccum | null = null;

  for (const line of lines) {
    // Try each whitespace/punctuation-delimited token for a drug-name hit
    let foundMatch: ReturnType<typeof lookupDrug> = null;
    const tokens = line.split(/[\s,./]+/);

    for (const token of tokens) {
      const hit = lookupDrug(token);
      if (!hit) continue;

      if (!hit.isUnrecognised) {
        if (__DEV__) {
          console.warn(
            `[PrescriptionParser] Drug match: "${token}" → "${hit.genericName}" (score=${hit.score.toFixed(2)})`,
          );
        }
        foundMatch = hit;
        break;
      }
    }

    if (foundMatch) {
      if (current) medicines.push(finalise(current));
      const med = accum(foundMatch.genericName, foundMatch.score);
      // Seed form from drug-db when not yet parsed from OCR
      if (foundMatch.forms.length > 0) {
        med.form = foundMatch.forms[0]!;
      }
      current = med;
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

    const { timing, instructions } = parseTiming(line);
    if (timing && !current.timing) {
      current.timing = timing;
      current.fieldScores.push(1.0);
    }
    if (instructions && !current.instructions) {
      current.instructions = instructions;
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
