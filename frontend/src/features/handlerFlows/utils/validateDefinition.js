/**
 * Flow Definition Validator
 * Validates flow definitions and individual action configs
 */

/**
 * Validate email.send action config
 */
const validateEmailSend = (config) => {
  const errors = [];

  if (!config.templateId) {
    errors.push('templateId is required');
  }

  if (!config.to || !config.to.mode) {
    errors.push('to.mode is required (owner|contact|custom)');
  }

  if (config.to?.mode === 'custom' && (!config.to.emails || config.to.emails.length === 0)) {
    errors.push('to.emails must have at least one email when mode is custom');
  }

  return errors;
};

/**
 * Validate sms.send action config
 */
const validateSmsSend = (config) => {
  const errors = [];

  if (!config.message) {
    errors.push('message is required');
  }

  if (!config.to || !config.to.mode) {
    errors.push('to.mode is required (owner|contact|custom)');
  }

  if (config.to?.mode === 'custom' && (!config.to.phones || config.to.phones.length === 0)) {
    errors.push('to.phones must have at least one phone number when mode is custom');
  }

  return errors;
};

/**
 * Validate task.create action config
 */
const validateTaskCreate = (config) => {
  const errors = [];

  if (!config.title) {
    errors.push('title is required');
  }

  return errors;
};

/**
 * Validate note.create action config
 */
const validateNoteCreate = (config) => {
  const errors = [];

  if (!config.title) {
    errors.push('title is required');
  }

  if (!config.body) {
    errors.push('body is required');
  }

  return errors;
};

/**
 * Validate print.document action config
 */
const validatePrintDocument = (config) => {
  const errors = [];

  if (!config.templateId) {
    errors.push('templateId is required');
  }

  if (!config.copies || config.copies < 1) {
    errors.push('copies must be >= 1');
  }

  return errors;
};

/**
 * Validate http.webhook action config
 */
const validateHttpWebhook = (config) => {
  const errors = [];

  if (!config.url) {
    errors.push('url is required');
  }

  if (!config.method) {
    errors.push('method is required (GET|POST|PUT|PATCH)');
  }

  return errors;
};

/**
 * Validate field.set action config
 */
const validateFieldSet = (config) => {
  const errors = [];

  if (!config.object) {
    errors.push('object is required (owner|pet|reservation|invoice|tenant|custom)');
  }

  if (!config.field) {
    errors.push('field is required');
  }

  return errors;
};

/**
 * Validate field.increment action config
 */
const validateFieldIncrement = (config) => {
  const errors = [];

  if (!config.object) {
    errors.push('object is required (owner|pet|reservation|invoice|tenant|custom)');
  }

  if (!config.field) {
    errors.push('field is required');
  }

  if (typeof config.delta !== 'number') {
    errors.push('delta must be a number');
  }

  return errors;
};

/**
 * Validate segment.add action config
 */
const validateSegmentAdd = (config) => {
  const errors = [];

  if (!config.segmentKey) {
    errors.push('segmentKey is required');
  }

  if (!config.target) {
    errors.push('target is required (owner|pet|reservation)');
  }

  return errors;
};

/**
 * Validate segment.remove action config
 */
const validateSegmentRemove = (config) => {
  const errors = [];

  if (!config.segmentKey) {
    errors.push('segmentKey is required');
  }

  if (!config.target) {
    errors.push('target is required (owner|pet|reservation)');
  }

  return errors;
};

/**
 * Validate fee.add action config
 */
const validateFeeAdd = (config) => {
  const errors = [];

  if (!config.reservationIdSource) {
    errors.push('reservationIdSource is required (context|latest|lookup)');
  }

  if (!config.amount || config.amount <= 0) {
    errors.push('amount must be > 0');
  }

  return errors;
};

/**
 * Validate discount.apply action config
 */
const validateDiscountApply = (config) => {
  const errors = [];

  if (!config.reservationIdSource) {
    errors.push('reservationIdSource is required (context|latest|lookup)');
  }

  if (!config.amount || config.amount <= 0) {
    errors.push('amount must be > 0');
  }

  return errors;
};

/**
 * Validate invoice.create action config
 */
const validateInvoiceCreate = (config) => {
  const errors = [];

  if (!config.reservationIdSource) {
    errors.push('reservationIdSource is required (context|latest|lookup)');
  }

  return errors;
};

/**
 * Validate status.update action config
 */
const validateStatusUpdate = (config) => {
  const errors = [];

  if (!config.object) {
    errors.push('object is required (owner|pet|reservation|invoice)');
  }

  if (!config.status) {
    errors.push('status is required');
  }

  return errors;
};

/**
 * Validate vaccination.remind action config
 */
const validateVaccinationRemind = (config) => {
  const errors = [];

  if (!config.vaccines || config.vaccines.length === 0) {
    errors.push('vaccines must have at least one vaccine type');
  }

  if (!config.channel) {
    errors.push('channel is required (email|sms|both)');
  }

  return errors;
};

/**
 * Validate reservation.create action config
 */
const validateReservationCreate = (config) => {
  const errors = [];

  if (!config.ownerIdSource) {
    errors.push('ownerIdSource is required (context|lookup)');
  }

  if (!config.start) {
    errors.push('start is required (ISO-8601 date)');
  }

  if (!config.end) {
    errors.push('end is required (ISO-8601 date)');
  }

  if (config.start && config.end && new Date(config.start) >= new Date(config.end)) {
    errors.push('start must be before end');
  }

  return errors;
};

