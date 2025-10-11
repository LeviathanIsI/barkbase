const Joi = require('joi');

exports.updateProfile = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  phone: Joi.string().max(20).optional().allow(null, ''),
  timezone: Joi.string().max(50).optional().allow(null, ''),
  language: Joi.string().max(10).optional(),
  preferences: Joi.object({
    notifications: Joi.object({
      email: Joi.boolean().optional(),
      sms: Joi.boolean().optional(),
      inApp: Joi.boolean().optional(),
      bookingReminders: Joi.boolean().optional(),
      vaccinationReminders: Joi.boolean().optional(),
    }).optional(),
    appearance: Joi.object({
      theme: Joi.string().valid('light', 'dark', 'system').optional(),
      sidebarCollapsed: Joi.boolean().optional(),
    }).optional(),
  }).optional(),
});

exports.updatePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
});
