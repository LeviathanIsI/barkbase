const Joi = require('joi');

const create = Joi.object({
  name: Joi.string().required(),
  breed: Joi.string().allow('', null),
  birthdate: Joi.date().iso().allow(null),
  photoUrl: Joi.string().uri().allow(null),
  medicalNotes: Joi.string().allow('', null),
  dietaryNotes: Joi.string().allow('', null),
  behaviorFlags: Joi.array().items(Joi.string()).default([]),
  ownerIds: Joi.array().items(Joi.string()).min(1).required(),
});

const update = create.fork(['ownerIds'], (schema) => schema.optional());

const addVaccination = Joi.object({
  type: Joi.string().required(),
  administeredAt: Joi.date().iso().required(),
  expiresAt: Joi.date().iso().greater(Joi.ref('administeredAt')).required(),
  documentUrl: Joi.string().uri().allow(null),
  notes: Joi.string().allow('', null),
});

module.exports = {
  create,
  update,
  addVaccination,
};
