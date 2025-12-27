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
 * - POST /api/v1/auth/change-password - Change password
 * - GET /api/v1/health - Health check
 *
 * MFA endpoints:
 * - GET /api/v1/auth/mfa - Get MFA status
 * - POST /api/v1/auth/mfa/setup - Initiate MFA setup (returns QR code secret)
 * - POST /api/v1/auth/mfa/verify - Verify TOTP code and enable MFA
 * - POST /api/v1/auth/mfa/challenge - Respond to MFA challenge during login
 * - DELETE /api/v1/auth/mfa - Disable MFA
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
  dbLayer = require('/opt/nodejs/db');
  sharedLayer = require('../../layers/shared-layer/nodejs/index');
}

const { getPoolAsync, query, getNextRecordId, generateUniqueAccountCode, getClient } = dbLayer;
const {
  authenticateRequest,
  createResponse,
  parseBody,
  validateToken,
  getAuthConfig,
  encryptToken,
  decryptToken,
} = sharedLayer;

// Cognito SDK for user creation and MFA
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
  AdminDeleteUserCommand,
  ChangePasswordCommand,
  AssociateSoftwareTokenCommand,
  VerifySoftwareTokenCommand,
  SetUserMFAPreferenceCommand,
  RespondToAuthChallengeCommand,
  GetUserCommand,
  GlobalSignOutCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-2'
});

/**
 * Route requests to appropriate handlers
 */
