const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

class JWTValidator {
    constructor(config) {
        this.region = config.region || process.env.AWS_REGION;
        this.userPoolId = config.userPoolId || process.env.USER_POOL_ID;
        this.clientId = config.clientId || process.env.CLIENT_ID;
        
        // JWT secrets for HS256 custom tokens (from auth-api)
        this.jwtSecret = process.env.JWT_SECRET;
        this.jwtSecretOld = process.env.JWT_SECRET_OLD; // For rotation support
        
        // Setup JWKS client for Cognito RS256 tokens
        if (this.userPoolId && this.region) {
            this.client = jwksClient({
                jwksUri: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`,
                cache: true,
                cacheMaxAge: 600000, // 10 min
                rateLimit: true,
                jwksRequestsPerMinute: 10
            });
        }
    }

    getKey(header, callback) {
        if (!this.client) {
            callback(new Error('JWKS client not configured'));
            return;
        }
        this.client.getSigningKey(header.kid, (err, key) => {
            if (err) {
                callback(err);
            } else {
                const signingKey = key.getPublicKey();
                callback(null, signingKey);
            }
        });
    }

    /**
     * Validates a custom HS256 JWT token (from auth-api)
     * @param {string} token - The JWT token to validate
     * @returns {object|null} The decoded token payload or null if invalid
     */
    validateHS256Token(token) {
        // Try primary secret first
        if (this.jwtSecret) {
            try {
                const decoded = jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] });
                console.log('[JWT] HS256 token validated with primary secret');
                return decoded;
            } catch (e) {
                // Try old secret for rotation support
                if (this.jwtSecretOld) {
                    try {
                        const decoded = jwt.verify(token, this.jwtSecretOld, { algorithms: ['HS256'] });
                        console.log('[JWT] HS256 token validated with rotation secret');
                        return decoded;
                    } catch (e2) {
                        // Neither secret worked
                    }
                }
            }
        }
        return null;
    }

    /**
     * Validates a Cognito RS256 JWT token
     * @param {string} token - The JWT token to validate
     * @returns {Promise<object>} The decoded token payload
     */
    async validateCognitoToken(token) {
        if (!this.client) {
            throw new Error('Cognito JWKS client not configured');
        }

        return new Promise((resolve, reject) => {
            // Note: Don't use 'audience' option because:
            // - Cognito ACCESS tokens use 'client_id' claim (not 'aud')
            // - Cognito ID tokens use 'aud' claim
            // We verify client_id/aud manually after decoding
            jwt.verify(
                token,
                this.getKey.bind(this),
                {
                    algorithms: ['RS256'],
                    issuer: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`,
                },
                (err, decoded) => {
                    if (err) {
                        reject(new Error('Invalid Cognito token: ' + err.message));
                    } else {
                        // Additional validation
                        const now = Math.floor(Date.now() / 1000);
                        if (decoded.exp && decoded.exp < now) {
                            reject(new Error('Token expired'));
                        } else if (decoded.token_use !== 'access' && decoded.token_use !== 'id') {
                            reject(new Error('Token must be an access or id token'));
                        } else {
                            // Verify client_id (for access tokens) or aud (for ID tokens)
                            const tokenClientId = decoded.client_id || decoded.aud;
                            if (tokenClientId !== this.clientId) {
                                reject(new Error(`Invalid client_id: expected ${this.clientId}, got ${tokenClientId}`));
                            } else {
                                resolve(decoded);
                            }
                        }
                    }
                }
            );
        });
    }

    /**
     * Validates a JWT token - tries HS256 first (faster), then Cognito RS256
     * @param {string} token - The JWT token to validate
     * @returns {Promise<{decoded: object, tokenType: string}>} The decoded token and its type
     */
    async validateToken(token) {
        // Try HS256 first (custom tokens from auth-api) - faster, no network call
        const hs256Decoded = this.validateHS256Token(token);
        if (hs256Decoded) {
            return { decoded: hs256Decoded, tokenType: 'custom' };
        }

        // Fall back to Cognito RS256 validation
        console.log('[JWT] HS256 validation failed, trying Cognito RS256...');
        try {
            const cognitoDecoded = await this.validateCognitoToken(token);
            console.log('[JWT] Cognito RS256 token validated');
            return { decoded: cognitoDecoded, tokenType: 'cognito' };
        } catch (cognitoError) {
            console.error('[JWT] Both HS256 and RS256 validation failed');
            throw new Error('Token validation failed: ' + cognitoError.message);
        }
    }

    /**
     * Extracts user information from a custom HS256 token
     * @param {object} decoded - The decoded JWT payload
     * @returns {object} User information
     */
    extractCustomUserInfo(decoded) {
        return {
            sub: decoded.sub,
            userId: decoded.sub,
            tenantId: decoded.tenantId,
            membershipId: decoded.membershipId,
            role: decoded.role || 'USER',
            email: decoded.email,
            username: decoded.username,
            tokenType: 'custom',
            expiresAt: decoded.exp ? decoded.exp * 1000 : null
        };
    }

    /**
     * Extracts user information from a Cognito RS256 token
     * @param {object} decoded - The decoded JWT payload
     * @returns {object} User information
     */
    extractCognitoUserInfo(decoded) {
        return {
            sub: decoded.sub,
            userId: decoded.sub,
            email: decoded.email || decoded['cognito:username'],
            groups: decoded['cognito:groups'] || [],
            tenantId: decoded['custom:tenant_id'] || decoded['custom:tenantId'],
            role: decoded['custom:role'] || this.extractRoleFromGroups(decoded['cognito:groups']),
            username: decoded['cognito:username'],
            tokenUse: decoded.token_use,
            tokenType: 'cognito',
            expiresAt: decoded.exp * 1000
        };
    }

    /**
     * Extracts user information from the token based on its type
     * @param {object} decoded - The decoded JWT payload
     * @param {string} tokenType - 'custom' or 'cognito'
     * @returns {object} User information
     */
    extractUserInfo(decoded, tokenType = 'cognito') {
        if (tokenType === 'custom') {
            return this.extractCustomUserInfo(decoded);
        }
        return this.extractCognitoUserInfo(decoded);
    }

    /**
     * Extract role from Cognito groups
     * @param {string[]} groups - Array of Cognito groups
     * @returns {string} The highest role found
     */
    extractRoleFromGroups(groups = []) {
        // Define role hierarchy
        const roleHierarchy = ['OWNER', 'ADMIN', 'STAFF', 'VIEWER'];
        
        for (const role of roleHierarchy) {
            if (groups.includes(role)) {
                return role;
            }
        }
        
        return 'VIEWER'; // Default role
    }

    /**
     * Validates the Authorization header and returns user info
     * @param {object} event - Lambda event object
     * @returns {Promise<object>} User information from the token
     */
    async validateRequest(event) {
        const authHeader = event.headers?.authorization || event.headers?.Authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Missing or invalid Authorization header');
        }
        
        const token = authHeader.split(' ')[1];
        const { decoded, tokenType } = await this.validateToken(token);
        return this.extractUserInfo(decoded, tokenType);
    }
}

module.exports = { JWTValidator };
