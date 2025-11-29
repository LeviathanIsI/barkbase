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
    // Support both /api/v1/profile/* and /api/v1/users/profile (compatibility route)
    if (path === '/api/v1/profile/me' || path === '/api/v1/profile' || path === '/profile/me' || path === '/profile' ||
        path === '/api/v1/users/profile' || path === '/users/profile') {
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

    console.log('[PROFILE-API] Fetching profile for cognito_sub:', user.id);

    const result = await query(
      `SELECT
         u.id,
         u.cognito_sub,
         u.email,
         u.first_name,
         u.last_name,
         u.phone,
         u.avatar_url,
         u.role,
         u.tenant_id,
         u.created_at,
         u.updated_at,
         t.name as tenant_name,
         t.slug as tenant_slug,
         t.plan as tenant_plan
       FROM "User" u
       LEFT JOIN "Tenant" t ON u.tenant_id = t.id
       WHERE u.cognito_sub = $1
       LIMIT 1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      console.log('[PROFILE-API] Profile not found for cognito_sub:', user.id);
      return createResponse(404, {
        error: 'Not Found',
        message: 'User profile not found',
      });
    }

    const profile = result.rows[0];
    console.log('[PROFILE-API] Found profile:', { id: profile.id, email: profile.email });

    return createResponse(200, {
      profile: {
        id: profile.id,
        recordId: profile.id,
        cognitoSub: profile.cognito_sub,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email?.split('@')[0],
        phone: profile.phone,
        avatarUrl: profile.avatar_url,
        role: profile.role,
        tenantId: profile.tenant_id,
        tenant: profile.tenant_id ? {
          id: profile.tenant_id,
          recordId: profile.tenant_id,
          name: profile.tenant_name,
          slug: profile.tenant_slug,
          plan: profile.tenant_plan,
        } : null,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
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
  const { firstName, lastName, name, phone, avatarUrl } = body;

  // Validate input and build updates
  const updates = {};
  const dbFieldMap = {};

  // Handle name - can be passed as firstName/lastName or combined name
  if (firstName !== undefined) {
    updates.first_name = sanitizeInput(firstName.trim());
    dbFieldMap.first_name = updates.first_name;
  }
  if (lastName !== undefined) {
    updates.last_name = sanitizeInput(lastName.trim());
    dbFieldMap.last_name = updates.last_name;
  }
  // If only "name" is passed, split it
  if (name !== undefined && firstName === undefined && lastName === undefined) {
    const nameParts = sanitizeInput(name.trim()).split(' ');
    updates.first_name = nameParts[0] || '';
    updates.last_name = nameParts.slice(1).join(' ') || '';
    dbFieldMap.first_name = updates.first_name;
    dbFieldMap.last_name = updates.last_name;
  }
  if (phone !== undefined) {
    updates.phone = sanitizeInput(phone.trim());
    dbFieldMap.phone = updates.phone;
  }
  if (avatarUrl !== undefined) {
    updates.avatar_url = avatarUrl;
    dbFieldMap.avatar_url = updates.avatar_url;
  }

  if (Object.keys(dbFieldMap).length === 0) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'No valid fields to update',
    });
  }

  try {
    await getPoolAsync();

    // Build dynamic update query with snake_case columns
    const columns = Object.keys(dbFieldMap);
    const setClauses = columns.map((key, i) => `${key} = $${i + 2}`);
    setClauses.push('updated_at = NOW()');

    console.log('[PROFILE-API] Updating profile for cognito_sub:', user.id, 'fields:', columns);

    const result = await query(
      `UPDATE "User"
       SET ${setClauses.join(', ')}
       WHERE cognito_sub = $1
       RETURNING id, email, first_name, last_name, phone, avatar_url, role, tenant_id, updated_at`,
      [user.id, ...Object.values(dbFieldMap)]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User profile not found',
      });
    }

    const updated = result.rows[0];
    console.log('[PROFILE-API] Profile updated:', { id: updated.id });

    return createResponse(200, {
      success: true,
      profile: {
        id: updated.id,
        recordId: updated.id,
        email: updated.email,
        firstName: updated.first_name,
        lastName: updated.last_name,
        name: `${updated.first_name || ''} ${updated.last_name || ''}`.trim(),
        phone: updated.phone,
        avatarUrl: updated.avatar_url,
        role: updated.role,
        tenantId: updated.tenant_id,
        updatedAt: updated.updated_at,
      },
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

    console.log('[PROFILE-API] Fetching tenant for cognito_sub:', user.id);

    const result = await query(
      `SELECT
         t.id,
         t.name,
         t.slug,
         t.plan,
         t.settings,
         t.theme,
         t.terminology,
         t.feature_flags,
         t.created_at,
         t.updated_at
       FROM "Tenant" t
       INNER JOIN "User" u ON u.tenant_id = t.id
       WHERE u.cognito_sub = $1
       LIMIT 1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      console.log('[PROFILE-API] Tenant not found for cognito_sub:', user.id);
      return createResponse(404, {
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    const tenant = result.rows[0];
    console.log('[PROFILE-API] Found tenant:', { id: tenant.id, slug: tenant.slug });

    return createResponse(200, {
      tenant: {
        id: tenant.id,
        recordId: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        settings: tenant.settings || {},
        theme: tenant.theme || {},
        terminology: tenant.terminology || {},
        featureFlags: tenant.feature_flags || {},
        createdAt: tenant.created_at,
        updatedAt: tenant.updated_at,
      },
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
  const { name, settings, theme, terminology } = body;

  try {
    await getPoolAsync();

    // Check if user has permission
    const userResult = await query(
      `SELECT role, tenant_id FROM "User" WHERE cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { role, tenant_id: tenantId } = userResult.rows[0];

    if (!['OWNER', 'ADMIN'].includes(role)) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to update tenant settings',
      });
    }

    // Build update with snake_case columns
    const dbFieldMap = {};
    if (name !== undefined) {
      dbFieldMap.name = sanitizeInput(name.trim());
    }
    if (settings !== undefined) {
      dbFieldMap.settings = JSON.stringify(settings);
    }
    if (theme !== undefined) {
      dbFieldMap.theme = JSON.stringify(theme);
    }
    if (terminology !== undefined) {
      dbFieldMap.terminology = JSON.stringify(terminology);
    }

    if (Object.keys(dbFieldMap).length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    const columns = Object.keys(dbFieldMap);
    const setClauses = columns.map((key, i) => `${key} = $${i + 2}`);
    setClauses.push('updated_at = NOW()');

    console.log('[PROFILE-API] Updating tenant:', tenantId, 'fields:', columns);

    const result = await query(
      `UPDATE "Tenant"
       SET ${setClauses.join(', ')}
       WHERE id = $1
       RETURNING id, name, slug, plan, settings, theme, terminology, updated_at`,
      [tenantId, ...Object.values(dbFieldMap)]
    );

    const updated = result.rows[0];
    console.log('[PROFILE-API] Tenant updated:', { id: updated.id });

    return createResponse(200, {
      success: true,
      tenant: {
        id: updated.id,
        recordId: updated.id,
        name: updated.name,
        slug: updated.slug,
        plan: updated.plan,
        settings: updated.settings || {},
        theme: updated.theme || {},
        terminology: updated.terminology || {},
        updatedAt: updated.updated_at,
      },
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
 * NOTE: User preferences are not in the current schema. This endpoint
 * returns an empty object for compatibility. In the future, preferences
 * could be stored in a separate table or as a JSONB column on User.
 */
async function handleGetPreferences(user) {
  try {
    await getPoolAsync();

    // Verify user exists
    const result = await query(
      `SELECT id FROM "User" WHERE cognito_sub = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // TODO: Add preferences column to User table or create UserPreferences table
    // For now, return empty preferences object
    return createResponse(200, {
      preferences: {},
      message: 'User preferences feature is pending implementation',
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
 * NOTE: User preferences are not in the current schema. This endpoint
 * accepts but does not persist preferences. Implementation pending.
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

    // Verify user exists
    const result = await query(
      `SELECT id FROM "User" WHERE cognito_sub = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // TODO: Add preferences column to User table or create UserPreferences table
    // For now, acknowledge the request but note it's not persisted
    console.log('[PROFILE-API] Preferences update requested but not persisted (feature pending):', user.id);

    return createResponse(200, {
      success: true,
      preferences: preferences,
      message: 'Preferences acknowledged but persistence is pending implementation',
    });

  } catch (error) {
    console.error('[PROFILE-API] Failed to update preferences:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update preferences',
    });
  }
}

