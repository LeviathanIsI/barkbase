/**
 * Impact Analysis Engine
 * Analyzes the impact of property modifications and deletions
 * Generates risk assessments and affected asset reports
 */

const { getPool } = require('/opt/nodejs');
const graphBuilder = require('./graph-builder');

/**
 * Analyze impact of modifying or deleting a property
 * @param {number} tenantId - Tenant ID
 * @param {string} propertyId - Property ID
 * @param {string} modificationType - 'modify', 'archive', 'delete', 'type_change'
 * @returns {object} - Impact analysis report
 */
async function analyze(tenantId, propertyId, modificationType = 'modify') {
  const pool = getPool();

  // Get property details
  const propertyResult = await pool.query(
    `SELECT * FROM "PropertyMetadata" 
     WHERE "property_id" = $1 AND ("tenant_id" = $2 OR "is_global" = true)`,
    [propertyId, tenantId]
  );

  if (propertyResult.rows.length === 0) {
    throw new Error('Property not found');
  }

  const property = propertyResult.rows[0];

  // Build dependency graph (downstream only - what depends on this)
  const graph = await graphBuilder.buildGraph(tenantId, propertyId, 'downstream');

  // Get record count with values
  const recordCount = await getRecordCount(pool, property);

  // Get detailed usage breakdown
  const usageBreakdown = await getUsageBreakdown(pool, propertyId);

  // Assess risk level
  const riskAssessment = calculateRiskLevel(property, graph, recordCount, usageBreakdown, modificationType);

  // Generate recommendations
  const recommendations = generateRecommendations(property, graph, riskAssessment, modificationType);

  // Get affected properties list
  const affectedProperties = graph.nodes
    .filter(node => node.id !== propertyId)
    .map(node => ({
      propertyId: node.id,
      propertyName: node.propertyName,
      displayLabel: node.label,
      objectType: node.objectType,
      propertyType: node.propertyType,
      depth: node.depth,
    }));

  // Get critical dependencies
  const criticalDependencies = graph.edges.filter(e => e.isCritical);

  return {
    propertyId,
    propertyName: property.property_name,
    displayLabel: property.display_label,
    objectType: property.object_type,
    propertyType: property.property_type,
    modificationType,
    
    riskAssessment,
    
    impactSummary: {
      affectedPropertiesCount: affectedProperties.length,
      criticalDependenciesCount: criticalDependencies.length,
      recordsWithValuesCount: recordCount,
      maxDependencyDepth: graph.metrics.maxDepth,
      totalDependencyChains: graph.metrics.edgeCount,
    },
    
    affectedProperties,
    criticalDependencies,
    usageBreakdown,
    recommendations,
    
    canProceed: riskAssessment.level !== 'critical' || riskAssessment.bypassAllowed,
    requiresApproval: riskAssessment.level === 'high' || riskAssessment.level === 'critical',
  };
}

/**
 * Get count of records with non-null values for this property
 */
async function getRecordCount(pool, property) {
  // Map object types to table names
  const tableMap = {
    pets: 'Pet',
    owners: 'Owner',
    bookings: 'Booking',
    payments: 'Payment',
    invoices: 'Invoice',
    staff: 'Staff',
    facilities: 'Facility',
    kennels: 'Kennel',
    runs: 'Run',
    services: 'Service',
    packages: 'Package',
    memberships: 'Membership',
    vaccinations: 'Vaccination',
    incidents: 'Incident',
    notes: 'Note',
    messages: 'Message',
    tasks: 'Task',
    users: 'User',
  };

  const tableName = tableMap[property.object_type];
  if (!tableName) {
    return 0;
  }

  // For custom properties, check JSONB column
  if (property.property_type === 'custom') {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) AS count 
         FROM "${tableName}" 
         WHERE "customFields"->>'${property.property_name}' IS NOT NULL
           AND ("tenantId" = $1 OR $1 IS NULL)`,
        [property.tenant_id]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error('Error counting custom field values:', error);
      return 0;
    }
  }

  // For system/standard properties, check actual column
  try {
    // Check if column exists first
    const columnCheck = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = $1 AND column_name = $2`,
      [tableName, property.property_name]
    );

    if (columnCheck.rows.length === 0) {
      return 0;
    }

    const result = await pool.query(
      `SELECT COUNT(*) AS count 
       FROM "${tableName}" 
       WHERE "${property.property_name}" IS NOT NULL
         AND ("tenantId" = $1 OR $1 IS NULL)`,
      [property.tenant_id]
    );
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Error counting column values:', error);
    return 0;
  }
}

/**
 * Get detailed usage breakdown
 */
async function getUsageBreakdown(pool, propertyId) {
  // In a real implementation, this would query actual workflow, form, and report tables
  // For now, we'll use the used_in field from PropertyMetadata
  const result = await pool.query(
    `SELECT "used_in" FROM "PropertyMetadata" WHERE "property_id" = $1`,
    [propertyId]
  );

  if (result.rows.length === 0) {
    return {};
  }

  const usedIn = result.rows[0].used_in || {};

  return {
    workflows: Array.isArray(usedIn.workflows) ? usedIn.workflows.length : 0,
    validations: Array.isArray(usedIn.validations) ? usedIn.validations.length : 0,
    forms: Array.isArray(usedIn.forms) ? usedIn.forms.length : 0,
    reports: Array.isArray(usedIn.reports) ? usedIn.reports.length : 0,
    apiIntegrations: Array.isArray(usedIn.api_integrations) ? usedIn.api_integrations.length : 0,
  };
}

