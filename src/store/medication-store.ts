import { create } from 'zustand';
import type { Medication } from '@/db/schema';
import { getAllMedications, insertMedication, updateMedication, deleteMedication } from '@/db/queries/medications';
import type { NewMedication } from '@/db/schema';

type MedicationState = {
  medications: Medication[];
  isLoading: boolean;
  load: () => void;
  add: (data: NewMedication) => void;
  update: (id: string, data: Partial<NewMedication>) => void;
  remove: (id: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
};

export const useMedicationStore = create<MedicationState>((set, get) => ({
  medications: [],
  isLoading: false,

  load() {
    set({ isLoading: true });
    const medications = getAllMedications();
    set({ medications, isLoading: false });
  },

  add(data) {
    insertMedication(data);
    get().load();
  },

  update(id, data) {
    updateMedication(id, data);
    get().load();
  },

  remove(id) {
    deleteMedication(id);
    get().load();
  },

  pause(id) {
    updateMedication(id, { paused: 1 });
    get().load();
  },

  resume(id) {
    updateMedication(id, { paused: 0 });
    get().load();
  },
}));

export const selectActiveMedications = (state: MedicationState) =>
  state.medications.filter((m) => m.paused === 0 && (!m.endDate || m.endDate >= new Date().toISOString().slice(0, 10)));
