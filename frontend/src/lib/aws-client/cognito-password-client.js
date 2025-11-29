import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
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
    if (!this.clientId) throw new Error('Cognito clientId not configured');
    if (!email || !password) throw new Error('Email and password are required');

    console.log('[CognitoPasswordClient] Starting signup for:', email);

    // Step 1: Create user in Cognito
    const command = new SignUpCommand({
      ClientId: this.clientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name || email.split('@')[0] }
      ]
    });

    const res = await this.client.send(command);
    console.log('[CognitoPasswordClient] Cognito user created:', res.UserSub);

    // Step 2: Sign in to get tokens (Cognito auto-confirms via Pre-SignUp trigger)
    const signInResult = await this.signIn({ email, password });
    console.log('[CognitoPasswordClient] User signed in, got access token');

    // Step 3: Call backend to create Tenant and User records in database
    console.log('[CognitoPasswordClient] Calling backend /api/v1/auth/register to create tenant/user');

    const registerResponse = await fetch(`${this.apiBaseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${signInResult.accessToken}`,
      },
      body: JSON.stringify({
        accessToken: signInResult.accessToken,
        email,
        name: name || email.split('@')[0],
        tenantName: tenantName || `${name || email.split('@')[0]}'s Workspace`,
        tenantSlug: tenantSlug,
      }),
      // Use 'cors' mode without credentials to avoid complex preflight issues
      mode: 'cors',
      credentials: 'omit',
    });

    if (!registerResponse.ok) {
      const errorData = await registerResponse.json().catch(() => ({}));
      console.error('[CognitoPasswordClient] Backend registration failed:', errorData);
      throw new Error(errorData.message || 'Failed to create workspace in database');
    }

    const registerData = await registerResponse.json();
    console.log('[CognitoPasswordClient] Backend registration successful:', registerData);

    return {
      user: {
        id: res.UserSub,
        recordId: registerData.user?.recordId,
        email: email,
        emailVerified: true,
        firstName: registerData.user?.firstName,
        lastName: registerData.user?.lastName,
        role: registerData.user?.role || 'OWNER',
      },
      accessToken: signInResult.accessToken,
      refreshToken: signInResult.refreshToken,
      idToken: signInResult.idToken,
      tenant: registerData.tenant || {
        recordId: null,
        name: tenantName || `${name || email.split('@')[0]}'s Workspace`,
        slug: tenantSlug || 'temp',
        plan: 'FREE'
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


