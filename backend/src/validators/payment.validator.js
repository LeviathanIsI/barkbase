const Joi = require('joi');

const record = Joi.object({
  ownerId: Joi.string().required(),
  bookingId: Joi.string().allow(null),
  amountCents: Joi.number().min(0).required(),
  currency: Joi.string().length(3).uppercase().default('USD'),
  status: Joi.string().valid('PENDING', 'AUTHORIZED', 'CAPTURED', 'REFUNDED', 'FAILED').default('CAPTURED'),
  method: Joi.string().allow(null),
  externalId: Joi.string().allow(null),
  intentId: Joi.string().allow(null),
  capturedAt: Joi.date().iso(),
  metadata: Joi.object().default({}),
});

const capture = Joi.object({
  metadata: Joi.object().default({}),
  captureAmountCents: Joi.number().min(0),
  force: Joi.boolean().default(false),
});

module.exports = {
  record,
  capture,
};