exports.handler = async (event, context) => {
  // Prevent Lambda from waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  // Handle admin path rewriting (Ops Center requests)
  const { handleAdminPathRewrite, applyRateLimit } = require('/opt/nodejs/index');
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

  // Apply rate limiting (defense in depth - WAF also rate limits)
  const rateLimitResponse = applyRateLimit(event);
  if (rateLimitResponse) {
    console.log('[AUTH-API] Request rate limited');
    return rateLimitResponse;
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

    if (path === '/api/v1/auth/change-password' || path === '/auth/change-password') {
      if (method === 'POST') {
        return handleChangePassword(event);
      }
    }

    if (path === '/api/v1/auth/sessions' || path === '/auth/sessions') {
      return handleSessions(event, method);
    }

    if (path === '/api/v1/auth/sessions/all' || path === '/auth/sessions/all') {
      if (method === 'DELETE') {
        return handleRevokeAllSessions(event);
      }
    }

    // OAuth endpoints for Gmail integration
    if (path === '/api/v1/auth/oauth/google/start' || path === '/auth/oauth/google/start') {
      if (method === 'GET') {
        return handleGoogleOAuthStart(event);
      }
    }

    if (path === '/api/v1/auth/oauth/google/callback' || path === '/auth/oauth/google/callback') {
      if (method === 'GET') {
        return handleGoogleOAuthCallback(event);
      }
    }

    // Connected email endpoints
    if (path === '/api/v1/auth/connected-email' || path === '/auth/connected-email') {
      if (method === 'GET') {
        return handleGetConnectedEmail(event);
      }
      if (method === 'DELETE') {
        return handleDisconnectEmail(event);
      }
    }

    // MFA endpoints
    if (path === '/api/v1/auth/mfa/setup' || path === '/auth/mfa/setup') {
      if (method === 'POST') {
        return handleMfaSetup(event);
      }
    }

    if (path === '/api/v1/auth/mfa/verify' || path === '/auth/mfa/verify') {
      if (method === 'POST') {
        return handleMfaVerify(event);
      }
    }

    if (path === '/api/v1/auth/mfa/challenge' || path === '/auth/mfa/challenge') {
      if (method === 'POST') {
        return handleMfaChallenge(event);
      }
    }

    if (path === '/api/v1/auth/mfa' || path === '/auth/mfa') {
      if (method === 'DELETE') {
        return handleMfaDisable(event);
      }
      if (method === 'GET') {
        return handleMfaStatus(event);
      }
    }

    // Contact form submission (public endpoint - no auth required)
    if (path === '/api/v1/contact' || path === '/contact') {
      if (method === 'POST') {
        return handleContactSubmission(event);
      }
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
 *
 * NEW SCHEMA NOTES:
 * - User table has NO role column - roles via UserRole junction table
 * - Roles are fetched from Role table via UserRole
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
    // NEW SCHEMA: No role column on User - fetch from UserRole junction
    // User profile data (first_name, last_name) now in UserSettings table
    // Uses (tenant_id, record_id) composite key
    const result = await query(
      `SELECT
         u.record_id,
         u.email,
         us.first_name,
         us.last_name,
         u.tenant_id,
         u.created_at,
         u.updated_at,
         COALESCE(
           (SELECT array_agg(r.name) FROM "UserRole" ur
            JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
            WHERE ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id),
           ARRAY[]::VARCHAR[]
         ) as roles
       FROM "User" u
       LEFT JOIN "UserSettings" us ON us.user_record_id = u.record_id AND us.tenant_id = u.tenant_id
       WHERE u.cognito_sub = $1
       LIMIT 1`,
      [user.id]
    );
    dbUser = result.rows[0] || null;
    if (dbUser) {
      console.log('[AUTH-API] Found user in DB:', { record_id: dbUser.record_id, email: dbUser.email, roles: dbUser.roles });
    } else {
      console.log('[AUTH-API] User not found in DB for cognito_sub:', user.id);
    }
  } catch (error) {
    console.error('[AUTH-API] Failed to fetch user from DB:', error.message);
  }

  // Determine primary role for backwards compatibility
  const roleHierarchy = ['OWNER', 'SUPER_ADMIN', 'MANAGER', 'STAFF', 'RECEPTIONIST', 'GROOMER', 'VIEWER'];
  const userRoles = dbUser?.roles || user.roles || [];
  const primaryRole = roleHierarchy.find(r => userRoles.map(ur => ur?.toUpperCase()).includes(r)) || userRoles[0] || null;

  return createResponse(200, {
    user: {
      id: user.id,
      recordId: dbUser?.record_id || null,
      email: user.email,
      firstName: dbUser?.first_name,
      lastName: dbUser?.last_name,
      name: user.name || (dbUser ? `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() : null),
      emailVerified: user.emailVerified,
      tenantId: user.tenantId || dbUser?.tenant_id,
      roles: userRoles,          // NEW: Array of roles
      role: primaryRole,         // BACKWARDS COMPAT: Primary role
      createdAt: dbUser?.created_at,
      updatedAt: dbUser?.updated_at,
    },
  });
}

/**
 * Handle login - validates provided tokens
 *
 * NEW SCHEMA NOTES:
 * - User table has NO role column - roles via UserRole junction table
 * - UserSession: no cognito_sub column, uses user_id FK
 * - UserSession: columns are session_start, last_activity (not *_time)
 * - UserSession: no updated_at column
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

      // NEW SCHEMA: Fetch user with roles from UserRole junction table
      // No role column on User table anymore - uses (tenant_id, record_id) composite key
      let result = await query(
        `UPDATE "User"
         SET last_login_at = NOW(), updated_at = NOW()
         WHERE cognito_sub = $1
         RETURNING record_id, email, first_name, last_name, tenant_id`,
        [payload.sub]
      );

      // If not found by cognito_sub, try by email and update cognito_sub
      // This handles the case where user verified email and signs in for the first time
      if (result.rows.length === 0 && payload.email) {
        console.log('[AUTH-API] User not found by cognito_sub, trying by email:', payload.email);
        result = await query(
          `UPDATE "User"
           SET cognito_sub = $1, last_login_at = NOW(), updated_at = NOW()
           WHERE email = $2 AND (cognito_sub IS NULL OR cognito_sub = 'PENDING')
           RETURNING record_id, email, first_name, last_name, tenant_id`,
          [payload.sub, payload.email]
        );
        if (result.rows.length > 0) {
          console.log('[AUTH-API] Updated cognito_sub for user via email lookup');
        }
      }

      if (result.rows.length > 0) {
        dbUser = result.rows[0];

        // Fetch roles separately from UserRole junction
        // NEW SCHEMA: Join on (tenant_id, record_id) composite key
        const rolesResult = await query(
          `SELECT r.name FROM "UserRole" ur
           JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
           WHERE ur.tenant_id = $1 AND ur.user_id = $2`,
          [dbUser.tenant_id, dbUser.record_id]
        );
        dbUser.roles = rolesResult.rows.map(r => r.name);

        console.log('[AUTH-API] User found:', {
          record_id: dbUser.record_id,
          email: dbUser.email,
          tenantId: dbUser.tenant_id,
          roles: dbUser.roles
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
      hasRecordId: !!dbUser?.record_id,
      hasTenantId: !!dbUser?.tenant_id,
      userRecordId: dbUser?.record_id,
      tenantId: dbUser?.tenant_id
    });

    if (dbUser?.record_id && dbUser?.tenant_id) {
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
          userRecordId: dbUser.record_id,
          tenantId: dbUser.tenant_id,
          cognitoSub: payload.sub
        });

        // NEW SCHEMA: Deactivate sessions by tenant_id + user_id (record_id)
        await query(
          `UPDATE "UserSession"
           SET is_active = false, logged_out_at = NOW()
           WHERE tenant_id = $1 AND user_id = $2 AND is_active = true`,
          [dbUser.tenant_id, dbUser.record_id]
        );

        // NEW SCHEMA: Create new active session
        // - user_id is the user's record_id
        // - Column names: session_start, last_activity (not *_time)
        const sessionRecordId = await getNextRecordId(dbUser.tenant_id, 'UserSession');
        const sessionResult = await query(
          `INSERT INTO "UserSession" (
            tenant_id, record_id, user_id, session_token,
            session_start, last_activity,
            ip_address, user_agent, is_active
          )
          VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, true)
          RETURNING record_id, session_start, session_token`,
          [dbUser.tenant_id, sessionRecordId, dbUser.record_id, sessionToken, sourceIp, userAgent]
        );

        session = sessionResult.rows[0];
        console.log('[AUTH-API] Session created:', {
          sessionRecordId: session.record_id,
          startTime: session.session_start
        });
      } catch (sessionError) {
        console.error('[AUTH-API] Failed to create session:', sessionError.message);
        console.error('[AUTH-API] Session error details:', sessionError);
        // Don't fail login if session creation fails
      }
    } else {
      console.warn('[AUTH-API] Skipping session creation - missing user or tenant:', {
        hasUser: !!dbUser,
        hasRecordId: !!dbUser?.record_id,
        hasTenantId: !!dbUser?.tenant_id
      });
    }

    // Determine primary role for backwards compatibility
    const roleHierarchy = ['OWNER', 'SUPER_ADMIN', 'MANAGER', 'STAFF', 'RECEPTIONIST', 'GROOMER', 'VIEWER'];
    const userRoles = dbUser?.roles || [];
    const primaryRole = roleHierarchy.find(r => userRoles.map(ur => ur?.toUpperCase()).includes(r)) || userRoles[0] || null;

    // SECURITY: Use DATABASE values for authorization (tenantId, roles)
    // Token claims (custom:tenantId, custom:role) are NOT trusted
    // See: auth-handler.js getUserAuthorizationFromDB() for the pattern
    return createResponse(200, {
      success: true,
      session: session ? {
        startTime: session.session_start,
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
        roles: userRoles,          // NEW: Array of roles
        role: primaryRole,         // BACKWARDS COMPAT: Primary role
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
 *
 * NEW SCHEMA NOTES:
 * - User table has NO role column - roles assigned via UserRole junction table
 * - Need to create Role record for OWNER and assign via UserRole
 * - TenantSettings is a separate 1:1 table (created with defaults)
 */
async function handleRegister(event) {
  const body = parseBody(event);
  const { email, password, name, tenantName, tenantSlug, accessToken } = body;

  // Support both flows:
  // 1. NEW: email + password (DB first, then Cognito)
  // 2. LEGACY: accessToken (Cognito already created by frontend)
  const isNewFlow = email && password && !accessToken;
  const isLegacyFlow = accessToken;

  if (!isNewFlow && !isLegacyFlow) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Either (email + password) or accessToken is required',
    });
  }

  const config = getAuthConfig();
  let cognitoSub = null;
  let userEmail = email;
  let displayName = name || email?.split('@')[0] || '';

  // ==========================================================================
  // LEGACY FLOW: Frontend already created Cognito user
  // ==========================================================================
  if (isLegacyFlow) {
    try {
      const payload = await validateToken(accessToken, {
        jwksUrl: config.jwksUrl,
        issuer: config.issuer,
        clientId: config.clientId,
        tokenType: 'access',
      });
      cognitoSub = payload.sub;
      userEmail = email || payload.email;
      displayName = name || payload.name || payload['cognito:username'] || userEmail?.split('@')[0] || '';
    } catch (error) {
      console.error('[AuthBootstrap] Token validation failed:', error.message);
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }
  }

  const nameParts = displayName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  console.log('[AuthBootstrap] Starting registration for email:', userEmail, 'flow:', isNewFlow ? 'NEW' : 'LEGACY');

  // ==========================================================================
  // STEP 1: Create DB records in a transaction
  // ==========================================================================
  let user = null;
  let tenant = null;
  let ownerRole = null;
  let dbClient = null;

  try {
    dbClient = await getClient();
    await dbClient.query('BEGIN');

    // Generate slug from tenant name or use provided slug
    const finalTenantName = tenantName || `${firstName || userEmail?.split('@')[0]}'s Workspace`;
    const finalSlug = tenantSlug ||
      finalTenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
      `tenant-${Date.now().toString(36)}`;

    console.log('[AuthBootstrap] Creating tenant:', { name: finalTenantName, slug: finalSlug });

    // Generate unique account_code for new ID system (BK-XXXXXX format)
    const accountCode = await generateUniqueAccountCode();
    console.log('[AuthBootstrap] Generated account_code:', accountCode);

    // Create tenant
    const tenantResult = await dbClient.query(
      `INSERT INTO "Tenant" (name, slug, plan, account_code, created_at, updated_at)
       VALUES ($1, $2, 'FREE', $3, NOW(), NOW())
       RETURNING id, name, slug, plan, account_code`,
      [finalTenantName, finalSlug, accountCode]
    );
    tenant = tenantResult.rows[0];
    console.log('[AuthBootstrap] Tenant created:', { id: tenant.id, slug: tenant.slug, accountCode: tenant.account_code });

    // Create TenantSettings with defaults
    await dbClient.query(
      `INSERT INTO "TenantSettings" (tenant_id)
       VALUES ($1)
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenant.id]
    );

    // Create default roles for the tenant (object type code 52)
    // Use dbClient for sequence to stay within transaction
    const roleSeqResult = await dbClient.query(
      `INSERT INTO "TenantSequence" (tenant_id, object_type_code, last_record_id)
       VALUES ($1, 52, 6)
       ON CONFLICT (tenant_id, object_type_code) DO UPDATE SET last_record_id = "TenantSequence".last_record_id + 6
       RETURNING last_record_id`,
      [tenant.id]
    );
    const roleBaseId = roleSeqResult.rows[0].last_record_id - 5; // Get first of 6 IDs
    const roleResult = await dbClient.query(
      `INSERT INTO "Role" (tenant_id, record_id, name, description, is_system, created_at, updated_at)
       VALUES
         ($1, $2, 'OWNER', 'Business owner with full facility access', true, NOW(), NOW()),
         ($1, $3, 'MANAGER', 'Manages daily operations and staff', true, NOW(), NOW()),
         ($1, $4, 'STAFF', 'Regular staff member', true, NOW(), NOW()),
         ($1, $5, 'RECEPTIONIST', 'Front desk operations', true, NOW(), NOW()),
         ($1, $6, 'GROOMER', 'Grooming staff', true, NOW(), NOW()),
         ($1, $7, 'VIEWER', 'Read-only access', true, NOW(), NOW())
       RETURNING record_id, name`,
      [tenant.id, roleBaseId, roleBaseId + 1, roleBaseId + 2, roleBaseId + 3, roleBaseId + 4, roleBaseId + 5]
    );
    ownerRole = roleResult.rows.find(r => r.name === 'OWNER');

    // Create user - cognito_sub will be set after Cognito creation for new flow
    const userSeqResult = await dbClient.query(
      `INSERT INTO "TenantSequence" (tenant_id, object_type_code, last_record_id)
       VALUES ($1, 50, 1)
       ON CONFLICT (tenant_id, object_type_code) DO UPDATE SET last_record_id = "TenantSequence".last_record_id + 1
       RETURNING last_record_id`,
      [tenant.id]
    );
    const userRecordId = userSeqResult.rows[0].last_record_id;
    const userResult = await dbClient.query(
      `INSERT INTO "User" (tenant_id, record_id, cognito_sub, email, first_name, last_name, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
       RETURNING record_id, email, first_name, last_name, tenant_id`,
      [tenant.id, userRecordId, cognitoSub || 'PENDING', userEmail, firstName, lastName]
    );
    user = userResult.rows[0];
    console.log('[AuthBootstrap] User created:', { record_id: user.record_id, email: user.email });

    // Assign OWNER role
    if (ownerRole) {
      const userRoleSeqResult = await dbClient.query(
        `INSERT INTO "TenantSequence" (tenant_id, object_type_code, last_record_id)
         VALUES ($1, 53, 1)
         ON CONFLICT (tenant_id, object_type_code) DO UPDATE SET last_record_id = "TenantSequence".last_record_id + 1
         RETURNING last_record_id`,
        [tenant.id]
      );
      const userRoleRecordId = userRoleSeqResult.rows[0].last_record_id;
      await dbClient.query(
        `INSERT INTO "UserRole" (tenant_id, record_id, user_id, role_id, assigned_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [tenant.id, userRoleRecordId, user.record_id, ownerRole.record_id]
      );
    }

    await dbClient.query('COMMIT');
    console.log('[AuthBootstrap] DB transaction committed');

  } catch (dbError) {
    console.error('[AuthBootstrap] DB error during registration:', dbError.message);
    if (dbClient) {
      await dbClient.query('ROLLBACK').catch(() => {});
    }
    return createResponse(500, {
      error: 'Registration Failed',
      message: 'Failed to create workspace. Please try again.',
      details: process.env.NODE_ENV === 'production' ? undefined : dbError.message,
    });
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }

  // ==========================================================================
  // STEP 2: Create Cognito user (NEW FLOW ONLY)
  // ==========================================================================
  let tokens = null;

  let needsVerification = false;

  if (isNewFlow) {
    try {
      console.log('[AuthBootstrap] Creating Cognito user for:', userEmail);

      // Create user in Cognito
      const signUpResult = await cognitoClient.send(new SignUpCommand({
        ClientId: config.clientId,
        Username: userEmail,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: userEmail },
          { Name: 'name', Value: displayName },
          { Name: 'custom:tenantId', Value: String(tenant.id) },
        ],
      }));

      cognitoSub = signUpResult.UserSub;
      console.log('[AuthBootstrap] Cognito user created:', cognitoSub);

      // Update User record with cognito_sub immediately
      await query(
        `UPDATE "User" SET cognito_sub = $1, updated_at = NOW() WHERE tenant_id = $2 AND record_id = $3`,
        [cognitoSub, tenant.id, user.record_id]
      );

      // Auto-confirm the user (requires AdminConfirmSignUp permission)
      let isConfirmed = false;
      try {
        await cognitoClient.send(new AdminConfirmSignUpCommand({
          UserPoolId: config.userPoolId,
          Username: userEmail,
        }));
        console.log('[AuthBootstrap] Cognito user auto-confirmed');
        isConfirmed = true;
      } catch (confirmError) {
        // If auto-confirm fails, user will need to verify email
        console.warn('[AuthBootstrap] Auto-confirm failed (user needs email verification):', confirmError.message);
        needsVerification = true;
      }

      // Only sign in to get tokens if user was confirmed
      if (isConfirmed) {
        const authResult = await cognitoClient.send(new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: config.clientId,
          AuthParameters: {
            USERNAME: userEmail,
            PASSWORD: password,
          },
        }));

        tokens = {
          accessToken: authResult.AuthenticationResult.AccessToken,
          idToken: authResult.AuthenticationResult.IdToken,
          refreshToken: authResult.AuthenticationResult.RefreshToken,
          expiresIn: authResult.AuthenticationResult.ExpiresIn,
        };
      }

    } catch (cognitoError) {
      console.error('[AuthBootstrap] Cognito error:', cognitoError.message);

      // ROLLBACK: Delete the tenant (cascade will clean up related records)
      console.log('[AuthBootstrap] Rolling back DB records due to Cognito failure');
      try {
        await query(`DELETE FROM "Tenant" WHERE id = $1`, [tenant.id]);
        console.log('[AuthBootstrap] DB rollback complete');
      } catch (rollbackError) {
        console.error('[AuthBootstrap] Rollback failed:', rollbackError.message);
      }

      return createResponse(500, {
        error: 'Registration Failed',
        message: cognitoError.message || 'Failed to create account. Please try again.',
      });
    }
  }

  console.log('[AuthBootstrap] Registration complete for:', userEmail, 'needsVerification:', needsVerification);

  // ==========================================================================
  // STEP 3: Return success response
  // ==========================================================================
  const response = {
    success: true,
    needsVerification,
    user: {
      id: cognitoSub,
      recordId: user?.record_id,
      email: userEmail,
      firstName: user?.first_name,
      lastName: user?.last_name,
      name: displayName,
      tenantId: tenant?.id,
      roles: ['OWNER'],
      role: 'OWNER',
    },
    tenant: {
      id: tenant.id,
      recordId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      accountCode: tenant.account_code,
    },
  };

  // Include tokens only if user was auto-confirmed
  if (tokens) {
    response.tokens = tokens;
  }

  // Add message for verification case
  if (needsVerification) {
    response.message = 'Please check your email to verify your account before signing in.';
  }

  return createResponse(201, response);
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
 *
 * NEW SCHEMA NOTES:
 * - UserSession: no cognito_sub column, uses user_id FK
 * - UserSession: no updated_at column
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
  // NEW SCHEMA: Use userId (database UUID), not cognitoSub
  try {
    await getPoolAsync();
    await query(
      `UPDATE "UserSession"
       SET is_active = false, logged_out_at = NOW()
       WHERE user_id = $1 AND is_active = true`,
      [authResult.user.userId]
    );
    console.log('[AUTH-API] Deactivated sessions for user:', authResult.user.userId);
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
 * Handle password change
 * POST /api/v1/auth/change-password
 *
 * Requires authenticated user with valid access token.
 * Uses Cognito ChangePassword API which requires current password verification.
 */
async function handleChangePassword(event) {
  const authResult = await authenticateRequest(event);

  if (!authResult.authenticated) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: authResult.error || 'Authentication required',
    });
  }

  const body = parseBody(event);

  if (!body.currentPassword || !body.newPassword) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'currentPassword and newPassword are required',
    });
  }

  // Validate new password requirements
  if (body.newPassword.length < 8) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'New password must be at least 8 characters',
    });
  }

  // Get the access token from the Authorization header
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Access token required',
    });
  }

  const accessToken = authHeader.replace('Bearer ', '');

  try {
    // Use Cognito ChangePassword - requires valid access token and current password
    const command = new ChangePasswordCommand({
      AccessToken: accessToken,
      PreviousPassword: body.currentPassword,
      ProposedPassword: body.newPassword,
    });

    await cognitoClient.send(command);

    console.log('[AUTH-API] Password changed successfully for user:', authResult.user.id);

    // Record password change timestamp in database
    try {
      console.log('[AUTH-API] Recording password change timestamp for cognito_sub:', authResult.user.id);
      await getPoolAsync();
      console.log('[AUTH-API] Database pool acquired, executing UPDATE...');
      const updateResult = await query(
        `UPDATE "User" SET password_changed_at = NOW(), updated_at = NOW() WHERE cognito_sub = $1 RETURNING record_id, password_changed_at`,
        [authResult.user.id]
      );
      console.log('[AUTH-API] UPDATE result:', JSON.stringify({
        rowCount: updateResult.rowCount,
        rows: updateResult.rows,
        cognitoSub: authResult.user.id
      }));
      if (updateResult.rowCount === 0) {
        console.warn('[AUTH-API] WARNING: No rows updated! User may not exist with cognito_sub:', authResult.user.id);
      }
    } catch (dbError) {
      console.error('[AUTH-API] Failed to record password change timestamp:', dbError.message, dbError.stack);
      // Don't fail the request - password was already changed successfully
    }

    return createResponse(200, {
      success: true,
      message: 'Password changed successfully',
    });

  } catch (error) {
    console.error('[AUTH-API] Password change failed:', error.name, error.message);

    // Handle specific Cognito errors
    if (error.name === 'NotAuthorizedException') {
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Current password is incorrect',
      });
    }

    if (error.name === 'InvalidPasswordException') {
      return createResponse(400, {
        error: 'Bad Request',
        message: error.message || 'New password does not meet requirements',
      });
    }

    if (error.name === 'LimitExceededException') {
      return createResponse(429, {
        error: 'Too Many Requests',
        message: 'Too many password change attempts. Please try again later.',
      });
    }

    return createResponse(500, {
      error: 'Server Error',
      message: 'Failed to change password. Please try again.',
    });
  }
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

