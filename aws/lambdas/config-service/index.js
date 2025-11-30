/**
 * =============================================================================
 * BarkBase Config Service Lambda
 * =============================================================================
 *
 * Handles configuration endpoints:
 * - GET /api/v1/config/tenant - Get tenant configuration (from JWT/DB)
 * - PUT /api/v1/config/tenant - Update tenant configuration
 * - GET /api/v1/config/tenant/theme - Get tenant theme
 * - PUT /api/v1/config/tenant/theme - Update tenant theme
 * - GET /api/v1/config/tenant/features - Get tenant features
 * - GET /api/v1/config/system - Get system configuration
 * - GET /api/v1/config/settings - Get all settings
 *
 * Enterprise Memberships API:
 * - GET /api/v1/memberships - List staff members for current tenant
 * - POST /api/v1/memberships - Create/invite new staff member
 * - PUT /api/v1/memberships/:id - Update member role/status
 * - DELETE /api/v1/memberships/:id - Remove member from tenant
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
} = sharedLayer;

/**
 * Route requests to appropriate handlers
 */
exports.handler = async (event, context) => {
  // Prevent Lambda from waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.requestContext?.http?.path || event.path || '/';

  console.log('[CONFIG-SERVICE] Request:', { method, path, headers: Object.keys(event.headers || {}) });

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return createResponse(200, { message: 'OK' });
  }

  try {
    // Authenticate request
    const authResult = await authenticateRequest(event);
    if (!authResult.authenticated) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required',
      });
    }

    // Attach user to event
    const user = authResult.user;

    // Route to appropriate handler
    // Tenant config routes
    if (path === '/api/v1/config/tenant' || path === '/config/tenant') {
      if (method === 'GET') {
        return handleGetTenantConfig(user, event);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateTenantConfig(user, parseBody(event));
      }
    }

    if (path === '/api/v1/config/tenant/theme' || path === '/config/tenant/theme') {
      if (method === 'GET') {
        return handleGetTenantTheme(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateTenantTheme(user, parseBody(event));
      }
    }

    if (path === '/api/v1/config/tenant/features' || path === '/config/tenant/features') {
      if (method === 'GET') {
        return handleGetTenantFeatures(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateTenantFeatures(user, parseBody(event));
      }
    }

    if (path === '/api/v1/config/tenant/onboarding' || path === '/config/tenant/onboarding') {
      if (method === 'GET') {
        return handleGetOnboarding(user);
      }
      if (method === 'PUT' || method === 'PATCH') {
        return handleUpdateOnboarding(user, parseBody(event));
      }
    }

    // System config routes
    if (path === '/api/v1/config/system' || path === '/config/system') {
      if (method === 'GET') {
        return handleGetSystemConfig();
      }
    }

    if (path === '/api/v1/config/system/features' || path === '/config/system/features') {
      if (method === 'GET') {
        return handleGetSystemFeatures();
      }
    }

    // Settings routes
    if (path === '/api/v1/config/settings' || path === '/config/settings') {
      if (method === 'GET') {
        return handleGetSettings(user);
      }
    }

    // =========================================================================
    // ENTERPRISE MEMBERSHIPS API
    // =========================================================================
    // Memberships represent the link between Users and Tenants (staff/team).
    // This is the canonical staff/org management interface for BarkBase.
    // All membership operations are tenant-scoped via the authenticated user.
    // =========================================================================

    // GET /api/v1/memberships - List all members for current tenant
    if ((path === '/api/v1/memberships' || path === '/memberships') && method === 'GET') {
      return handleGetMemberships(user);
    }

    // POST /api/v1/memberships - Create/invite new member
    if ((path === '/api/v1/memberships' || path === '/memberships') && method === 'POST') {
      return handleCreateMembership(user, parseBody(event));
    }

    // PUT/PATCH /api/v1/memberships/:id - Update member role/status
    const membershipUpdateMatch = path.match(/^\/(?:api\/v1\/)?memberships\/([a-f0-9-]+)$/i);
    if (membershipUpdateMatch && (method === 'PUT' || method === 'PATCH')) {
      const membershipId = membershipUpdateMatch[1];
      return handleUpdateMembership(user, membershipId, parseBody(event));
    }

    // DELETE /api/v1/memberships/:id - Remove member from tenant
    if (membershipUpdateMatch && method === 'DELETE') {
      const membershipId = membershipUpdateMatch[1];
      return handleDeleteMembership(user, membershipId);
    }

    // Default response for unmatched routes
    return createResponse(404, {
      error: 'Not Found',
      message: `Route ${method} ${path} not found`,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Unhandled error:', error);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
    });
  }
};

