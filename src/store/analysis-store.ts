import { create } from 'zustand';
import type { AnalysisResponse } from '@/schemas/analysis-schema';

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

interface AnalysisState {
  status: AnalysisStatus;
  result: AnalysisResponse | null;
  error: string | null;
  setLoading: () => void;
  setResult: (result: AnalysisResponse) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  status: 'idle',
  result: null,
  error: null,
  setLoading: () => set({ status: 'loading', error: null }),
  setResult: (result) => set({ status: 'success', result }),
  setError: (error) => set({ status: 'error', error }),
  reset: () => set({ status: 'idle', result: null, error: null }),
}));
