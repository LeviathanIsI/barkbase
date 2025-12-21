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

const { getPoolAsync, query, getNextRecordId, generateUniqueAccountCode } = dbLayer;
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

    if (path === '/api/v1/auth/sessions' || path === '/auth/sessions') {
      return handleSessions(event, method);
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
    const result = await query(
      `SELECT
         u.id,
         u.email,
         u.first_name,
         u.last_name,
         u.tenant_id,
         u.created_at,
         u.updated_at,
         COALESCE(
           (SELECT array_agg(r.name) FROM "UserRole" ur
            JOIN "Role" r ON ur.role_id = r.id
            WHERE ur.user_id = u.id),
           ARRAY[]::VARCHAR[]
         ) as roles
       FROM "User" u
       WHERE u.cognito_sub = $1
       LIMIT 1`,
      [user.id]
    );
    dbUser = result.rows[0] || null;
    if (dbUser) {
      console.log('[AUTH-API] Found user in DB:', { id: dbUser.id, email: dbUser.email, roles: dbUser.roles });
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
      recordId: dbUser?.id || null,
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
      // No role column on User table anymore
      const result = await query(
        `UPDATE "User"
         SET last_login_at = NOW(), updated_at = NOW()
         WHERE cognito_sub = $1
         RETURNING id, email, first_name, last_name, tenant_id`,
        [payload.sub]
      );

      if (result.rows.length > 0) {
        dbUser = result.rows[0];

        // Fetch roles separately from UserRole junction
        const rolesResult = await query(
          `SELECT r.name FROM "UserRole" ur
           JOIN "Role" r ON ur.role_id = r.id
           WHERE ur.user_id = $1`,
          [dbUser.id]
        );
        dbUser.roles = rolesResult.rows.map(r => r.name);

        console.log('[AUTH-API] User found:', {
          id: dbUser.id,
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

        // NEW SCHEMA: Deactivate sessions by user_id (not cognito_sub)
        await query(
          `UPDATE "UserSession"
           SET is_active = false, logged_out_at = NOW()
           WHERE user_id = $1 AND is_active = true`,
          [dbUser.id]
        );

        // NEW SCHEMA: Create new active session
        // - No cognito_sub column
        // - Column names: session_start, last_activity (not *_time)
        const sessionRecordId = await getNextRecordId(dbUser.tenant_id, 'UserSession');
        const sessionResult = await query(
          `INSERT INTO "UserSession" (
            tenant_id, record_id, user_id, session_token,
            session_start, last_activity,
            ip_address, user_agent, is_active
          )
          VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, true)
          RETURNING id, session_start, session_token`,
          [dbUser.tenant_id, sessionRecordId, dbUser.id, sessionToken, sourceIp, userAgent]
        );

        session = sessionResult.rows[0];
        console.log('[AUTH-API] Session created:', {
          sessionId: session.id,
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
        hasId: !!dbUser?.id,
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
    let ownerRole = null;

    try {
      await getPoolAsync();

      // Generate slug from tenant name or use provided slug
      const finalTenantName = tenantName || `${firstName || userEmail?.split('@')[0]}'s Workspace`;
      const finalSlug = tenantSlug ||
        finalTenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
        `tenant-${payload.sub.substring(0, 8)}`;

      console.log('[AuthBootstrap] Creating tenant:', { name: finalTenantName, slug: finalSlug });

      // Generate unique account_code for new ID system (BK-XXXXXX format)
      const accountCode = await generateUniqueAccountCode();
      console.log('[AuthBootstrap] Generated account_code:', accountCode);

      // Create tenant first
      const tenantResult = await query(
        `INSERT INTO "Tenant" (name, slug, plan, account_code, created_at, updated_at)
         VALUES ($1, $2, 'FREE', $3, NOW(), NOW())
         RETURNING id, name, slug, plan, account_code`,
        [finalTenantName, finalSlug, accountCode]
      );
      tenant = tenantResult.rows[0];
      console.log('[AuthBootstrap] Tenant created:', { id: tenant.id, slug: tenant.slug, accountCode: tenant.account_code });

      // NEW SCHEMA: Create TenantSettings with defaults
      await query(
        `INSERT INTO "TenantSettings" (tenant_id)
         VALUES ($1)
         ON CONFLICT (tenant_id) DO NOTHING`,
        [tenant.id]
      );
      console.log('[AuthBootstrap] TenantSettings created for tenant:', tenant.id);

      // NEW SCHEMA: Create default roles for the tenant
      const roleResult = await query(
        `INSERT INTO "Role" (tenant_id, name, description, is_system, created_at, updated_at)
         VALUES
           ($1, 'OWNER', 'Business owner with full facility access', true, NOW(), NOW()),
           ($1, 'MANAGER', 'Manages daily operations and staff', true, NOW(), NOW()),
           ($1, 'STAFF', 'Regular staff member', true, NOW(), NOW()),
           ($1, 'RECEPTIONIST', 'Front desk operations', true, NOW(), NOW()),
           ($1, 'GROOMER', 'Grooming staff', true, NOW(), NOW()),
           ($1, 'VIEWER', 'Read-only access', true, NOW(), NOW())
         ON CONFLICT (tenant_id, name) DO UPDATE SET updated_at = NOW()
         RETURNING id, name`,
        [tenant.id]
      );
      ownerRole = roleResult.rows.find(r => r.name === 'OWNER');
      console.log('[AuthBootstrap] Default roles created, OWNER role id:', ownerRole?.id);

      // NEW SCHEMA: Create user WITHOUT role column
      console.log('[AuthBootstrap] Creating user for tenant_id:', tenant.id, 'cognito_sub:', payload.sub);

      const userRecordId = await getNextRecordId(tenant.id, 'User');
      const userResult = await query(
        `INSERT INTO "User" (tenant_id, record_id, cognito_sub, email, first_name, last_name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
         RETURNING id, email, first_name, last_name, tenant_id`,
        [tenant.id, userRecordId, payload.sub, userEmail, firstName, lastName]
      );
      user = userResult.rows[0];
      console.log('[AuthBootstrap] User created:', { id: user.id, email: user.email });

      // NEW SCHEMA: Assign OWNER role via UserRole junction table
      if (ownerRole) {
        const userRoleRecordId = await getNextRecordId(tenant.id, 'UserRole');
        await query(
          `INSERT INTO "UserRole" (tenant_id, record_id, user_id, role_id, assigned_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (user_id, role_id) DO NOTHING`,
          [tenant.id, userRoleRecordId, user.id, ownerRole.id]
        );
        console.log('[AuthBootstrap] OWNER role assigned to user:', user.id);
      }

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
        roles: ['OWNER'],          // NEW: Array of roles
        role: 'OWNER',             // BACKWARDS COMPAT: Primary role
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

