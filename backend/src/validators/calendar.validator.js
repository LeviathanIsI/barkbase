const Joi = require('joi');

const calendarView = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso().min(Joi.ref('from')),
}).with('to', 'from');

const occupancy = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso().min(Joi.ref('from')),
}).with('to', 'from');

const suggestKennel = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  petSize: Joi.string().valid('SMALL', 'MEDIUM', 'LARGE', 'XLARGE'),
  kennelType: Joi.string().valid('SUITE', 'KENNEL', 'CABIN', 'DAYCARE', 'MEDICAL'),
});

const assignKennel = Joi.object({
  kennelId: Joi.string().required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
});

const reassignKennel = Joi.object({
  kennelId: Joi.string(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
}).min(1);

module.exports = {
  calendarView,
  occupancy,
  suggestKennel,
  assignKennel,
  reassignKennel,
};
