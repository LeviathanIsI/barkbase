const Joi = require('joi');

const create = Joi.object({
  name: Joi.string().required(),
  species: Joi.string().allow('', null).optional(),
  breed: Joi.string().allow('', null).optional(),
  birthdate: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow('', null)).optional(),
  photoUrl: Joi.string().uri().allow('', null).optional(),
  weight: Joi.number().min(0).allow(null).optional(),
  allergies: Joi.string().allow('', null).optional(),
  medicalNotes: Joi.string().allow('', null).optional(),
  dietaryNotes: Joi.string().allow('', null).optional(),
  lastVetVisit: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow('', null)).optional(),
  nextAppointment: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow('', null)).optional(),
  behaviorFlags: Joi.array().items(Joi.string()).default([]),
  ownerIds: Joi.array().items(Joi.string()).default([]),
  status: Joi.string().valid('active', 'inactive').optional(),
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
