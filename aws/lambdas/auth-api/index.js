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

  // Handle admin path rewriting (Ops Center requests)
  const { handleAdminPathRewrite } = require('/opt/nodejs/index');
  handleAdminPathRewrite(event);

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.requestContext?.http?.path || event.path || '/';

  console.log('[AUTH-API] Request:', {
    method,
    path,
    headers: Object.keys(event.headers || {}),
  });

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    console.log('[AUTH-API] Handling CORS preflight request');
    return createResponse(200, { message: 'OK' });
  }

  try {

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
    console.log('[AUTH-API] Fetching user from DB for cognito_sub:', user.id);
    const result = await query(
      `SELECT
         id,
         email,
         first_name,
         last_name,
         role,
         tenant_id,
         created_at,
         updated_at
       FROM "User"
       WHERE cognito_sub = $1
       LIMIT 1`,
      [user.id]
    );
    dbUser = result.rows[0] || null;
    if (dbUser) {
      console.log('[AUTH-API] Found user in DB:', { id: dbUser.id, email: dbUser.email });
    } else {
      console.log('[AUTH-API] User not found in DB for cognito_sub:', user.id);
    }
  } catch (error) {
    console.error('[AUTH-API] Failed to fetch user from DB:', error.message);
  }

  return createResponse(200, {
    user: {
      id: user.id,
      recordId: dbUser?.id || null,
      email: user.email,
      firstName: dbUser?.first_name,
      lastName: dbUser?.last_name,
      name: user.name || (dbUser ? `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() : null),
      emailVerified: user.emailVerified,
      tenantId: user.tenantId || dbUser?.tenant_id,
      role: user.role || dbUser?.role,
      createdAt: dbUser?.created_at,
      updatedAt: dbUser?.updated_at,
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

    console.log('[AUTH-API] Token validated for user:', payload.sub);

    // Fetch user from database (users must be created via registration first)
    let dbUser = null;
    try {
      await getPoolAsync();

      console.log('[AUTH-API] Fetching user from DB:', { cognito_sub: payload.sub, email: payload.email });

      // Fetch existing user and update last_login_at
      const result = await query(
        `UPDATE "User"
         SET last_login_at = NOW(), updated_at = NOW()
         WHERE cognito_sub = $1
         RETURNING id, email, first_name, last_name, role, tenant_id`,
        [payload.sub]
      );

      if (result.rows.length > 0) {
        dbUser = result.rows[0];
        console.log('[AUTH-API] User found:', {
          id: dbUser.id,
          email: dbUser.email,
          tenantId: dbUser.tenant_id
        });
      } else {
        console.warn('[AUTH-API] User not found in database. Must register first.');
      }
    } catch (dbError) {
      console.error('[AUTH-API] Failed to fetch user from DB:', dbError.message);
      console.error('[AUTH-API] DB error details:', dbError);
      // Don't fail login if DB fetch fails
    }

    // Create or update session for auto-logout enforcement
    let session = null;
    console.log('[AUTH-API] Session check - dbUser:', {
      hasId: !!dbUser?.id,
      hasTenantId: !!dbUser?.tenant_id,
      userId: dbUser?.id,
      tenantId: dbUser?.tenant_id
    });

    if (dbUser?.id && dbUser?.tenant_id) {
      try {
        const crypto = require('crypto');
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sourceIp = event.requestContext?.identity?.sourceIp ||
                        event.requestContext?.http?.sourceIp ||
                        event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
                        'Unknown';
        const userAgent = event.headers?.['user-agent'] ||
                         event.headers?.['User-Agent'] ||
                         'Unknown';

        console.log('[AUTH-API] Creating session for user:', {
          userId: dbUser.id,
          tenantId: dbUser.tenant_id,
          cognitoSub: payload.sub
        });

        // Deactivate any existing active sessions for this user (single session per user)
        await query(
          `UPDATE "UserSession"
           SET is_active = false, logged_out_at = NOW(), updated_at = NOW()
           WHERE cognito_sub = $1 AND is_active = true`,
          [payload.sub]
        );

        // Create new active session
        const sessionResult = await query(
          `INSERT INTO "UserSession" (
            user_id, tenant_id, cognito_sub, session_token,
            session_start_time, last_activity_time,
            ip_address, user_agent, is_active
          )
          VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, true)
          RETURNING id, session_start_time, session_token`,
          [dbUser.id, dbUser.tenant_id, payload.sub, sessionToken, sourceIp, userAgent]
        );

        session = sessionResult.rows[0];
        console.log('[AUTH-API] Session created:', {
          sessionId: session.id,
          startTime: session.session_start_time
        });
      } catch (sessionError) {
        console.error('[AUTH-API] Failed to create session:', sessionError.message);
        console.error('[AUTH-API] Session error details:', sessionError);
        // Don't fail login if session creation fails
      }
    } else {
      console.warn('[AUTH-API] Skipping session creation - missing user or tenant:', {
        hasUser: !!dbUser,
        hasId: !!dbUser?.id,
        hasTenantId: !!dbUser?.tenant_id
      });
    }

    // SECURITY: Use DATABASE values for authorization (tenantId, role)
    // Token claims (custom:tenantId, custom:role) are NOT trusted
    // See: auth-handler.js getUserAuthorizationFromDB() for the pattern
    return createResponse(200, {
      success: true,
      session: session ? {
        startTime: session.session_start_time,
        token: session.session_token,
      } : null,
      user: {
        id: payload.sub,
        recordId: dbUser?.id || null,
        email: payload.email,
        firstName: dbUser?.first_name,
        lastName: dbUser?.last_name,
        name: payload.name || payload['cognito:username'],
        // AUTHORIZATION from DATABASE only (defense-in-depth)
        tenantId: dbUser?.tenant_id || null,
        role: dbUser?.role || null,
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
 * This is the main tenant/user bootstrap flow.
 */
async function handleRegister(event) {
  const body = parseBody(event);
  const { accessToken, email, name, tenantName, tenantSlug } = body;

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

    const userEmail = email || payload.email;
    const displayName = name || payload.name || payload['cognito:username'] || userEmail?.split('@')[0] || '';
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    console.log('[AuthBootstrap] Starting registration for email:', userEmail, 'cognito_sub:', payload.sub);

    // Create user and tenant in database
    let user = null;
    let tenant = null;

    try {
      await getPoolAsync();

      // Generate slug from tenant name or use provided slug
      const finalTenantName = tenantName || `${firstName || userEmail?.split('@')[0]}'s Workspace`;
      const finalSlug = tenantSlug ||
        finalTenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
        `tenant-${payload.sub.substring(0, 8)}`;

      console.log('[AuthBootstrap] Creating tenant:', { name: finalTenantName, slug: finalSlug });

      // Create tenant first
      const tenantResult = await query(
        `INSERT INTO "Tenant" (name, slug, plan, created_at, updated_at)
         VALUES ($1, $2, 'FREE', NOW(), NOW())
         RETURNING id, name, slug, plan`,
        [finalTenantName, finalSlug]
      );
      tenant = tenantResult.rows[0];
      console.log('[AuthBootstrap] Tenant created:', { id: tenant.id, slug: tenant.slug });

      // Create user with tenant association as OWNER
      console.log('[AuthBootstrap] Creating user for tenant_id:', tenant.id, 'cognito_sub:', payload.sub);

      const userResult = await query(
        `INSERT INTO "User" (tenant_id, cognito_sub, email, first_name, last_name, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'OWNER', TRUE, NOW(), NOW())
         RETURNING id, email, first_name, last_name, role, tenant_id`,
        [tenant.id, payload.sub, userEmail, firstName, lastName]
      );
      user = userResult.rows[0];
      console.log('[AuthBootstrap] User created:', { id: user.id, email: user.email, role: user.role });

    } catch (dbError) {
      console.error('[AuthBootstrap] DB error during registration:', dbError.message);
      console.error('[AuthBootstrap] DB error details:', dbError);
      // Return error to client since registration failed
      return createResponse(500, {
        error: 'Registration Failed',
        message: 'Failed to create workspace. Please try again.',
        details: process.env.NODE_ENV === 'production' ? undefined : dbError.message,
      });
    }

    console.log('[AuthBootstrap] Registration complete for:', userEmail);

    return createResponse(201, {
      success: true,
      user: {
        id: payload.sub,
        recordId: user?.id,
        email: userEmail,
        firstName: user?.first_name,
        lastName: user?.last_name,
        name: displayName,
        tenantId: tenant?.id,
        role: 'OWNER',
      },
      tenant: tenant ? {
        id: tenant.id,
        recordId: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
      } : null,
    });

  } catch (error) {
    console.error('[AuthBootstrap] Token validation failed:', error.message);
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
      `UPDATE "User" SET last_login_at = NOW(), updated_at = NOW() WHERE cognito_sub = $1`,
      [authResult.user.id]
    );
    console.log('[AUTH-API] Updated last_login_at for user:', authResult.user.id);
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

  // Log the logout event
  console.log('[AUTH-API] User logged out:', authResult.user.id);

  // Deactivate active sessions for this user
  try {
    await getPoolAsync();
    const result = await query(
      `UPDATE "UserSession"
       SET is_active = false, logged_out_at = NOW(), updated_at = NOW()
       WHERE cognito_sub = $1 AND is_active = true`,
      [authResult.user.id]
    );
    console.log('[AUTH-API] Deactivated sessions for user:', authResult.user.id);
  } catch (error) {
    console.error('[AUTH-API] Failed to deactivate sessions:', error.message);
    // Don't fail logout if session update fails
  }

  return createResponse(200, {
    success: true,
    message: 'Logged out successfully',
  });
}

/**
 * Handle session management
 * NOTE: Session tracking is handled by Cognito. This endpoint returns
 * minimal info for compatibility. For full session management, use
 * Cognito's admin APIs or implement ActivityLog-based tracking.
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
    // Return current session info from the JWT
    // Full session management would require Cognito admin API integration
    return createResponse(200, {
      sessions: [
        {
          sessionId: 'current',
          userAgent: event.headers?.['user-agent'] || 'Unknown',
          ipAddress: event.requestContext?.identity?.sourceIp || event.headers?.['x-forwarded-for'] || 'Unknown',
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          current: true,
        },
      ],
      message: 'Session tracking is managed by Cognito. Only current session shown.',
    });
  }

  if (method === 'DELETE') {
    // To revoke all sessions, the user should sign out from Cognito
    // This endpoint can trigger a global sign-out via Cognito admin API if needed
    console.log('[AUTH-API] Session revocation requested for user:', user.id);

    return createResponse(200, {
      success: true,
      message: 'To sign out from all devices, please use the Cognito sign-out feature.',
      revokedCount: 0,
    });
  }

  return createResponse(405, {
    error: 'Method Not Allowed',
    message: `Method ${method} not allowed on this endpoint`,
  });
}

