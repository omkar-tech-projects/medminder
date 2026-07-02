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
import { cancelNotificationsForDoseLog } from '@/services/notification-service';

const EMPTY_SUMMARY: AdherenceSummary = { taken: 0, missed: 0, pending: 0, total: 0 };

type DoseSource = 'notification' | 'app';

type DoseState = {
  selectedDate: string;
  dosesForDate: TodayDose[];
  summary: AdherenceSummary;
  // Increments on every write so any screen subscribed to it re-renders on change.
  doseVersion: number;
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
  doseVersion: 0,

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
    set((s) => ({ doseVersion: s.doseVersion + 1 }));
    get().loadForDate(get().selectedDate);
    // Cancel any still-pending nag alarms for this dose so nagging stops immediately,
    // whether the user tapped in-app or via a notification action.
    void cancelNotificationsForDoseLog(doseLogId);
  },

  markMissed(doseLogId) {
    updateDoseLogStatus(doseLogId, 'missed', undefined, 'app');
    set((s) => ({ doseVersion: s.doseVersion + 1 }));
    get().loadForDate(get().selectedDate);
  },

  skip(doseLogId) {
    updateDoseLogStatus(doseLogId, 'skipped', undefined, 'app');
    set((s) => ({ doseVersion: s.doseVersion + 1 }));
    get().loadForDate(get().selectedDate);
  },

  revertToPending(doseLogId) {
    revertDoseLogToPending(doseLogId);
    set((s) => ({ doseVersion: s.doseVersion + 1 }));
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
      set((s) => ({ doseVersion: s.doseVersion + 1 }));
      get().loadForDate(get().selectedDate);
    }
    return overdue;
  },
}));