/**
 * Validate reservation.cancel action config
 */
const validateReservationCancel = (config) => {
  const errors = [];

  if (!config.reservationIdSource) {
    errors.push('reservationIdSource is required (context|lookup)');
  }

  return errors;
};

/**
 * Validate review.request action config
 */
const validateReviewRequest = (config) => {
  const errors = [];

  if (!config.provider) {
    errors.push('provider is required (google|yelp|facebook)');
  }

  return errors;
};

/**
 * Validate owner.notify action config
 */
const validateOwnerNotify = (config) => {
  const errors = [];

  if (!config.emailTemplateId && !config.smsMessage) {
    errors.push('At least one of emailTemplateId or smsMessage is required');
  }

  return errors;
};

/**
 * Validate team.notify action config
 */
const validateTeamNotify = (config) => {
  const errors = [];

  if ((!config.users || config.users.length === 0) && (!config.roles || config.roles.length === 0)) {
    errors.push('At least one of users or roles must be specified');
  }

  if (!config.message) {
    errors.push('message is required');
  }

  return errors;
};

/**
 * Validate file.generate action config
 */
const validateFileGenerate = (config) => {
  const errors = [];

  if (!config.generator) {
    errors.push('generator is required (csv|docx|xlsx)');
  }

  return errors;
};

/**
 * Validate pdf.generate action config
 */
const validatePdfGenerate = (config) => {
  const errors = [];

  if (!config.templateId) {
    errors.push('templateId is required');
  }

  return errors;
};

/**
 * Validate queue.enqueue action config
 */
const validateQueueEnqueue = (config) => {
  const errors = [];

  if (!config.queue) {
    errors.push('queue is required');
  }

  return errors;
};

/**
 * Validate custom.js action config
 */
const validateCustomJs = (config) => {
  const errors = [];

  if (!config.code || config.code.trim().length === 0) {
    errors.push('code is required and must be non-empty');
  }

  return errors;
};

/**
 * Action type validators map
 */
const actionValidators = {
  'email.send': validateEmailSend,
  'sms.send': validateSmsSend,
  'task.create': validateTaskCreate,
  'note.create': validateNoteCreate,
  'print.document': validatePrintDocument,
  'http.webhook': validateHttpWebhook,
  'field.set': validateFieldSet,
  'field.increment': validateFieldIncrement,
  'segment.add': validateSegmentAdd,
  'segment.remove': validateSegmentRemove,
  'fee.add': validateFeeAdd,
  'discount.apply': validateDiscountApply,
  'invoice.create': validateInvoiceCreate,
  'status.update': validateStatusUpdate,
  'vaccination.remind': validateVaccinationRemind,
  'reservation.create': validateReservationCreate,
  'reservation.cancel': validateReservationCancel,
  'review.request': validateReviewRequest,
  'owner.notify': validateOwnerNotify,
  'team.notify': validateTeamNotify,
  'file.generate': validateFileGenerate,
  'pdf.generate': validatePdfGenerate,
  'queue.enqueue': validateQueueEnqueue,
  'custom.js': validateCustomJs,
};

/**
 * Validate an action node's config
 */
export const validateActionConfig = (actionType, config) => {
  const validator = actionValidators[actionType];

  if (!validator) {
    return [`Unknown action type: ${actionType}`];
  }

  return validator(config || {});
};

/**
 * Validate entire flow definition
 */
export const validateFlowDefinition = (definition) => {
  const errors = [];

  // Validate meta
  if (!definition.meta || !definition.meta.name) {
    errors.push('Flow name is required');
  }

  // Validate trigger
  if (!definition.trigger) {
    errors.push('Flow must have a trigger configuration');
  }

  // Validate nodes
  if (!Array.isArray(definition.nodes) || definition.nodes.length === 0) {
    errors.push('Flow must have at least one node');
  }

  // Check for trigger node
  const triggerNode = definition.nodes?.find(n => n.type === 'trigger');
  if (!triggerNode) {
    errors.push('Flow must have a trigger node');
  }

  // Validate each action node
  definition.nodes?.forEach((node, index) => {
    if (node.type === 'action') {
      const actionType = node.data?.actionType;

      if (!actionType) {
        errors.push(`Action node at index ${index} (${node.recordId}) is missing actionType`);
        return;
      }

      const configErrors = validateActionConfig(actionType, node.data?.config);

      if (configErrors.length > 0) {
        errors.push(`Action node ${node.recordId} (${actionType}): ${configErrors.join(', ')}`);
      }
    }
  });

  // Validate edges
  if (!Array.isArray(definition.edges)) {
    errors.push('Flow must have an edges array');
  }

  // Check for dangling edges
  const nodeIds = new Set(definition.nodes?.map(n => n.recordId) || []);
  definition.edges?.forEach((edge, index) => {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${index} has invalid source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${index} has invalid target node: ${edge.target}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Get list of all supported action types
 */
export const getSupportedActionTypes = () => {
  return Object.keys(actionValidators);
};

/**
 * Check if an action type is supported
 */
export const isActionTypeSupported = (actionType) => {
  return actionType in actionValidators;
};
