const Joi = require('joi');

const theme = Joi.object({
  colors: Joi.object().unknown(true).default({}),
  fonts: Joi.object().unknown(true).default({}),
  assets: Joi.object().unknown(true).default({}),
  mode: Joi.string().valid('light', 'dark').optional(),
});

const featureFlags = Joi.object().pattern(Joi.string(), Joi.boolean());

const onboardingUpdate = Joi.object({
  dismissed: Joi.boolean().required(),
});

module.exports = {
  theme,
  featureFlags,
  onboardingUpdate,
};
