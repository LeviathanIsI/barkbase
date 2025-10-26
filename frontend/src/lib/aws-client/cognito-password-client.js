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
    this.client = new CognitoIdentityProviderClient({ region: this.region });
  }

  async signUp({ email, password, name, tenantName }) {
    if (!this.clientId) throw new Error('Cognito clientId not configured');
    if (!email || !password) throw new Error('Email and password are required');
    
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
    
    // Since we auto-confirm users (via Pre-SignUp trigger), 
    // immediately sign them in to get tokens
    const signInResult = await this.signIn({ email, password });
    
    return {
      user: {
        id: res.UserSub,
        email: email,
        emailVerified: true,
      },
      accessToken: signInResult.accessToken,
      refreshToken: signInResult.refreshToken,
      tenant: {
        recordId: 'temp', // Will be fetched from API
        name: tenantName || `${name || email.split('@')[0]}'s Organization`,
        slug: 'temp',
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


