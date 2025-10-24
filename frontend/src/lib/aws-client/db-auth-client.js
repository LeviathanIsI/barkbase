export class DbAuthClient {
  constructor(config) {
    this.apiUrl = config.apiUrl?.replace(/\/?$/, '');
  }

  async signIn({ email, password }) {
    if (!email || !password) throw new Error('Email and password are required');
    const res = await fetch(`${this.apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json().catch(()=>({message:''}))).message || 'Invalid credentials');
    const data = await res.json();
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      tenant: data.tenant,
      expiresIn: 900,
    };
  }

  async refreshSession({ refreshToken }) {
    const res = await fetch(`${this.apiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error('Failed to refresh');
    const data = await res.json();
    return { accessToken: data.accessToken, role: data.role, expiresIn: 900 };
  }

  async signOut({ accessToken }) {
    if (!accessToken) return;
    await fetch(`${this.apiUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
  }

  async signUp({ email, password, tenantName, tenantSlug, name }) {
    const res = await fetch(`${this.apiUrl}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantName, tenantSlug, name }),
    });
    if (!res.ok) throw new Error((await res.json().catch(()=>({message:''}))).message || 'Sign up failed');
    return await res.json();
  }
}


