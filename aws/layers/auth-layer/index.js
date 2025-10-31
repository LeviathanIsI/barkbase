const { 
    CognitoIdentityProviderClient,
    SignUpCommand,
    InitiateAuthCommand,
    GlobalSignOutCommand,
    GetUserCommand,
    ForgotPasswordCommand,
    ConfirmForgotPasswordCommand,
    ChangePasswordCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

class CognitoClient {
    constructor(config) {
        this.region = config.region;
        this.clientId = config.clientId;
        this.userPoolId = config.userPoolId;
        this.client = new CognitoIdentityProviderClient({ region: this.region });
    }

    /**
     * Signs up a new user in the Cognito User Pool.
     * Note: Does not sign the user in. They will need to confirm their email
     * and then sign in separately.
     */
    async signUp({ email, password, attributes = {} }) {
        const params = {
            ClientId: this.clientId,
            Username: email,
            Password: password,
            UserAttributes: [
                { Name: 'email', Value: email },
                // Convert other attributes to the required format
                ...Object.entries(attributes).map(([key, value]) => ({
                    Name: key,
                    Value: String(value),
                })),
            ],
        };

        try {
            const command = new SignUpCommand(params);
            const response = await this.client.send(command);
            return {
                user: {
                    username: response.UserSub,
                    email,
                },
                userConfirmed: response.UserConfirmed,
            };
        } catch (error) {
            console.error('Error signing up user:', error);
            // Re-throw a simplified error for the frontend
            throw new Error(error.message || 'An error occurred during sign up.');
        }
    }

    /**
     * Signs in a user and returns session tokens.
     */
    async signIn({ email, password }) {
        const params = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: this.clientId,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
            },
        };

        try {
            const command = new InitiateAuthCommand(params);
            const response = await this.client.send(command);
            
            if (!response.AuthenticationResult) {
                throw new Error('Authentication failed. Please check your credentials.');
            }

            return {
                idToken: response.AuthenticationResult.IdToken,
                accessToken: response.AuthenticationResult.AccessToken,
                refreshToken: response.AuthenticationResult.RefreshToken,
                expiresIn: response.AuthenticationResult.ExpiresIn,
            };
        } catch (error) {
            console.error('Error signing in user:', error);
            throw new Error(error.message || 'An error occurred during sign in.');
        }
    }

    /**
     * Signs out the user globally from all devices by invalidating all tokens.
     * The client application is responsible for clearing its local storage.
     */
    async signOut({ accessToken }) {
        const params = {
            AccessToken: accessToken,
        };

        try {
            const command = new GlobalSignOutCommand(params);
            await this.client.send(command);
            return { message: 'Successfully signed out' };
        } catch (error) {
            console.error('Error signing out user:', error);
            throw new Error(error.message || 'An error occurred during sign out.');
        }
    }

    /**
     * Retrieves the current user's details from Cognito using the access token.
     */
    async getCurrentUser({ accessToken }) {
        const params = {
            AccessToken: accessToken,
        };

        try {
            const command = new GetUserCommand(params);
            const response = await this.client.send(command);
            
            // The response contains user attributes in a specific format.
            // We can map them to a simpler object.
            const user = {
                username: response.Username,
                ...Object.fromEntries(response.UserAttributes.map(attr => [attr.Name, attr.Value]))
            };
            return user;
        } catch (error) {
            console.error('Error getting current user:', error);
            // This error often means the token is expired or invalid.
            throw new Error('Could not retrieve user. The session may be invalid.');
        }
    }

    /**
     * This is a placeholder. In a real client-side app, this would
     * retrieve the stored ID token. For the backend, this concept
     * doesn't directly apply as the token is passed in each request.
     */
    async getIdToken({ accessToken }) {
        // This method is more of a client-side concept.
        // The ID token is acquired during sign-in and should be stored securely
        // on the client (e.g., in memory or httpOnly cookie).
        console.warn('getIdToken is a client-side concept. Ensure you are handling tokens correctly.');
        // If we need to validate and decode the token, that would happen here
        // using a JWT library.
        return 'Placeholder: ID token should be retrieved from client-side storage.';
    }

    /**
     * Refreshes the session using a refresh token.
     */
    async refreshSession({ refreshToken }) {
        const params = {
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            ClientId: this.clientId,
            AuthParameters: {
                REFRESH_TOKEN: refreshToken,
            },
        };

        try {
            const command = new InitiateAuthCommand(params);
            const response = await this.client.send(command);
            
            if (!response.AuthenticationResult) {
                throw new Error('Failed to refresh session.');
            }

            // Cognito does not return a new refresh token in the refresh flow by default
            return {
                idToken: response.AuthenticationResult.IdToken,
                accessToken: response.AuthenticationResult.AccessToken,
                expiresIn: response.AuthenticationResult.ExpiresIn,
            };
        } catch (error) {
            console.error('Error refreshing session:', error);
            throw new Error(error.message || 'Could not refresh session.');
        }
    }
    
    /**
     * Initiates the forgot password flow for a user.
     */
    async forgotPassword(email) {
        const params = {
            ClientId: this.clientId,
            Username: email,
        };

        try {
            const command = new ForgotPasswordCommand(params);
            await this.client.send(command);
            return { message: `Password reset code sent to ${email}` };
        } catch (error) {
            console.error('Error in forgot password flow:', error);
            throw new Error(error.message || 'Could not initiate password reset.');
        }
    }

    /**
     * Confirms the new password using the code from the forgot password flow.
     */
    async confirmPassword({ email, code, newPassword }) {
        const params = {
            ClientId: this.clientId,
            Username: email,
            ConfirmationCode: code,
            Password: newPassword,
        };

        try {
            const command = new ConfirmForgotPasswordCommand(params);
            await this.client.send(command);
            return { message: 'Password has been successfully reset.' };
        } catch (error) {
            console.error('Error confirming new password:', error);
            throw new Error(error.message || 'Could not reset password.');
        }
    }

    /**
     * Allows a signed-in user to change their password.
     */
    async changePassword({ oldPassword, newPassword, accessToken }) {
        const params = {
            PreviousPassword: oldPassword,
            ProposedPassword: newPassword,
            AccessToken: accessToken,
        };

        try {
            const command = new ChangePasswordCommand(params);
            await this.client.send(command);
            return { message: 'Password changed successfully.' };
        } catch (error) {
            console.error('Error changing password:', error);
            throw new Error(error.message || 'Could not change password.');
        }
    }
}

const { JWTValidator } = require('./nodejs/jwt-validator');
const { PermissionFilter } = require('./nodejs/permission-filter');

module.exports = { CognitoClient, JWTValidator, PermissionFilter };