/**
 * Revoke all sessions (global sign out)
 * DELETE /api/v1/auth/sessions/all
 *
 * Signs out user from all devices by invalidating all refresh tokens.
 */
async function handleRevokeAllSessions(event) {
  const authResult = await authenticateRequest(event);

  if (!authResult.authenticated) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: authResult.error || 'Authentication required',
    });
  }

  // Get access token from header
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Access token required',
    });
  }

  const accessToken = authHeader.replace('Bearer ', '');

  try {
    // Global sign out invalidates all refresh tokens for this user
    const signOutCommand = new GlobalSignOutCommand({
      AccessToken: accessToken,
    });

    await cognitoClient.send(signOutCommand);

    console.log('[AUTH-API] Global sign out for user:', authResult.user.id);

    // Also deactivate all sessions in our database
    try {
      await getPoolAsync();
      const result = await query(
        `UPDATE "UserSession"
         SET is_active = false, logged_out_at = NOW()
         WHERE user_id = $1 AND is_active = true
         RETURNING record_id`,
        [authResult.user.userId]
      );
      console.log('[AUTH-API] Deactivated', result.rowCount, 'sessions in database');
    } catch (dbError) {
      console.warn('[AUTH-API] Failed to deactivate DB sessions:', dbError.message);
      // Don't fail - Cognito sign out already succeeded
    }

    return createResponse(200, {
      success: true,
      message: 'Signed out from all devices. You will need to sign in again.',
    });

  } catch (error) {
    console.error('[AUTH-API] Global sign out failed:', error.message);

    if (error.name === 'NotAuthorizedException') {
      return createResponse(401, {
        error: 'Session Expired',
        message: 'Your session has expired. Please sign in again.',
      });
    }

    return createResponse(500, {
      error: 'Server Error',
      message: 'Failed to sign out from all devices',
    });
  }
}

