/**
 * Dependencies Handler
 * Handles dependency-related endpoints for Properties API v2
 */

const { getPool } = require('/opt/nodejs');

/**
 * Get dependencies for a property
 */
async function getDependencies(tenantId, propertyId, direction = 'both') {
  const pool = getPool();

  let query = '';
  const params = [propertyId, tenantId];

  if (direction === 'upstream') {
    // Properties that this property depends on
    query = `
      SELECT 
        pd.*,
        pm."property_name",
        pm."display_label",
        pm."object_type",
        pm."property_type"
      FROM "PropertyDependencies" pd
      INNER JOIN "PropertyMetadata" pm ON pd."source_property_id" = pm."property_id"
      WHERE pd."dependent_property_id" = $1
        AND pd."is_active" = true
        AND (pm."tenant_id" = $2 OR pm."is_global" = true)
    `;
  } else if (direction === 'downstream') {
    // Properties that depend on this property
    query = `
      SELECT 
        pd.*,
        pm."property_name",
        pm."display_label",
        pm."object_type",
        pm."property_type"
      FROM "PropertyDependencies" pd
      INNER JOIN "PropertyMetadata" pm ON pd."dependent_property_id" = pm."property_id"
      WHERE pd."source_property_id" = $1
        AND pd."is_active" = true
        AND (pm."tenant_id" = $2 OR pm."is_global" = true)
    `;
  } else {
    // Both directions
    query = `
      SELECT 
        pd.*,
        CASE 
          WHEN pd."source_property_id" = $1 THEN 'downstream'
          ELSE 'upstream'
        END AS direction,
        pm."property_name",
        pm."display_label",
        pm."object_type",
        pm."property_type"
      FROM "PropertyDependencies" pd
      INNER JOIN "PropertyMetadata" pm ON 
        CASE 
          WHEN pd."source_property_id" = $1 THEN pm."property_id" = pd."dependent_property_id"
          ELSE pm."property_id" = pd."source_property_id"
        END
      WHERE (pd."source_property_id" = $1 OR pd."dependent_property_id" = $1)
        AND pd."is_active" = true
        AND (pm."tenant_id" = $2 OR pm."is_global" = true)
    `;
  }

  const result = await pool.query(query, params);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
    body: JSON.stringify({
      propertyId,
      direction,
      dependencies: result.rows,
      count: result.rows.length,
    }),
  };
}

/**
 * Get dependents (reverse dependencies)
 */
async function getDependents(tenantId, propertyId) {
  return await getDependencies(tenantId, propertyId, 'downstream');
}

/**
 * Analyze impact of modifying/deleting a property
 */
async function analyzeImpact(tenantId, propertyId, modificationType = 'modify') {
  // Import impact analyzer from property-dependency-service
  const impactAnalyzer = require('../../property-dependency-service/impact-analyzer');

  const impact = await impactAnalyzer.analyze(tenantId, propertyId, modificationType);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
    body: JSON.stringify(impact),
  };
}

/**
 * Get detailed usage report for a property
 */
async function getUsageReport(tenantId, propertyId) {
  const pool = getPool();

  // Get property details
  const propertyResult = await pool.query(
    `SELECT * FROM "PropertyMetadata" WHERE "property_id" = $1`,
    [propertyId]
  );

  if (propertyResult.rows.length === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Property not found' }),
    };
  }

  const property = propertyResult.rows[0];

  // Get dependencies
  const depsResult = await pool.query(
    `SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE "is_critical" = true) AS critical
     FROM "PropertyDependencies"
     WHERE ("source_property_id" = $1 OR "dependent_property_id" = $1)
       AND "is_active" = true`,
    [propertyId]
  );

  // Get audit trail count
  const auditResult = await pool.query(
    `SELECT COUNT(*) AS modifications
     FROM "PropertyChangeAudit"
     WHERE "property_id" = $1`,
    [propertyId]
  );

  // Parse used_in from property
  const usedIn = property.used_in || {};

  const report = {
    propertyId,
    propertyName: property.property_name,
    displayLabel: property.display_label,
    objectType: property.object_type,
    propertyType: property.property_type,
    
    usage: {
      dependencies: {
        total: parseInt(depsResult.rows[0].total, 10),
        critical: parseInt(depsResult.rows[0].critical, 10),
      },
      assets: {
        workflows: Array.isArray(usedIn.workflows) ? usedIn.workflows : [],
        validations: Array.isArray(usedIn.validations) ? usedIn.validations : [],
        forms: Array.isArray(usedIn.forms) ? usedIn.forms : [],
        reports: Array.isArray(usedIn.reports) ? usedIn.reports : [],
        apiIntegrations: Array.isArray(usedIn.api_integrations) ? usedIn.api_integrations : [],
      },
      modifications: parseInt(auditResult.rows[0].modifications, 10),
    },
    
    metadata: {
      createdDate: property.created_date,
      createdBy: property.created_by,
      modifiedDate: property.modified_date,
      modifiedBy: property.modified_by,
    },
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'X-API-Version': 'v2' },
    body: JSON.stringify(report),
  };
}

module.exports = {
  getDependencies,
  getDependents,
  analyzeImpact,
  getUsageReport,
};

