/**
 * Flow Definition Mapper
 * Converts between React Flow state and backend FlowDefinition schema
 */

/**
 * Convert React Flow nodes/edges to FlowDefinition
 * @param {Object} params
 * @param {Array} params.nodes - React Flow nodes
 * @param {Array} params.edges - React Flow edges
 * @param {string} params.name - Flow name
 * @param {string} params.description - Flow description
 * @param {Object} params.triggerConfig - Trigger configuration from TriggerConfigurator
 * @returns {Object} FlowDefinition
 */
export function toFlowDefinition({ nodes, edges, name, description, triggerConfig = {} }) {
  // Find trigger node
  const triggerNode = nodes.find(n => n.type === 'trigger');

  // Build trigger configuration
  const trigger = {
    manuallyTriggered: triggerConfig.manuallyTriggered ?? true,
    criteriaGroups: triggerConfig.criteriaGroups || [],
    scheduleTrigger: triggerConfig.scheduleTrigger || null,
    enrollmentFilters: triggerConfig.enrollmentFilters || [],
    settings: triggerConfig.settings || {
      reEnrollment: 'disallow',
      timezone: 'America/New_York',
      maxConcurrentRuns: 10,
      defaultRetry: {
        maxAttempts: 3,
        backoff: 'exponential',
        initialMs: 1000,
        maxMs: 60000,
      },
      enforceActionIdempotency: true,
    },
  };

  // Map nodes to FlowDefinition format
  const mappedNodes = nodes.map(node => {
    const baseNode = {
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        stepIndex: node.data?.stepIndex || 0,
        label: node.data?.label || '',
        description: node.data?.description || '',
      },
    };

    // Add type-specific data
    switch (node.type) {
      case 'action':
        baseNode.data = {
          ...baseNode.data,
          actionType: node.data?.actionType,
          // Copy all action-specific config
          ...Object.keys(node.data || {}).reduce((acc, key) => {
            if (!['stepIndex', 'label', 'description', 'onClone', 'onMoveUp', 'onMoveDown', 'onDelete', 'onInsert', 'totalSteps'].includes(key)) {
              acc[key] = node.data[key];
            }
            return acc;
          }, {}),
        };
        break;

      case 'delay':
        baseNode.data = {
          ...baseNode.data,
          mode: node.data?.mode || 'for-duration',
          amount: node.data?.amount,
          unit: node.data?.unit,
          iso: node.data?.iso,
          object: node.data?.object,
          property: node.data?.property,
          alignment: node.data?.alignment,
        };
        break;

      case 'condition':
        baseNode.data = {
          ...baseNode.data,
          criteriaGroup: node.data?.criteriaGroup || { id: '', name: '', criteria: [] },
        };
        break;

      case 'branch':
        baseNode.data = {
          ...baseNode.data,
          branches: node.data?.branches || 2,
          branchLabels: node.data?.branchLabels,
          evaluation: node.data?.evaluation || 'first-match-wins',
          branchCriteria: node.data?.branchCriteria,
        };
        break;

      case 'custom-code':
        baseNode.data = {
          ...baseNode.data,
          js: node.data?.js || '',
          timeoutMs: node.data?.timeoutMs || 5000,
        };
        break;

      case 'trigger':
      default:
        // Trigger node already handled above
        break;
    }

    return baseNode;
  });

  // Map edges to FlowDefinition format
  const mappedEdges = edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle || null,
    target: edge.target,
    targetHandle: edge.targetHandle || null,
    label: edge.label || null,
  }));

  return {
    meta: {
      version: 1,
      name: name || 'Unnamed Workflow',
      description: description || '',
    },
    trigger,
    nodes: mappedNodes,
    edges: mappedEdges,
  };
}

/**
 * Convert FlowDefinition to React Flow state
 * @param {Object} definition - FlowDefinition from backend
 * @returns {Object} { nodes, edges, name, description, triggerConfig }
 */
export function fromFlowDefinition(definition) {
  if (!definition || !definition.nodes || !definition.edges) {
    return {
      nodes: [],
      edges: [],
      name: '',
      description: '',
      triggerConfig: {},
    };
  }

  // Map nodes to React Flow format
  const nodes = definition.nodes.map(node => ({
    id: node.id,
    type: node.type,
    position: node.position || { x: 0, y: 0 },
    data: {
      ...node.data,
      // Remove these - they'll be added by WorkflowBuilder
      onClone: undefined,
      onMoveUp: undefined,
      onMoveDown: undefined,
      onDelete: undefined,
      onInsert: undefined,
      totalSteps: undefined,
    },
  }));

  // Map edges to React Flow format
  const edges = definition.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle || undefined,
    target: edge.target,
    targetHandle: edge.targetHandle || undefined,
    label: edge.label || undefined,
    type: 'linear', // Use custom edge type
  }));

  return {
    nodes,
    edges,
    name: definition.meta?.name || 'Unnamed Workflow',
    description: definition.meta?.description || '',
    triggerConfig: definition.trigger || {},
  };
}

/**
 * Create empty flow definition
 */
export function createEmptyFlowDefinition() {
  return {
    meta: {
      version: 1,
      name: 'Unnamed Workflow',
      description: '',
    },
    trigger: {
      manuallyTriggered: true,
      criteriaGroups: [],
      scheduleTrigger: null,
      enrollmentFilters: [],
    },
    nodes: [
      {
        id: '1',
        type: 'trigger',
        position: { x: 0, y: 0 },
        data: {
          stepIndex: 0,
          label: 'Set up trigger',
          description: 'Click to choose what starts this flow',
        },
      },
    ],
    edges: [],
  };
}