/**
 * Get tenant configuration - CRITICAL ENDPOINT
 * This is called by frontend to get tenantId after login
 */
async function handleGetTenantConfig(user, event) {
  const requestId = event?.requestContext?.requestId || 'unknown';
  const cognitoSub = user.id;

  console.log('[ConfigTenant] start', { path: '/api/v1/config/tenant', requestId });
  console.log('[ConfigTenant] auth', { cognitoSub });

  try {
    await getPoolAsync();

    // Look up user and their tenant from database
    const result = await query(
      `SELECT
         u.id as user_id,
         u.email,
         u.first_name,
         u.last_name,
         u.role,
         u.tenant_id,
         t.id as tenant_record_id,
         t.name as tenant_name,
         t.slug as tenant_slug,
         t.plan as tenant_plan,
         t.settings as tenant_settings,
         t.theme as tenant_theme,
         t.feature_flags as tenant_features,
         t.created_at as tenant_created_at,
         (SELECT COUNT(*) FROM "Service" WHERE tenant_id = t.id) as service_count,
         (SELECT COUNT(*) FROM "Kennel" WHERE tenant_id = t.id) as kennel_count
       FROM "User" u
       LEFT JOIN "Tenant" t ON u.tenant_id = t.id
       WHERE u.cognito_sub = $1
       LIMIT 1`,
      [cognitoSub]
    );

    if (result.rows.length === 0) {
      console.log('[ConfigTenant] tenantLookup', { tenantId: null, reason: 'user_not_found' });
      return createResponse(404, {
        error: 'NotFound',
        message: 'User not found. Please complete registration.',
      });
    }

    const row = result.rows[0];

    if (!row.tenant_id) {
      console.log('[ConfigTenant] tenantLookup', { tenantId: null, reason: 'no_tenant_for_user' });
      return createResponse(404, {
        error: 'NotFound',
        message: 'Tenant not found for user',
      });
    }

    console.log('[ConfigTenant] tenantLookup', { tenantId: row.tenant_id });

    // Determine onboarding status
    const hasOnboardingCompleted = parseInt(row.service_count || 0) > 0 && parseInt(row.kennel_count || 0) > 0;

    // Return tenant config in the format frontend expects
    return createResponse(200, {
      // Top-level fields for compatibility
      id: row.tenant_id,
      recordId: row.tenant_id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      hasOnboardingCompleted,
      name: row.tenant_name,
      slug: row.tenant_slug,
      plan: row.tenant_plan || 'FREE',
      settings: row.tenant_settings || {},
      theme: row.tenant_theme || {},
      featureFlags: row.tenant_features || {},
      createdAt: row.tenant_created_at,
      // User info
      user: {
        id: row.user_id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        role: row.role,
      },
      // Nested tenant object for some frontend code paths
      tenant: {
        id: row.tenant_id,
        recordId: row.tenant_id,
        name: row.tenant_name,
        slug: row.tenant_slug,
        plan: row.tenant_plan || 'FREE',
      },
    });

  } catch (error) {
    console.error('[ConfigTenant] error', { error: error.message, stack: error.stack });
    return createResponse(500, {
      error: 'InternalServerError',
      message: 'Failed to load tenant config',
    });
  }
}

/**
 * Update tenant configuration
 */
