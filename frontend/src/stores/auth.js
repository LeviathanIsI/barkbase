import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import getStorage from '@/lib/storage';

const DEFAULT_ACCESS_TOKEN_TTL_MS = 5 * 60 * 1000;

const initialState = {
  user: null,
  memberships: [],
  role: null,
  tenantId: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      ...initialState,
      setAuth: (payload = {}) => {
        const { user, tokens, accessToken, refreshToken, role, tenantId, memberships, expiresAt } = payload;
        const resolvedAccessToken = accessToken ?? tokens?.accessToken ?? null;
        const resolvedRefreshToken = refreshToken ?? tokens?.refreshToken ?? null;
        const computedExpiry = tokens?.accessTokenExpiresIn
          ? Date.now() + tokens.accessTokenExpiresIn * 1000
          : expiresAt ?? Date.now() + DEFAULT_ACCESS_TOKEN_TTL_MS;

        const resolvedRoleRaw = role ?? user?.role ?? null;
        const resolvedRole = resolvedRoleRaw ? String(resolvedRoleRaw).toUpperCase() : null;
        const resolvedTenantId = tenantId ?? user?.tenantId ?? null;
        const resolvedMemberships = memberships ?? user?.memberships ?? [];

        set({
          user: user ?? null,
          accessToken: resolvedAccessToken,
          refreshToken: resolvedRefreshToken,
          role: resolvedRole,
          tenantId: resolvedTenantId,
          memberships: resolvedMemberships,
          expiresAt: computedExpiry,
        });
      },
      updateTokens: ({ accessToken, refreshToken, tokens, expiresAt, role, tenantId }) => {
        const resolvedAccessToken = accessToken ?? tokens?.accessToken;
        const resolvedRefreshToken = refreshToken ?? tokens?.refreshToken;
        const computedExpiry = tokens?.accessTokenExpiresIn
          ? Date.now() + tokens.accessTokenExpiresIn * 1000
          : expiresAt ?? Date.now() + DEFAULT_ACCESS_TOKEN_TTL_MS;
        const resolvedRole = role ? String(role).toUpperCase() : undefined;

        set((state) => ({
          accessToken: resolvedAccessToken ?? state.accessToken,
          refreshToken: resolvedRefreshToken ?? state.refreshToken,
          role: resolvedRole ?? state.role,
          tenantId: tenantId ?? state.tenantId,
          expiresAt: computedExpiry ?? state.expiresAt,
        }));
      },
      clearAuth: () => {
        set(initialState);
        try {
          getStorage().removeItem('barkbase-auth');
        } catch {
          // ignore storage cleanup issues
        }
      },
      logout: () => {
        set(initialState);
        try {
          getStorage().removeItem('barkbase-auth');
        } catch {
          // ignore storage cleanup issues
        }
      },
      hasRole: (role) => {
        const currentRole = get().role;
        if (!currentRole) {
          return false;
        }
        if (Array.isArray(role)) {
          return role.map((value) => String(value).toUpperCase()).includes(currentRole);
        }
        return currentRole === String(role).toUpperCase();
      },
      isAuthenticated: () => {
        const { accessToken, expiresAt } = get();
        if (!accessToken) {
          return false;
        }
        if (expiresAt && Date.now() >= expiresAt) {
          set(initialState);
          return false;
        }
        return true;
      },
    }),
    {
      name: 'barkbase-auth',
      storage: createJSONStorage(getStorage),
      // SECURITY: Do NOT persist tokens in browser storage (XSS vulnerability)
      // Tokens are kept in memory only. Backend uses httpOnly cookies for refresh.
      partialize: ({ user, memberships, role, tenantId, expiresAt }) => ({
        user,
        memberships,
        role,
        tenantId,
        // accessToken and refreshToken intentionally excluded from persistence
        expiresAt,
      }),
    },
  ),
);

