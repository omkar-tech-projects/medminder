import { z } from 'zod';

export const medicineExtractionSchema = z.object({
  name: z.string().nullable(),
  strength: z.string().nullable(),
  form: z.string().nullable(),
  dosageAmount: z.string().nullable(),
  frequencyPerDay: z.number().int().positive().nullable(),
  specificTimes: z.array(z.string()).nullable(),
  timing: z.enum(['before_food', 'after_food', 'with_food', 'any']).nullable(),
  durationDays: z.number().int().positive().nullable(),
  instructions: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  // JSON-serialised DayPattern for non-daily schedules (weekly, monthly, every N days).
  // Kept as a string so Zod schema and form values remain free of schedule-generator types.
  dayPattern: z.string().nullable().optional(),
});

export const analysisResponseSchema = z.object({
  medicines: z.array(medicineExtractionSchema),
  overallConfidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
});

export type MedicineExtraction = z.infer<typeof medicineExtractionSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
