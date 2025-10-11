const Joi = require('joi');

const ingestEvent = Joi.object({
  tenantId: Joi.string().uuid().required(),
  type: Joi.string().min(2).max(120).required(),
  payload: Joi.object().default({}),
  idempotencyKey: Joi.string().max(255).optional(),
});

module.exports = {
  ingestEvent,
};
