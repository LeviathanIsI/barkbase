/**
 * Auth Store - Demo Version
 *
 * Always authenticated as Demo User for demo mode.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import getStorage from '@/lib/storage';

// Demo user - always authenticated
const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@barkbase.io',
  firstName: 'Demo',
  lastName: 'User',
  name: 'Demo User',
  role: 'ADMIN',
};

const DEMO_STATE = {
  user: DEMO_USER,
  session: { idToken: 'demo-token' },
  memberships: [{ tenantId: 'demo-tenant', role: 'ADMIN' }],
  role: 'ADMIN',
  tenantId: 'demo-tenant',
  accountCode: 'BK-DEMO',
  accessToken: 'demo-access-token',
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      ...DEMO_STATE,

      // Store user data - in demo mode, always use demo user
      setAuth: (payload = {}) => {
        // In demo mode, ignore payload and use demo user
        set(DEMO_STATE);
      },

      // Update tokens - in demo mode, no-op
      updateTokens: () => {
        // No-op for demo
      },

      // Set session - in demo mode, always use demo session
      setSession: () => {
        set(DEMO_STATE);
      },

      // Clear auth - in demo mode, restore demo state
      clearAuth: () => {
        set(DEMO_STATE);
      },

      // Logout - in demo mode, restore demo state
      logout: () => {
        set(DEMO_STATE);
      },

      // Check role - in demo mode, always admin
      hasRole: (role) => {
        if (Array.isArray(role)) {
          return role.map((r) => String(r).toUpperCase()).includes('ADMIN');
        }
        return String(role).toUpperCase() === 'ADMIN' || String(role).toUpperCase() === 'OWNER';
      },

      // Always authenticated in demo mode
      isAuthenticated: () => true,
    }),
    {
      name: 'barkbase-auth',
      storage: createJSONStorage(getStorage),
      partialize: ({ user, role, tenantId, accountCode, memberships, accessToken }) => ({
        user,
        role,
        tenantId,
        accountCode,
        memberships,
        accessToken,
      }),
    },
  ),
);
