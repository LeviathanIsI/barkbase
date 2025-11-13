// SECURITY: Updated to use httpOnly cookies for JWT storage (XSS protection)
export class DbAuthClient {
  constructor(config) {
    this.apiUrl = config.apiUrl?.replace(/\/?$/, '');
  }

  async signIn({ email, password }) {
    if (!email || !password) throw new Error('Email and password are required');
    // SECURITY: credentials: 'include' sends httpOnly cookies
    const res = await fetch(`${this.apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Send and receive cookies
    });
    if (!res.ok) throw new Error((await res.json().catch(()=>({message:''}))).message || 'Invalid credentials');
    const data = await res.json();
    // SECURITY: Tokens are in httpOnly cookies (not in response body)
    return {
      user: data.user,
      tenant: data.tenant,
      // REMOVED: accessToken and refreshToken (now in httpOnly cookies)
    };
  }

  async refreshSession() {
    // SECURITY: refreshToken comes from httpOnly cookies (not body)
    const res = await fetch(`${this.apiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send cookies with refresh token
    });
    if (!res.ok) throw new Error('Failed to refresh');
    const data = await res.json();
    return { role: data.role };
  }

  async signOut() {
    // SECURITY: accessToken comes from httpOnly cookies (not parameter)
    await fetch(`${this.apiUrl}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include', // Send cookies for logout
    }).catch(() => {});
  }

  async signUp({ email, password, tenantName, tenantSlug, name }) {
    // SECURITY: credentials: 'include' to receive httpOnly cookies
    const res = await fetch(`${this.apiUrl}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantName, tenantSlug, name }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error((await res.json().catch(()=>({message:''}))).message || 'Sign up failed');
    return await res.json();
  }
}


