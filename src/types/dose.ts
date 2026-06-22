import { z } from 'zod';
import { DOSE_STATUS } from '@/lib/constants';

export const doseStatusValues = Object.values(DOSE_STATUS) as [string, ...string[]];

export const doseStatusSchema = z.enum(doseStatusValues as [string, ...string[]]);

export type DoseStatus = (typeof DOSE_STATUS)[keyof typeof DOSE_STATUS];
