// SECURITY: Updated to use httpOnly cookies for JWT storage (XSS protection)
export class DbAuthClient {
  constructor(config = {}) {
    // Gather possible API URL sources
    const envApiUrl = import.meta.env?.VITE_API_URL;
    const rawApiUrl = config.apiUrl ?? envApiUrl ?? "/api";

    // Fail loud if nothing is set (helps diagnose issues instantly)
    if (!rawApiUrl || rawApiUrl === "undefined") {
      console.error("[DB-AUTH] FATAL: apiUrl is NOT configured!", {
        configApiUrl: config.apiUrl,
        envApiUrl,
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

  async signUp({ email, password, tenantName, tenantSlug, name }) {
    const url = `${this.apiUrl}/api/v1/auth/signup`;

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
