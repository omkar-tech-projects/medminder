import { create } from 'zustand';

export interface CapturedPage {
  id: string;
  uri: string;
}

type CaptureState = {
  pages: CapturedPage[];
  addPage: (uri: string) => string;
  removePage: (id: string) => void;
  clear: () => void;
};

export const useCaptureStore = create<CaptureState>((set) => ({
  pages: [],

  addPage(uri: string): string {
    const id = `page_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ pages: [...s.pages, { id, uri }] }));
    return id;
  },

  removePage(id: string) {
    set((s) => ({ pages: s.pages.filter((p) => p.id !== id) }));
  },

  clear() {
    set({ pages: [] });
  },
}));
