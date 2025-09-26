import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarCollapsed: false,
  activeModal: null,
  offline: false,
  notifications: [],
  isSyncing: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  showModal: (modal, payload = {}) => set({ activeModal: { name: modal, payload } }),
  hideModal: () => set({ activeModal: null }),
  enqueueNotification: (notification) =>
    set((state) => ({ notifications: [...state.notifications, { id: crypto.randomUUID(), ...notification }] })),
  dismissNotification: (notificationId) =>
    set((state) => ({ notifications: state.notifications.filter(({ id }) => id !== notificationId) })),
  setOffline: (offline) => {
    if (typeof document !== 'undefined') {
      document.body.dataset.offline = offline;
    }
    set({ offline });
  },
  setSyncing: (flag) => set({ isSyncing: flag }),
}));
