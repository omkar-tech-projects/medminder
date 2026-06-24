import type { DoseStatus } from '@/types/dose';

export interface TodayDose {
  id: string;
  medicineId: string;
  medicationName: string;
  medicationColor: string;
  dosage: string;
  scheduledAt: string;
  status: DoseStatus;
  respondedAt: string | null;
}

export interface AdherenceSummary {
  taken: number;
  missed: number;
  pending: number;
  total: number;
}

export interface DoseRepository {
  getTodayDoses: () => TodayDose[];
  getAdherenceSummary: () => AdherenceSummary;
  markTaken: (doseId: string, respondedAt: string) => void;
}
