import type { AnalysisResponse, MedicineExtraction } from '@/schemas/analysis-schema';
import type { DayPattern } from '@/lib/schedule-generator';
import { lookupDrug } from './drug-db';

// ---------------------------------------------------------------------------
// Field extractors
// ---------------------------------------------------------------------------
interface FreqResult {
  frequencyPerDay: number;
  specificTimes: string[];
  dayPattern?: DayPattern;
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
  // Weekly once — one dose every 7 days (e.g. Vitamin D3, Methotrexate)
  {
    re: /\bow\b|weekly\s+once|once\s+(?:a\s+)?week(?:ly)?|per\s+week/i,
    result: {
      frequencyPerDay: 1,
      specificTimes: ['08:00'],
      dayPattern: { type: 'every_n_days', n: 7 },
    },
  },
  // Monthly once — one dose every 30 days (e.g. Alendronate, Ibandronate)
  {
    re: /\bom\b|monthly\s+once|once\s+(?:a\s+)?month(?:ly)?|per\s+month/i,
    result: {
      frequencyPerDay: 1,
      specificTimes: ['08:00'],
      dayPattern: { type: 'every_n_days', n: 30 },
    },
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
  // Match bare "500mg" or parenthesised "(1ML)" or "(500MG)"
  const m = /\(?\s*([\d.]+)\s*(mg|ml|mcg|g\b|IU|%)\s*\)?/i.exec(text);
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

// Strip Indian prescription form prefixes: "Tab.", "Cap.", "Syr.", "T.", "Inj.", "Lot."
const FORM_PREFIX_RE = /^(?:tab\.?|cap\.?|syr\.?|t\.|inj\.?|oint\.?|lot\.?)\s*/i;

// Indian OPD numbered advice pattern: "1. DrugName ..." or "1) DrugName ..."
const NUMBERED_LINE_RE = /^\d+[\.\)]\s+/;

// Lines that are certainly NOT medicines — skip before any drug lookup.
// Covers counselling notes, follow-up instructions, diagnosis, investigations.
const NON_MEDICINE_LINE_RE =
  /^(?:counsell|r\/a\b|follow[\s-]?up|review\s+after|photo\s*doc|to\s+do\s+inv|investig|diagnos|diag\b|avoid\b|do\s+not|diet\b|lifestyle|exercise|sun\s*(?:screen|protect)|hairwash|wash\s+hair|shampoo\s+with|apply\s+gently|massage|note\b|n\.b\b|important|instructions?|patient\s+counsell|photoprot)/i;

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
  dayPattern: DayPattern | null;
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
    dayPattern: null,
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
    dayPattern: a.dayPattern ? JSON.stringify(a.dayPattern) : null,
    timing: a.timing,
    durationDays: a.durationDays,
    instructions: a.instructions,
    confidence: Math.round(avg * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scanLineForDrug(line: string): ReturnType<typeof lookupDrug> {
  const tokens = line.split(/[\s,./]+/);
  for (const token of tokens) {
    const hit = lookupDrug(token);
    if (hit && !hit.isUnrecognised) {
      if (__DEV__) {
        console.warn(
          `[PrescriptionParser] Drug match: "${token}" → "${hit.genericName}" (score=${hit.score.toFixed(2)})`,
        );
      }
      return hit;
    }
  }
  // Try adjacent 2-token concatenations (handles "Vit D3" → "VitD3", "Vit B12" → "VitB12").
  // Require the first token to be 3+ chars to avoid short numeric prefixes producing false hits.
  for (let i = 0; i < tokens.length - 1; i++) {
    if ((tokens[i] ?? '').length < 3) continue;
    const joined = (tokens[i] ?? '') + (tokens[i + 1] ?? '');
    const hit = lookupDrug(joined);
    if (!hit || hit.isUnrecognised) continue;
    if (__DEV__) {
      console.warn(
        `[PrescriptionParser] Drug match (2-token): "${tokens[i]} ${tokens[i + 1]}" → "${hit.genericName}" (score=${hit.score.toFixed(2)})`,
      );
    }
    return hit;
  }
  return null;
}

function extractFields(line: string, current: MedAccum): void {
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
    if (freq.dayPattern) current.dayPattern = freq.dayPattern;
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

function normalizeMedName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(?:tablet|capsule|syrup|lotion|cream|gel|drops?|injection|solution|foam|ointment)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function startMedicine(hit: ReturnType<typeof lookupDrug>): MedAccum {
  if (!hit) throw new Error('hit is null');
  const med = accum(hit.genericName, hit.score);
  if (hit.forms.length > 0) med.form = hit.forms[0]!;
  return med;
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

  const rawAdviceLines = rawLines.slice(parseFrom);

  // Detect "anchored" mode: when ≥2 numbered items are present in the advice
  // section, only scan numbered lines for new drug names. Continuation lines
  // contribute field data (frequency, strength, etc.) but do NOT start new
  // medicines. This prevents counselling notes and follow-up lines from
  // being misidentified as additional medicines.
  const numberedCount = rawAdviceLines.filter((l) => NUMBERED_LINE_RE.test(l.trim())).length;
  const anchored = numberedCount >= 2;

  if (__DEV__) {
    console.warn(`[PrescriptionParser] anchored=${anchored} numberedCount=${numberedCount}`);
  }

  interface PreparedLine {
    text: string;
    isNumberedItem: boolean;
  }

  const preparedLines: PreparedLine[] = rawAdviceLines
    .map((l) => {
      const trimmed = l.trim();
      const isNumberedItem = NUMBERED_LINE_RE.test(trimmed);
      let s = trimmed;
      s = s.replace(NUMBERED_LINE_RE, '');
      s = s.replace(FORM_PREFIX_RE, '');
      return { text: s, isNumberedItem };
    })
    .filter((pl) => pl.text.length > 0);

  if (__DEV__) {
    console.warn('[PrescriptionParser] Prepared lines:', preparedLines);
  }

  const medicines: MedicineExtraction[] = [];
  let current: MedAccum | null = null;

  for (const { text: line, isNumberedItem } of preparedLines) {
    if (NON_MEDICINE_LINE_RE.test(line)) continue;

    const shouldScanForDrug = anchored ? isNumberedItem : true;

    if (shouldScanForDrug) {
      const hit = scanLineForDrug(line);
      if (hit) {
        if (current) medicines.push(finalise(current));
        current = startMedicine(hit);
      }
    }

    if (!current) continue;
    extractFields(line, current);
  }

  if (current) medicines.push(finalise(current));

  // Deduplicate by normalised name — keep the first (highest-confidence) occurrence.
  const seen = new Set<string>();
  const deduped = medicines.filter((m) => {
    const key = normalizeMedName(m.name ?? '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (__DEV__ && deduped.length !== medicines.length) {
    console.warn(
      `[PrescriptionParser] Deduped ${medicines.length} → ${deduped.length} medicines`,
    );
  }

  if (deduped.length === 0) {
    if (__DEV__) console.warn('[PrescriptionParser] No medicines detected.');
    return { medicines: [], overallConfidence: 0, needsReview: true };
  }

  const overallConfidence =
    Math.round((deduped.reduce((s, m) => s + m.confidence, 0) / deduped.length) * 100) / 100;

  const needsReview =
    overallConfidence < 0.8 ||
    deduped.some((m) => m.confidence < 0.8 || !m.name || m.frequencyPerDay === null);

  if (__DEV__) {
    console.warn(
      '[PrescriptionParser] Result:',
      JSON.stringify({ medicines: deduped, overallConfidence, needsReview }, null, 2),
    );
  }

  return { medicines: deduped, overallConfidence, needsReview };
}
