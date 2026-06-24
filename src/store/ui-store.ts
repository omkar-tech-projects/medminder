import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  undoAction?: () => void;
}

interface UIStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      // Cap at 3 visible toasts; oldest drops off
      toasts: [...state.toasts.slice(-2), { ...toast, id: Math.random().toString(36).slice(2, 9) }],
    })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience hook — call anywhere in the component tree */
export function useToast() {
  const addToast = useUIStore((s) => s.addToast);

  return {
    success: (message: string, duration = 3000) => addToast({ message, type: 'success', duration }),
    error: (message: string, duration = 4000) => addToast({ message, type: 'error', duration }),
    warning: (message: string, duration = 3500) => addToast({ message, type: 'warning', duration }),
    info: (message: string, duration = 3000) => addToast({ message, type: 'info', duration }),
    show: (opts: Omit<Toast, 'id'>) => addToast(opts),
  };
}
