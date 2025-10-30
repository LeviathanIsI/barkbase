/**
 * Dependency Graph Builder
 * Builds directed acyclic graphs (DAG) of property dependencies
 * Implements graph traversal and visualization data generation
 */

const { getPool } = require('/opt/nodejs');

/**
 * Build dependency graph for a property
 * @param {number} tenantId - Tenant ID
 * @param {string} propertyId - Property ID
 * @param {string} direction - 'upstream', 'downstream', or 'both'
 * @returns {object} - Graph data structure
 */
async function buildGraph(tenantId, propertyId, direction = 'both') {
  const pool = getPool();

  const nodes = new Map();
  const edges = [];
  const visited = new Set();

  // Get root property
  const rootResult = await pool.query(
    `SELECT * FROM "PropertyMetadata" 
     WHERE "property_id" = $1 AND ("tenant_id" = $2 OR "is_global" = true)`,
    [propertyId, tenantId]
  );

  if (rootResult.rows.length === 0) {
    throw new Error('Property not found');
  }

  const rootProperty = rootResult.rows[0];
  nodes.set(propertyId, formatNode(rootProperty, 'root'));

  // Build graph based on direction
  if (direction === 'upstream' || direction === 'both') {
    await traverseUpstream(pool, tenantId, propertyId, nodes, edges, visited, 0, 10);
  }

  if (direction === 'downstream' || direction === 'both') {
    await traverseDownstream(pool, tenantId, propertyId, nodes, edges, visited, 0, 10);
  }

  // Calculate metrics
  const metrics = calculateGraphMetrics(nodes, edges);

  return {
    rootPropertyId: propertyId,
    direction,
    nodes: Array.from(nodes.values()),
    edges,
    metrics,
  };
}

/**
 * Traverse upstream (properties that this property depends on)
 */
async function traverseUpstream(pool, tenantId, propertyId, nodes, edges, visited, depth, maxDepth) {
  if (depth >= maxDepth || visited.has(`up_${propertyId}`)) {
    return;
  }

  visited.add(`up_${propertyId}`);

  const result = await pool.query(
    `SELECT 
      pd.*,
      pm."property_name" AS source_property_name,
      pm."display_label" AS source_display_label,
      pm."object_type" AS source_object_type,
      pm."property_type" AS source_property_type,
      pm."is_deleted" AS source_is_deleted
    FROM "PropertyDependencies" pd
    INNER JOIN "PropertyMetadata" pm ON pd."source_property_id" = pm."property_id"
    WHERE pd."dependent_property_id" = $1
      AND pd."is_active" = true
      AND (pm."tenant_id" = $2 OR pm."is_global" = true)
      AND pm."is_deleted" = false`,
    [propertyId, tenantId]
  );

  for (const row of result.rows) {
    const sourceId = row.source_property_id;

    // Add node if not already present
    if (!nodes.has(sourceId)) {
      nodes.set(sourceId, formatNode(row, 'upstream', depth + 1));

      // Recursively traverse
      await traverseUpstream(pool, tenantId, sourceId, nodes, edges, visited, depth + 1, maxDepth);
    }

    // Add edge
    edges.push({
      id: `${sourceId}_${propertyId}_${row.dependency_type}`,
      source: sourceId,
      target: propertyId,
      type: row.dependency_type,
      context: row.dependency_context,
      isCritical: row.is_critical,
      breakOnDelete: row.break_on_source_delete,
    });
  }
}

/**
 * Traverse downstream (properties that depend on this property)
 */
async function traverseDownstream(pool, tenantId, propertyId, nodes, edges, visited, depth, maxDepth) {
  if (depth >= maxDepth || visited.has(`down_${propertyId}`)) {
    return;
  }

  visited.add(`down_${propertyId}`);

  const result = await pool.query(
    `SELECT 
      pd.*,
      pm."property_name" AS dependent_property_name,
      pm."display_label" AS dependent_display_label,
      pm."object_type" AS dependent_object_type,
      pm."property_type" AS dependent_property_type,
      pm."is_deleted" AS dependent_is_deleted
    FROM "PropertyDependencies" pd
    INNER JOIN "PropertyMetadata" pm ON pd."dependent_property_id" = pm."property_id"
    WHERE pd."source_property_id" = $1
      AND pd."is_active" = true
      AND (pm."tenant_id" = $2 OR pm."is_global" = true)
      AND pm."is_deleted" = false`,
    [propertyId, tenantId]
  );

  for (const row of result.rows) {
    const dependentId = row.dependent_property_id;

    // Add node if not already present
    if (!nodes.has(dependentId)) {
      nodes.set(dependentId, formatNode(row, 'downstream', depth + 1));

      // Recursively traverse
      await traverseDownstream(pool, tenantId, dependentId, nodes, edges, visited, depth + 1, maxDepth);
    }

    // Add edge
    edges.push({
      id: `${propertyId}_${dependentId}_${row.dependency_type}`,
      source: propertyId,
      target: dependentId,
      type: row.dependency_type,
      context: row.dependency_context,
      isCritical: row.is_critical,
      breakOnDelete: row.break_on_source_delete,
    });
  }
}

