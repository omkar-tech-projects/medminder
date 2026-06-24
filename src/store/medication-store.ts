import { create } from 'zustand';
import { format } from 'date-fns';
import type { Medicine, NewMedicine } from '@/db/schema';
import {
  getAllMedicines,
  insertMedicine,
  updateMedicine,
  deleteMedicine,
  pauseMedicine,
  resumeMedicine,
} from '@/db/queries/medicines';
import { useProfileStore } from '@/store/profile-store';

type MedicationState = {
  medications: Medicine[];
  isLoading: boolean;
  load: () => void;
  add: (data: NewMedicine) => void;
  update: (id: string, data: Partial<NewMedicine>) => void;
  remove: (id: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
};

export const useMedicationStore = create<MedicationState>((set, get) => ({
  medications: [],
  isLoading: false,

  load() {
    set({ isLoading: true });
    const profileId = useProfileStore.getState().activeProfileId;
    const medications = getAllMedicines(profileId);
    set({ medications, isLoading: false });
  },

  add(data) {
    insertMedicine(data);
    get().load();
  },

  update(id, data) {
    updateMedicine(id, data);
    get().load();
  },

  remove(id) {
    deleteMedicine(id);
    get().load();
  },

  pause(id) {
    pauseMedicine(id);
    get().load();
  },

  resume(id) {
    resumeMedicine(id);
    get().load();
  },
}));

const today = () => format(new Date(), 'yyyy-MM-dd');

export const selectActiveMedications = (state: MedicationState): Medicine[] =>
  state.medications.filter((m) => m.active === 1 && (m.endDate == null || m.endDate >= today()));
