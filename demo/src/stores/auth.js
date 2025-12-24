/**
 * =============================================================================
 * BarkBase Demo - Auth Store
 * =============================================================================
 *
 * Demo version - Always authenticated with a demo user.
 * No Cognito integration - purely for demonstration purposes.
 *
 * =============================================================================
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import getStorage from '@/lib/storage';

// Demo user - always authenticated
const demoUser = {
  id: 'demo-user-001',
  email: 'demo@barkbase.io',
  firstName: 'Sarah',
  lastName: 'Henderson',
  name: 'Sarah Henderson',
  phone: '(512) 555-1001',
  avatar: '/images/staff/sarah-henderson.jpg',
};

// Demo state - pre-populated and always authenticated
const demoState = {
  user: demoUser,
  session: { isDemo: true },
  memberships: [
    {
      tenantId: 'demo-tenant',
      tenantName: 'BarkBase Demo',
      role: 'ADMIN',
      accountCode: 'BK-DEMO01',
    },
  ],
  role: 'ADMIN',
  tenantId: 'demo-tenant',
  accountCode: 'BK-DEMO01',
  accessToken: 'demo-access-token-not-used',
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      ...demoState,

      // Set auth - in demo, just merge with existing demo state
      setAuth: (payload = {}) => {
        set({
          ...demoState,
          ...payload,
        });
      },

      // Update tokens - no-op in demo since we don't use real tokens
      updateTokens: () => {
        // No-op in demo mode
      },

      // Set session - no-op in demo
      setSession: () => {
        // No-op in demo mode - always use demo session
      },

      // Clear auth - resets to demo state (still authenticated)
      clearAuth: () => {
        set(demoState);
      },

      // Logout - in demo, just resets to demo state (still authenticated)
      logout: () => {
        set(demoState);
        console.log('[Demo] Logout called - demo user remains authenticated');
      },

      // Role check
      hasRole: (role) => {
        const currentRole = get().role;
        if (!currentRole) return false;

        if (Array.isArray(role)) {
          return role.map((r) => String(r).toUpperCase()).includes(currentRole);
        }
        return currentRole === String(role).toUpperCase();
      },

      // Always authenticated in demo mode
      isAuthenticated: () => true,
    }),
    {
      name: 'barkbase-demo-auth',
      storage: createJSONStorage(getStorage),
      partialize: ({ user, role, tenantId, accountCode, memberships }) => ({
        user,
        role,
        tenantId,
        accountCode,
        memberships,
      }),
    },
  ),
);

// Export demo user for use elsewhere
export const getDemoUser = () => demoUser;
