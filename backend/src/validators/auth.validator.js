const Joi = require('joi');

const emailField = Joi.string().email({ tlds: { allow: false } });

const login = Joi.object({
  email: emailField.required(),
  password: Joi.string().min(8).required(),
});

const register = Joi.object({
  email: emailField.required(),
  password: Joi.string().min(12).required(),
  role: Joi.string().valid('OWNER', 'ADMIN', 'STAFF', 'READONLY').default('STAFF'),
});

module.exports = {
  login,
  register,
};