async function handleUpdateTenantConfig(user, body) {
  const { name, settings } = body;

  try {
    await getPoolAsync();

    // Get user's tenant and verify permission
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
        message: 'You do not have permission to update tenant configuration',
      });
    }

    // Build update
    const updates = [];
    const values = [tenantId];
    let paramIndex = 2;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }
    if (settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    updates.push('updated_at = NOW()');

    const result = await query(
      `UPDATE "Tenant"
       SET ${updates.join(', ')}
       WHERE id = $1
       RETURNING id, name, slug, plan, settings, updated_at`,
      values
    );

    const updated = result.rows[0];

    return createResponse(200, {
      success: true,
      id: updated.id,
      recordId: updated.id,
      tenantId: updated.id,
      name: updated.name,
      slug: updated.slug,
      plan: updated.plan,
      settings: updated.settings || {},
      updatedAt: updated.updated_at,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to update tenant config:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update tenant configuration',
    });
  }
}

/**
 * Get tenant theme
 */
async function handleGetTenantTheme(user) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT t.theme
       FROM "Tenant" t
       INNER JOIN "User" u ON u.tenant_id = t.id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    return createResponse(200, {
      theme: result.rows[0].theme || {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        logo: null,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to get tenant theme:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve tenant theme',
    });
  }
}

/**
 * Update tenant theme
 */
async function handleUpdateTenantTheme(user, body) {
  const { theme, primaryColor, secondaryColor, logo } = body;

  try {
    await getPoolAsync();

    // Get user's tenant
    const userResult = await query(
      `SELECT role, tenant_id FROM "User" WHERE cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'User not found' });
    }

    const { role, tenant_id: tenantId } = userResult.rows[0];

    if (!['OWNER', 'ADMIN'].includes(role)) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to update tenant theme',
      });
    }

    // Accept either nested theme object or flat properties
    const themeData = theme || { primaryColor, secondaryColor, logo };

    const result = await query(
      `UPDATE "Tenant"
       SET theme = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING theme`,
      [tenantId, JSON.stringify(themeData)]
    );

    return createResponse(200, {
      success: true,
      theme: result.rows[0].theme,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to update tenant theme:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update tenant theme',
    });
  }
}

/**
 * Get tenant features/feature flags
 */
async function handleGetTenantFeatures(user) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT t.feature_flags, t.plan
       FROM "Tenant" t
       INNER JOIN "User" u ON u.tenant_id = t.id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    const { feature_flags, plan } = result.rows[0];

    // Default features based on plan
    const defaultFeatures = {
      bookings: true,
      analytics: plan !== 'FREE',
      customReports: plan === 'ENTERPRISE',
      apiAccess: plan !== 'FREE',
      multiLocation: plan === 'ENTERPRISE',
    };

    return createResponse(200, {
      features: { ...defaultFeatures, ...(feature_flags || {}) },
      plan,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to get tenant features:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve tenant features',
    });
  }
}

/**
 * Update tenant features
 */
async function handleUpdateTenantFeatures(user, body) {
  const { features } = body;

  try {
    await getPoolAsync();

    const userResult = await query(
      `SELECT role, tenant_id FROM "User" WHERE cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, { error: 'Not Found', message: 'User not found' });
    }

    const { role, tenant_id: tenantId } = userResult.rows[0];

    if (!['OWNER', 'ADMIN'].includes(role)) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to update tenant features',
      });
    }

    const result = await query(
      `UPDATE "Tenant"
       SET feature_flags = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING feature_flags`,
      [tenantId, JSON.stringify(features)]
    );

    return createResponse(200, {
      success: true,
      features: result.rows[0].feature_flags,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to update tenant features:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update tenant features',
    });
  }
}

/**
 * Get onboarding status
 */
