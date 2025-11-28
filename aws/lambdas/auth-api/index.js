/**
 * =============================================================================
 * BarkBase Auth API Lambda
 * =============================================================================
 * 
 * Handles authentication endpoints:
 * - POST /api/v1/auth/login - User login (validates Cognito tokens)
 * - POST /api/v1/auth/register - User registration
 * - POST /api/v1/auth/refresh - Token refresh
 * - GET /api/v1/auth/me - Get current user info
 * - POST /api/v1/auth/logout - User logout
 * - GET /api/v1/health - Health check
 * 
 * =============================================================================
 */

// Import from layers (mounted at /opt/nodejs in Lambda)
let dbLayer, sharedLayer;

try {
  dbLayer = require('/opt/nodejs/db');
  sharedLayer = require('/opt/nodejs/index');
} catch (e) {
  // Local development fallback
  dbLayer = require('../../layers/db-layer/nodejs/db');
  sharedLayer = require('../../layers/shared-layer/nodejs/index');
}

const { getPoolAsync, query } = dbLayer;
const { 
  authenticateRequest, 
  createResponse, 
  parseBody,
  validateToken,
  getAuthConfig,
} = sharedLayer;

/**
 * Route requests to appropriate handlers
 */
exports.handler = async (event, context) => {
  // Prevent Lambda from waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  console.log('[AUTH-API] Request:', {
    method: event.requestContext?.http?.method || event.httpMethod,
    path: event.requestContext?.http?.path || event.path,
    headers: Object.keys(event.headers || {}),
  });

  try {
    const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
    const path = event.requestContext?.http?.path || event.path || '/';

    // Health check endpoint
    if (path === '/api/v1/health' || path === '/health') {
      return handleHealthCheck();
    }

    // Route to appropriate handler
    if (path === '/api/v1/auth/me' || path === '/auth/me') {
      return handleGetMe(event);
    }

    if (path === '/api/v1/auth/login' || path === '/auth/login') {
      if (method === 'POST') {
        return handleLogin(event);
      }
    }

    if (path === '/api/v1/auth/register' || path === '/auth/register') {
      if (method === 'POST') {
        return handleRegister(event);
      }
    }

    if (path === '/api/v1/auth/refresh' || path === '/auth/refresh') {
      if (method === 'POST') {
        return handleRefresh(event);
      }
    }

    if (path === '/api/v1/auth/logout' || path === '/auth/logout') {
      if (method === 'POST') {
        return handleLogout(event);
      }
    }

    if (path === '/api/v1/auth/sessions' || path === '/auth/sessions') {
      return handleSessions(event, method);
    }

    // Default response for unmatched routes
    return createResponse(404, {
      error: 'Not Found',
      message: `Route ${method} ${path} not found`,
    });

  } catch (error) {
    console.error('[AUTH-API] Unhandled error:', error);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
    });
  }
};

/**
 * Health check endpoint
 */
async function handleHealthCheck() {
  let dbStatus = 'unknown';
  
  try {
    await getPoolAsync();
    const result = await query('SELECT 1 as healthy');
    dbStatus = result.rows[0]?.healthy === 1 ? 'healthy' : 'unhealthy';
  } catch (error) {
    console.warn('[AUTH-API] DB health check failed:', error.message);
    dbStatus = 'unhealthy';
  }

  return createResponse(200, {
    status: 'ok',
    service: 'auth-api',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
  });
}

/**
 * Get current user info
 */
async function handleGetMe(event) {
  const authResult = await authenticateRequest(event);

  if (!authResult.authenticated) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: authResult.error || 'Authentication required',
    });
  }

  const { user } = authResult;

  // Optionally fetch additional user data from database
  let dbUser = null;
  try {
    await getPoolAsync();
    const result = await query(
      `SELECT "id", "email", "name", "role", "tenantId", "createdAt", "updatedAt"
       FROM "User"
       WHERE "cognitoId" = $1 OR "id" = $1
       LIMIT 1`,
      [user.id]
    );
    dbUser = result.rows[0] || null;
  } catch (error) {
    console.warn('[AUTH-API] Failed to fetch user from DB:', error.message);
  }

  return createResponse(200, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name || dbUser?.name,
      emailVerified: user.emailVerified,
      tenantId: user.tenantId || dbUser?.tenantId,
      role: user.role || dbUser?.role,
      createdAt: dbUser?.createdAt,
      updatedAt: dbUser?.updatedAt,
    },
  });
}

/**
 * Handle login - validates provided tokens
 */
