const Joi = require('joi');

const create = Joi.object({
  name: Joi.string().required().trim(),
  type: Joi.string().valid('SUITE', 'KENNEL', 'CABIN', 'DAYCARE', 'MEDICAL').required(),
  size: Joi.string().valid('SMALL', 'MEDIUM', 'LARGE', 'XLARGE').allow(null),
  capacity: Joi.number().integer().min(1).default(1),
  location: Joi.string().allow(null, ''),
  building: Joi.string().allow(null, ''),
  zone: Joi.string().allow(null, ''),
  amenities: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).default([]),
  hourlyRate: Joi.number().integer().min(0).allow(null),
  dailyRate: Joi.number().integer().min(0).allow(null),
  weeklyRate: Joi.number().integer().min(0).allow(null),
  notes: Joi.string().allow(null, ''),
  isActive: Joi.boolean().default(true)
});

const update = Joi.object({
  name: Joi.string().trim(),
  type: Joi.string().valid('SUITE', 'KENNEL', 'CABIN', 'DAYCARE', 'MEDICAL'),
  size: Joi.string().valid('SMALL', 'MEDIUM', 'LARGE', 'XLARGE').allow(null),
  capacity: Joi.number().integer().min(1),
  location: Joi.string().allow(null, ''),
  building: Joi.string().allow(null, ''),
  zone: Joi.string().allow(null, ''),
  amenities: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ),
  hourlyRate: Joi.number().integer().min(0).allow(null),
  dailyRate: Joi.number().integer().min(0).allow(null),
  weeklyRate: Joi.number().integer().min(0).allow(null),
  notes: Joi.string().allow(null, ''),
  isActive: Joi.boolean()
}).min(1);

module.exports = {
  kennelSchemas: {
    create,
    update
  }
};
