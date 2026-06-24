import { create } from 'zustand';
import { format, subHours } from 'date-fns';
import type { TodayDose, AdherenceSummary } from '@/repositories/dose-repository';
import {
  getTodayDoses,
  getAdherenceSummary,
  updateDoseLogStatus,
  revertDoseLogToPending,
  getOverduePendingLogsWithProfile,
  type OverduePendingDoseWithProfile,
} from '@/db/queries/dose-logs';
import { DOSE_REMINDER_RE_REMIND_CAP_HOURS } from '@/lib/constants';
import { useProfileStore } from '@/store/profile-store';

const EMPTY_SUMMARY: AdherenceSummary = { taken: 0, missed: 0, pending: 0, total: 0 };

type DoseSource = 'notification' | 'app';

type DoseState = {
  selectedDate: string;
  dosesForDate: TodayDose[];
  summary: AdherenceSummary;
  setDate: (date: string) => void;
  loadForDate: (date: string) => void;
  markTaken: (doseLogId: string, source?: DoseSource) => void;
  markMissed: (doseLogId: string) => void;
  skip: (doseLogId: string) => void;
  revertToPending: (doseLogId: string) => void;
  processAutoMisses: () => OverduePendingDoseWithProfile[];
};

export const useDoseStore = create<DoseState>((set, get) => ({
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  dosesForDate: [],
  summary: EMPTY_SUMMARY,

  setDate(date) {
    set({ selectedDate: date });
    get().loadForDate(date);
  },

  loadForDate(date) {
    const profileId = useProfileStore.getState().activeProfileId;
    const dosesForDate = getTodayDoses(date, profileId);
    const summary = getAdherenceSummary(date, profileId);
    set({ dosesForDate, summary });
  },

  markTaken(doseLogId, source = 'app') {
    updateDoseLogStatus(doseLogId, 'taken', new Date().toISOString(), source);
    get().loadForDate(get().selectedDate);
  },

  markMissed(doseLogId) {
    updateDoseLogStatus(doseLogId, 'missed', undefined, 'app');
    get().loadForDate(get().selectedDate);
  },

  skip(doseLogId) {
    updateDoseLogStatus(doseLogId, 'skipped', undefined, 'app');
    get().loadForDate(get().selectedDate);
  },

  revertToPending(doseLogId) {
    revertDoseLogToPending(doseLogId);
    get().loadForDate(get().selectedDate);
  },

  processAutoMisses() {
    const cutoff = format(
      subHours(new Date(), DOSE_REMINDER_RE_REMIND_CAP_HOURS),
      "yyyy-MM-dd'T'HH:mm:ss",
    );
    const overdue = getOverduePendingLogsWithProfile(cutoff);
    for (const log of overdue) {
      updateDoseLogStatus(log.doseLogId, 'missed');
    }
    if (overdue.length > 0) {
      get().loadForDate(get().selectedDate);
    }
    return overdue;
  },
}));