async function handleLogin(event) {
  const body = parseBody(event);
  
  // This endpoint primarily validates existing tokens
  // Actual Cognito authentication happens on the client side
  const { accessToken, idToken } = body;

  if (!accessToken) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Access token is required',
    });
  }

  try {
    const config = getAuthConfig();
    
    const payload = await validateToken(accessToken, {
      jwksUrl: config.jwksUrl,
      issuer: config.issuer,
      clientId: config.clientId,
      tokenType: 'access',
    });

    // Optionally sync user to database
    let dbUser = null;
    try {
      await getPoolAsync();
      
      // Upsert user record
      const result = await query(
        `INSERT INTO "User" ("cognitoId", "email", "name", "updatedAt")
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT ("cognitoId") DO UPDATE SET
           "email" = EXCLUDED."email",
           "name" = EXCLUDED."name",
           "updatedAt" = NOW()
         RETURNING "id", "email", "name", "role", "tenantId"`,
        [payload.sub, payload.email, payload.name || payload['cognito:username']]
      );
      dbUser = result.rows[0];
    } catch (dbError) {
      console.warn('[AUTH-API] Failed to sync user to DB:', dbError.message);
    }

    return createResponse(200, {
      success: true,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload['cognito:username'],
        tenantId: payload['custom:tenantId'] || dbUser?.tenantId,
        role: payload['custom:role'] || dbUser?.role,
      },
    });

  } catch (error) {
    console.error('[AUTH-API] Token validation failed:', error.message);
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Handle registration - creates user record after Cognito signup
 */
async function handleRegister(event) {
  const body = parseBody(event);
  const { accessToken, email, name, tenantName } = body;

  if (!accessToken) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Access token is required',
    });
  }

  try {
    const config = getAuthConfig();
    
    const payload = await validateToken(accessToken, {
      jwksUrl: config.jwksUrl,
      issuer: config.issuer,
      clientId: config.clientId,
      tokenType: 'access',
    });

    // Create user and tenant in database
    let user = null;
    let tenant = null;

    try {
      await getPoolAsync();
      
      // Create tenant first
      const tenantResult = await query(
        `INSERT INTO "Tenant" ("name", "slug", "plan", "createdAt", "updatedAt")
         VALUES ($1, $2, 'FREE', NOW(), NOW())
         RETURNING "id", "name", "slug", "plan"`,
        [
          tenantName || `${name || email.split('@')[0]}'s Organization`,
          `tenant-${payload.sub.substring(0, 8)}`,
        ]
      );
      tenant = tenantResult.rows[0];

      // Create user with tenant association
      const userResult = await query(
        `INSERT INTO "User" ("cognitoId", "email", "name", "tenantId", "role", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'OWNER', NOW(), NOW())
         RETURNING "id", "email", "name", "role", "tenantId"`,
        [payload.sub, email || payload.email, name || payload.name, tenant.id]
      );
      user = userResult.rows[0];

    } catch (dbError) {
      console.error('[AUTH-API] Failed to create user/tenant:', dbError.message);
      // Don't fail the request - user is already in Cognito
    }

    return createResponse(201, {
      success: true,
      user: {
        id: payload.sub,
        email: email || payload.email,
        name: name || payload.name,
        tenantId: tenant?.id,
        role: 'OWNER',
      },
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
      } : null,
    });

  } catch (error) {
    console.error('[AUTH-API] Registration failed:', error.message);
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Handle token refresh
 */
async function handleRefresh(event) {
  // Token refresh is handled by Cognito directly on the client
  // This endpoint can be used to update last active timestamp
  
  const authResult = await authenticateRequest(event);

  if (!authResult.authenticated) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: authResult.error || 'Authentication required',
    });
  }

  try {
    await getPoolAsync();
    await query(
      `UPDATE "User" SET "lastActiveAt" = NOW() WHERE "cognitoId" = $1`,
      [authResult.user.id]
    );
  } catch (error) {
    console.warn('[AUTH-API] Failed to update last active:', error.message);
  }

  return createResponse(200, {
    success: true,
    message: 'Session refreshed',
  });
}

/**
 * Handle logout
 */
async function handleLogout(event) {
  const authResult = await authenticateRequest(event);

  if (!authResult.authenticated) {
    // Still return success for logout even if not authenticated
    return createResponse(200, {
      success: true,
      message: 'Logged out',
    });
  }

  // Optionally record logout in database
  try {
    await getPoolAsync();
    await query(
      `UPDATE "AuthSession" SET "isRevoked" = TRUE WHERE "userId" = $1`,
      [authResult.user.id]
    );
  } catch (error) {
    console.warn('[AUTH-API] Failed to revoke sessions:', error.message);
  }

  return createResponse(200, {
    success: true,
    message: 'Logged out successfully',
  });
}

/**
 * Handle session management
 */
async function handleSessions(event, method) {
  const authResult = await authenticateRequest(event);

  if (!authResult.authenticated) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: authResult.error || 'Authentication required',
    });
  }

  const { user } = authResult;

  if (method === 'GET') {
    try {
      await getPoolAsync();
      const result = await query(
        `SELECT "sessionId", "userAgent", "ipAddress", "createdAt", "lastActive"
         FROM "AuthSession"
         WHERE "userId" = $1 AND "isRevoked" = FALSE
         ORDER BY "lastActive" DESC`,
        [user.id]
      );

      return createResponse(200, {
        sessions: result.rows,
      });
    } catch (error) {
      console.warn('[AUTH-API] Failed to fetch sessions:', error.message);
      return createResponse(200, { sessions: [] });
    }
  }

  if (method === 'DELETE') {
    try {
      await getPoolAsync();
      const result = await query(
        `UPDATE "AuthSession"
         SET "isRevoked" = TRUE
         WHERE "userId" = $1 AND "isRevoked" = FALSE
         RETURNING "sessionId"`,
        [user.id]
      );

      return createResponse(200, {
        success: true,
        revokedCount: result.rowCount,
      });
    } catch (error) {
      console.warn('[AUTH-API] Failed to revoke sessions:', error.message);
      return createResponse(200, { success: true, revokedCount: 0 });
    }
  }

  return createResponse(405, {
    error: 'Method Not Allowed',
    message: `Method ${method} not allowed on this endpoint`,
  });
}

