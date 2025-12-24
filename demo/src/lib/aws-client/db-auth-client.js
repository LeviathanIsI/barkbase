/**
 * =============================================================================
 * DbAuthClient - LEGACY / DEV-ONLY
 * =============================================================================
 *
 * @deprecated This client is LEGACY and should NOT be used in production.
 *
 * STATUS: DEV-ONLY / UNSUPPORTED
 * ------------------------------
 * - This client was designed for direct database-based authentication without
 *   Cognito, but it does NOT integrate properly with the current backend.
 * - The backend /register endpoint requires a valid Cognito accessToken, which
 *   this client cannot provide (it sends email/password directly).
 * - SignUp flow is BROKEN in this mode.
 * - SignIn flow expects a backend /login endpoint that validates credentials
 *   directly against the database, which may not be fully implemented.
 *
 * PRODUCTION AUTH:
 * ----------------
 * For production deployments, use one of the Cognito-based clients:
 * - CognitoPasswordClient (AUTH_MODE='embedded'): Direct Cognito USER_PASSWORD_AUTH
 * - LambdaAuthClient (AUTH_MODE='hosted'): Cognito Hosted UI with OAuth2 + PKCE
 *
 * This client remains available ONLY for:
 * - Local development without Cognito setup
 * - Legacy testing scenarios
 * - Migration/debugging purposes
 *
 * It will be blocked from instantiation in production builds.
 *
 * =============================================================================
 */

// SECURITY: Updated to use httpOnly cookies for JWT storage (XSS protection)
export class DbAuthClient {
  constructor(clientConfig = {}) {
    // API URL should be passed in from the factory which reads from centralized config
    const rawApiUrl = clientConfig.apiUrl ?? "/api";

    // Fail loud if nothing is set (helps diagnose issues instantly)
    if (!rawApiUrl || rawApiUrl === "undefined") {
      console.error("[DB-AUTH] FATAL: apiUrl is NOT configured!", {
        configApiUrl: clientConfig.apiUrl,
      });
      throw new Error(
        "API URL is not configured. Make sure VITE_API_URL is set in your frontend .env"
      );
    }

    // Normalize (remove trailing slash)
    this.apiUrl = rawApiUrl.replace(/\/+$/, "");
  }

  async signIn({ email, password }) {
    if (!email || !password) throw new Error("Email and password are required");

    const url = `${this.apiUrl}/api/v1/auth/login`;

    // SECURITY: credentials: 'include' sends httpOnly cookies
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "" }));
      throw new Error(errorData.message || "Invalid credentials");
    }

    const data = await res.json();

    if (!data.user) {
      throw new Error("Login response missing user data");
    }

    if (!data.tenant) {
      throw new Error("Login response missing tenant data");
    }

    return {
      user: data.user,
      tenant: data.tenant,
      accessToken: data.accessToken || data.token,
    };
  }

  async refreshSession() {
    const url = `${this.apiUrl}/api/v1/auth/refresh`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to refresh session");
    const data = await res.json();

    return {
      role: data.role,
      accessToken: data.accessToken || data.token,
    };
  }

  async signOut() {
    const url = `${this.apiUrl}/api/v1/auth/logout`;

    await fetch(url, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }

  /**
   * Sign up a new user and create their workspace.
   *
   * NOTE: Both DbAuthClient and CognitoPasswordClient use the same /register
   * endpoint on the auth-api Lambda. The /signup endpoint does NOT exist on
   * the backend and should not be used.
   *
   * IMPORTANT: The /register endpoint requires an accessToken from Cognito.
   * In DB auth mode (legacy), this flow will NOT work as-is because we don't
   * have a Cognito token. DB auth mode requires a backend endpoint that accepts
   * email/password directly, which is not currently implemented.
   *
   * For now, this calls /register to align with the backend contract, but the
   * call will fail with "Access token is required" unless the backend is updated
   * to support password-based registration.
   */
  async signUp({ email, password, tenantName, tenantSlug, name }) {
    const url = `${this.apiUrl}/api/v1/auth/register`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        tenantName,
        tenantSlug,
        name,
      }),
      credentials: "include",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "" }));
      throw new Error(errorData.message || "Sign up failed");
    }

    const data = await res.json();

    if (!data.user) {
      throw new Error("Signup response missing user data");
    }

    if (!data.tenant) {
      throw new Error("Signup response missing tenant data");
    }

    return data;
  }
}