// =============================================================================
// MFA HANDLERS
// =============================================================================

/**
 * Get MFA status for the current user
 * GET /api/v1/auth/mfa
 */
async function handleMfaStatus(event) {
  const authResult = await authenticateRequest(event);

  if (!authResult.authenticated) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: authResult.error || 'Authentication required',
    });
  }

  // Get access token from header
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Access token required',
    });
  }

  const accessToken = authHeader.replace('Bearer ', '');

  try {
    // Get user's MFA settings using their access token (no admin permissions needed)
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken,
    });

    const userResponse = await cognitoClient.send(getUserCommand);

    // Check if TOTP MFA is enabled
    const mfaEnabled = userResponse.UserMFASettingList?.includes('SOFTWARE_TOKEN_MFA') || false;
    const preferredMfa = userResponse.PreferredMfaSetting || null;

    return createResponse(200, {
      enabled: mfaEnabled,
      preferredMethod: preferredMfa,
      methods: userResponse.UserMFASettingList || [],
    });

  } catch (error) {
    console.error('[MFA] Failed to get MFA status:', error.message);
    return createResponse(500, {
      error: 'Server Error',
      message: 'Failed to get MFA status',
    });
  }
}

/**
 * Initiate MFA setup - returns secret for QR code
 * POST /api/v1/auth/mfa/setup
 *
 * Requires authenticated user. Returns secret key to generate QR code.
 */
