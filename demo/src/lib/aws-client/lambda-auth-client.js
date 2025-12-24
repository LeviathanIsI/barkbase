// Lightweight Cognito Hosted UI PKCE client (no external deps)

function base64UrlEncode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(str) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(hash);
}

function randomCodeVerifier(len = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let out = '';
  const arr = crypto.getRandomValues(new Uint8Array(len));
  for (const v of arr) out += chars[v % chars.length];
  return out;
}

export class LambdaAuthClient {
  constructor(config) {
    this.apiUrl = config.apiUrl || '/api';
    this.region = config.region;
    this.userPoolId = config.userPoolId;
    this.clientId = config.clientId;
    this.domain = (config.cognitoDomain || '').replace(/\/+$/, '');
    this.redirectUri = config.redirectUri || (typeof window !== 'undefined' ? window.location.origin : '');
    this.logoutUri = config.logoutUri || (typeof window !== 'undefined' ? window.location.origin : '');
  }

  async signIn({ email } = {}) {
    if (!this.domain || !this.clientId) throw new Error('Cognito domain/clientId not configured');
    const verifier = randomCodeVerifier();
    const challenge = await sha256(verifier);
    try { sessionStorage.setItem('pkce_verifier', verifier); } catch {}

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'openid email profile',
      code_challenge_method: 'S256',
      code_challenge: challenge,
      ...(email ? { login_hint: email } : {}),
    });

    if (typeof window !== 'undefined') {
      window.location.assign(`${this.domain}/oauth2/authorize?${params.toString()}`);
    }
  }

  async handleCallback() {
    if (typeof window === 'undefined') return null;
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (!code) return null;

    let verifier = null;
    try { verifier = sessionStorage.getItem('pkce_verifier'); sessionStorage.removeItem('pkce_verifier'); } catch {}
    if (!verifier) throw new Error('Missing PKCE verifier');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      code,
      redirect_uri: this.redirectUri,
      code_verifier: verifier,
    });

    const res = await fetch(`${this.domain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error('Token exchange failed');
    const data = await res.json();

    // Clean URL
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, '', url.toString());

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresIn: data.expires_in,
      user: null,
      tenant: null,
    };
  }

  async refreshSession({ refreshToken }) {
    if (!refreshToken) throw new Error('Missing refresh token');
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      refresh_token: refreshToken,
    });
    const res = await fetch(`${this.domain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error('Failed to refresh session');
    const data = await res.json();
    return { accessToken: data.access_token, role: null, expiresIn: data.expires_in };
  }

  async signOut() {
    if (!this.domain || !this.clientId) return;
    const params = new URLSearchParams({ client_id: this.clientId, logout_uri: this.logoutUri });
    if (typeof window !== 'undefined') {
      window.location.assign(`${this.domain}/logout?${params.toString()}`);
    }
  }

  async getIdToken() {
    try {
      const raw = localStorage.getItem('barkbase-auth');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.state?.accessToken || null;
    } catch {
      return null;
    }
  }
}

