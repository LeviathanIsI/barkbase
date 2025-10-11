const Joi = require('joi');

const stepSchema = Joi.object({
  id: Joi.string().uuid().optional(),
  kind: Joi.string().valid('condition', 'action', 'delay', 'branch').required(),
  name: Joi.string().min(1).max(120).required(),
  config: Joi.object().default({}),
  nextId: Joi.string().uuid().allow(null).optional(),
  altNextId: Joi.string().uuid().allow(null).optional(),
});

const triggerSchema = Joi.object({
  type: Joi.string().valid('event', 'schedule', 'manual').required(),
  config: Joi.object().default({}),
});

const definitionSchema = Joi.object({
  entryStepId: Joi.string().uuid().required(),
  version: Joi.number().integer().min(1).optional(),
  metadata: Joi.object().optional(),
});

const createFlow = Joi.object({
  name: Joi.string().min(3).max(200).required(),
  trigger: triggerSchema.required(),
  steps: Joi.array().items(stepSchema).min(1).required(),
  definition: definitionSchema.required(),
});

const publishFlow = Joi.object({}).unknown(false);

const manualRun = Joi.object({
  payload: Joi.object().default({}),
  idempotencyKey: Joi.string().max(255).optional(),
});

module.exports = {
  createFlow,
  publishFlow,
  manualRun,
};
