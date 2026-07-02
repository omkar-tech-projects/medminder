import { parseISO } from 'date-fns';
import { DOSE_STATUS } from './constants';
import type { DoseStatus } from '@/types/dose';
import type { BadgeVariant } from '@/components/Badge';

/** Richer client-side status that distinguishes future-pending from past-pending. */
export type DoseDisplayStatus = 'upcoming' | 'yetToTake' | 'taken' | 'missed' | 'skipped';

/**
 * Derives a display status from the persisted DB status plus the scheduled time.
 * PENDING + future → "upcoming";  PENDING + past → "yetToTake".
 * All other statuses pass through unchanged.
 */
export function getDoseDisplayStatus(
  status: DoseStatus,
  scheduledAt: string,
): DoseDisplayStatus {
  if (status === DOSE_STATUS.TAKEN) return 'taken';
  if (status === DOSE_STATUS.MISSED) return 'missed';
  if (status === DOSE_STATUS.SKIPPED) return 'skipped';
  return parseISO(scheduledAt) > new Date() ? 'upcoming' : 'yetToTake';
}

export const DISPLAY_STATUS_BADGE: Record<DoseDisplayStatus, BadgeVariant> = {
  upcoming: 'primary',
  yetToTake: 'warning',
  taken: 'success',
  missed: 'danger',
  skipped: 'neutral',
};

export const DISPLAY_STATUS_LABEL: Record<DoseDisplayStatus, string> = {
  upcoming: 'Upcoming',
  yetToTake: 'Yet to take',
  taken: 'Taken',
  missed: 'Missed',
  skipped: 'Skipped',
};