async function handleGetOnboarding(user) {
  try {
    await getPoolAsync();

    // Check for basic setup completion
    const result = await query(
      `SELECT
         t.id as tenant_id,
         t.name,
         (SELECT COUNT(*) FROM "Service" WHERE tenant_id = t.id) as service_count,
         (SELECT COUNT(*) FROM "Kennel" WHERE tenant_id = t.id) as kennel_count,
         (SELECT COUNT(*) FROM "Owner" WHERE tenant_id = t.id) as owner_count,
         (SELECT COUNT(*) FROM "Pet" WHERE tenant_id = t.id) as pet_count
       FROM "Tenant" t
       INNER JOIN "User" u ON u.tenant_id = t.id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    const data = result.rows[0];

    const steps = {
      accountCreated: true,
      servicesAdded: parseInt(data.service_count) > 0,
      kennelsAdded: parseInt(data.kennel_count) > 0,
      firstOwnerAdded: parseInt(data.owner_count) > 0,
      firstPetAdded: parseInt(data.pet_count) > 0,
    };

    const completedSteps = Object.values(steps).filter(Boolean).length;
    const totalSteps = Object.keys(steps).length;

    return createResponse(200, {
      onboarding: {
        steps,
        completedSteps,
        totalSteps,
        percentComplete: Math.round((completedSteps / totalSteps) * 100),
        isComplete: completedSteps === totalSteps,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to get onboarding:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve onboarding status',
    });
  }
}

/**
 * Update onboarding (dismiss)
 */
async function handleUpdateOnboarding(user, body) {
  // Onboarding dismissal could be stored in tenant settings
  // For now, just acknowledge
  return createResponse(200, {
    success: true,
    message: 'Onboarding status updated',
  });
}

/**
 * Get system configuration
 */
async function handleGetSystemConfig() {
  return createResponse(200, {
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    region: process.env.AWS_REGION_DEPLOY || process.env.AWS_REGION || 'us-east-2',
    maintenanceMode: false,
  });
}

/**
 * Get system features
 */
async function handleGetSystemFeatures() {
  return createResponse(200, {
    features: {
      multiTenant: true,
      whiteLabel: true,
      advancedAnalytics: true,
      apiAccess: true,
    },
  });
}

/**
 * Get all settings for current tenant
 */
async function handleGetSettings(user) {
  try {
    await getPoolAsync();

    const result = await query(
      `SELECT t.settings
       FROM "Tenant" t
       INNER JOIN "User" u ON u.tenant_id = t.id
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Tenant not found',
      });
    }

    return createResponse(200, {
      settings: result.rows[0].settings || {},
      categories: ['general', 'notifications', 'booking', 'billing'],
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to get settings:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve settings',
    });
  }
}

// =============================================================================
// ENTERPRISE MEMBERSHIPS API
// =============================================================================
//
// Memberships represent the relationship between Users and Tenants.
// This is the canonical interface for managing staff/team members in BarkBase.
//
// Schema (Membership table):
//   id, tenant_id, user_id, role, status, invited_at, joined_at, created_at, updated_at
//
// NOTE: All membership operations are tenant-scoped. The membershipId must
// belong to the current user's tenant_id to be accessible.
//
// =============================================================================

/**
 * Get all memberships (staff members) for the current tenant
 *
 * Returns list of team members with user details (name, email, role, status).
 * Only returns memberships belonging to the authenticated user's tenant.
 */
