const Joi = require('joi');

const create = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  role: Joi.string().valid('OWNER', 'ADMIN', 'STAFF', 'READONLY').default('STAFF'),
});

const accept = Joi.object({
  password: Joi.string().min(8).required(),
});

module.exports = {
  create,
  accept,
};
