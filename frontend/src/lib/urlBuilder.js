/**
 * URL Builder Utility for BarkBase ID System
 *
 * Provides utilities for building URLs with the new ID system:
 * - Uses account_code (BK-XXXXXX) instead of tenant_id in URLs
 * - Uses record_id (sequential number) instead of UUID for display
 *
 * URL Pattern: /{resource}/{account_code}/record/{type_id}/{record_id}
 * Example: /owners/BK-7X3M9P/record/1/42
 */

import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';

/**
 * Object type codes matching backend OBJECT_TYPE_CODES
 */
export const OBJECT_TYPE_CODES = {
  // Core CRM Objects (1-19)
  owner: 1,
  pet: 2,
  booking: 3,
  payment: 4,
  invoice: 5,
  invoiceLine: 6,
  task: 7,
  note: 8,
  vaccination: 9,
  incident: 10,
  veterinarian: 11,

  // Workflow Objects (20-29)
  workflow: 20,
  workflowStep: 21,
  workflowExecution: 22,
  workflowExecutionLog: 23,
  workflowFolder: 24,
  workflowRevision: 25,
  workflowTemplate: 26,
  segment: 27,
  segmentMember: 28,
  segmentActivity: 29,

  // Service Objects (30-39)
  service: 30,
  package: 31,

  // Facility Objects (40-49)
  run: 40,
  kennel: 41,
  runTemplate: 42,
  runAssignment: 43,

  // User/Staff Objects (50-59)
  user: 50,
  staff: 51,
  role: 52,
  userRole: 53,
  userSession: 54,
  timeEntry: 55,
  timePunch: 56,
  shift: 57,
  shiftTemplate: 58,

  // Communication Objects (60-69)
  conversation: 60,
  message: 61,
  notification: 62,
  emailTemplate: 63,
  communication: 64,

  // Configuration Objects (70-79)
  customProperty: 70,
  objectSettings: 71,
  objectAssociation: 72,
  objectPipeline: 73,
  pipelineStage: 74,
  objectStatus: 75,
  savedView: 76,
  associationLabel: 77,
  objectIndexSettings: 78,
  objectRecordLayout: 79,

  // Property System Objects (80-89)
  property: 80,
  propertyGroup: 81,
  propertyLogicRule: 82,
  propertyValue: 83,
  propertyTemplate: 84,
  propertyHistory: 85,

  // System Objects (90-99)
  auditLog: 90,
  deletedRecord: 91,
  import: 92,
  activity: 93,
  segmentSnapshot: 94,
  objectPreviewLayout: 95,

  // Booking Extensions (100-109)
  recurringBooking: 100,
  recurringBookingInstance: 101,
};

/**
 * Get the current account code from auth or tenant store
 * @returns {string|null} Account code (e.g., "BK-7X3M9P")
 */
export function getAccountCode() {
  // Try auth store first (canonical source)
  const authAccountCode = useAuthStore.getState().accountCode;
  if (authAccountCode) return authAccountCode;

  // Fallback to tenant store
  const tenantAccountCode = useTenantStore.getState().tenant?.accountCode;
  return tenantAccountCode || null;
}

/**
 * Get the object type code for a given entity type
 * @param {string} entityType - Entity type name (e.g., "owner", "pet")
 * @returns {number|null} Type code or null if not found
 */
export function getTypeCode(entityType) {
  const normalizedType = entityType?.toLowerCase().replace(/_/g, '');
  return OBJECT_TYPE_CODES[normalizedType] ?? null;
}

/**
 * Build a record URL using the new ID system
 *
 * @param {string} resourcePath - Base resource path (e.g., "/owners", "/pets")
 * @param {string} entityType - Entity type for type code lookup
 * @param {number|string} recordId - The sequential record_id (NOT UUID)
 * @param {string} [accountCode] - Optional account code override
 * @returns {string} Full URL path
 *
 * @example
 * buildRecordUrl('/owners', 'owner', 42)
 * // Returns: "/owners/BK-7X3M9P/record/1/42"
 */
export function buildRecordUrl(resourcePath, entityType, recordId, accountCode = null) {
  const code = accountCode || getAccountCode();
  const typeCode = getTypeCode(entityType);

  if (!code) {
    console.warn('[urlBuilder] No account code available, using fallback URL');
    return `${resourcePath}/${recordId}`;
  }

  if (!typeCode) {
    console.warn(`[urlBuilder] Unknown entity type: ${entityType}`);
    return `${resourcePath}/${code}/${recordId}`;
  }

  return `${resourcePath}/${code}/record/${typeCode}/${recordId}`;
}

/**
 * Build an API endpoint URL with account code
 *
 * @param {string} basePath - API base path (e.g., "/api/v1/entity/owners")
 * @param {string} entityType - Entity type for type code lookup
 * @param {number|string} recordId - The sequential record_id
 * @param {string} [accountCode] - Optional account code override
 * @returns {string} Full API URL path
 *
 * @example
 * buildApiRecordUrl('/api/v1/entity/owners', 'owner', 42)
 * // Returns: "/api/v1/entity/owners/BK-7X3M9P/record/1/42"
 */
export function buildApiRecordUrl(basePath, entityType, recordId, accountCode = null) {
  return buildRecordUrl(basePath, entityType, recordId, accountCode);
}

/**
 * Parse a record URL to extract account code, type code, and record ID
 *
 * @param {string} url - URL to parse
 * @returns {{ accountCode: string, typeCode: number, recordId: number } | null}
 *
 * @example
 * parseRecordUrl('/owners/BK-7X3M9P/record/1/42')
 * // Returns: { accountCode: 'BK-7X3M9P', typeCode: 1, recordId: 42 }
 */
export function parseRecordUrl(url) {
  // Pattern: /{resource}/{accountCode}/record/{typeCode}/{recordId}
  const match = url.match(/\/([^/]+)\/(BK-[A-Z0-9]+)\/record\/(\d+)\/(\d+)/);

  if (!match) return null;

  return {
    resource: match[1],
    accountCode: match[2],
    typeCode: parseInt(match[3], 10),
    recordId: parseInt(match[4], 10),
  };
}

/**
 * Format a record ID for display
 * Shows the sequential record_id as a plain number
 *
 * @param {number|string} recordId - The record_id to format
 * @returns {string} Formatted ID (e.g., "42")
 */
export function formatRecordId(recordId) {
  if (recordId === null || recordId === undefined) return '-';
  return String(recordId);
}

/**
 * Check if a value looks like a UUID (for backwards compatibility)
 * @param {string} value - Value to check
 * @returns {boolean}
 */
export function isUuid(value) {
  if (!value || typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Get the display ID for a record
 * Returns record_id if available, otherwise returns a truncated UUID for backwards compatibility
 *
 * @param {object} record - Record object with potential id and recordId fields
 * @returns {string} Display ID
 */
export function getDisplayId(record) {
  if (!record) return '-';

  // Prefer record_id (new system)
  if (record.recordId !== undefined && record.recordId !== null) {
    return formatRecordId(record.recordId);
  }

  // Fallback to UUID (old system) - show first 8 chars
  if (record.id && isUuid(record.id)) {
    return record.id.substring(0, 8);
  }

  // Last resort: show full id
  return record.id ? String(record.id) : '-';
}

export default {
  OBJECT_TYPE_CODES,
  getAccountCode,
  getTypeCode,
  buildRecordUrl,
  buildApiRecordUrl,
  parseRecordUrl,
  formatRecordId,
  isUuid,
  getDisplayId,
};