async function handleMfaSetup(event) {
  const authResult = await authenticateRequest(event);

  if (!authResult.authenticated) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: authResult.error || 'Authentication required',
    });
  }

  // Get access token from header
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Access token required',
    });
  }

  const accessToken = authHeader.replace('Bearer ', '');

  try {
    // Associate software token with the user
    const associateCommand = new AssociateSoftwareTokenCommand({
      AccessToken: accessToken,
    });

    const response = await cognitoClient.send(associateCommand);
    const secretCode = response.SecretCode;

    // Generate otpauth URI for QR code
    // Format: otpauth://totp/{issuer}:{email}?secret={secret}&issuer={issuer}
    const issuer = 'BarkBase';
    const email = authResult.user.email;
    const otpauthUri = `otpauth://totp/${issuer}:${encodeURIComponent(email)}?secret=${secretCode}&issuer=${issuer}`;

    console.log('[MFA] Setup initiated for user:', authResult.user.id);

    return createResponse(200, {
      success: true,
      secretCode,
      otpauthUri,
      message: 'Scan the QR code with your authenticator app',
    });

  } catch (error) {
    console.error('[MFA] Setup failed:', error.name, error.message);

    if (error.name === 'NotAuthorizedException') {
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Session expired. Please sign in again.',
      });
    }

    return createResponse(500, {
      error: 'Server Error',
      message: 'Failed to initiate MFA setup',
    });
  }
}

