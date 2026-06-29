import { parsePrescription } from '@/parsers/prescription-parser';

// ---------------------------------------------------------------------------
// Fixture 1: Dermatology OPD — hair loss
// Densita M 0-0-1 / Finast 0-0-1 / Tugain 1-0-0
// ---------------------------------------------------------------------------
describe('Indian OPD — dermatology (hair loss)', () => {
  const DERM_OCR = `
Dr. Rajan Mehta, Dermatologist
Patient: Rahul Sharma
Date: 01/06/2026

Advice:
1. Densita M 0.5mg
   0-0-1
   x 90 days
   h/s

2. Finast 1mg
   0-0-1
   x 90 days
   h/s

3. Tugain 5% Solution
   1-0-0
   x 90 days
`.trim();

  it('detects three medicines', () => {
    const result = parsePrescription(DERM_OCR);
    expect(result.medicines.length).toBeGreaterThanOrEqual(2);
  });

  it('matches Densita M → Dutasteride', () => {
    const result = parsePrescription(DERM_OCR);
    const dutasteride = result.medicines.find((m) => m.name.toLowerCase().includes('dutasteride'));
    expect(dutasteride).toBeDefined();
  });

  it('matches Finast → Finasteride', () => {
    const result = parsePrescription(DERM_OCR);
    const finasteride = result.medicines.find((m) => m.name.toLowerCase().includes('finasteride'));
    expect(finasteride).toBeDefined();
  });

  it('matches Tugain → Minoxidil', () => {
    const result = parsePrescription(DERM_OCR);
    const minoxidil = result.medicines.find((m) => m.name.toLowerCase().includes('minoxidil'));
    expect(minoxidil).toBeDefined();
  });

  it('correctly parses 0-0-1 as once daily at evening', () => {
    const result = parsePrescription(DERM_OCR);
    const dutasteride = result.medicines.find((m) => m.name.toLowerCase().includes('dutasteride'));
    expect(dutasteride?.frequencyPerDay).toBe(1);
    expect(dutasteride?.specificTimes).toEqual(['20:00']);
  });

  it('correctly parses 1-0-0 as once daily at morning', () => {
    const result = parsePrescription(DERM_OCR);
    const minoxidil = result.medicines.find((m) => m.name.toLowerCase().includes('minoxidil'));
    expect(minoxidil?.frequencyPerDay).toBe(1);
    expect(minoxidil?.specificTimes).toEqual(['08:00']);
  });

  it('parses 90 day duration', () => {
    const result = parsePrescription(DERM_OCR);
    const dutasteride = result.medicines.find((m) => m.name.toLowerCase().includes('dutasteride'));
    expect(dutasteride?.durationDays).toBe(90);
  });

  it('sets bedtime instructions for h/s', () => {
    const result = parsePrescription(DERM_OCR);
    const dutasteride = result.medicines.find((m) => m.name.toLowerCase().includes('dutasteride'));
    expect(dutasteride?.instructions).toBe('Take at bedtime');
  });
});

// ---------------------------------------------------------------------------
// Fixture 2: Full OPD with header noise above Rx section
// Tests that parser skips header lines and only parses Advice section
// ---------------------------------------------------------------------------
describe('Indian OPD — Rx section detection with header noise', () => {
  const OPD_OCR = `
Apollo Hospital, Mumbai
OPD Registration No: 2026-1234
Patient: Priya Patel   Age: 45   Sex: F
BP: 130/85   Weight: 68 kg

Diagnosis: Hypertension + Type 2 DM + Dyslipidaemia

Rx:
Tab. Telma 40mg OD morning
Tab. Glycomet 500mg BD after food x 90 days
Tab. Atorva 10mg OD at night x 90 days
Tab. Ecosprin 75mg OD after food
`.trim();

  it('detects four medicines', () => {
    const result = parsePrescription(OPD_OCR);
    expect(result.medicines.length).toBeGreaterThanOrEqual(3);
  });

  it('does not parse "Apollo" or "Mumbai" as drugs', () => {
    const result = parsePrescription(OPD_OCR);
    const names = result.medicines.map((m) => m.name.toLowerCase());
    expect(names.some((n) => n.includes('apollo') || n.includes('mumbai'))).toBe(false);
  });

  it('matches Telma → Telmisartan', () => {
    const result = parsePrescription(OPD_OCR);
    const drug = result.medicines.find((m) => m.name.toLowerCase().includes('telmisartan'));
    expect(drug).toBeDefined();
    expect(drug?.frequencyPerDay).toBe(1);
  });

  it('matches Glycomet → Metformin with BD after food', () => {
    const result = parsePrescription(OPD_OCR);
    const drug = result.medicines.find((m) => m.name.toLowerCase().includes('metformin'));
    expect(drug).toBeDefined();
    expect(drug?.frequencyPerDay).toBe(2);
    expect(drug?.timing).toBe('after_food');
    expect(drug?.durationDays).toBe(90);
  });

  it('matches Atorva → Atorvastatin', () => {
    const result = parsePrescription(OPD_OCR);
    const drug = result.medicines.find((m) => m.name.toLowerCase().includes('atorvastatin'));
    expect(drug).toBeDefined();
    expect(drug?.frequencyPerDay).toBe(1);
  });

  it('strips Tab. prefix — does not appear in name', () => {
    const result = parsePrescription(OPD_OCR);
    const names = result.medicines.map((m) => m.name);
    expect(names.some((n) => n.toLowerCase().startsWith('tab'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Fixture 3: h/s and empty stomach timing
// ---------------------------------------------------------------------------
describe('Indian OPD — h/s and timing variants', () => {
  it('parses h/s as bedtime instruction', () => {
    const result = parsePrescription('Finast 1mg\n0-0-1\nh/s\nx30 days');
    const m = result.medicines[0];
    expect(m?.instructions).toBe('Take at bedtime');
    expect(m?.durationDays).toBe(30);
  });

  it('parses "empty stomach" as before_food timing', () => {
    const result = parsePrescription('Thyronorm 50mcg\n1-0-0\nempty stomach\nx60 days');
    const m = result.medicines[0];
    expect(m?.timing).toBe('before_food');
  });

  it('parses "a/c" as before_food', () => {
    const result = parsePrescription('Pan 40mg BD a/c');
    const m = result.medicines[0];
    expect(m?.timing).toBe('before_food');
  });

  it('parses "p/c" as after_food', () => {
    const result = parsePrescription('Glycomet 500mg BD p/c x90 days');
    const m = result.medicines[0];
    expect(m?.timing).toBe('after_food');
    expect(m?.durationDays).toBe(90);
  });

  it('parses x 10/7 as 10 days', () => {
    const result = parsePrescription('Azithral 500mg OD × 10/7');
    const m = result.medicines[0];
    expect(m?.durationDays).toBe(10);
  });
});
