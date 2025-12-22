/**
 * =============================================================================
 * BarkBase Audit Trail Utilities
 * =============================================================================
 * 
 * Comprehensive audit logging for compliance and security
 * 
 * =============================================================================
 */

// Audit action types
const AUDIT_ACTIONS = {
  // CRUD operations
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET: 'password_reset',
  MFA_ENABLED: 'mfa_enabled',
  MFA_DISABLED: 'mfa_disabled',
  
  // Data operations
  EXPORT: 'export',
  IMPORT: 'import',
  PRINT: 'print',
  ARCHIVE: 'archive',
  RESTORE: 'restore',
  
  // Business operations
  CHECK_IN: 'check_in',
  CHECK_OUT: 'check_out',
  PAYMENT: 'payment',
  REFUND: 'refund',
  CANCEL: 'cancel',
  APPROVE: 'approve',
  REJECT: 'reject',
  
  // Configuration
  CONFIG_CHANGE: 'config_change',
  PERMISSION_CHANGE: 'permission_change',
};

// Entity types
const ENTITY_TYPES = {
  USER: 'user',
  OWNER: 'owner',
  PET: 'pet',
  BOOKING: 'booking',
  PAYMENT: 'payment',
  INVOICE: 'invoice',
  VACCINATION: 'vaccination',
  STAFF: 'staff',
  INCIDENT: 'incident',
  SETTINGS: 'settings',
  KENNEL: 'kennel',
  SERVICE: 'service',
};

// Data types for compliance
const DATA_TYPES = {
  PII: 'pii', // Personally Identifiable Information
  FINANCIAL: 'financial',
  MEDICAL: 'medical',
  SENSITIVE: 'sensitive',
};

/**
 * Calculate changes between old and new values
 * @param {object} oldValues - Previous values
 * @param {object} newValues - New values
 * @returns {object} - Changed fields
 */
function calculateChanges(oldValues, newValues) {
  if (!oldValues || !newValues) return null;
  
  const changes = {};
  const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
  
  for (const key of allKeys) {
    const oldVal = oldValues[key];
    const newVal = newValues[key];
    
    // Skip internal/system fields
    if (['updated_at', 'created_at', 'deleted_at'].includes(key)) {
      continue;
    }
    
    // Check if value changed
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = {
        from: oldVal,
        to: newVal,
      };
    }
  }
  
  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Mask sensitive fields in data
 * @param {object} data - Data to mask
 * @param {string[]} sensitiveFields - Fields to mask
 * @returns {object} - Data with sensitive fields masked
 */
function maskSensitiveData(data, sensitiveFields = []) {
  if (!data) return data;
  
  const defaultSensitiveFields = [
    'password', 'password_hash', 'ssn', 'social_security',
    'credit_card', 'card_number', 'cvv', 'pin',
    'secret', 'token', 'api_key', 'private_key',
  ];
  
  const allSensitiveFields = [...new Set([...defaultSensitiveFields, ...sensitiveFields])];
  const masked = { ...data };
  
  for (const field of allSensitiveFields) {
    if (masked[field]) {
      masked[field] = '***REDACTED***';
    }
  }
  
  return masked;
}

/**
 * Create an audit log entry
 * @param {function} dbQuery - Database query function
 * @param {object} auditData - Audit data
 * @returns {Promise<object>} - Created audit log entry
 */
