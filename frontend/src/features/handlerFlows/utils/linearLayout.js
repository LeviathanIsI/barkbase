// Linear layout utilities for single-column workflow arrangement

const LINEAR_CONFIG = {
  centerX: 250, // X coordinate for the centerline (center of 500px wide node)
  startY: 50, // Starting Y position
  verticalSpacing: 180, // Space between nodes (enough for node height + gap)
  nodeWidth: 500, // Uniform width for all nodes
  nodeHeight: 120, // Approximate height for spacing calculations
};

/**
 * Sorts nodes by stepIndex
 */
export const sortByStepIndex = (nodes) => {
  return [...nodes].sort((a, b) => (a.data.stepIndex || 0) - (b.data.stepIndex || 0));
};

/**
 * Assigns stepIndex to nodes based on current order
 */
export const assignStepIndices = (nodes) => {
  return nodes.map((node, index) => ({
    ...node,
    data: {
      ...node.data,
      stepIndex: index + 1,
    },
  }));
};

/**
 * Calculates linear layout positions for nodes
 */
export const calculateLinearPositions = (nodes) => {
  const sorted = sortByStepIndex(nodes);
  return sorted.map((node, index) => ({
    ...node,
    position: {
      x: LINEAR_CONFIG.centerX,
      y: LINEAR_CONFIG.startY + (index * LINEAR_CONFIG.verticalSpacing),
    },
    data: {
      ...node.data,
      stepIndex: index + 1,
    },
  }));
};

/**
 * Creates sequential edges for linear mode (step i → step i+1)
 * Optionally includes insert affordance data
 */
export const createSequentialEdges = (nodes, onInsert = null) => {
  const sorted = sortByStepIndex(nodes);
  const edges = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    edges.push({
      id: `e${sorted[i].id}-${sorted[i + 1].id}`,
      source: sorted[i].id,
      target: sorted[i + 1].id,
      animated: true,
      type: 'linear', // Use custom linear edge with insert affordance
      data: {
        afterStepIndex: sorted[i].data?.stepIndex || (i + 1),
        onInsert,
      },
    });
  }

  return edges;
};

/**
 * Converts freeform layout to linear by topological sort
 */
export const convertToLinear = (nodes, edges) => {
  // Build adjacency list
  const adjacency = new Map();
  const inDegree = new Map();

  nodes.forEach((node) => {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  edges.forEach((edge) => {
    if (adjacency.has(edge.source)) {
      adjacency.get(edge.source).push(edge.target);
    }
    if (inDegree.has(edge.target)) {
      inDegree.set(edge.target, inDegree.get(edge.target) + 1);
    }
  });

  // Topological sort (Kahn's algorithm)
  const queue = [];
  const sorted = [];

  // Find nodes with no incoming edges
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  while (queue.length > 0) {
    const nodeId = queue.shift();
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      sorted.push(node);
    }

    const neighbors = adjacency.get(nodeId) || [];
    neighbors.forEach((neighborId) => {
      const newDegree = inDegree.get(neighborId) - 1;
      inDegree.set(neighborId, newDegree);
      if (newDegree === 0) {
        queue.push(neighborId);
      }
    });
  }

  // Add any remaining nodes (in case of disconnected components)
  nodes.forEach((node) => {
    if (!sorted.find((n) => n.id === node.id)) {
      sorted.push(node);
    }
  });

  // Calculate linear positions
  const linearNodes = calculateLinearPositions(sorted);
  const linearEdges = createSequentialEdges(linearNodes);

  return { nodes: linearNodes, edges: linearEdges };
};

/**
 * Inserts a node at a specific step index
 */
export const insertNodeAtIndex = (nodes, newNode, insertIndex) => {
  const sorted = sortByStepIndex(nodes);

  // Shift nodes after insert position
  const updated = sorted.map((node) => {
    if (node.data.stepIndex >= insertIndex) {
      return {
        ...node,
        data: {
          ...node.data,
          stepIndex: node.data.stepIndex + 1,
        },
      };
    }
    return node;
  });

  // Add new node with correct index
  const nodeWithIndex = {
    ...newNode,
    data: {
      ...newNode.data,
      stepIndex: insertIndex,
    },
  };

  updated.push(nodeWithIndex);

  return calculateLinearPositions(updated);
};

/**
 * Removes a node and compacts indices
 */
export const removeNodeAtIndex = (nodes, nodeId) => {
  const filtered = nodes.filter((n) => n.id !== nodeId);
  return calculateLinearPositions(filtered);
};

/**
 * Moves a node up or down in the sequence
 */
export const moveNode = (nodes, nodeId, direction) => {
  const sorted = sortByStepIndex(nodes);
  const currentIndex = sorted.findIndex((n) => n.id === nodeId);

  if (currentIndex === -1) return nodes;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  // Boundary checks
  if (targetIndex < 0 || targetIndex >= sorted.length) {
    return nodes;
  }

  // Swap
  const newSorted = [...sorted];
  [newSorted[currentIndex], newSorted[targetIndex]] = [newSorted[targetIndex], newSorted[currentIndex]];

  return calculateLinearPositions(newSorted);
};

/**
 * Clones a node and inserts it after the original
 */
export const cloneNode = (nodes, nodeId) => {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return nodes;

  const clonedNode = {
    ...node,
    id: `node-${Date.now()}`,
    data: {
      ...node.data,
      label: `${node.data.label} (Copy)`,
    },
  };

  const insertIndex = node.data.stepIndex + 1;
  return insertNodeAtIndex(nodes, clonedNode, insertIndex);
};

/**
 * Validates linear mode constraints
 */
export const validateLinearMode = (nodes, edges) => {
  const errors = [];

  // Check for contiguous indices
  const sorted = sortByStepIndex(nodes);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].data.stepIndex !== i + 1) {
      errors.push(`Step index gap detected at position ${i + 1}`);
    }
  }

  // Check for single entry point
  const nodesWithIncoming = new Set(edges.map((e) => e.target));
  const entryNodes = nodes.filter((n) => !nodesWithIncoming.has(n.id));
  if (entryNodes.length !== 1) {
    errors.push('Must have exactly one entry node');
  }

  // Check for single outgoing edge per node
  const outgoingCount = new Map();
  edges.forEach((edge) => {
    outgoingCount.set(edge.source, (outgoingCount.get(edge.source) || 0) + 1);
  });

  outgoingCount.forEach((count, nodeId) => {
    if (count > 1) {
      errors.push(`Node ${nodeId} has more than one outgoing edge`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};
