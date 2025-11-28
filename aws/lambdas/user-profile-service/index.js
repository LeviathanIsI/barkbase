/**
 * =============================================================================
 * BarkBase User Profile Service Lambda
 * =============================================================================
 * 
 * Handles user profile endpoints:
 * - GET /api/v1/profile/me - Get current user profile
 * - PUT /api/v1/profile/me - Update current user profile
 * - GET /api/v1/profile/tenant - Get current tenant info
 * - PUT /api/v1/profile/tenant - Update tenant info
 * - GET /api/v1/profile/preferences - Get user preferences
 * - PUT /api/v1/profile/preferences - Update user preferences
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
  sanitizeInput,
} = sharedLayer;

/**
 * Route requests to appropriate handlers
 */
exports.handler = async (event, context) => {
  // Prevent Lambda from waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  console.log('[PROFILE-API] Request:', {
    method: event.requestContext?.http?.method || event.httpMethod,
    path: event.requestContext?.http?.path || event.path,
    headers: Object.keys(event.headers || {}),
  });

  try {
    // Authenticate all requests
    const authResult = await authenticateRequest(event);

    if (!authResult.authenticated) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required',
      });
    }

    const { user } = authResult;
    const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
    const path = event.requestContext?.http?.path || event.path || '/';

    // Route to appropriate handler
    if (path === '/api/v1/profile/me' || path === '/api/v1/profile' || path === '/profile/me' || path === '/profile') {
      if (method === 'GET') {
        return handleGetProfile(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateProfile(user, parseBody(event));
      }
    }

    if (path === '/api/v1/profile/tenant' || path === '/profile/tenant') {
      if (method === 'GET') {
        return handleGetTenant(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateTenant(user, parseBody(event));
      }
    }

    if (path === '/api/v1/profile/preferences' || path === '/profile/preferences') {
      if (method === 'GET') {
        return handleGetPreferences(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdatePreferences(user, parseBody(event));
      }
    }

    // Default response for unmatched routes
    return createResponse(404, {
      error: 'Not Found',
      message: `Route ${method} ${path} not found`,
    });

  } catch (error) {
    console.error('[PROFILE-API] Unhandled error:', error);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
    });
  }
};

/**
 * Get user profile
 */
async function handleGetProfile(user) {
  try {
    await getPoolAsync();
    
    const result = await query(
      `SELECT u."id", u."cognitoId", u."email", u."name", u."phone", 
              u."avatarUrl", u."role", u."tenantId", u."createdAt", u."updatedAt",
              t."name" as "tenantName", t."slug" as "tenantSlug", t."plan" as "tenantPlan"
       FROM "User" u
       LEFT JOIN "Tenant" t ON u."tenantId" = t."id"
       WHERE u."cognitoId" = $1
       LIMIT 1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User profile not found',
      });
    }

    const profile = result.rows[0];

    return createResponse(200, {
      profile: {
        id: profile.id,
        cognitoId: profile.cognitoId,
        email: profile.email,
        name: profile.name,
        phone: profile.phone,
        avatarUrl: profile.avatarUrl,
        role: profile.role,
        tenantId: profile.tenantId,
        tenant: profile.tenantId ? {
          id: profile.tenantId,
          name: profile.tenantName,
          slug: profile.tenantSlug,
          plan: profile.tenantPlan,
        } : null,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    });

  } catch (error) {
    console.error('[PROFILE-API] Failed to get profile:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve profile',
    });
  }
}

/**
 * Update user profile
 */
async function handleUpdateProfile(user, body) {
  const { name, phone, avatarUrl } = body;

  // Validate input
  const updates = {};
  if (name !== undefined) {
    updates.name = sanitizeInput(name.trim());
  }
  if (phone !== undefined) {
    updates.phone = sanitizeInput(phone.trim());
  }
  if (avatarUrl !== undefined) {
    updates.avatarUrl = avatarUrl;
  }

  if (Object.keys(updates).length === 0) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'No valid fields to update',
    });
  }

  try {
    await getPoolAsync();

    // Build dynamic update query
    const setClauses = Object.keys(updates).map((key, i) => `"${key}" = $${i + 2}`);
    setClauses.push('"updatedAt" = NOW()');

    const result = await query(
      `UPDATE "User"
       SET ${setClauses.join(', ')}
       WHERE "cognitoId" = $1
       RETURNING "id", "email", "name", "phone", "avatarUrl", "role", "tenantId", "updatedAt"`,
      [user.id, ...Object.values(updates)]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User profile not found',
      });
    }

    return createResponse(200, {
      success: true,
      profile: result.rows[0],
    });

  } catch (error) {
    console.error('[PROFILE-API] Failed to update profile:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update profile',
    });
  }
}

/**
 * Get tenant info
 */
async function handleGetTenant(user) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT t."id", t."name", t."slug", t."plan", t."settings", 
              t."createdAt", t."updatedAt"
       FROM "Tenant" t
       INNER JOIN "User" u ON u."tenantId" = t."id"
       WHERE u."cognitoId" = $1
       LIMIT 1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    return createResponse(200, {
      tenant: result.rows[0],
    });

  } catch (error) {
    console.error('[PROFILE-API] Failed to get tenant:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve tenant',
    });
  }
}

/**
 * Update tenant info (requires OWNER or ADMIN role)
 */
async function handleUpdateTenant(user, body) {
  const { name, settings } = body;

  try {
    await getPoolAsync();

    // Check if user has permission
    const userResult = await query(
      `SELECT "role", "tenantId" FROM "User" WHERE "cognitoId" = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { role, tenantId } = userResult.rows[0];

    if (!['OWNER', 'ADMIN'].includes(role)) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to update tenant settings',
      });
    }

    // Build update
    const updates = {};
    if (name !== undefined) {
      updates.name = sanitizeInput(name.trim());
    }
    if (settings !== undefined) {
      updates.settings = JSON.stringify(settings);
    }

    if (Object.keys(updates).length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    const setClauses = Object.keys(updates).map((key, i) => `"${key}" = $${i + 2}`);
    setClauses.push('"updatedAt" = NOW()');

    const result = await query(
      `UPDATE "Tenant"
       SET ${setClauses.join(', ')}
       WHERE "id" = $1
       RETURNING "id", "name", "slug", "plan", "settings", "updatedAt"`,
      [tenantId, ...Object.values(updates)]
    );

    return createResponse(200, {
      success: true,
      tenant: result.rows[0],
    });

  } catch (error) {
    console.error('[PROFILE-API] Failed to update tenant:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update tenant',
    });
  }
}

/**
 * Get user preferences
 */
async function handleGetPreferences(user) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT "preferences" FROM "User" WHERE "cognitoId" = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return createResponse(200, {
      preferences: result.rows[0].preferences || {},
    });

  } catch (error) {
    console.error('[PROFILE-API] Failed to get preferences:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve preferences',
    });
  }
}

/**
 * Update user preferences
 */
async function handleUpdatePreferences(user, body) {
  const { preferences } = body;

  if (!preferences || typeof preferences !== 'object') {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Preferences must be an object',
    });
  }

  try {
    await getPoolAsync();

    const result = await query(
      `UPDATE "User"
       SET "preferences" = "preferences" || $2::jsonb,
           "updatedAt" = NOW()
       WHERE "cognitoId" = $1
       RETURNING "preferences"`,
      [user.id, JSON.stringify(preferences)]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return createResponse(200, {
      success: true,
      preferences: result.rows[0].preferences,
    });

  } catch (error) {
    console.error('[PROFILE-API] Failed to update preferences:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update preferences',
    });
  }
}

