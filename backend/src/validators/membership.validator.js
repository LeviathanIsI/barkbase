const Joi = require('joi');

const updateRole = Joi.object({
  role: Joi.string().valid('OWNER', 'ADMIN', 'STAFF', 'READONLY').required(),
});

module.exports = {
  updateRole,
};
