import type { DoseStatus } from '@/types/dose';

export interface TodayDose {
  id: string;
  medicationId: string;
  medicationName: string;
  medicationColor: string;
  dosage: string;
  scheduledAt: string;
  status: DoseStatus;
  takenAt: string | null;
}

export interface AdherenceSummary {
  taken: number;
  missed: number;
  pending: number;
  total: number;
}

export interface DoseRepository {
  getTodayDoses: () => TodayDose[];
  getAdheranceSummary: () => AdherenceSummary;
  markTaken: (doseId: string, takenAt: string) => void;
}
