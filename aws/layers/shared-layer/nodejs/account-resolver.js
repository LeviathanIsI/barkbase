/**
 * =============================================================================
 * BarkBase Account Code Resolver
 * =============================================================================
 *
 * Resolves account_code (BK-XXXXXX) to tenant_id for the new ID system.
 *
 * Supports two patterns:
 * 1. New URL pattern: /{resource}/{account_code}/record/{type_id}/{record_id}
 * 2. Legacy pattern with X-Account-Code header fallback
 *
 * =============================================================================
 */

let dbLayer;
try {
  dbLayer = require('/opt/nodejs/db');
} catch (e) {
  // Local development fallback
  dbLayer = require('../../db-layer/nodejs/db');
}

const { getPoolAsync, query } = dbLayer;

/**
 * Object type codes mapping entity types to their type_id
 * Must match frontend urlBuilder.js OBJECT_TYPE_CODES
 */
const OBJECT_TYPE_CODES = {
  pet: 1,
  owner: 2,
  booking: 3,
  invoice: 4,
  payment: 5,
  task: 6,
  workflow: 7,
  segment: 8,
  service: 9,
  kennel: 10,
  run: 11,
  staff: 12,
  user: 13,
  note: 14,
  vaccination: 15,
  incident: 16,
  activity: 17,
};

/**
 * Reverse mapping: type_id to entity type
 */
const TYPE_CODE_TO_ENTITY = Object.entries(OBJECT_TYPE_CODES).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {});

// Cache for tenant lookups (account_code -> tenant_id)
// TTL: 5 minutes (tenants rarely change account codes)
const tenantCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Get tenant_id from account_code using database lookup
 * Results are cached for 5 minutes
 *
 * @param {string} accountCode - Account code (BK-XXXXXX)
 * @returns {Promise<string|null>} - tenant_id or null if not found
 */
async function getTenantByAccountCode(accountCode) {
  if (!accountCode) {
    return null;
  }

  // Check cache first
  const cached = tenantCache.get(accountCode);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log('[AccountResolver] Cache hit for account_code:', accountCode);
    return cached.tenantId;
  }

  try {
    await getPoolAsync();
    const result = await query(
      'SELECT id FROM "Tenant" WHERE account_code = $1',
      [accountCode]
    );

    if (result.rows.length === 0) {
      console.warn('[AccountResolver] No tenant found for account_code:', accountCode);
      return null;
    }

    const tenantId = result.rows[0].id;

    // Update cache
    tenantCache.set(accountCode, {
      tenantId,
      timestamp: Date.now(),
    });

    console.log('[AccountResolver] Resolved account_code:', accountCode, '-> tenant_id:', tenantId);
    return tenantId;
  } catch (error) {
    console.error('[AccountResolver] Database error:', error.message);
    return null;
  }
}

/**
 * Parse the new ID system URL pattern
 * Pattern: /{base}/{resource}/{account_code}/record/{type_id}/{record_id}
 *
 * @param {string} path - Request path
 * @returns {object|null} - { accountCode, typeId, recordId, resourceType } or null
 */
function parseNewIdPattern(path) {
  // Match pattern: /api/v1/{service}/{resource}/{account_code}/record/{type_id}/{record_id}
  // Or: /api/v1/{service}/{account_code}/record/{type_id}/{record_id}
  // Account code format: BK-XXXXXX (6 alphanumeric characters)
  const patterns = [
    // Pattern for entity service: /api/v1/entity/{resource}/{account_code}/record/{type_id}/{record_id}
    /\/api\/v\d+\/entity\/([^/]+)\/(BK-[A-Z0-9]{6})\/record\/(\d+)\/(\d+)/i,
    // Pattern for other services: /api/v1/{service}/{account_code}/record/{type_id}/{record_id}
    /\/api\/v\d+\/([^/]+)\/(BK-[A-Z0-9]{6})\/record\/(\d+)\/(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match) {
      return {
        resourceType: match[1].toLowerCase(),
        accountCode: match[2].toUpperCase(),
        typeId: parseInt(match[3], 10),
        recordId: parseInt(match[4], 10),
      };
    }
  }

  return null;
}

/**
 * Extract account_code from X-Account-Code header (case-insensitive)
 *
 * @param {object} event - Lambda event
 * @returns {string|null} - Account code or null
 */
function getAccountCodeFromHeader(event) {
  const headers = event.headers || {};
  return (
    headers['X-Account-Code'] ||
    headers['x-account-code'] ||
    headers['X-ACCOUNT-CODE'] ||
    headers['x-Account-Code'] ||
    null
  );
}

/**
 * Validate that type_id matches the expected resource type
 *
 * @param {number} typeId - Type ID from URL
 * @param {string} expectedType - Expected entity type (e.g., 'pet', 'owner')
 * @returns {boolean} - True if valid
 */
