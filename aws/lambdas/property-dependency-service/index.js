/**
 * Property Dependency Service
 * Automatic dependency discovery, graph building, and impact analysis
 * Implements Salesforce MetadataComponentDependency pattern
 */

const { getPool } = require('/opt/nodejs');
const { getTenantIdFromEvent } = require('/opt/nodejs');
const formulaParser = require('./parsers/formula-parser');
const validationScanner = require('./parsers/validation-scanner');
const workflowAnalyzer = require('./parsers/workflow-analyzer');
const graphBuilder = require('./graph-builder');
const impactAnalyzer = require('./impact-analyzer');
const cascadeHandler = require('./cascade-handler');

exports.handler = async (event) => {
  console.log('Property Dependency Service invoked:', JSON.stringify(event, null, 2));

  const { httpMethod: method, path } = event.requestContext.http;
  const pathParams = event.pathParameters || {};
  const queryParams = event.queryStringParameters || {};
  const body = event.body ? JSON.parse(event.body) : {};

  // Extract tenant context
  const tenantId = await getTenantIdFromEvent(event);
  if (!tenantId) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing tenant context' }),
    };
  }

  // Extract user ID
  const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
  const userId = claims['sub'] || 'system';

  try {
    // Route: GET /api/v2/dependencies/discover
    if (method === 'GET' && path.endsWith('/discover')) {
      return await discoverAllDependencies(tenantId);
    }

    // Route: POST /api/v2/dependencies/discover/{propertyId}
    if (method === 'POST' && path.match(/\/discover\/[^/]+$/)) {
      const propertyId = pathParams.propertyId;
      return await discoverPropertyDependencies(tenantId, propertyId);
    }

    // Route: GET /api/v2/dependencies/graph/{propertyId}
    if (method === 'GET' && path.match(/\/graph\/[^/]+$/)) {
      const propertyId = pathParams.propertyId;
      const direction = queryParams.direction || 'both'; // 'upstream', 'downstream', 'both'
      return await getPropertyGraph(tenantId, propertyId, direction);
    }

    // Route: POST /api/v2/dependencies/impact-analysis/{propertyId}
    if (method === 'POST' && path.match(/\/impact-analysis\/[^/]+$/)) {
      const propertyId = pathParams.propertyId;
      const modificationType = body.modificationType || 'modify';
      return await analyzeImpact(tenantId, propertyId, modificationType);
    }

    // Route: POST /api/v2/dependencies/cascade
    if (method === 'POST' && path.endsWith('/cascade')) {
      const { propertyId, operation, strategy } = body;
      return await executeCascade(tenantId, userId, propertyId, operation, strategy);
    }

    // Route: GET /api/v2/dependencies/validate-circular
    if (method === 'GET' && path.endsWith('/validate-circular')) {
      return await validateCircularDependencies(tenantId);
    }

    // Route: GET /api/v2/dependencies/critical-paths
    if (method === 'GET' && path.endsWith('/critical-paths')) {
      return await getCriticalPaths(tenantId);
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Route not found' }),
    };
  } catch (error) {
    console.error('Error in property-dependency-service:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

/**
 * Discover all dependencies for all properties in the tenant
 */
async function discoverAllDependencies(tenantId) {
  const pool = getPool();
  
  // Get all properties for the tenant
  const propertiesResult = await pool.query(
    `SELECT "property_id", "property_name", "object_type", "data_type", 
            "calculation_formula", "validation_rules", "is_calculated", "is_rollup"
     FROM "PropertyMetadata"
     WHERE ("tenant_id" = $1 OR "is_global" = true) 
       AND "is_deleted" = false`,
    [tenantId]
  );

  const properties = propertiesResult.rows;
  let totalDiscovered = 0;

  for (const property of properties) {
    const count = await discoverPropertyDependenciesInternal(tenantId, property);
    totalDiscovered += count;
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Dependency discovery completed',
      propertiesScanned: properties.length,
      dependenciesDiscovered: totalDiscovered,
    }),
  };
}

/**
 * Discover dependencies for a specific property
 */
async function discoverPropertyDependencies(tenantId, propertyId) {
  const pool = getPool();

  const result = await pool.query(
    `SELECT * FROM "PropertyMetadata" WHERE "property_id" = $1 AND ("tenant_id" = $2 OR "is_global" = true)`,
    [propertyId, tenantId]
  );

  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Property not found' }),
    };
  }

  const property = result.rows[0];
  const count = await discoverPropertyDependenciesInternal(tenantId, property);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Dependencies discovered',
      propertyId,
      dependenciesFound: count,
    }),
  };
}

/**
 * Internal function to discover dependencies for a property
 */
