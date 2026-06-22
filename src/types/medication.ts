import { z } from 'zod';
import { FREQUENCY } from '@/lib/constants';

export const frequencyValues = Object.values(FREQUENCY) as [string, ...string[]];

export const medicationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  dosage: z.number().positive('Dosage must be a positive number'),
  dosageUnit: z.string().min(1, 'Unit is required'),
  frequency: z.enum(frequencyValues as [string, ...string[]]),
  timesPerDay: z.number().int().positive(),
  durationDays: z.number().int().positive().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  endDate: z.string().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  notes: z.string().nullable(),
  paused: z.number().int().min(0).max(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const newMedicationSchema = medicationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  paused: true,
  endDate: true,
});

export const aiExtractedMedicationSchema = z.object({
  name: z.string().min(1),
  dosage: z.number().positive(),
  dosage_unit: z.string().min(1),
  frequency: z.string(),
  times_per_day: z.number().int().positive(),
  duration_days: z.number().int().positive().nullable(),
  special_instructions: z.string().nullable(),
});

export const aiResponseSchema = z.object({
  medications: z.array(aiExtractedMedicationSchema),
});

export type AiExtractedMedication = z.infer<typeof aiExtractedMedicationSchema>;
export type AiResponse = z.infer<typeof aiResponseSchema>;
export type NewMedicationForm = z.infer<typeof newMedicationSchema>;
