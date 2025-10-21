import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import getStorage from '@/lib/storage';

const DEFAULT_ACCESS_TOKEN_TTL_MS = 5 * 60 * 1000;

const initialState = {
  user: null,
  session: null, // Holds the raw Cognito session
  memberships: [],
  role: null,
  tenantId: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  rememberMe: false,
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      ...initialState,
      setAuth: (payload = {}) => {
        const { user, tokens, accessToken, refreshToken, role, tenantId, memberships, expiresAt, rememberMe } = payload;
        const resolvedAccessToken = accessToken ?? tokens?.accessToken ?? null;
        const resolvedRefreshToken = refreshToken ?? tokens?.refreshToken ?? null;
        const computedExpiry = tokens?.accessTokenExpiresIn
          ? Date.now() + tokens.accessTokenExpiresIn * 1000
          : expiresAt ?? Date.now() + DEFAULT_ACCESS_TOKEN_TTL_MS;

        const resolvedRoleRaw = role ?? user?.role ?? null;
        const resolvedRole = resolvedRoleRaw ? String(resolvedRoleRaw).toUpperCase() : null;
        const resolvedTenantId = tenantId ?? user?.tenantId ?? null;
        const resolvedMemberships = memberships ?? user?.memberships ?? [];
        const shouldRemember = rememberMe ?? false;

        set({
          user: user ?? null,
          accessToken: resolvedAccessToken,
          refreshToken: resolvedRefreshToken,
          role: resolvedRole,
          tenantId: resolvedTenantId,
          memberships: resolvedMemberships,
          expiresAt: computedExpiry,
          rememberMe: shouldRemember,
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

      // New action to handle Cognito session
      setSession: (session) => {
        if (!session || !session.idToken) {
          get().clearAuth();
          return;
        }

        // TODO: Use AWS Amplify to get user attributes instead of decoding JWT
        // import { fetchUserAttributes } from 'aws-amplify/auth';
        // const attributes = await fetchUserAttributes();
        
        const user = {
          // User info should come from Cognito user attributes
          // email: attributes.email,
          // name: attributes.name,
          // phone: attributes.phone_number,
        };
        
        set({
          session,
          user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.idToken?.payload?.exp ? session.idToken.payload.exp * 1000 : Date.now() + DEFAULT_ACCESS_TOKEN_TTL_MS,
          // Role and tenant should come from Cognito custom attributes or your backend
          role: 'STAFF', // Placeholder - get from Cognito attributes
          tenantId: null, // Placeholder - get from Cognito attributes
        });
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
          // Don't auto-clear here, let the AuthLoader handle refresh
          return false;
        }
        return true;
      },
    }),
    {
      name: 'barkbase-auth',
      storage: createJSONStorage(getStorage),
      // Persist auth tokens to survive page refreshes
      partialize: ({ user, role, tenantId, memberships, accessToken, refreshToken, expiresAt, rememberMe }) => ({
        user,
        role,
        tenantId,
        memberships,
        // Always persist refreshToken to enable auto-refresh
        refreshToken,
        // Persist accessToken if rememberMe or if we have a valid token
        ...(rememberMe || refreshToken ? { accessToken, expiresAt } : {}),
        rememberMe,
      }),
    },
  ),
);

