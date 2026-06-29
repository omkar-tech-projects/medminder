interface DrugEntry {
  brandName: string;
  genericName: string;
  aliases: string[];
  commonStrengths: string[];
  forms: string[];
}

export interface DrugMatch {
  genericName: string;
  brandName: string;
  forms: string[];
  commonStrengths: string[];
  score: number;
  isUnrecognised: boolean;
}

function bigrams(s: string): Map<string, number> {
  const bg = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const k = s.slice(i, i + 2);
    bg.set(k, (bg.get(k) ?? 0) + 1);
  }
  return bg;
}

function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bg = bigrams(a);
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

interface IndexEntry {
  entry: DrugEntry;
  normalizedKey: string;
}

let _index: IndexEntry[] | null = null;

function getIndex(): IndexEntry[] {
  if (_index) return _index;

  // Lazy-load: require at call time, not at module parse time.

  const raw = require('../../assets/drug-database.json') as DrugEntry[];

  const seen = new Set<string>();
  const deduped: DrugEntry[] = [];
  for (const entry of raw) {
    const key = normalize(entry.genericName);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(entry);
    }
  }

  _index = [];
  for (const entry of deduped) {
    const names = [entry.genericName, entry.brandName, ...entry.aliases];
    for (const name of names) {
      _index.push({ entry, normalizedKey: normalize(name) });
    }
  }

  if (__DEV__) {
    console.warn(`[DrugDB] Index built: ${deduped.length} drugs, ${_index.length} name variants`);
  }

  return _index;
}

const FUZZY_THRESHOLD = 0.55;

// Common English words that could false-positive match short brand names
// (e.g. "food"→"Alfoo" score=0.57, "empty"→"Empa" score=0.57)
const STOPWORDS = new Set([
  'food',
  'meal',
  'days',
  'day',
  'week',
  'month',
  'take',
  'dose',
  'once',
  'twice',
  'daily',
  'after',
  'before',
  'with',
  'from',
  'into',
  'only',
  'night',
  'morning',
  'evening',
  'noon',
  'time',
  'tabs',
  'caps',
  'some',
  'then',
  'each',
  'dose',
  'stat',
  'hour',
  'apply',
  'oral',
  'side',
  'empty',
  'stomach',
  'water',
  'glass',
  'blood',
  'pressure',
  'sugar',
  'heart',
  'sleep',
  'wrist',
  'liver',
  'kidney',
  'joint',
  'skin',
  'eye',
  'pain',
  'fever',
  'cough',
  'cold',
  'body',
  'head',
  'back',
  'chest',
]);

export function lookupDrug(token: string): DrugMatch | null {
  const n = normalize(token);
  if (n.length < 3) return null;
  if (STOPWORDS.has(n)) return null;

  const index = getIndex();

  // Exact match first
  for (const { entry, normalizedKey } of index) {
    if (normalizedKey === n) {
      return {
        genericName: entry.genericName,
        brandName: entry.brandName,
        forms: entry.forms,
        commonStrengths: entry.commonStrengths,
        score: 1.0,
        isUnrecognised: false,
      };
    }
  }

  // Fuzzy match
  let best = 0;
  let bestEntry: DrugEntry | null = null;
  for (const { entry, normalizedKey } of index) {
    const score = dice(n, normalizedKey);
    if (score > best) {
      best = score;
      bestEntry = entry;
    }
  }

  if (best >= FUZZY_THRESHOLD && bestEntry) {
    if (__DEV__) {
      console.warn(
        `[DrugDB] Fuzzy match: "${token}" → "${bestEntry.genericName}" (score=${best.toFixed(2)})`,
      );
    }
    return {
      genericName: bestEntry.genericName,
      brandName: bestEntry.brandName,
      forms: bestEntry.forms,
      commonStrengths: bestEntry.commonStrengths,
      score: best,
      isUnrecognised: false,
    };
  }

  // Below threshold — keep as low-confidence unrecognised entry, never drop
  if (__DEV__) {
    console.warn(`[DrugDB] Unrecognised token: "${token}" (best score=${best.toFixed(2)})`);
  }
  return {
    genericName: token,
    brandName: token,
    forms: [],
    commonStrengths: [],
    score: 0.3,
    isUnrecognised: true,
  };
}