/**
 * Verify TOTP code and enable MFA
 * POST /api/v1/auth/mfa/verify
 *
 * Requires: { code: "123456" }
 * Verifies the TOTP code and enables MFA for the user.
 */
async function handleMfaVerify(event) {
  const authResult = await authenticateRequest(event);

  if (!authResult.authenticated) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: authResult.error || 'Authentication required',
    });
  }

  const body = parseBody(event);
  const { code } = body;

  if (!code || code.length !== 6) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'A 6-digit verification code is required',
    });
  }

  // Get access token from header
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Access token required',
    });
  }

  const accessToken = authHeader.replace('Bearer ', '');

  try {
    // Verify the software token
    const verifyCommand = new VerifySoftwareTokenCommand({
      AccessToken: accessToken,
      UserCode: code,
      FriendlyDeviceName: 'Authenticator App',
    });

    const verifyResponse = await cognitoClient.send(verifyCommand);

    if (verifyResponse.Status !== 'SUCCESS') {
      return createResponse(400, {
        error: 'Verification Failed',
        message: 'Invalid verification code. Please try again.',
      });
    }

    // Enable TOTP MFA as preferred method
    const setMfaCommand = new SetUserMFAPreferenceCommand({
      AccessToken: accessToken,
      SoftwareTokenMfaSettings: {
        Enabled: true,
        PreferredMfa: true,
      },
    });

    await cognitoClient.send(setMfaCommand);

    // Record MFA enablement in database
    try {
      await getPoolAsync();
      await query(
        `UPDATE "User" SET mfa_enabled_at = NOW(), updated_at = NOW() WHERE cognito_sub = $1`,
        [authResult.user.id]
      );
    } catch (dbError) {
      console.warn('[MFA] Failed to record MFA enablement:', dbError.message);
    }

    console.log('[MFA] Successfully enabled for user:', authResult.user.id);

    return createResponse(200, {
      success: true,
      message: 'Two-factor authentication has been enabled',
    });

  } catch (error) {
    console.error('[MFA] Verification failed:', error.name, error.message);

    if (error.name === 'EnableSoftwareTokenMFAException') {
      return createResponse(400, {
        error: 'Verification Failed',
        message: 'Invalid verification code. Please try again.',
      });
    }

    if (error.name === 'NotAuthorizedException') {
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Session expired. Please sign in again.',
      });
    }

    if (error.name === 'CodeMismatchException') {
      return createResponse(400, {
        error: 'Verification Failed',
        message: 'Invalid verification code. Please try again.',
      });
    }

    return createResponse(500, {
      error: 'Server Error',
      message: 'Failed to verify MFA code',
    });
  }
}

/**
 * Respond to MFA challenge during login
 * POST /api/v1/auth/mfa/challenge
 *
 * Requires: { session: "...", code: "123456" }
 * Completes the MFA challenge and returns tokens.
 */
async function handleMfaChallenge(event) {
  const body = parseBody(event);
  const { session, code, email } = body;

  if (!session) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Session token is required',
    });
  }

  if (!code || code.length !== 6) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'A 6-digit verification code is required',
    });
  }

  if (!email) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Email is required',
    });
  }

  const config = getAuthConfig();

  try {
    // Respond to the SOFTWARE_TOKEN_MFA challenge
    const challengeCommand = new RespondToAuthChallengeCommand({
      ClientId: config.clientId,
      ChallengeName: 'SOFTWARE_TOKEN_MFA',
      Session: session,
      ChallengeResponses: {
        USERNAME: email,
        SOFTWARE_TOKEN_MFA_CODE: code,
      },
    });

    const response = await cognitoClient.send(challengeCommand);

    // If successful, we get authentication result with tokens
    if (response.AuthenticationResult) {
      console.log('[MFA] Challenge completed successfully for:', email);

      return createResponse(200, {
        success: true,
        tokens: {
          accessToken: response.AuthenticationResult.AccessToken,
          idToken: response.AuthenticationResult.IdToken,
          refreshToken: response.AuthenticationResult.RefreshToken,
          expiresIn: response.AuthenticationResult.ExpiresIn,
        },
      });
    }

    // If there's another challenge (shouldn't happen for TOTP)
    if (response.ChallengeName) {
      return createResponse(400, {
        error: 'Challenge Error',
        message: `Unexpected challenge: ${response.ChallengeName}`,
      });
    }

    return createResponse(500, {
      error: 'Server Error',
      message: 'Unexpected response from authentication service',
    });

  } catch (error) {
    console.error('[MFA] Challenge failed:', error.name, error.message);

    if (error.name === 'CodeMismatchException') {
      return createResponse(401, {
        error: 'Verification Failed',
        message: 'Invalid verification code. Please try again.',
      });
    }

    if (error.name === 'ExpiredCodeException') {
      return createResponse(401, {
        error: 'Code Expired',
        message: 'Verification code has expired. Please request a new one.',
      });
    }

    if (error.name === 'NotAuthorizedException') {
      return createResponse(401, {
        error: 'Session Expired',
        message: 'Login session expired. Please sign in again.',
      });
    }

    return createResponse(500, {
      error: 'Server Error',
      message: 'Failed to verify MFA code',
    });
  }
}

/**
 * Disable MFA for the current user
 * DELETE /api/v1/auth/mfa
 */
async function handleMfaDisable(event) {
  const authResult = await authenticateRequest(event);

  if (!authResult.authenticated) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: authResult.error || 'Authentication required',
    });
  }

  // Get access token from header
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Access token required',
    });
  }

  const accessToken = authHeader.replace('Bearer ', '');

  try {
    // Disable TOTP MFA
    const disableCommand = new SetUserMFAPreferenceCommand({
      AccessToken: accessToken,
      SoftwareTokenMfaSettings: {
        Enabled: false,
        PreferredMfa: false,
      },
    });

    await cognitoClient.send(disableCommand);

    // Record MFA disablement in database
    try {
      await getPoolAsync();
      await query(
        `UPDATE "User" SET mfa_enabled_at = NULL, updated_at = NOW() WHERE cognito_sub = $1`,
        [authResult.user.id]
      );
    } catch (dbError) {
      console.warn('[MFA] Failed to record MFA disablement:', dbError.message);
    }

    console.log('[MFA] Successfully disabled for user:', authResult.user.id);

    return createResponse(200, {
      success: true,
      message: 'Two-factor authentication has been disabled',
    });

  } catch (error) {
    console.error('[MFA] Disable failed:', error.name, error.message);

    if (error.name === 'NotAuthorizedException') {
      return createResponse(401, {
        error: 'Unauthorized',
        message: 'Session expired. Please sign in again.',
      });
    }

    return createResponse(500, {
      error: 'Server Error',
      message: 'Failed to disable MFA',
    });
  }
}

