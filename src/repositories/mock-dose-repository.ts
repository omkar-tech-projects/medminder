import { subHours, addHours, addMinutes } from 'date-fns';
import type { DoseRepository, TodayDose } from './dose-repository';
import { DOSE_STATUS } from '@/lib/constants';

const now = new Date();

const doses: TodayDose[] = [
  {
    id: 'd-1',
    medicationId: 'm-1',
    medicationName: 'Metformin',
    medicationColor: '#3B82F6',
    dosage: '500 mg',
    scheduledAt: subHours(now, 3).toISOString(),
    status: DOSE_STATUS.TAKEN,
    takenAt: addMinutes(subHours(now, 3), 4).toISOString(),
  },
  {
    id: 'd-2',
    medicationId: 'm-2',
    medicationName: 'Lisinopril',
    medicationColor: '#14B8A6',
    dosage: '10 mg',
    scheduledAt: subHours(now, 1).toISOString(),
    status: DOSE_STATUS.MISSED,
    takenAt: null,
  },
  {
    id: 'd-3',
    medicationId: 'm-1',
    medicationName: 'Metformin',
    medicationColor: '#3B82F6',
    dosage: '500 mg',
    scheduledAt: addHours(now, 1).toISOString(),
    status: DOSE_STATUS.PENDING,
    takenAt: null,
  },
  {
    id: 'd-4',
    medicationId: 'm-3',
    medicationName: 'Atorvastatin',
    medicationColor: '#A855F7',
    dosage: '20 mg',
    scheduledAt: addHours(now, 5).toISOString(),
    status: DOSE_STATUS.PENDING,
    takenAt: null,
  },
];

export const mockDoseRepository: DoseRepository = {
  getTodayDoses() {
    return [...doses].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  },

  getAdheranceSummary() {
    const taken = doses.filter((d) => d.status === DOSE_STATUS.TAKEN).length;
    const missed = doses.filter((d) => d.status === DOSE_STATUS.MISSED).length;
    const pending = doses.filter(
      (d) => d.status === DOSE_STATUS.PENDING || d.status === DOSE_STATUS.SNOOZED,
    ).length;
    return { taken, missed, pending, total: doses.length };
  },

  markTaken(doseId, takenAt) {
    const dose = doses.find((d) => d.id === doseId);
    if (dose != null) {
      dose.status = DOSE_STATUS.TAKEN;
      dose.takenAt = takenAt;
    }
  },
};
