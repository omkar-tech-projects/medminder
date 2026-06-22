import { create } from 'zustand';
import { format } from 'date-fns';
import type { DoseLog } from '@/db/schema';
import { getDoseLogsForDate, updateDoseLogStatus } from '@/db/queries/dose-logs';

type DoseState = {
  selectedDate: string;
  dosesForDate: DoseLog[];
  setDate: (date: string) => void;
  loadForDate: (date: string) => void;
  markTaken: (doseLogId: string) => void;
  markMissed: (doseLogId: string) => void;
  snooze: (doseLogId: string) => void;
};

export const useDoseStore = create<DoseState>((set, get) => ({
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  dosesForDate: [],

  setDate(date) {
    set({ selectedDate: date });
    get().loadForDate(date);
  },

  loadForDate(date) {
    const dosesForDate = getDoseLogsForDate(date);
    set({ dosesForDate });
  },

  markTaken(doseLogId) {
    updateDoseLogStatus(doseLogId, 'taken', new Date().toISOString());
    get().loadForDate(get().selectedDate);
  },

  markMissed(doseLogId) {
    updateDoseLogStatus(doseLogId, 'missed');
    get().loadForDate(get().selectedDate);
  },

  snooze(doseLogId) {
    updateDoseLogStatus(doseLogId, 'snoozed');
    get().loadForDate(get().selectedDate);
  },
}));
