/**
 * Lambda JWT Auth Client
 * Replaces Cognito authentication with custom Lambda JWT auth
 */
export class LambdaAuthClient {
  constructor(config) {
    this.apiUrl = config.apiUrl || '/api';
  }

  /**
   * Sign in with email and password
   */
  async signIn({ email, password }) {
    const response = await fetch(`${this.apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Invalid credentials');
    }

    const data = await response.json();
    
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      tenant: data.tenant,
    };
  }

  /**
   * Sign up - create new tenant/workspace
   */
  async signUp({ email, password, tenantName, tenantSlug, name }) {
    const response = await fetch(`${this.apiUrl}/api/v1/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, tenantName, tenantSlug, name }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Signup failed' }));
      throw new Error(error.message || 'Could not create account');
    }

    const data = await response.json();
    
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      tenant: data.tenant,
    };
  }

  /**
   * Refresh access token
   */
  async refreshSession({ refreshToken }) {
    const response = await fetch(`${this.apiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh session');
    }

    const data = await response.json();
    
    return {
      accessToken: data.accessToken,
      role: data.role,
    };
  }

  /**
   * Sign out
   */
  async signOut(accessToken) {
    try {
      await fetch(`${this.apiUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Ignore errors on logout
    }
  }

  /**
   * Get current user (not implemented - user info comes from login)
   */
  async getCurrentUser() {
    // This would require a /me endpoint on the backend
    throw new Error('Not implemented - user info comes from login response');
  }
}

