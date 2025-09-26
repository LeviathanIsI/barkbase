const Joi = require('joi');

const emailField = Joi.string().email({ tlds: { allow: false } });
const slugField = Joi.string()
  .trim()
  .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .min(3)
  .max(50);

const login = Joi.object({
  email: emailField.required(),
  password: Joi.string().min(8).required(),
});

const register = Joi.object({
  email: emailField.required(),
  password: Joi.string().min(12).required(),
  role: Joi.string().valid('OWNER', 'ADMIN', 'STAFF', 'READONLY').default('STAFF'),
});

const signup = Joi.object({
  tenantName: Joi.string().trim().min(2).max(120).required(),
  tenantSlug: slugField.required(),
  email: emailField.required(),
  password: Joi.string().min(12).required(),
  honeypot: Joi.string().allow('').custom((value, helpers) => {
    if (value) {
      return helpers.error('any.invalid');
    }
    return value;
  }),
});

const verifyEmail = Joi.object({
  token: Joi.string().length(64).hex().required(),
});

module.exports = {
  login,
  register,
  signup,
  verifyEmail,
};
