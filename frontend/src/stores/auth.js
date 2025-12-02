import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import getStorage from '@/lib/storage';

// SECURITY: Tokens are now stored in httpOnly cookies (not accessible to JavaScript)
// This prevents XSS attacks from stealing JWT tokens
const initialState = {
  user: null,
  session: null, // Holds the raw Cognito session
  memberships: [],
  role: null,
  tenantId: null,
  accessToken: null, // Needed for API Gateway Authorization header
  // refreshToken stays in httpOnly cookies for security
  // REMOVED: expiresAt, sessionStartTime, sessionExpiryTime (server handles session validation)
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      ...initialState,
      // Store user data and accessToken (needed for API Gateway Authorization header)
      setAuth: (payload = {}) => {
        const { user, role, tenantId, memberships, accessToken } = payload;

        const resolvedRoleRaw = role ?? user?.role ?? null;
        const resolvedRole = resolvedRoleRaw ? String(resolvedRoleRaw).toUpperCase() : null;
        const resolvedTenantId = tenantId ?? user?.tenantId ?? null;
        const resolvedMemberships = memberships ?? user?.memberships ?? [];

        set({
          user: user ?? null,
          role: resolvedRole,
          tenantId: resolvedTenantId,
          memberships: resolvedMemberships,
          accessToken: accessToken ?? null, // Store for API Gateway Authorization header
        });
      },
      // Update tokens and user metadata
      updateTokens: ({ role, tenantId, accessToken }) => {
        const resolvedRole = role ? String(role).toUpperCase() : undefined;

        set((state) => ({
          role: resolvedRole ?? state.role,
          tenantId: tenantId ?? state.tenantId,
          accessToken: accessToken ?? state.accessToken, // Update accessToken for API Gateway
        }));
      },

      // New action to handle Cognito session
      // SECURITY: Tokens are in httpOnly cookies, only store session metadata
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
      // SECURITY: Authentication is validated via httpOnly cookies by the server
      // We just check if we have user data (which confirms successful authentication)
      isAuthenticated: () => {
        const { user } = get();
        return !!user;
      },
    }),
    {
      name: 'barkbase-auth',
      storage: createJSONStorage(getStorage),
      // Persist user metadata and accessToken (needed for API Gateway)
      partialize: ({ user, role, tenantId, memberships, accessToken }) => ({
        user,
        role,
        tenantId,
        memberships,
        accessToken, // Persist for API Gateway Authorization header
      }),
    },
  ),
);

