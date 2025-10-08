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
  'IN_PROGRESS',
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

const checkIn = Joi.object({
  time: Joi.date().iso().default(() => new Date()),
  weight: Joi.number().positive().precision(2).allow(null),
  photos: Joi.array().items(Joi.string().trim()).max(10).default([]),
  notes: Joi.string().allow('', null),
  conditionRating: Joi.number().integer().min(1).max(5).allow(null),
  staffId: Joi.string().optional(),
});

const incidentSeverityEnum = Joi.string().valid('MINOR', 'MODERATE', 'SEVERE', 'CRITICAL');

const incidentPayload = Joi.object({
  petId: Joi.string().required(),
  occurredAt: Joi.date().iso().default(() => new Date()),
  severity: incidentSeverityEnum.required(),
  narrative: Joi.string().min(3).required(),
  photos: Joi.array().items(Joi.string().trim()).default([]),
  vetContacted: Joi.boolean().default(false),
});

const checkOut = Joi.object({
  time: Joi.date().iso().default(() => new Date()),
  incidentReportId: Joi.string().allow(null),
  incident: incidentPayload.optional(),
  extraCharges: Joi.object().default({}),
  signatureUrl: Joi.string().allow('', null),
  remainingBalanceCents: Joi.number().min(0),
  capturePayment: Joi.boolean().default(true),
  paymentIntentId: Joi.string().allow('', null),
  metadata: Joi.object().default({}),
}).oxor('incidentReportId', 'incident');

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
  checkIn,
  checkOut,
  promoteWaitlist,
};