function validateTypeId(typeId, expectedType) {
  const expectedTypeId = OBJECT_TYPE_CODES[expectedType.toLowerCase()];
  if (!expectedTypeId) {
    console.warn('[AccountResolver] Unknown entity type:', expectedType);
    return false;
  }
  return typeId === expectedTypeId;
}

/**
 * Resolve account context from request
 * Supports both new URL pattern and X-Account-Code header
 *
 * @param {object} event - Lambda event
 * @param {string} expectedResourceType - Expected resource type (optional, for validation)
 * @returns {Promise<object>} - { tenantId, accountCode, typeId, recordId, isNewPattern }
 */
async function resolveAccountContext(event, expectedResourceType = null) {
  const path = event.requestContext?.http?.path || event.path || '';

  // Try new URL pattern first
  const newIdPattern = parseNewIdPattern(path);
  if (newIdPattern) {
    console.log('[AccountResolver] Matched new ID pattern:', newIdPattern);

    // Validate type_id if expected type provided
    if (expectedResourceType && !validateTypeId(newIdPattern.typeId, expectedResourceType)) {
      console.warn('[AccountResolver] Type ID mismatch:', {
        typeId: newIdPattern.typeId,
        expectedType: expectedResourceType,
        expectedTypeId: OBJECT_TYPE_CODES[expectedResourceType.toLowerCase()],
      });
      return {
        error: 'Type ID does not match expected resource type',
        valid: false,
      };
    }

    // Resolve tenant_id from account_code
    const tenantId = await getTenantByAccountCode(newIdPattern.accountCode);
    if (!tenantId) {
      return {
        error: 'Invalid account code',
        valid: false,
      };
    }

    return {
      tenantId,
      accountCode: newIdPattern.accountCode,
      typeId: newIdPattern.typeId,
      recordId: newIdPattern.recordId,
      resourceType: newIdPattern.resourceType,
      isNewPattern: true,
      valid: true,
    };
  }

  // Fall back to X-Account-Code header
  const headerAccountCode = getAccountCodeFromHeader(event);
  if (headerAccountCode) {
    console.log('[AccountResolver] Using X-Account-Code header:', headerAccountCode);

    const tenantId = await getTenantByAccountCode(headerAccountCode);
    if (!tenantId) {
      return {
        error: 'Invalid account code in header',
        valid: false,
      };
    }

    return {
      tenantId,
      accountCode: headerAccountCode,
      typeId: null,
      recordId: null,
      resourceType: null,
      isNewPattern: false,
      valid: true,
    };
  }

  // No account context found - fall back to legacy tenant resolution
  return {
    tenantId: null,
    accountCode: null,
    typeId: null,
    recordId: null,
    resourceType: null,
    isNewPattern: false,
    valid: true, // Valid because legacy paths may not have account context
  };
}

/**
 * Rewrite path to legacy format for backward compatibility
 * Converts: /api/v1/entity/pets/BK-ABC123/record/1/42
 * To:       /api/v1/entity/pets/{id} (with pathParameters.id = record_id)
 *
 * @param {object} event - Lambda event (will be mutated)
 * @param {object} accountContext - Result from resolveAccountContext
 */
function rewritePathToLegacy(event, accountContext) {
  if (!accountContext.isNewPattern || !accountContext.recordId) {
    return;
  }

  const path = event.requestContext?.http?.path || event.path || '';

  // Build legacy path by removing the account_code/record/type_id part
  // /api/v1/entity/pets/BK-ABC123/record/1/42 -> /api/v1/entity/pets/42
  const legacyPath = path.replace(
    /\/(BK-[A-Z0-9]{6})\/record\/\d+\/(\d+)/i,
    '/$2'
  );

  // Update event path references
  if (event.path) {
    event.path = legacyPath;
  }
  if (event.rawPath) {
    event.rawPath = legacyPath;
  }
  if (event.requestContext?.http?.path) {
    event.requestContext.http.path = legacyPath;
  }

  // Set pathParameters with record_id as 'id' for legacy handler compatibility
  event.pathParameters = event.pathParameters || {};
  event.pathParameters.id = String(accountContext.recordId);
  event.pathParameters.recordId = String(accountContext.recordId);
  event.pathParameters.accountCode = accountContext.accountCode;
  event.pathParameters.typeId = String(accountContext.typeId);

  console.log('[AccountResolver] Rewrote path:', path, '->', legacyPath);
}

/**
 * Get entity type from type_id
 *
 * @param {number} typeId - Type ID
 * @returns {string|null} - Entity type or null
 */
function getEntityTypeFromId(typeId) {
  return TYPE_CODE_TO_ENTITY[typeId] || null;
}

module.exports = {
  // Core functions
  getTenantByAccountCode,
  resolveAccountContext,
  rewritePathToLegacy,

  // Validation
  validateTypeId,
  parseNewIdPattern,

  // Helper functions
  getAccountCodeFromHeader,
  getEntityTypeFromId,

  // Constants
  OBJECT_TYPE_CODES,
  TYPE_CODE_TO_ENTITY,
};
