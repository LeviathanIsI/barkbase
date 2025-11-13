// SECURITY: Updated to use httpOnly cookies for JWT storage (XSS protection)
export class DbAuthClient {
  constructor(config) {
    this.apiUrl = config.apiUrl?.replace(/\/?$/, '');
  }

  async signIn({ email, password }) {
    if (!email || !password) throw new Error('Email and password are required');

    console.log('[DB-AUTH] Attempting login to:', `${this.apiUrl}/api/v1/auth/login`);

    // SECURITY: credentials: 'include' sends httpOnly cookies
    const res = await fetch(`${this.apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Send and receive cookies
    });

    console.log('[DB-AUTH] Login response status:', res.status);
    console.log('[DB-AUTH] Response headers:', {
      'set-cookie': res.headers.get('set-cookie'),
      'access-control-allow-credentials': res.headers.get('access-control-allow-credentials'),
      'access-control-allow-origin': res.headers.get('access-control-allow-origin')
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({message: ''}));
      console.error('[DB-AUTH] Login failed:', errorData);
      throw new Error(errorData.message || 'Invalid credentials');
    }

    const data = await res.json();

    console.log('[DB-AUTH] Raw response data:', data);
    console.log('[DB-AUTH] Login response data:', {
      hasUser: !!data.user,
      hasTenant: !!data.tenant,
      userRole: data.user?.role,
      userRecordId: data.user?.recordId,
      tenantId: data.tenant?.recordId,
      tenantSlug: data.tenant?.slug
    });

    // Validate response structure
    if (!data.user) {
      console.error('[DB-AUTH] ERROR: Response missing user data!', data);
      throw new Error('Login response missing user data');
    }

    if (!data.tenant) {
      console.error('[DB-AUTH] ERROR: Response missing tenant data!', data);
      throw new Error('Login response missing tenant data');
    }

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
    console.log('[DB-AUTH] Attempting signup to:', `${this.apiUrl}/api/v1/auth/signup`);

    // SECURITY: credentials: 'include' to receive httpOnly cookies
    const res = await fetch(`${this.apiUrl}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantName, tenantSlug, name }),
      credentials: 'include',
    });

    console.log('[DB-AUTH] Signup response status:', res.status);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({message: ''}));
      console.error('[DB-AUTH] Signup failed:', errorData);
      throw new Error(errorData.message || 'Sign up failed');
    }

    const data = await res.json();

    console.log('[DB-AUTH] Signup response data:', {
      hasUser: !!data.user,
      hasTenant: !!data.tenant,
      message: data.message
    });

    // Validate response structure
    if (!data.user) {
      console.error('[DB-AUTH] ERROR: Signup response missing user data!', data);
      throw new Error('Signup response missing user data');
    }

    if (!data.tenant) {
      console.error('[DB-AUTH] ERROR: Signup response missing tenant data!', data);
      throw new Error('Signup response missing tenant data');
    }

    return data;
  }
}


