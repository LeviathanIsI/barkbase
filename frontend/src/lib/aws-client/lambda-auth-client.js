import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

export class LambdaAuthClient {
  constructor(config) {
    this.apiUrl = config.apiUrl || '/api';
    this.region = config.region;
    this.userPoolId = config.userPoolId;
    this.clientId = config.clientId;
    this.pool = new CognitoUserPool({ UserPoolId: this.userPoolId, ClientId: this.clientId });
  }

  async signIn({ email, password }) {
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    const user = new CognitoUser({ Username: email, Pool: this.pool });

    const session = await new Promise((resolve, reject) => {
      user.authenticateUser(authDetails, {
        onSuccess: resolve,
        onFailure: reject,
      });
    });

    return {
      accessToken: session.getAccessToken().getJwtToken(),
      refreshToken: session.getRefreshToken().getToken(),
      user: { email },
      tenant: null,
    };
  }

  async signUp({ email, password }) {
    const result = await new Promise((resolve, reject) => {
      this.pool.signUp(email, password, [{ Name: 'email', Value: email }], null, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
    return { user: { username: result.userSub, email } };
  }

  async refreshSession({ refreshToken }) {
    const cognitoUser = await this._getCurrentUser();
    if (!cognitoUser) throw new Error('No user');
    const CognitoRefreshToken = (await import('amazon-cognito-identity-js')).CognitoRefreshToken;
    const rt = new CognitoRefreshToken({ RefreshToken: refreshToken });
    const session = await new Promise((resolve, reject) => {
      cognitoUser.refreshSession(rt, (err, newSession) => {
        if (err) return reject(err);
        resolve(newSession);
      });
    });
    return { accessToken: session.getAccessToken().getJwtToken(), role: null };
  }

  async signOut() {
    const cognitoUser = await this._getCurrentUser();
    if (cognitoUser) cognitoUser.signOut();
  }

  async getIdToken() {
    const cognitoUser = await this._getCurrentUser();
    if (!cognitoUser) return null;
    const session = await this._getSession(cognitoUser);
    return session.getIdToken().getJwtToken();
  }

  async _getCurrentUser() {
    return this.pool.getCurrentUser();
  }

  async _getSession(cognitoUser) {
    return await new Promise((resolve, reject) => {
      cognitoUser.getSession((err, session) => {
        if (err) return reject(err);
        resolve(session);
      });
    });
  }
}

