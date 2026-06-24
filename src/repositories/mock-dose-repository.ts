import { subHours, addHours, addMinutes } from 'date-fns';
import type { DoseRepository, TodayDose } from './dose-repository';
import { DOSE_STATUS } from '@/lib/constants';

const now = new Date();

const doses: TodayDose[] = [
  {
    id: 'd-1',
    medicineId: 'm-1',
    medicationName: 'Metformin',
    medicationColor: '#3B82F6',
    dosage: '500 mg',
    scheduledAt: subHours(now, 3).toISOString(),
    status: DOSE_STATUS.TAKEN,
    respondedAt: addMinutes(subHours(now, 3), 4).toISOString(),
  },
  {
    id: 'd-2',
    medicineId: 'm-2',
    medicationName: 'Lisinopril',
    medicationColor: '#14B8A6',
    dosage: '10 mg',
    scheduledAt: subHours(now, 1).toISOString(),
    status: DOSE_STATUS.MISSED,
    respondedAt: null,
  },
  {
    id: 'd-3',
    medicineId: 'm-1',
    medicationName: 'Metformin',
    medicationColor: '#3B82F6',
    dosage: '500 mg',
    scheduledAt: addHours(now, 1).toISOString(),
    status: DOSE_STATUS.PENDING,
    respondedAt: null,
  },
  {
    id: 'd-4',
    medicineId: 'm-3',
    medicationName: 'Atorvastatin',
    medicationColor: '#A855F7',
    dosage: '20 mg',
    scheduledAt: addHours(now, 5).toISOString(),
    status: DOSE_STATUS.PENDING,
    respondedAt: null,
  },
];

export const mockDoseRepository: DoseRepository = {
  getTodayDoses() {
    return [...doses].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  },

  getAdherenceSummary() {
    const taken = doses.filter((d) => d.status === DOSE_STATUS.TAKEN).length;
    const missed = doses.filter((d) => d.status === DOSE_STATUS.MISSED).length;
    const pending = doses.filter(
      (d) => d.status === DOSE_STATUS.PENDING || d.status === DOSE_STATUS.SKIPPED,
    ).length;
    return { taken, missed, pending, total: doses.length };
  },

  markTaken(doseId, respondedAt) {
    const dose = doses.find((d) => d.id === doseId);
    if (dose != null) {
      dose.status = DOSE_STATUS.TAKEN;
      dose.respondedAt = respondedAt;
    }
  },
};
