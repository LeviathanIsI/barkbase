import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

export class CognitoPasswordClient {
  constructor(config) {
    this.region = config.region;
    this.clientId = config.clientId;
    this.client = new CognitoIdentityProviderClient({ region: this.region });
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


