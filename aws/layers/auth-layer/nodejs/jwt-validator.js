const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

class JWTValidator {
    constructor(config) {
        this.region = config.region || process.env.AWS_REGION;
        this.userPoolId = config.userPoolId || process.env.USER_POOL_ID;
        this.clientId = config.clientId || process.env.CLIENT_ID;
        
        // Setup JWKS client for Cognito
        this.client = jwksClient({
            jwksUri: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`,
            cache: true,
            cacheMaxAge: 600000, // 10 min
            rateLimit: true,
            jwksRequestsPerMinute: 10
        });
    }

    getKey(header, callback) {
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
     * Validates a JWT token from Cognito
     * @param {string} token - The JWT token to validate
     * @returns {Promise<object>} The decoded token payload
     */
    async validateToken(token) {
        return new Promise((resolve, reject) => {
            jwt.verify(
                token,
                this.getKey.bind(this),
                {
                    algorithms: ['RS256'],
                    issuer: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`,
                    audience: this.clientId,
                },
                (err, decoded) => {
                    if (err) {
                        reject(new Error('Invalid token: ' + err.message));
                    } else {
                        // Additional validation
                        const now = Math.floor(Date.now() / 1000);
                        if (decoded.exp && decoded.exp < now) {
                            reject(new Error('Token expired'));
                        } else if (decoded.token_use !== 'access' && decoded.token_use !== 'id') {
                            reject(new Error('Token must be an access or id token'));
                        } else {
                            resolve(decoded);
                        }
                    }
                }
            );
        });
    }

    /**
     * Extracts user information from the token
     * @param {object} decoded - The decoded JWT payload
     * @returns {object} User information
     */
    extractUserInfo(decoded) {
        return {
            userId: decoded.sub,
            email: decoded.email || decoded['cognito:username'],
            groups: decoded['cognito:groups'] || [],
            // Custom attributes should be prefixed with 'custom:'
            tenantId: decoded['custom:tenant_id'],
            role: decoded['custom:role'] || this.extractRoleFromGroups(decoded['cognito:groups']),
            username: decoded['cognito:username'],
            tokenUse: decoded.token_use,
            expiresAt: decoded.exp * 1000 // Convert to milliseconds
        };
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
        const decoded = await this.validateToken(token);
        return this.extractUserInfo(decoded);
    }
}

module.exports = { JWTValidator };
