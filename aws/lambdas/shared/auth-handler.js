/**
 * Enhanced authorization handler with fallback JWT validation
 * Handles both API Gateway JWT claims and manual JWT validation
 */

const { getJWTValidator, getTenantIdFromEvent } = require('/opt/nodejs');

/**
 * Extract user info from event with fallback to manual JWT validation
 * @param {Object} event - Lambda event
 * @returns {Object|null} User info object or null if unauthorized
 */
async function getUserInfoFromEventWithFallback(event) {
    // First, try to get claims from API Gateway JWT authorizer
    const claims = event?.requestContext?.authorizer?.jwt?.claims;

    if (claims) {
        console.log('[AUTH] Using API Gateway JWT claims');
        return {
            sub: claims.sub,
            username: claims.username || claims['cognito:username'],
            email: claims.email,
            tenantId: claims['custom:tenantId'] || claims.tenantId,
            userId: claims.sub,
            role: claims['custom:role'] || 'USER'
        };
    }

    // Fallback: Manual JWT validation
    console.log('[AUTH] No API Gateway claims found, falling back to manual JWT validation');

    try {
        // Get Authorization header
        const authHeader = event?.headers?.Authorization || event?.headers?.authorization;

        if (!authHeader) {
            console.error('[AUTH] No Authorization header found');
            return null;
        }

        // Initialize JWT validator and validate token
        const jwtValidator = getJWTValidator();
        const userInfo = await jwtValidator.validateRequest(event);

        if (!userInfo) {
            console.error('[AUTH] JWT validation failed');
            return null;
        }

        console.log('[AUTH] Manual JWT validation successful');

        // Get tenant ID from the validated token or database
        const tenantId = userInfo.tenantId || userInfo['custom:tenantId'] || await getTenantIdFromEvent(event);

        return {
            sub: userInfo.sub,
            username: userInfo.username || userInfo['cognito:username'],
            email: userInfo.email,
            tenantId: tenantId,
            userId: userInfo.sub,
            role: userInfo.role || userInfo['custom:role'] || 'USER'
        };
    } catch (error) {
        console.error('[AUTH] Manual JWT validation error:', error.message);
        return null;
    }
}

/**
 * Validate authorization and return user info
 * @param {Object} event - Lambda event
 * @returns {Object} Response object with userInfo or error
 */
async function validateAuthWithFallback(event) {
    const userInfo = await getUserInfoFromEventWithFallback(event);

    if (!userInfo) {
        console.error('[AUTH] Authorization failed - no valid user info');
        return {
            isValid: false,
            error: {
                statusCode: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id',
                    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE'
                },
                body: JSON.stringify({ message: 'Unauthorized' })
            }
        };
    }

    // Get tenant ID if not already present
    if (!userInfo.tenantId) {
        try {
            userInfo.tenantId = await getTenantIdFromEvent(event);
        } catch (error) {
            console.error('[AUTH] Failed to get tenant ID:', error.message);
        }
    }

    if (!userInfo.tenantId) {
        console.error('[AUTH] No tenant context found');
        return {
            isValid: false,
            error: {
                statusCode: 401,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id',
                    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE'
                },
                body: JSON.stringify({ message: 'Missing tenant context' })
            }
        };
    }

    return {
        isValid: true,
        userInfo: userInfo,
        tenantId: userInfo.tenantId
    };
}

module.exports = {
    getUserInfoFromEventWithFallback,
    validateAuthWithFallback
};