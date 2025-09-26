const Joi = require('joi');

const segmentSchema = Joi.object({
  kennelId: Joi.string().required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  status: Joi.string().default('CONFIRMED'),
  notes: Joi.string().allow('', null),
});

const serviceSchema = Joi.object({
  serviceId: Joi.string().required(),
  quantity: Joi.number().min(1).default(1),
  priceCents: Joi.number().min(0).default(0),
});

const statusEnum = Joi.string().valid(
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'COMPLETED',
  'CANCELLED',
);

const create = Joi.object({
  petId: Joi.string().required(),
  ownerId: Joi.string().required(),
  status: statusEnum.default('PENDING'),
  checkIn: Joi.date().iso().required(),
  checkOut: Joi.date().iso().min(Joi.ref('checkIn')).required(),
  depositCents: Joi.number().min(0).default(0),
  totalCents: Joi.number().min(0).default(0),
  balanceDueCents: Joi.number().min(0).default(0),
  notes: Joi.string().allow('', null),
  specialInstructions: Joi.string().allow('', null),
  segments: Joi.array().items(segmentSchema).min(1).required(),
  services: Joi.array().items(serviceSchema).default([]),
});

const update = Joi.object({
  petId: Joi.string(),
  ownerId: Joi.string(),
  status: statusEnum,
  checkIn: Joi.date().iso(),
  checkOut: Joi.alternatives().conditional('checkIn', {
    then: Joi.date().iso().min(Joi.ref('checkIn')),
    otherwise: Joi.date().iso(),
  }),
  depositCents: Joi.number().min(0),
  totalCents: Joi.number().min(0),
  balanceDueCents: Joi.number().min(0),
  notes: Joi.string().allow('', null),
  specialInstructions: Joi.string().allow('', null),
  segments: Joi.array().items(segmentSchema).min(1),
  services: Joi.array().items(serviceSchema),
}).min(1);

const updateStatus = Joi.object({
  status: statusEnum.required(),
});

const quickCheckIn = Joi.object({
  bookingId: Joi.string().required(),
  kennelId: Joi.string().optional(),
});

const promoteWaitlist = Joi.object({
  kennelId: Joi.string().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date()
    .iso()
    .when('startDate', {
      is: Joi.exist(),
      then: Joi.date().iso().min(Joi.ref('startDate')),
      otherwise: Joi.date().iso(),
    })
    .optional(),
})
  .with('endDate', 'startDate')
  .min(0);

module.exports = {
  create,
  update,
  updateStatus,
  quickCheckIn,
  promoteWaitlist,
};
