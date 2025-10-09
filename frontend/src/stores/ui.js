import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      activeModal: null,
      offline: false,
      notifications: [],
      isSyncing: false,
      _hasHydrated: false,
      setHasHydrated: (state) => {
        set({
          _hasHydrated: state,
        });
      },
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
    }),
    {
      name: 'barkbase-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
