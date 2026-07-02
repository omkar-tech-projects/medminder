import { z } from 'zod';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const medicineFormSchema = z.object({
  name: z.string().min(1, 'Medicine name is required'),
  strength: z.string(),
  form: z.string(),
  dosageAmount: z.string().min(1, 'Dosage is required'),
  frequencyPerDay: z
    .number({ invalid_type_error: 'Enter a number' })
    .int('Must be a whole number')
    .positive('Must be at least 1'),
  specificTimes: z
    .array(z.string().regex(TIME_RE, 'Use HH:MM format'))
    .min(1, 'Add at least one dose time'),
  timing: z.enum(['before_food', 'after_food', 'with_food', 'any']),
  durationDays: z.number().int().positive().nullable(),
  startDate: z.string().regex(DATE_RE, 'Use YYYY-MM-DD format'),
  stockCount: z.number().int().min(1).nullable(),
  instructions: z.string(),
  // Passed through from AI extraction; not user-editable. JSON-serialised DayPattern.
  dayPattern: z.string().nullable().optional(),
});

export const reviewFormSchema = z.object({
  medicines: z.array(medicineFormSchema).min(1, 'Add at least one medicine'),
});

export type MedicineFormValues = z.infer<typeof medicineFormSchema>;
export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

export const TIMING_LABELS: Record<MedicineFormValues['timing'], string> = {
  before_food: 'Before food',
  after_food: 'After food',
  with_food: 'With food',
  any: 'Any time',
};