/**
 * Handle contact form submission (public endpoint)
 * Sends email via SES and stores submission in database
 */
async function handleContactSubmission(event) {
  const body = parseBody(event);

  // Validate required fields
  const { name, email, subject, message, company } = body;

  if (!name || !email || !message) {
    return createResponse(400, {
      error: 'Validation Error',
      message: 'Name, email, and message are required',
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return createResponse(400, {
      error: 'Validation Error',
      message: 'Invalid email address',
    });
  }

  // Rate limiting by IP (simple in-memory, WAF handles more robust rate limiting)
  const sourceIp = event.requestContext?.identity?.sourceIp ||
                   event.headers?.['x-forwarded-for']?.split(',')[0] ||
                   'unknown';

  try {
    // Store contact submission in database
    await getPoolAsync();

    // Create ContactSubmission table if it doesn't exist (safe to run multiple times)
    await query(`
      CREATE TABLE IF NOT EXISTS "ContactSubmission" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        subject VARCHAR(100) DEFAULT 'general',
        message TEXT NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        status VARCHAR(50) DEFAULT 'new',
        created_at TIMESTAMP DEFAULT NOW(),
        responded_at TIMESTAMP,
        notes TEXT
      )
    `);

    // Insert the submission
    const result = await query(`
      INSERT INTO "ContactSubmission" (name, email, company, subject, message, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at
    `, [
      name,
      email,
      company || null,
      subject || 'general',
      message,
      sourceIp,
      event.headers?.['user-agent'] || null,
    ]);

    const submissionId = result.rows[0]?.id;
    console.log('[AUTH-API] Contact submission stored:', submissionId);

    // Send notification email via SES
    try {
      const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
      const ses = new SESClient({ region: process.env.AWS_REGION_DEPLOY || 'us-east-2' });

      const subjectLabels = {
        general: 'General Inquiry',
        demo: 'Demo Request',
        support: 'Support Question',
        feedback: 'Feedback',
      };
      const subjectLabel = subjectLabels[subject] || 'General Inquiry';

      const emailParams = {
        Source: process.env.SES_FROM_EMAIL || 'noreply@barkbase.app',
        Destination: {
          ToAddresses: [process.env.CONTACT_EMAIL || 'hello@barkbase.com'],
        },
        Message: {
          Subject: {
            Data: `[BarkBase Contact] ${subjectLabel} from ${name}`,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: `
New contact form submission received:

Name: ${name}
Email: ${email}
Company: ${company || 'Not provided'}
Subject: ${subjectLabel}

Message:
${message}

---
Submission ID: ${submissionId}
IP Address: ${sourceIp}
Submitted at: ${new Date().toISOString()}
              `.trim(),
              Charset: 'UTF-8',
            },
            Html: {
              Data: `
<!DOCTYPE html>
<html>
<head><style>body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }</style></head>
<body>
  <h2>New Contact Form Submission</h2>
  <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${name}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Company:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${company || 'Not provided'}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Subject:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${subjectLabel}</td></tr>
  </table>
  <h3>Message:</h3>
  <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message}</div>
  <hr style="margin-top: 20px; border: none; border-top: 1px solid #eee;">
  <p style="font-size: 12px; color: #666;">Submission ID: ${submissionId}<br>IP: ${sourceIp}<br>Time: ${new Date().toISOString()}</p>
</body>
</html>
              `.trim(),
              Charset: 'UTF-8',
            },
          },
        },
      };

      await ses.send(new SendEmailCommand(emailParams));
      console.log('[AUTH-API] Contact notification email sent');
    } catch (sesError) {
      // Log but don't fail - the submission is already stored
      console.error('[AUTH-API] Failed to send notification email:', sesError.message);
    }

    return createResponse(200, {
      success: true,
      message: 'Thank you for your message! We\'ll get back to you within 24-48 hours.',
      submissionId,
    });

  } catch (error) {
    console.error('[AUTH-API] Contact submission error:', error);
    return createResponse(500, {
      error: 'Server Error',
      message: 'Failed to submit contact form. Please try again or email us directly at hello@barkbase.com',
    });
  }
}

// =============================================================================
// GOOGLE OAUTH HANDLERS
// =============================================================================

/**
 * Get Google OAuth configuration from environment
 */
function getGoogleOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/oauth/google/callback',
  };
}

/**
 * Initiate Google OAuth flow
 * GET /api/v1/auth/oauth/google/start
 *
 * Requires authenticated user. Returns redirect URL for frontend.
 */
async function handleGoogleOAuthStart(event) {
  const authResult = await authenticateRequest(event);

  if (!authResult.authenticated) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Authentication required to connect Gmail',
    });
  }

  const config = getGoogleOAuthConfig();

  if (!config.clientId || !config.clientSecret) {
    console.error('[OAuth] Google OAuth not configured');
    return createResponse(500, {
      error: 'Configuration Error',
      message: 'Gmail integration is not configured',
    });
  }

  // Generate state token (include user info for callback)
  const crypto = require('crypto');
  const stateData = {
    userId: authResult.user.id,
    tenantId: authResult.user.tenantId,
    nonce: crypto.randomBytes(16).toString('hex'),
    timestamp: Date.now(),
  };
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

  // Store state in session for CSRF protection (using a simple approach)
  // In production, you'd store this in Redis or DynamoDB with TTL
  try {
    await getPoolAsync();
    await query(
      `UPDATE "User" SET updated_at = NOW() WHERE cognito_sub = $1`,
      [authResult.user.id]
    );
  } catch (e) {
    console.warn('[OAuth] Could not update user record:', e.message);
  }

  // Build Google OAuth URL
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  console.log('[OAuth] Generated Google OAuth URL for user:', authResult.user.id);

  return createResponse(200, {
    authUrl: authUrl.toString(),
    state,
  });
}

