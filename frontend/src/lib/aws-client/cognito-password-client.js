import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  ConfirmSignUpCommand
} from '@aws-sdk/client-cognito-identity-provider';

export class CognitoPasswordClient {
  constructor(config) {
    this.region = config.region;
    this.clientId = config.clientId;
    this.apiBaseUrl = config.apiUrl || config.apiBaseUrl; // Accept both naming conventions
    this.client = new CognitoIdentityProviderClient({ region: this.region });
  }

  async signUp({ email, password, name, tenantName, tenantSlug }) {
    if (!this.apiBaseUrl) throw new Error('API base URL not configured');
    if (!email || !password) throw new Error('Email and password are required');

    // Call backend to handle everything: DB first, then Cognito
    // Backend will create tenant, user, roles in DB, then create Cognito user
    // If Cognito fails, backend rolls back DB changes
    const registerResponse = await fetch(`${this.apiBaseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name: name || email.split('@')[0],
        tenantName: tenantName || `${name || email.split('@')[0]}'s Workspace`,
        tenantSlug: tenantSlug,
      }),
      mode: 'cors',
      credentials: 'omit',
    });

    if (!registerResponse.ok) {
      const errorData = await registerResponse.json().catch(() => ({}));
      console.error('[CognitoPasswordClient] Registration failed:', errorData);
      throw new Error(errorData.message || 'Failed to create account');
    }

    const registerData = await registerResponse.json();

    // Check if user needs email verification
    if (registerData.needsVerification) {
      return {
        needsVerification: true,
        email: email,
        message: registerData.message || 'Please check your email to verify your account',
        user: registerData.user ? {
          id: registerData.user.id,
          recordId: registerData.user.recordId,
          email: email,
          emailVerified: false,
          firstName: registerData.user.firstName,
          lastName: registerData.user.lastName,
          role: registerData.user.role || 'OWNER',
          roles: registerData.user.roles || ['OWNER'],
          tenantId: registerData.user.tenantId,
        } : null,
        tenant: registerData.tenant || null,
      };
    }

    // Backend returns tokens if auto-confirmed
    return {
      user: {
        id: registerData.user?.id,
        recordId: registerData.user?.recordId,
        email: email,
        emailVerified: true,
        firstName: registerData.user?.firstName,
        lastName: registerData.user?.lastName,
        role: registerData.user?.role || 'OWNER',
        roles: registerData.user?.roles || ['OWNER'],
        tenantId: registerData.user?.tenantId,
      },
      accessToken: registerData.tokens?.accessToken,
      refreshToken: registerData.tokens?.refreshToken,
      idToken: registerData.tokens?.idToken,
      tenant: registerData.tenant || {
        id: null,
        name: tenantName || `${name || email.split('@')[0]}'s Workspace`,
        slug: tenantSlug || 'temp',
        plan: 'FREE',
      },
    };
  }

  async confirmSignUp({ email, code }) {
    if (!this.clientId) throw new Error('Cognito clientId not configured');
    if (!email || !code) throw new Error('Email and confirmation code are required');
    
    const command = new ConfirmSignUpCommand({
      ClientId: this.clientId,
      Username: email,
      ConfirmationCode: code,
    });
    
    await this.client.send(command);
    return { success: true };
  }

  async signIn({ email, password }) {
    if (!this.clientId) throw new Error('Cognito clientId not configured');
    if (!email || !password) throw new Error('Email and password are required');
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: this.clientId,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    });
    const res = await this.client.send(command);

    // Check if MFA challenge is required
    if (res.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
      return {
        mfaRequired: true,
        challengeName: res.ChallengeName,
        session: res.Session,
        email: email,
      };
    }

    const tokens = res.AuthenticationResult;
    if (!tokens?.AccessToken) throw new Error('Authentication failed');
    return {
      accessToken: tokens.AccessToken,
      idToken: tokens.IdToken,
      refreshToken: tokens.RefreshToken,
      expiresIn: tokens.ExpiresIn,
      user: null,
      tenant: null,
    };
  }

  async respondToMfaChallenge({ session, code, email }) {
    if (!this.apiBaseUrl) throw new Error('API base URL not configured');
    if (!session || !code || !email) throw new Error('Session, code, and email are required');

    const response = await fetch(`${this.apiBaseUrl}/api/v1/auth/mfa/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session, code, email }),
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'MFA verification failed');
    }

    const data = await response.json();
    return {
      accessToken: data.tokens.accessToken,
      idToken: data.tokens.idToken,
      refreshToken: data.tokens.refreshToken,
      expiresIn: data.tokens.expiresIn,
      user: null,
      tenant: null,
    };
  }

  async refreshSession({ refreshToken }) {
    if (!this.clientId) throw new Error('Cognito clientId not configured');
    if (!refreshToken) throw new Error('Missing refresh token');
    const command = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: this.clientId,
      AuthParameters: { REFRESH_TOKEN: refreshToken },
    });
    const res = await this.client.send(command);
    const tokens = res.AuthenticationResult;
    if (!tokens?.AccessToken) throw new Error('Failed to refresh session');
    return { accessToken: tokens.AccessToken, expiresIn: tokens.ExpiresIn };
  }

  async signOut() {
    // Stateless client: tokens live in app store. Nothing to call here.
  }

  async getIdToken() {
    return null;
  }
}


