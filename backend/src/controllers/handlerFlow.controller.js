const handlerFlowService = require('../services/handlerFlow.service');

/**
 * Create a new draft flow
 */
const createFlow = async (req, res, next) => {
  try {
    const { name, description, definition } = req.body || {};

    if (!definition) {
      return res.status(400).json({ error: 'Flow definition is required' });
    }

    const flow = await handlerFlowService.createFlow({
      tenantId: req.tenantId,
      name,
      description,
      definition,
    });

    return res.status(201).json(flow);
  } catch (error) {
    return next(error);
  }
};

/**
 * Update an existing flow
 */
const updateFlow = async (req, res, next) => {
  try {
    const { flowId } = req.params;
    const { name, description, status, definition } = req.body || {};

    const flow = await handlerFlowService.updateFlow({
      tenantId: req.tenantId,
      flowId,
      name,
      description,
      status,
      definition,
    });

    return res.json(flow);
  } catch (error) {
    return next(error);
  }
};

/**
 * Publish a flow (turn it on)
 */
const publishFlow = async (req, res, next) => {
  try {
    const { flowId } = req.params;

    const flow = await handlerFlowService.publishFlow({
      tenantId: req.tenantId,
      flowId,
    });

    return res.json(flow);
  } catch (error) {
    return next(error);
  }
};

/**
 * List flows
 */
const listFlows = async (req, res, next) => {
  try {
    const { status } = req.query;

    const flows = await handlerFlowService.listFlows({
      tenantId: req.tenantId,
      status,
    });

    return res.json(flows);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get a single flow by ID
 */
const getFlowById = async (req, res, next) => {
  try {
    const { flowId } = req.params;

    const flow = await handlerFlowService.getFlowById({
      tenantId: req.tenantId,
      flowId,
    });

    return res.json(flow);
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete a flow
 */
const deleteFlow = async (req, res, next) => {
  try {
    const { flowId } = req.params;

    const result = await handlerFlowService.deleteFlow({
      tenantId: req.tenantId,
      flowId,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Manual run trigger
 */
const manualRun = async (req, res, next) => {
  try {
    const { flowId } = req.params;
    const { payload, idempotencyKey } = req.body || {};

    const result = await handlerFlowService.manualRun({
      tenantId: req.tenantId,
      flowId,
      payload: payload || {},
      idempotencyKey,
    });

    return res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get run logs
 */
const getRunLogs = async (req, res, next) => {
  try {
    const { runId } = req.params;

    const logs = await handlerFlowService.getRunLogs({
      tenantId: req.tenantId,
      runId,
    });

    return res.json(logs);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get run details
 */
const getRunById = async (req, res, next) => {
  try {
    const { runId } = req.params;

    const run = await handlerFlowService.getRunById({
      tenantId: req.tenantId,
      runId,
    });

    return res.json(run);
  } catch (error) {
    return next(error);
  }
};

/**
 * Validate a flow definition without creating it
 */
const validateFlow = async (req, res, next) => {
  try {
    const { definition } = req.body || {};

    if (!definition) {
      return res.status(400).json({ error: 'Flow definition is required' });
    }

    // Validation checks
    const errors = [];

    // Check meta
    if (!definition.meta || !definition.meta.name) {
      errors.push('definition.meta.name is required');
    }

    // Check trigger
    if (!definition.trigger) {
      errors.push('definition.trigger is required');
    }

    // Check nodes
    if (!Array.isArray(definition.nodes) || definition.nodes.length === 0) {
      errors.push('definition.nodes must be a non-empty array');
    } else {
      // Check for trigger node
      const triggerNode = definition.nodes.find(n => n.type === 'trigger');
      if (!triggerNode) {
        errors.push('Flow must have a trigger node');
      }

      // Check for duplicate node IDs
      const nodeIds = definition.nodes.map(n => n.recordId);
      const duplicates = nodeIds.filter((recordId, index) => nodeIds.indexOf(recordId) !== index);
      if (duplicates.length > 0) {
        errors.push(`Duplicate node IDs found: ${duplicates.join(', ')}`);
      }

      // Validate each node has required fields
      definition.nodes.forEach((node, index) => {
        if (!node.recordId) {
          errors.push(`Node at index ${index} is missing id`);
        }
        if (!node.type) {
          errors.push(`Node ${node.recordId || index} is missing type`);
        }
        if (!node.data) {
          errors.push(`Node ${node.recordId || index} is missing data`);
        }
      });
    }

    // Check edges
    if (!Array.isArray(definition.edges)) {
      errors.push('definition.edges must be an array');
    } else {
      // Check for dangling edges (edges pointing to non-existent nodes)
      const nodeIds = new Set(definition.nodes.map(n => n.recordId));
      definition.edges.forEach((edge, index) => {
        if (!nodeIds.has(edge.source)) {
          errors.push(`Edge ${index} has invalid source node: ${edge.source}`);
        }
        if (!nodeIds.has(edge.target)) {
          errors.push(`Edge ${index} has invalid target node: ${edge.target}`);
        }
      });

      // Check for cycles (simplified check)
      // This is a basic check - a full cycle detection would be more complex
      const hasMultipleOutgoingFromNonBranch = definition.nodes.some(node => {
        if (node.type === 'branch' || node.type === 'condition') {
          return false; // These can have multiple outgoing edges
        }
        const outgoing = definition.edges.filter(e => e.source === node.recordId);
        return outgoing.length > 1;
      });

      if (hasMultipleOutgoingFromNonBranch) {
        errors.push('Non-branch/condition nodes cannot have multiple outgoing edges');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        valid: false,
        errors,
      });
    }

    return res.json({
      valid: true,
      message: 'Flow definition is valid',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createFlow,
  updateFlow,
  publishFlow,
  listFlows,
  getFlowById,
  deleteFlow,
  manualRun,
  getRunLogs,
  getRunById,
  validateFlow,
};