async function handleGetMemberships(user) {
  console.log('[CONFIG-SERVICE] handleGetMemberships - start');

  try {
    await getPoolAsync();

    // First get the user's tenant
    const userResult = await query(
      `SELECT tenant_id, role FROM "User" WHERE cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { tenant_id: tenantId } = userResult.rows[0];

    if (!tenantId) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User has no associated tenant',
      });
    }

    // Get all memberships for this tenant with user details
    const result = await query(
      `SELECT
         m.id,
         m.tenant_id,
         m.user_id,
         m.role,
         m.status,
         m.invited_at,
         m.joined_at,
         m.created_at,
         m.updated_at,
         u.email,
         u.first_name,
         u.last_name,
         u.cognito_sub
       FROM "Membership" m
       LEFT JOIN "User" u ON m.user_id = u.id
       WHERE m.tenant_id = $1
       ORDER BY m.created_at DESC`,
      [tenantId]
    );

    console.log('[CONFIG-SERVICE] handleGetMemberships - found:', result.rows.length, 'members');

    // Transform to frontend-friendly format
    const members = result.rows.map(row => ({
      id: row.id,
      membershipId: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      role: row.role,
      status: row.status || 'active',
      invitedAt: row.invited_at,
      joinedAt: row.joined_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // User details
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      name: row.first_name && row.last_name
        ? `${row.first_name} ${row.last_name}`
        : row.email,
      // Flag if this is the current user
      isCurrentUser: row.cognito_sub === user.id,
    }));

    return createResponse(200, {
      success: true,
      data: members,
      members,
      total: members.length,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to get memberships:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to retrieve team members',
    });
  }
}

/**
 * Create a new membership (invite staff member to tenant)
 *
 * Creates a new user (if not exists) and membership record.
 * Requires OWNER or ADMIN role.
 */
async function handleCreateMembership(user, body) {
  const { email, role = 'STAFF', firstName, lastName } = body;

  console.log('[CONFIG-SERVICE] handleCreateMembership - start', { email, role });

  if (!email) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'Email is required',
    });
  }

  // Validate role
  const validRoles = ['OWNER', 'ADMIN', 'STAFF', 'READONLY'];
  if (!validRoles.includes(role)) {
    return createResponse(400, {
      error: 'Bad Request',
      message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
    });
  }

  try {
    await getPoolAsync();

    // Get current user's tenant and verify permission
    const userResult = await query(
      `SELECT tenant_id, role FROM "User" WHERE cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { tenant_id: tenantId, role: currentUserRole } = userResult.rows[0];

    // Only OWNER or ADMIN can create memberships
    if (!['OWNER', 'ADMIN'].includes(currentUserRole)) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to invite team members',
      });
    }

    // Only OWNER can create OWNER or ADMIN memberships
    if (['OWNER', 'ADMIN'].includes(role) && currentUserRole !== 'OWNER') {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Only owners can assign admin or owner roles',
      });
    }

    // Check if user with this email already exists
    const existingUser = await query(
      `SELECT id FROM "User" WHERE email = $1`,
      [email.toLowerCase()]
    );

    let userId;

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;

      // Check if already a member of this tenant
      const existingMembership = await query(
        `SELECT id FROM "Membership" WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );

      if (existingMembership.rows.length > 0) {
        return createResponse(409, {
          error: 'Conflict',
          message: 'This user is already a member of your team',
        });
      }
    } else {
      // Create new user record (pending Cognito signup)
      const newUser = await query(
        `INSERT INTO "User" (email, first_name, last_name, role, tenant_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [email.toLowerCase(), firstName || null, lastName || null, role, tenantId]
      );
      userId = newUser.rows[0].id;
    }

    // Create membership record
    const membership = await query(
      `INSERT INTO "Membership" (tenant_id, user_id, role, status, invited_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'invited', NOW(), NOW(), NOW())
       RETURNING *`,
      [tenantId, userId, role]
    );

    const newMembership = membership.rows[0];

    console.log('[CONFIG-SERVICE] handleCreateMembership - created:', newMembership.id);

    return createResponse(201, {
      success: true,
      message: 'Team member invited successfully',
      membership: {
        id: newMembership.id,
        membershipId: newMembership.id,
        tenantId: newMembership.tenant_id,
        userId: newMembership.user_id,
        role: newMembership.role,
        status: newMembership.status,
        invitedAt: newMembership.invited_at,
        createdAt: newMembership.created_at,
        email,
        firstName,
        lastName,
        name: firstName && lastName ? `${firstName} ${lastName}` : email,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to create membership:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to invite team member',
    });
  }
}

/**
 * Update a membership (change role or status)
 *
 * Requires OWNER or ADMIN role. Only OWNER can modify OWNER/ADMIN memberships.
 * NOTE: membershipId must belong to the current tenant.
 */
