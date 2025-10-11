const Joi = require('joi');

const createOwnerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().trim().email().lowercase().max(255).allow(null, ''),
  phone: Joi.string().trim().max(50).allow(null, ''),
  address: Joi.object({
    street: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    zip: Joi.string().allow(''),
    country: Joi.string().allow(''),
  }).allow(null),
  emergencyContact: Joi.object({
    name: Joi.string().allow(''),
    phone: Joi.string().allow(''),
    relationship: Joi.string().allow(''),
  }).allow(null),
  notes: Joi.string().allow(null, ''),
});

const updateOwnerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100),
  lastName: Joi.string().trim().min(1).max(100),
  email: Joi.string().trim().email().lowercase().max(255).allow(null, ''),
  phone: Joi.string().trim().max(50).allow(null, ''),
  address: Joi.object({
    street: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    zip: Joi.string().allow(''),
    country: Joi.string().allow(''),
  }).allow(null),
  emergencyContact: Joi.object({
    name: Joi.string().allow(''),
    phone: Joi.string().allow(''),
    relationship: Joi.string().allow(''),
  }).allow(null),
  notes: Joi.string().allow(null, ''),
}).min(1);

const listOwnersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  search: Joi.string().trim().allow(''),
});

module.exports = {
  createOwnerSchema,
  updateOwnerSchema,
  listOwnersQuerySchema,
};
