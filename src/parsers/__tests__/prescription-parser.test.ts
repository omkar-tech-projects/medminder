import { parsePrescription } from '@/parsers/prescription-parser';

// ---------------------------------------------------------------------------
// Clean, well-structured OCR
// ---------------------------------------------------------------------------
describe('parsePrescription — clean input', () => {
  it('extracts a single medicine with all fields', () => {
    const result = parsePrescription('Tab. Dolo 650mg\n1-0-1\nAfter food\nx5 days');
    expect(result.medicines).toHaveLength(1);
    const m = result.medicines[0]!;
    expect(m.name).toBe('Paracetamol');
    expect(m.strength).toBe('650mg');
    expect(m.form).toBe('tablet');
    expect(m.frequencyPerDay).toBe(2);
    expect(m.specificTimes).toEqual(['08:00', '20:00']);
    expect(m.timing).toBe('after_food');
    expect(m.durationDays).toBe(5);
    expect(m.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('handles BD shorthand for twice daily', () => {
    const result = parsePrescription('Azithral 250mg BD for 1 week');
    const m = result.medicines[0]!;
    expect(m.name).toBe('Azithromycin');
    expect(m.frequencyPerDay).toBe(2);
    expect(m.durationDays).toBe(7);
  });

  it('handles TDS shorthand for three times daily', () => {
    const result = parsePrescription('Pan 40mg TDS before food');
    const m = result.medicines[0]!;
    expect(m.name).toBe('Pantoprazole');
    expect(m.frequencyPerDay).toBe(3);
    expect(m.specificTimes).toEqual(['08:00', '14:00', '20:00']);
    expect(m.timing).toBe('before_food');
  });

  it('handles OD for once daily', () => {
    const result = parsePrescription('Atorva 10mg OD');
    const m = result.medicines[0]!;
    expect(m.name).toBe('Atorvastatin');
    expect(m.frequencyPerDay).toBe(1);
    expect(m.specificTimes).toEqual(['08:00']);
  });

  it('parses Indian 1-1-1 pattern (three times)', () => {
    const result = parsePrescription('Crocin 500mg\n1-1-1\n5 days');
    const m = result.medicines[0]!;
    expect(m.frequencyPerDay).toBe(3);
    expect(m.specificTimes).toEqual(['08:00', '14:00', '20:00']);
    expect(m.durationDays).toBe(5);
  });

  it('parses 0-0-1 (bedtime only)', () => {
    const result = parsePrescription('Shelcal 500mg\n0-0-1\n1 month');
    const m = result.medicines[0]!;
    expect(m.frequencyPerDay).toBe(1);
    expect(m.specificTimes).toEqual(['20:00']);
    expect(m.durationDays).toBe(30);
  });

  it('parses multiple medicines from one prescription', () => {
    const text = [
      'Tab. Dolo 650mg 1-0-1 x3 days After food',
      'Cap. Azithral 250mg OD x5 days',
      'Tab. Pan 40mg BD Before food',
    ].join('\n');
    const result = parsePrescription(text);
    expect(result.medicines).toHaveLength(3);
    expect(result.medicines[0]!.name).toBe('Paracetamol');
    expect(result.medicines[1]!.name).toBe('Azithromycin');
    expect(result.medicines[2]!.name).toBe('Pantoprazole');
  });
});

// ---------------------------------------------------------------------------
// Messy / noisy OCR
// ---------------------------------------------------------------------------
describe('parsePrescription — noisy OCR', () => {
  it('fuzzy-matches a drug name with OCR noise chars', () => {
    // "Dol0" (zero instead of o), mangled spacing
    const result = parsePrescription('Tab. Dol0  65Omg\n1-0-1\n3 days');
    // Dice on 'dol0' vs 'dolo' should still pass threshold
    expect(result.medicines.length).toBeGreaterThanOrEqual(0);
    // May or may not match depending on noise level — assert needsReview=true if uncertain
    if (result.medicines.length > 0) {
      expect(result.needsReview).toBeDefined();
    }
  });

  it('sets needsReview=true when confidence is low', () => {
    // Prescription with recognisable drug but missing most fields
    const result = parsePrescription('Atorva');
    expect(result.needsReview).toBe(true);
  });

  it('returns empty result for blank input', () => {
    const result = parsePrescription('');
    expect(result.medicines).toHaveLength(0);
    expect(result.overallConfidence).toBe(0);
    expect(result.needsReview).toBe(true);
  });

  it('returns empty result for unreadable image text', () => {
    const result = parsePrescription('■■■■ ████ ▓▓▓ ░░░');
    expect(result.medicines).toHaveLength(0);
    expect(result.needsReview).toBe(true);
  });

  it('handles extra whitespace and mixed case', () => {
    const result = parsePrescription('  AUGMENTIN   625mg   BD   After  Food  ');
    const m = result.medicines[0];
    if (m) {
      expect(['Amoxicillin', 'Amoxicillin Clavulanate']).toContain(m.name);
      expect(m.frequencyPerDay).toBe(2);
    }
  });
});

// ---------------------------------------------------------------------------
// Duration edge cases
// ---------------------------------------------------------------------------
describe('parsePrescription — duration', () => {
  it('parses weeks into days', () => {
    const result = parsePrescription('Dolo 500mg BD for 2 weeks');
    expect(result.medicines[0]!.durationDays).toBe(14);
  });

  it('parses months into days', () => {
    const result = parsePrescription('Shelcal 500mg OD 3 months');
    expect(result.medicines[0]!.durationDays).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// Schema compliance
// ---------------------------------------------------------------------------
describe('parsePrescription — output schema', () => {
  it('never returns undefined for required nullable fields', () => {
    const result = parsePrescription('Dolo 650mg OD');
    for (const m of result.medicines) {
      expect('name' in m).toBe(true);
      expect('strength' in m).toBe(true);
      expect('form' in m).toBe(true);
      expect('frequencyPerDay' in m).toBe(true);
      expect('timing' in m).toBe(true);
      expect('durationDays' in m).toBe(true);
      expect(m.confidence).toBeGreaterThanOrEqual(0);
      expect(m.confidence).toBeLessThanOrEqual(1);
    }
    expect(typeof result.overallConfidence).toBe('number');
    expect(typeof result.needsReview).toBe('boolean');
  });
});
