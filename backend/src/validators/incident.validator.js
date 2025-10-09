const Joi = require('joi');

const create = Joi.object({
  petId: Joi.string().required(),
  bookingId: Joi.string().allow(null),
  occurredAt: Joi.date().iso().default(() => new Date()),
  severity: Joi.string().valid('MINOR', 'MODERATE', 'SEVERE', 'CRITICAL').required(),
  narrative: Joi.string().min(3).required(),
  photos: Joi.array().items(Joi.string().trim()).default([]),
  vetContacted: Joi.boolean().default(false),
});

const query = Joi.object({
  petId: Joi.string(),
  bookingId: Joi.string(),
})
  .or('petId', 'bookingId')
  .messages({ 'object.missing': 'Provide petId or bookingId to filter incident reports' });

module.exports = {
  create,
  query,
};
