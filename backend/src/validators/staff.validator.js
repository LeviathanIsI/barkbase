const Joi = require('joi');

const status = Joi.object({
  isActive: Joi.boolean().required(),
});

module.exports = {
  status,
};
