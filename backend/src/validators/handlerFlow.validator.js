const Joi = require('joi');

const triggerSchema = Joi.object({
  type: Joi.string().valid('event', 'schedule', 'manual').required(),
}).unknown(true);

const nodeSchema = Joi.object({ recordId: Joi.string().required(),
  type: Joi.string().min(2).max(64).required(),
  data: Joi.object().required(),
}).unknown(true);

const edgeSchema = Joi.object({ recordId: Joi.string().optional(),
  source: Joi.string().required(),
  target: Joi.string().required(),
  sourceHandle: Joi.string().optional(),
  targetHandle: Joi.string().optional(),
  label: Joi.string().allow('', null),
}).unknown(true);

const definitionSchema = Joi.object({
  meta: Joi.object({
    name: Joi.string().min(1).max(200).required(),
    description: Joi.string().allow('', null),
  }).unknown(true).required(),
  trigger: triggerSchema.required(),
  nodes: Joi.array().items(nodeSchema).min(1).required(),
  edges: Joi.array().items(edgeSchema).required(),
}).unknown(true);

const createFlow = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().allow('', null),
  definition: definitionSchema.required(),
});

const updateFlow = Joi.object({
  name: Joi.string().min(1).max(200),
  description: Joi.string().allow('', null),
  status: Joi.string().valid('draft', 'on', 'off'),
  definition: definitionSchema,
}).min(1);

const publishFlow = Joi.object().max(0);

const manualRun = Joi.object({
  payload: Joi.object().default({}),
  idempotencyKey: Joi.string().max(255),
});

const validateDefinition = Joi.object({
  definition: definitionSchema.required(),
});

const listQuery = Joi.object({
  status: Joi.string().valid('draft', 'on', 'off'),
});

module.exports = {
  createFlow,
  updateFlow,
  publishFlow,
  manualRun,
  validateDefinition,
  listQuery,
};
