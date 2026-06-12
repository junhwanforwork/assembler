import { create } from "zustand";

interface ToastState {
  message: string | null;
  // Internal timer ref — tracked as a plain number so we can clear on replacement
  _timerId: ReturnType<typeof setTimeout> | null;

  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  message: null,
  _timerId: null,

  showToast: (message) => {
    // Cancel the previous auto-dismiss timer before setting a new message.
    // Without this, back-to-back actions would clear the toast too early.
    const prev = get()._timerId;
    if (prev !== null) clearTimeout(prev);

    const timerId = setTimeout(() => {
      set({ message: null, _timerId: null });
    }, 2500);

    set({ message, _timerId: timerId });
  },

  clearToast: () => {
    const prev = get()._timerId;
    if (prev !== null) clearTimeout(prev);
    set({ message: null, _timerId: null });
  },
}));