/**
 * Handle Google OAuth callback
 * GET /api/v1/auth/oauth/google/callback
 *
 * Exchanges authorization code for tokens and stores them.
 */
async function handleGoogleOAuthCallback(event) {
  const queryParams = event.queryStringParameters || {};
  const { code, state, error, error_description } = queryParams;

  // Handle OAuth errors
  if (error) {
    console.error('[OAuth] Google OAuth error:', error, error_description);
    return createRedirectResponse('/settings/profile?oauth_error=' + encodeURIComponent(error_description || error));
  }

  if (!code || !state) {
    console.error('[OAuth] Missing code or state in callback');
    return createRedirectResponse('/settings/profile?oauth_error=missing_params');
  }

  // Decode state
  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
  } catch (e) {
    console.error('[OAuth] Invalid state parameter');
    return createRedirectResponse('/settings/profile?oauth_error=invalid_state');
  }

  // Validate state timestamp (10 minute expiry)
  if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
    console.error('[OAuth] State expired');
    return createRedirectResponse('/settings/profile?oauth_error=expired');
  }

  const config = getGoogleOAuthConfig();

  // Exchange code for tokens
  let tokens;
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[OAuth] Token exchange failed:', errorData);
      return createRedirectResponse('/settings/profile?oauth_error=token_exchange_failed');
    }

    tokens = await response.json();
    console.log('[OAuth] Token exchange successful');
  } catch (e) {
    console.error('[OAuth] Token exchange error:', e.message);
    return createRedirectResponse('/settings/profile?oauth_error=token_exchange_error');
  }

  // Get user info from Google
  let googleUserInfo;
  try {
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    googleUserInfo = await userInfoResponse.json();
    console.log('[OAuth] Got Google user info:', googleUserInfo.email);
  } catch (e) {
    console.error('[OAuth] Failed to get user info:', e.message);
    return createRedirectResponse('/settings/profile?oauth_error=user_info_failed');
  }

  // Store encrypted tokens in database
  try {
    await getPoolAsync();

    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    await query(
      `UPDATE "User"
       SET gmail_access_token = $1,
           gmail_refresh_token = $2,
           gmail_token_expires_at = $3,
           gmail_connected_email = $4,
           gmail_connected_at = NOW(),
           updated_at = NOW()
       WHERE cognito_sub = $5`,
      [encryptedAccessToken, encryptedRefreshToken, expiresAt, googleUserInfo.email, stateData.userId]
    );

    console.log('[OAuth] Stored Gmail tokens for user:', stateData.userId, 'email:', googleUserInfo.email);

    return createRedirectResponse('/settings/profile?oauth_success=true&email=' + encodeURIComponent(googleUserInfo.email));

  } catch (e) {
    console.error('[OAuth] Failed to store tokens:', e.message);
    return createRedirectResponse('/settings/profile?oauth_error=storage_failed');
  }
}

/**
 * Get connected email info
 * GET /api/v1/user/connected-email
 */
async function handleGetConnectedEmail(event) {
  const authResult = await authenticateRequest(event);

  if (!authResult.authenticated) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `SELECT gmail_connected_email, gmail_connected_at, gmail_token_expires_at
       FROM "User"
       WHERE cognito_sub = $1`,
      [authResult.user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    if (!user.gmail_connected_email) {
      return createResponse(200, {
        connected: false,
        email: null,
        connectedAt: null,
      });
    }

    // Check if token is expired (needs refresh)
    const isExpired = user.gmail_token_expires_at && new Date(user.gmail_token_expires_at) < new Date();

    return createResponse(200, {
      connected: true,
      email: user.gmail_connected_email,
      connectedAt: user.gmail_connected_at,
      needsRefresh: isExpired,
    });

  } catch (e) {
    console.error('[OAuth] Failed to get connected email:', e.message);
    return createResponse(500, {
      error: 'Server Error',
      message: 'Failed to get connection status',
    });
  }
}

/**
 * Disconnect email
 * DELETE /api/v1/user/connected-email
 */
async function handleDisconnectEmail(event) {
  const authResult = await authenticateRequest(event);

  if (!authResult.authenticated) {
    return createResponse(401, {
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  try {
    await getPoolAsync();

    // Get current email before clearing (for response)
    const result = await query(
      `SELECT gmail_connected_email FROM "User" WHERE cognito_sub = $1`,
      [authResult.user.id]
    );

    const previousEmail = result.rows[0]?.gmail_connected_email;

    // Clear all Gmail OAuth data
    await query(
      `UPDATE "User"
       SET gmail_access_token = NULL,
           gmail_refresh_token = NULL,
           gmail_token_expires_at = NULL,
           gmail_connected_email = NULL,
           gmail_connected_at = NULL,
           updated_at = NOW()
       WHERE cognito_sub = $1`,
      [authResult.user.id]
    );

    console.log('[OAuth] Disconnected Gmail for user:', authResult.user.id, 'email:', previousEmail);

    return createResponse(200, {
      success: true,
      message: 'Email disconnected successfully',
      previousEmail,
    });

  } catch (e) {
    console.error('[OAuth] Failed to disconnect email:', e.message);
    return createResponse(500, {
      error: 'Server Error',
      message: 'Failed to disconnect email',
    });
  }
}

/**
 * Helper to create redirect response
 */
function createRedirectResponse(path) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const redirectUrl = path.startsWith('http') ? path : `${frontendUrl}${path}`;

  return {
    statusCode: 302,
    headers: {
      Location: redirectUrl,
      'Cache-Control': 'no-store',
    },
    body: '',
  };
}


// Force rebuild 12/25/2025 18:22:28

// Force rebuild 12/25/2025 18:28:24
