const Joi = require('joi');

const calendarView = Joi.object({
  from: Joi.string().isoDate(),
  to: Joi.string().isoDate(),
}).with('to', 'from');

const occupancy = Joi.object({
  from: Joi.string().isoDate(),
  to: Joi.string().isoDate(),
}).with('to', 'from');

const suggestKennel = Joi.object({
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required(),
  petSize: Joi.string().valid('SMALL', 'MEDIUM', 'LARGE', 'XLARGE'),
  kennelType: Joi.string().valid('SUITE', 'KENNEL', 'CABIN', 'DAYCARE', 'MEDICAL'),
});

const assignKennel = Joi.object({
  kennelId: Joi.string().required(),
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().required(),
});

const reassignKennel = Joi.object({
  kennelId: Joi.string(),
  startDate: Joi.string().isoDate(),
  endDate: Joi.string().isoDate(),
}).min(1);

module.exports = {
  calendarView,
  occupancy,
  suggestKennel,
  assignKennel,
  reassignKennel,
};