/**
 * Format node for graph visualization
 */
function formatNode(data, role, depth = 0) {
  // Extract property info (handle both source_ and dependent_ prefixes)
  const propertyId = data.property_id || data.source_property_id || data.dependent_property_id;
  const propertyName = data.property_name || data.source_property_name || data.dependent_property_name;
  const displayLabel = data.display_label || data.source_display_label || data.dependent_display_label;
  const objectType = data.object_type || data.source_object_type || data.dependent_object_type;
  const propertyType = data.property_type || data.source_property_type || data.dependent_property_type;

  return {
    id: propertyId,
    label: displayLabel || propertyName,
    propertyName,
    objectType,
    propertyType,
    role, // 'root', 'upstream', 'downstream'
    depth,
    icon: getIconForPropertyType(propertyType),
    color: getColorForPropertyType(propertyType),
  };
}

/**
 * Get icon name for property type
 */
function getIconForPropertyType(propertyType) {
  const iconMap = {
    system: 'shield',
    standard: 'cube',
    protected: 'lock',
    custom: 'plus-circle',
  };
  return iconMap[propertyType] || 'circle';
}

/**
 * Get color for property type
 */
function getColorForPropertyType(propertyType) {
  const colorMap = {
    system: '#dc2626',    // red
    standard: '#2563eb',  // blue
    protected: '#f59e0b', // amber
    custom: '#10b981',    // green
  };
  return colorMap[propertyType] || '#6b7280';
}

/**
 * Calculate graph metrics
 */
function calculateGraphMetrics(nodes, edges) {
  const nodeCount = nodes.size;
  const edgeCount = edges.length;

  // Calculate dependency depth for each node
  const depths = Array.from(nodes.values()).map(n => n.depth);
  const maxDepth = Math.max(...depths, 0);

  // Count by property type
  const typeDistribution = {};
  for (const node of nodes.values()) {
    typeDistribution[node.propertyType] = (typeDistribution[node.propertyType] || 0) + 1;
  }

  // Count by dependency type
  const dependencyTypeDistribution = {};
  for (const edge of edges) {
    dependencyTypeDistribution[edge.type] = (dependencyTypeDistribution[edge.type] || 0) + 1;
  }

  // Critical paths
  const criticalEdgeCount = edges.filter(e => e.isCritical).length;

  return {
    nodeCount,
    edgeCount,
    maxDepth,
    typeDistribution,
    dependencyTypeDistribution,
    criticalEdgeCount,
    criticalPathPercentage: edgeCount > 0 ? (criticalEdgeCount / edgeCount * 100).toFixed(1) : 0,
  };
}

/**
 * Detect cycles in the graph
 * @param {Map} nodes - Map of nodes
 * @param {Array} edges - Array of edges
 * @returns {Array} - Array of cycles found
 */
function detectCycles(nodes, edges) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  const adjacencyList = buildAdjacencyList(edges);

  for (const nodeId of nodes.keys()) {
    if (!visited.has(nodeId)) {
      const path = [];
      findCyclesRecursive(nodeId, visited, recursionStack, adjacencyList, path, cycles);
    }
  }

  return cycles;
}

/**
 * Build adjacency list from edges
 */
function buildAdjacencyList(edges) {
  const adjacencyList = new Map();

  for (const edge of edges) {
    if (!adjacencyList.has(edge.source)) {
      adjacencyList.set(edge.source, []);
    }
    adjacencyList.get(edge.source).push(edge.target);
  }

  return adjacencyList;
}

/**
 * Recursive cycle detection (DFS)
 */
function findCyclesRecursive(nodeId, visited, recursionStack, adjacencyList, path, cycles) {
  visited.add(nodeId);
  recursionStack.add(nodeId);
  path.push(nodeId);

  const neighbors = adjacencyList.get(nodeId) || [];
  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      findCyclesRecursive(neighbor, visited, recursionStack, adjacencyList, path, cycles);
    } else if (recursionStack.has(neighbor)) {
      // Cycle detected
      const cycleStartIndex = path.indexOf(neighbor);
      const cycle = path.slice(cycleStartIndex);
      cycles.push([...cycle, neighbor]);
    }
  }

  path.pop();
  recursionStack.delete(nodeId);
}

module.exports = {
  buildGraph,
  detectCycles,
  calculateGraphMetrics,
};