/**
 * Calculate risk level based on impact factors
 */
function calculateRiskLevel(property, graph, recordCount, usageBreakdown, modificationType) {
  let riskScore = 0;
  const factors = [];

  // Factor 1: Property type
  if (property.property_type === 'system') {
    riskScore += 50;
    factors.push('System property (immutable)');
  } else if (property.property_type === 'protected') {
    riskScore += 30;
    factors.push('Protected property (business logic dependencies)');
  } else if (property.property_type === 'standard') {
    riskScore += 20;
    factors.push('Standard property (structural importance)');
  }

  // Factor 2: Modification type
  if (modificationType === 'delete') {
    riskScore += 30;
    factors.push('Permanent deletion');
  } else if (modificationType === 'type_change') {
    riskScore += 25;
    factors.push('Data type change');
  } else if (modificationType === 'archive') {
    riskScore += 15;
    factors.push('Archive operation');
  }

  // Factor 3: Dependencies
  if (graph.metrics.nodeCount > 10) {
    riskScore += 20;
    factors.push(`${graph.metrics.nodeCount - 1} dependent properties`);
  } else if (graph.metrics.nodeCount > 5) {
    riskScore += 10;
    factors.push(`${graph.metrics.nodeCount - 1} dependent properties`);
  }

  if (graph.metrics.criticalEdgeCount > 0) {
    riskScore += 15;
    factors.push(`${graph.metrics.criticalEdgeCount} critical dependencies`);
  }

  // Factor 4: Data population
  if (recordCount > 10000) {
    riskScore += 15;
    factors.push(`${recordCount.toLocaleString()} records with values`);
  } else if (recordCount > 1000) {
    riskScore += 10;
    factors.push(`${recordCount.toLocaleString()} records with values`);
  } else if (recordCount > 100) {
    riskScore += 5;
    factors.push(`${recordCount} records with values`);
  }

  // Factor 5: Asset usage
  const totalUsage = Object.values(usageBreakdown).reduce((sum, count) => sum + count, 0);
  if (totalUsage > 20) {
    riskScore += 15;
    factors.push(`Used in ${totalUsage} assets (workflows/forms/reports)`);
  } else if (totalUsage > 10) {
    riskScore += 10;
    factors.push(`Used in ${totalUsage} assets`);
  } else if (totalUsage > 0) {
    riskScore += 5;
    factors.push(`Used in ${totalUsage} assets`);
  }

  // Determine risk level
  let level, color, bypassAllowed;
  if (riskScore >= 80) {
    level = 'critical';
    color = 'red';
    bypassAllowed = false;
  } else if (riskScore >= 50) {
    level = 'high';
    color = 'orange';
    bypassAllowed = false;
  } else if (riskScore >= 25) {
    level = 'medium';
    color = 'yellow';
    bypassAllowed = true;
  } else {
    level = 'low';
    color = 'green';
    bypassAllowed = true;
  }

  return {
    level,
    score: riskScore,
    color,
    bypassAllowed,
    factors,
  };
}

/**
 * Generate recommendations based on impact analysis
 */
function generateRecommendations(property, graph, riskAssessment, modificationType) {
  const recommendations = [];

  // Recommendation 1: Can't modify system properties
  if (property.property_type === 'system') {
    recommendations.push({
      type: 'blocker',
      message: 'System properties cannot be modified or deleted.',
      action: null,
    });
    return recommendations;
  }

  // Recommendation 2: High risk operations
  if (riskAssessment.level === 'critical' || riskAssessment.level === 'high') {
    recommendations.push({
      type: 'warning',
      message: 'This operation has high risk. Consider alternative approaches.',
      action: 'Review dependencies and consider cascade strategy',
    });
  }

  // Recommendation 3: Dependencies exist
  if (graph.metrics.nodeCount > 1) {
    recommendations.push({
      type: 'info',
      message: `This property has ${graph.metrics.nodeCount - 1} dependent properties.`,
      action: 'Review dependency graph and select appropriate cascade strategy',
    });
  }

  // Recommendation 4: Critical dependencies
  if (graph.metrics.criticalEdgeCount > 0) {
    recommendations.push({
      type: 'warning',
      message: `${graph.metrics.criticalEdgeCount} critical dependencies will break if this property is deleted.`,
      action: 'Use "Substitute Property" cascade strategy to replace with compatible property',
    });
  }

  // Recommendation 5: Type change with data
  if (modificationType === 'type_change' && riskAssessment.factors.some(f => f.includes('records with values'))) {
    recommendations.push({
      type: 'blocker',
      message: 'Cannot change data type for properties with existing data.',
      action: 'Export data, clear property, change type, then re-import',
    });
  }

  // Recommendation 6: Suggest archiving instead of deletion
  if (modificationType === 'delete') {
    recommendations.push({
      type: 'suggestion',
      message: 'Consider archiving instead of permanent deletion.',
      action: 'Archive property (90-day recovery window)',
    });
  }

  return recommendations;
}

module.exports = {
  analyze,
  getRecordCount,
  calculateRiskLevel,
  generateRecommendations,
};

