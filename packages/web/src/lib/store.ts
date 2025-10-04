/**
 * Global State Management with Zustand
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  tenantId: string;
}

interface AppState {
  // Tenant
  tenantId: string;
  setTenantId: (id: string) => void;

  // User
  user: User | null;
  setUser: (user: User | null) => void;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Filters
  filters: {
    riskLevel?: string;
    status?: string;
    dateRange?: [Date, Date];
  };
  setFilters: (filters: AppState['filters']) => void;
  clearFilters: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Tenant
      tenantId: '',
      setTenantId: (id) => set({ tenantId: id }),

      // User
      user: null,
      setUser: (user) => set({ user }),

      // UI State
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Filters
      filters: {},
      setFilters: (filters) => set({ filters }),
      clearFilters: () => set({ filters: {} }),
    }),
    {
      name: 'sap-grc-storage', // localStorage key
      partialize: (state) => ({
        tenantId: state.tenantId,
        user: state.user,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
