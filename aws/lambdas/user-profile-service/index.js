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
  // Handle admin path rewriting (Ops Center requests)
  const { handleAdminPathRewrite } = require('/opt/nodejs/index');
  handleAdminPathRewrite(event);

  // Prevent Lambda from waiting for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;

  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.requestContext?.http?.path || event.path || '/';

  console.log('[PROFILE-API] Request:', {
    method,
    path,
    headers: Object.keys(event.headers || {}),
  });

  // Handle CORS preflight requests BEFORE authentication
  // OPTIONS requests don't include Authorization headers
  if (method === 'OPTIONS') {
    return createResponse(200, { message: 'OK' });
  }

  try {
    // Authenticate all non-OPTIONS requests
    const authResult = await authenticateRequest(event);

    if (!authResult.authenticated) {
      return createResponse(401, {
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required',
      });
    }

    const { user } = authResult;

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
         u.record_id,
         u.cognito_sub,
         u.email,
         u.first_name,
         u.last_name,
         u.phone,
         u.avatar_url,
         u.tenant_id,
         u.created_at,
         u.updated_at,
         t.name as tenant_name,
         t.slug as tenant_slug,
         t.plan as tenant_plan,
         COALESCE(
           (SELECT array_agg(r.name) FROM "UserRole" ur
            JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
            WHERE ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id),
           ARRAY[]::VARCHAR[]
         ) as roles
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
    console.log('[PROFILE-API] Found profile:', { record_id: profile.record_id, email: profile.email });

    // Determine primary role for backward compatibility (highest privilege role)
    const roleHierarchy = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'USER'];
    const userRoles = profile.roles || [];
    const primaryRole = roleHierarchy.find(r => userRoles.includes(r)) || userRoles[0] || 'USER';

    return createResponse(200, {
      profile: {
        id: profile.record_id,
        recordId: profile.record_id,
        cognitoSub: profile.cognito_sub,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email?.split('@')[0],
        phone: profile.phone,
        avatarUrl: profile.avatar_url,
        role: primaryRole,  // Primary role for backward compatibility
        roles: userRoles,   // All roles from UserRole junction table
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
       RETURNING record_id, email, first_name, last_name, phone, avatar_url, tenant_id, updated_at`,
      [user.id, ...Object.values(dbFieldMap)]
    );

    if (result.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User profile not found',
      });
    }

    const updated = result.rows[0];
    console.log('[PROFILE-API] Profile updated:', { record_id: updated.record_id });

    // Fetch roles from UserRole junction table for the response
    const rolesResult = await query(
      `SELECT r.name FROM "UserRole" ur
       JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
       WHERE ur.tenant_id = $1 AND ur.user_id = $2`,
      [updated.tenant_id, updated.record_id]
    );
    const userRoles = rolesResult.rows.map(r => r.name);

    // Determine primary role for backward compatibility
    const roleHierarchy = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'USER'];
    const primaryRole = roleHierarchy.find(r => userRoles.includes(r)) || userRoles[0] || 'USER';

    return createResponse(200, {
      success: true,
      profile: {
        id: updated.record_id,
        recordId: updated.record_id,
        email: updated.email,
        firstName: updated.first_name,
        lastName: updated.last_name,
        name: `${updated.first_name || ''} ${updated.last_name || ''}`.trim(),
        phone: updated.phone,
        avatarUrl: updated.avatar_url,
        role: primaryRole,  // Primary role for backward compatibility
        roles: userRoles,   // All roles from UserRole junction table
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
 * NOTE: Settings are stored in TenantSettings table, not on Tenant directly
 */
async function handleGetTenant(user) {
  try {
    await getPoolAsync();

    console.log('[PROFILE-API] Fetching tenant for cognito_sub:', user.id);

    // Query Tenant table - settings, theme, terminology are NOT on this table
    const result = await query(
      `SELECT
         t.id,
         t.name,
         t.slug,
         t.plan,
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

    // Fetch settings from TenantSettings table (1:1 relationship with Tenant)
    const settingsResult = await query(
      `SELECT
         timezone,
         currency,
         date_format,
         time_format,
         language,
         business_name,
         business_phone,
         business_email,
         business_address,
         default_check_in_time,
         default_check_out_time,
         booking_buffer_minutes,
         max_advance_booking_days,
         min_advance_booking_hours,
         allow_online_booking,
         require_deposit,
         deposit_percent,
         require_vaccinations,
         cancellation_window_hours,
         tax_rate,
         tax_name,
         invoice_prefix,
         invoice_footer,
         notification_prefs,
         email_templates,
         business_hours,
         branding,
         integrations,
         custom_fields,
         created_at as settings_created_at,
         updated_at as settings_updated_at
       FROM "TenantSettings"
       WHERE tenant_id = $1`,
      [tenant.id]
    );

    const settings = settingsResult.rows[0] || {};

    return createResponse(200, {
      tenant: {
        id: tenant.id,
        recordId: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        featureFlags: tenant.feature_flags || {},
        createdAt: tenant.created_at,
        updatedAt: tenant.updated_at,
        // Settings from TenantSettings table
        settings: {
          timezone: settings.timezone,
          currency: settings.currency,
          dateFormat: settings.date_format,
          timeFormat: settings.time_format,
          language: settings.language,
          businessName: settings.business_name,
          businessPhone: settings.business_phone,
          businessEmail: settings.business_email,
          businessAddress: settings.business_address,
          defaultCheckInTime: settings.default_check_in_time,
          defaultCheckOutTime: settings.default_check_out_time,
          bookingBufferMinutes: settings.booking_buffer_minutes,
          maxAdvanceBookingDays: settings.max_advance_booking_days,
          minAdvanceBookingHours: settings.min_advance_booking_hours,
          allowOnlineBooking: settings.allow_online_booking,
          requireDeposit: settings.require_deposit,
          depositPercent: settings.deposit_percent,
          requireVaccinations: settings.require_vaccinations,
          cancellationWindowHours: settings.cancellation_window_hours,
          taxRate: settings.tax_rate,
          taxName: settings.tax_name,
          invoicePrefix: settings.invoice_prefix,
          invoiceFooter: settings.invoice_footer,
          notificationPrefs: settings.notification_prefs || {},
          emailTemplates: settings.email_templates || {},
          businessHours: settings.business_hours || {},
          integrations: settings.integrations || {},
          customFields: settings.custom_fields || {},
        },
        // Branding is a subset often needed separately
        branding: settings.branding || {},
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
 * NOTE: Settings are stored in TenantSettings table, not on Tenant directly
 * - Tenant table: only `name` can be updated here
 * - TenantSettings table: all settings fields go here
 */
async function handleUpdateTenant(user, body) {
  const { name, settings, branding } = body;

  try {
    await getPoolAsync();

    // Check if user has permission - fetch roles from UserRole junction table
    const userResult = await query(
      `SELECT
         u.record_id,
         u.tenant_id,
         COALESCE(
           (SELECT array_agg(r.name) FROM "UserRole" ur
            JOIN "Role" r ON r.tenant_id = ur.tenant_id AND r.record_id = ur.role_id
            WHERE ur.tenant_id = u.tenant_id AND ur.user_id = u.record_id),
           ARRAY[]::VARCHAR[]
         ) as roles
       FROM "User" u
       WHERE u.cognito_sub = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return createResponse(404, {
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const { roles, tenant_id: tenantId } = userResult.rows[0];
    const userRoles = roles || [];

    // Check if user has OWNER or ADMIN role
    const hasPermission = userRoles.some(role => ['OWNER', 'ADMIN'].includes(role));
    if (!hasPermission) {
      return createResponse(403, {
        error: 'Forbidden',
        message: 'You do not have permission to update tenant settings',
      });
    }

    // Separate updates: Tenant table vs TenantSettings table
    const tenantUpdates = {};
    const settingsUpdates = {};

    // Only 'name' can be updated on Tenant table
    if (name !== undefined) {
      tenantUpdates.name = sanitizeInput(name.trim());
    }

    // Settings go to TenantSettings table
    if (settings !== undefined && typeof settings === 'object') {
      // Map camelCase input to snake_case database columns
      if (settings.timezone !== undefined) settingsUpdates.timezone = settings.timezone;
      if (settings.currency !== undefined) settingsUpdates.currency = settings.currency;
      if (settings.dateFormat !== undefined) settingsUpdates.date_format = settings.dateFormat;
      if (settings.timeFormat !== undefined) settingsUpdates.time_format = settings.timeFormat;
      if (settings.language !== undefined) settingsUpdates.language = settings.language;
      if (settings.businessName !== undefined) settingsUpdates.business_name = settings.businessName;
      if (settings.businessPhone !== undefined) settingsUpdates.business_phone = settings.businessPhone;
      if (settings.businessEmail !== undefined) settingsUpdates.business_email = settings.businessEmail;
      if (settings.businessAddress !== undefined) settingsUpdates.business_address = settings.businessAddress;
      if (settings.defaultCheckInTime !== undefined) settingsUpdates.default_check_in_time = settings.defaultCheckInTime;
      if (settings.defaultCheckOutTime !== undefined) settingsUpdates.default_check_out_time = settings.defaultCheckOutTime;
      if (settings.bookingBufferMinutes !== undefined) settingsUpdates.booking_buffer_minutes = settings.bookingBufferMinutes;
      if (settings.maxAdvanceBookingDays !== undefined) settingsUpdates.max_advance_booking_days = settings.maxAdvanceBookingDays;
      if (settings.minAdvanceBookingHours !== undefined) settingsUpdates.min_advance_booking_hours = settings.minAdvanceBookingHours;
      if (settings.allowOnlineBooking !== undefined) settingsUpdates.allow_online_booking = settings.allowOnlineBooking;
      if (settings.requireDeposit !== undefined) settingsUpdates.require_deposit = settings.requireDeposit;
      if (settings.depositPercent !== undefined) settingsUpdates.deposit_percent = settings.depositPercent;
      if (settings.requireVaccinations !== undefined) settingsUpdates.require_vaccinations = settings.requireVaccinations;
      if (settings.cancellationWindowHours !== undefined) settingsUpdates.cancellation_window_hours = settings.cancellationWindowHours;
      if (settings.taxRate !== undefined) settingsUpdates.tax_rate = settings.taxRate;
      if (settings.taxName !== undefined) settingsUpdates.tax_name = settings.taxName;
      if (settings.invoicePrefix !== undefined) settingsUpdates.invoice_prefix = settings.invoicePrefix;
      if (settings.invoiceFooter !== undefined) settingsUpdates.invoice_footer = settings.invoiceFooter;
      if (settings.notificationPrefs !== undefined) settingsUpdates.notification_prefs = JSON.stringify(settings.notificationPrefs);
      if (settings.emailTemplates !== undefined) settingsUpdates.email_templates = JSON.stringify(settings.emailTemplates);
      if (settings.businessHours !== undefined) settingsUpdates.business_hours = JSON.stringify(settings.businessHours);
      if (settings.integrations !== undefined) settingsUpdates.integrations = JSON.stringify(settings.integrations);
      if (settings.customFields !== undefined) settingsUpdates.custom_fields = JSON.stringify(settings.customFields);
    }

    // Branding is a JSONB column in TenantSettings
    if (branding !== undefined) {
      settingsUpdates.branding = JSON.stringify(branding);
    }

    if (Object.keys(tenantUpdates).length === 0 && Object.keys(settingsUpdates).length === 0) {
      return createResponse(400, {
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    let updatedTenant = null;
    let updatedSettings = null;

    // Update Tenant table if there are tenant-level changes
    if (Object.keys(tenantUpdates).length > 0) {
      const columns = Object.keys(tenantUpdates);
      const setClauses = columns.map((key, i) => `${key} = $${i + 2}`);
      setClauses.push('updated_at = NOW()');

      console.log('[PROFILE-API] Updating Tenant table:', tenantId, 'fields:', columns);

      const result = await query(
        `UPDATE "Tenant"
         SET ${setClauses.join(', ')}
         WHERE id = $1
         RETURNING id, name, slug, plan, feature_flags, updated_at`,
        [tenantId, ...Object.values(tenantUpdates)]
      );

      updatedTenant = result.rows[0];
    } else {
      // Just fetch current tenant data
      const result = await query(
        `SELECT id, name, slug, plan, feature_flags, updated_at FROM "Tenant" WHERE id = $1`,
        [tenantId]
      );
      updatedTenant = result.rows[0];
    }

    // Update TenantSettings table if there are settings changes
    if (Object.keys(settingsUpdates).length > 0) {
      const columns = Object.keys(settingsUpdates);
      const setClauses = columns.map((key, i) => `${key} = $${i + 2}`);
      setClauses.push('updated_at = NOW()');

      console.log('[PROFILE-API] Updating TenantSettings table:', tenantId, 'fields:', columns);

      // Use UPSERT in case TenantSettings row doesn't exist yet
      const insertColumns = ['tenant_id', ...columns, 'updated_at'];
      const insertValues = ['$1', ...columns.map((_, i) => `$${i + 2}`), 'NOW()'];
      const updateClauses = columns.map((key, i) => `${key} = EXCLUDED.${key}`);
      updateClauses.push('updated_at = NOW()');

      const result = await query(
        `INSERT INTO "TenantSettings" (${insertColumns.join(', ')})
         VALUES (${insertValues.join(', ')})
         ON CONFLICT (tenant_id) DO UPDATE
         SET ${updateClauses.join(', ')}
         RETURNING *`,
        [tenantId, ...Object.values(settingsUpdates)]
      );

      updatedSettings = result.rows[0];
    } else {
      // Just fetch current settings
      const result = await query(
        `SELECT * FROM "TenantSettings" WHERE tenant_id = $1`,
        [tenantId]
      );
      updatedSettings = result.rows[0] || {};
    }

    console.log('[PROFILE-API] Tenant updated:', { id: updatedTenant.id });

    return createResponse(200, {
      success: true,
      tenant: {
        id: updatedTenant.id,
        recordId: updatedTenant.id,
        name: updatedTenant.name,
        slug: updatedTenant.slug,
        plan: updatedTenant.plan,
        featureFlags: updatedTenant.feature_flags || {},
        updatedAt: updatedTenant.updated_at,
        settings: {
          timezone: updatedSettings.timezone,
          currency: updatedSettings.currency,
          dateFormat: updatedSettings.date_format,
          timeFormat: updatedSettings.time_format,
          language: updatedSettings.language,
          businessName: updatedSettings.business_name,
          businessPhone: updatedSettings.business_phone,
          businessEmail: updatedSettings.business_email,
          businessAddress: updatedSettings.business_address,
          defaultCheckInTime: updatedSettings.default_check_in_time,
          defaultCheckOutTime: updatedSettings.default_check_out_time,
          bookingBufferMinutes: updatedSettings.booking_buffer_minutes,
          maxAdvanceBookingDays: updatedSettings.max_advance_booking_days,
          minAdvanceBookingHours: updatedSettings.min_advance_booking_hours,
          allowOnlineBooking: updatedSettings.allow_online_booking,
          requireDeposit: updatedSettings.require_deposit,
          depositPercent: updatedSettings.deposit_percent,
          requireVaccinations: updatedSettings.require_vaccinations,
          cancellationWindowHours: updatedSettings.cancellation_window_hours,
          taxRate: updatedSettings.tax_rate,
          taxName: updatedSettings.tax_name,
          invoicePrefix: updatedSettings.invoice_prefix,
          invoiceFooter: updatedSettings.invoice_footer,
          notificationPrefs: updatedSettings.notification_prefs || {},
          emailTemplates: updatedSettings.email_templates || {},
          businessHours: updatedSettings.business_hours || {},
          integrations: updatedSettings.integrations || {},
          customFields: updatedSettings.custom_fields || {},
        },
        branding: updatedSettings.branding || {},
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
      `SELECT record_id FROM "User" WHERE cognito_sub = $1`,
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
      `SELECT record_id FROM "User" WHERE cognito_sub = $1`,
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

