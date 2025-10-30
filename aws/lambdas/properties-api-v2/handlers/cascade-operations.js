/**
 * Cascade Operations Handler
 * Handles cascade operations (archive, restore, substitute, force delete) for Properties API v2
 */

const softDeleteHandler = require('../../properties-api/handlers/soft-delete');
const restoreHandler = require('../../properties-api/handlers/restore');
const cascadeHandlerV1 = require('../../property-dependency-service/cascade-handler');

/**
 * Archive a property with cascade strategy
 */
async function archive(tenantId, userId, propertyId, options) {
  const { cascadeStrategy = 'cancel', confirmed = false, reason } = options;

  // Use soft-delete handler
  return await softDeleteHandler.softDelete(propertyId, tenantId, userId, {
    confirmed,
    reason,
  });
}

/**
 * Restore a property from soft delete or archive
 */
async function restore(tenantId, userId, propertyId) {
  // Try restoring from soft delete first
  return await restoreHandler.restoreSoftDeleted(propertyId, tenantId, userId);
}

/**
 * Substitute property with another (cascade strategy)
 */
async function substitute(tenantId, userId, propertyId, replacementPropertyId) {
  if (!replacementPropertyId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
      body: JSON.stringify({ error: 'replacementPropertyId is required' }),
    };
  }

  // Use cascade handler from dependency service
  const result = await cascadeHandlerV1.execute(
    tenantId,
    userId,
    propertyId,
    'archive',
    'substitute',
    { replacementPropertyId }
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
    body: JSON.stringify(result),
  };
}

/**
 * Force delete property (with broken dependencies)
 */
async function forceDelete(tenantId, userId, propertyId, reason) {
  // Use cascade handler with force strategy
  const result = await cascadeHandlerV1.execute(
    tenantId,
    userId,
    propertyId,
    'delete',
    'force',
    { reason }
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
    body: JSON.stringify(result),
  };
}

module.exports = {
  archive,
  restore,
  substitute,
  forceDelete,
};