async function handleUpdateMembership(user, membershipId, body) {
  const { role, status } = body;

  console.log('[CONFIG-SERVICE] handleUpdateMembership - start', { membershipId, role, status });

  if (!role && !status) {
    return createResponse(400, {
      error: 'Bad Request',
      message: 'At least one field (role or status) is required',
    });
  }

  // Validate role if provided
  if (role) {
    const validRoles = ['OWNER', 'ADMIN', 'STAFF', 'READONLY'];
    if (!validRoles.includes(role)) {
      return createResponse(400, {
        error: 'Bad Request',
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }
  }

  try {
    await getPoolAsync();

    // Get current user's tenant and role
    const userResult = await query(
      `SELECT tenant_id, role, id as user_id FROM "User" WHERE cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { tenant_id: tenantId, role: currentUserRole, user_id: currentUserId } = userResult.rows[0];

    // Only OWNER or ADMIN can update memberships
    if (!['OWNER', 'ADMIN'].includes(currentUserRole)) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to update team members',
      });
    }

    // Get the membership being updated (ensure it belongs to this tenant)
    const membershipResult = await query(
      `SELECT m.*, u.id as target_user_id
       FROM "Membership" m
       LEFT JOIN "User" u ON m.user_id = u.id
       WHERE m.id = $1 AND m.tenant_id = $2`,
      [membershipId, tenantId]
    );

    if (membershipResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Membership not found',
      });
    }

    const targetMembership = membershipResult.rows[0];

    // Prevent self-demotion for owners
    if (targetMembership.target_user_id === currentUserId && role && role !== 'OWNER' && targetMembership.role === 'OWNER') {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'You cannot demote yourself from owner',
      });
    }

    // Only OWNER can modify OWNER/ADMIN memberships
    if (['OWNER', 'ADMIN'].includes(targetMembership.role) && currentUserRole !== 'OWNER') {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Only owners can modify admin or owner memberships',
      });
    }

    // Only OWNER can assign OWNER/ADMIN roles
    if (role && ['OWNER', 'ADMIN'].includes(role) && currentUserRole !== 'OWNER') {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Only owners can assign admin or owner roles',
      });
    }

    // Build update query
    const updates = ['updated_at = NOW()'];
    const values = [membershipId, tenantId];
    let paramIndex = 3;

    if (role) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    const result = await query(
      `UPDATE "Membership"
       SET ${updates.join(', ')}
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      values
    );

    const updatedMembership = result.rows[0];

    console.log('[CONFIG-SERVICE] handleUpdateMembership - updated:', updatedMembership.id);

    return createResponse(200, {
      success: true,
      message: 'Team member updated successfully',
      membership: {
        id: updatedMembership.id,
        membershipId: updatedMembership.id,
        tenantId: updatedMembership.tenant_id,
        userId: updatedMembership.user_id,
        role: updatedMembership.role,
        status: updatedMembership.status,
        updatedAt: updatedMembership.updated_at,
      },
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to update membership:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to update team member',
    });
  }
}

/**
 * Delete a membership (remove member from tenant)
 *
 * Hard deletes the membership record. Requires OWNER or ADMIN role.
 * NOTE: membershipId must belong to the current tenant.
 */
async function handleDeleteMembership(user, membershipId) {
  console.log('[CONFIG-SERVICE] handleDeleteMembership - start', { membershipId });

  try {
    await getPoolAsync();

    // Get current user's tenant and role
    const userResult = await query(
      `SELECT tenant_id, role, id as user_id FROM "User" WHERE cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { tenant_id: tenantId, role: currentUserRole, user_id: currentUserId } = userResult.rows[0];

    // Only OWNER or ADMIN can delete memberships
    if (!['OWNER', 'ADMIN'].includes(currentUserRole)) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to remove team members',
      });
    }

    // Get the membership being deleted (ensure it belongs to this tenant)
    const membershipResult = await query(
      `SELECT m.*, u.id as target_user_id
       FROM "Membership" m
       LEFT JOIN "User" u ON m.user_id = u.id
       WHERE m.id = $1 AND m.tenant_id = $2`,
      [membershipId, tenantId]
    );

    if (membershipResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Membership not found',
      });
    }

    const targetMembership = membershipResult.rows[0];

    // Prevent self-removal
    if (targetMembership.target_user_id === currentUserId) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'You cannot remove yourself from the team',
      });
    }

    // Only OWNER can remove OWNER/ADMIN members
    if (['OWNER', 'ADMIN'].includes(targetMembership.role) && currentUserRole !== 'OWNER') {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'Only owners can remove admin or owner members',
      });
    }

    // Delete the membership
    const result = await query(
      `DELETE FROM "Membership" WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [membershipId, tenantId]
    );

    if (result.rowCount === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'Membership not found',
      });
    }

    console.log('[CONFIG-SERVICE] handleDeleteMembership - deleted:', membershipId);

    return createResponse(200, {
      success: true,
      message: 'Team member removed successfully',
      deletedMembershipId: membershipId,
    });

  } catch (error) {
    console.error('[CONFIG-SERVICE] Failed to delete membership:', error.message);
    return createResponse(500, {
      error: 'Internal Server Error',
      message: 'Failed to remove team member',
    });
  }
}