async function createAuditLog(dbQuery, auditData) {
  const {
    tenantId,
    userId,
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
    ipAddress,
    userAgent,
    requestId,
    sessionId,
    metadata,
  } = auditData;
  
  // Calculate changes if both old and new values provided
  const changes = calculateChanges(oldValues, newValues);
  
  // Mask sensitive data
  const maskedOldValues = maskSensitiveData(oldValues);
  const maskedNewValues = maskSensitiveData(newValues);
  
  try {
    const result = await dbQuery(
      `INSERT INTO "AuditLog" (
         tenant_id, user_id, action, entity_type, entity_id,
         old_values, new_values, changes,
         ip_address, user_agent, request_id, session_id, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        tenantId,
        userId || null,
        action,
        entityType,
        entityId || null,
        maskedOldValues ? JSON.stringify(maskedOldValues) : null,
        maskedNewValues ? JSON.stringify(maskedNewValues) : null,
        changes ? JSON.stringify(changes) : null,
        ipAddress || null,
        userAgent || null,
        requestId || null,
        sessionId || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('[AUDIT] Failed to create log:', error.message);
    // Don't throw - audit logging should not break operations
    return null;
  }
}

/**
 * Create an authentication audit log entry
 */
async function createAuthAuditLog(dbQuery, auditData) {
  const {
    tenantId,
    userId,
    action,
    status,
    ipAddress,
    userAgent,
    location,
    failureReason,
  } = auditData;
  
  try {
    const result = await dbQuery(
      `INSERT INTO "AuthAuditLog" (
         tenant_id, user_id, action, status,
         ip_address, user_agent, location, failure_reason
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        tenantId || null,
        userId || null,
        action,
        status,
        ipAddress || null,
        userAgent || null,
        location ? JSON.stringify(location) : null,
        failureReason || null,
      ]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('[AUDIT] Failed to create auth log:', error.message);
    return null;
  }
}

/**
 * Create a data access log entry (for compliance)
 */
async function createDataAccessLog(dbQuery, auditData) {
  const {
    tenantId,
    userId,
    dataType,
    entityType,
    entityId,
    accessType,
    purpose,
    ipAddress,
  } = auditData;
  
  try {
    const result = await dbQuery(
      `INSERT INTO "DataAccessLog" (
         tenant_id, user_id, data_type, entity_type, entity_id,
         access_type, purpose, ip_address
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        tenantId,
        userId || null,
        dataType,
        entityType,
        entityId || null,
        accessType,
        purpose || null,
        ipAddress || null,
      ]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('[AUDIT] Failed to create data access log:', error.message);
    return null;
  }
}

/**
 * Create a configuration change log entry
 */
async function createConfigChangeLog(dbQuery, auditData) {
  const {
    tenantId,
    userId,
    configType,
    configKey,
    oldValue,
    newValue,
    changeReason,
  } = auditData;
  
  try {
    const result = await dbQuery(
      `INSERT INTO "ConfigChangeLog" (
         tenant_id, user_id, config_type, config_key,
         old_value, new_value, change_reason
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        tenantId,
        userId,
        configType,
        configKey,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        changeReason || null,
      ]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('[AUDIT] Failed to create config change log:', error.message);
    return null;
  }
}

/**
 * Query audit logs
 * @param {function} dbQuery - Database query function
 * @param {string} tenantId - Tenant ID
 * @param {object} filters - Filter options
 * @returns {Promise<object[]>} - Audit logs
 */
async function queryAuditLogs(dbQuery, tenantId, filters = {}) {
  const {
    userId,
    action,
    entityType,
    entityId,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = filters;
  
  let whereClause = 'tenant_id = $1';
  const params = [tenantId];
  let paramIndex = 2;
  
  if (userId) {
    whereClause += ` AND user_id = $${paramIndex++}`;
    params.push(userId);
  }
  if (action) {
    whereClause += ` AND action = $${paramIndex++}`;
    params.push(action);
  }
  if (entityType) {
    whereClause += ` AND entity_type = $${paramIndex++}`;
    params.push(entityType);
  }
  if (entityId) {
    whereClause += ` AND entity_id = $${paramIndex++}`;
    params.push(entityId);
  }
  if (startDate) {
    whereClause += ` AND created_at >= $${paramIndex++}`;
    params.push(startDate);
  }
  if (endDate) {
    whereClause += ` AND created_at <= $${paramIndex++}`;
    params.push(endDate);
  }
  
  params.push(limit, offset);
  
  const result = await dbQuery(
    `SELECT a.*, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name
     FROM "AuditLog" a
     LEFT JOIN "User" u ON a.user_id = u.record_id
     WHERE ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    params
  );
  
  return result.rows;
}

/**
 * Get audit summary for a tenant
 */
async function getAuditSummary(dbQuery, tenantId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const result = await dbQuery(
    `SELECT
       action,
       entity_type,
       COUNT(*) as count
     FROM "AuditLog"
     WHERE tenant_id = $1 AND created_at >= $2
     GROUP BY action, entity_type
     ORDER BY count DESC`,
    [tenantId, startDate.toISOString()]
  );
  
  return result.rows;
}

/**
 * Helper to extract audit context from Lambda event
 */
function extractAuditContext(event) {
  const headers = event.headers || {};
  
  return {
    ipAddress: headers['x-forwarded-for']?.split(',')[0] || 
               headers['x-real-ip'] || 
               event.requestContext?.http?.sourceIp,
    userAgent: headers['user-agent'],
    requestId: event.requestContext?.requestId,
  };
}

module.exports = {
  AUDIT_ACTIONS,
  ENTITY_TYPES,
  DATA_TYPES,
  calculateChanges,
  maskSensitiveData,
  createAuditLog,
  createAuthAuditLog,
  createDataAccessLog,
  createConfigChangeLog,
  queryAuditLogs,
  getAuditSummary,
  extractAuditContext,
};