async function discoverPropertyDependenciesInternal(tenantId, property) {
  const pool = getPool();
  const dependencies = [];

  // 1. Formula dependencies (calculated fields)
  if (property.is_calculated && property.calculation_formula) {
    const formulaDeps = formulaParser.extractDependencies(property.calculation_formula);
    for (const depName of formulaDeps) {
      dependencies.push({
        dependentPropertyId: property.property_id,
        sourcePropertyName: depName,
        dependencyType: 'formula',
        context: { formula: property.calculation_formula },
      });
    }
  }

  // 2. Validation rule dependencies
  if (property.validation_rules && Array.isArray(property.validation_rules)) {
    const validationDeps = validationScanner.extractDependencies(property.validation_rules);
    for (const dep of validationDeps) {
      dependencies.push({
        dependentPropertyId: property.property_id,
        sourcePropertyName: dep.propertyName,
        dependencyType: 'validation',
        context: { rule: dep.rule },
      });
    }
  }

  // 3. Default value dependencies
  if (property.default_value && typeof property.default_value === 'string' && property.default_value.startsWith('=')) {
    const defaultDeps = formulaParser.extractDependencies(property.default_value);
    for (const depName of defaultDeps) {
      dependencies.push({
        dependentPropertyId: property.property_id,
        sourcePropertyName: depName,
        dependencyType: 'default_value',
        context: { defaultValue: property.default_value },
      });
    }
  }

  // Insert discovered dependencies
  let insertedCount = 0;
  for (const dep of dependencies) {
    // Resolve source property ID
    const sourceResult = await pool.query(
      `SELECT "property_id" FROM "PropertyMetadata" 
       WHERE "property_name" = $1 AND "object_type" = $2 AND ("tenant_id" = $3 OR "is_global" = true)
       LIMIT 1`,
      [dep.sourcePropertyName, property.object_type, tenantId]
    );

    if (sourceResult.rows.length > 0) {
      const sourcePropertyId = sourceResult.rows[0].property_id;

      try {
        await pool.query(
          `INSERT INTO "PropertyDependencies" 
           ("source_property_id", "dependent_property_id", "dependency_type", "dependency_context", "is_system_discovered")
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT ("source_property_id", "dependent_property_id", "dependency_type") 
           DO UPDATE SET 
             "dependency_context" = EXCLUDED."dependency_context",
             "is_active" = true,
             "last_validated" = NOW()`,
          [sourcePropertyId, dep.dependentPropertyId, dep.dependencyType, JSON.stringify(dep.context)]
        );
        insertedCount++;
      } catch (error) {
        console.error('Error inserting dependency:', error.message);
      }
    }
  }

  return insertedCount;
}

/**
 * Get dependency graph for a property
 */
async function getPropertyGraph(tenantId, propertyId, direction) {
  const graph = await graphBuilder.buildGraph(tenantId, propertyId, direction);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graph),
  };
}

/**
 * Analyze impact of modifying/deleting a property
 */
async function analyzeImpact(tenantId, propertyId, modificationType) {
  const impact = await impactAnalyzer.analyze(tenantId, propertyId, modificationType);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(impact),
  };
}

/**
 * Execute cascade operation
 */
async function executeCascade(tenantId, userId, propertyId, operation, strategy) {
  const result = await cascadeHandler.execute(tenantId, userId, propertyId, operation, strategy);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  };
}

/**
 * Validate no circular dependencies exist
 */
async function validateCircularDependencies(tenantId) {
  const pool = getPool();

  const result = await pool.query(
    `WITH RECURSIVE dependency_chain AS (
      SELECT 
        pd."source_property_id" AS source,
        pd."dependent_property_id" AS dependent,
        1 AS depth,
        ARRAY[pd."source_property_id", pd."dependent_property_id"] AS path
      FROM "PropertyDependencies" pd
      WHERE pd."is_active" = true
      
      UNION ALL
      
      SELECT 
        dc.source,
        pd."dependent_property_id",
        dc.depth + 1,
        dc.path || pd."dependent_property_id"
      FROM dependency_chain dc
      INNER JOIN "PropertyDependencies" pd 
        ON pd."source_property_id" = dc.dependent AND pd."is_active" = true
      WHERE dc.depth < 50
        AND NOT (pd."dependent_property_id" = ANY(dc.path))
    )
    SELECT 
      dc.source,
      dc.dependent,
      dc.path
    FROM dependency_chain dc
    WHERE dc.dependent = dc.source`
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hasCircularDependencies: result.rows.length > 0,
      cycles: result.rows,
    }),
  };
}

/**
 * Get critical paths (high-risk properties with many dependencies)
 */
async function getCriticalPaths(tenantId) {
  const pool = getPool();

  const result = await pool.query(
    `SELECT 
      pm."property_id",
      pm."property_name",
      pm."object_type",
      COUNT(DISTINCT pd."dependent_property_id") AS dependent_count,
      COUNT(DISTINCT pd2."source_property_id") AS dependency_count,
      COUNT(DISTINCT pd."dependent_property_id") + COUNT(DISTINCT pd2."source_property_id") AS total_connections
    FROM "PropertyMetadata" pm
    LEFT JOIN "PropertyDependencies" pd ON pm."property_id" = pd."source_property_id" AND pd."is_active" = true
    LEFT JOIN "PropertyDependencies" pd2 ON pm."property_id" = pd2."dependent_property_id" AND pd2."is_active" = true
    WHERE (pm."tenant_id" = $1 OR pm."is_global" = true)
      AND pm."is_deleted" = false
    GROUP BY pm."property_id", pm."property_name", pm."object_type"
    HAVING COUNT(DISTINCT pd."dependent_property_id") + COUNT(DISTINCT pd2."source_property_id") > 0
    ORDER BY total_connections DESC
    LIMIT 50`,
    [tenantId]
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      criticalProperties: result.rows,
    }),
  };
}

