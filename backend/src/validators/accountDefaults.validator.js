const Joi = require('joi');

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const toMinutes = (time) => {
  if (!time || !TIME_REGEX.test(time)) {
    return null;
  }
  const [hours, minutes] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
};

const daySchema = Joi.object({
  isOpen: Joi.boolean().required(),
  open: Joi.string().pattern(TIME_REGEX).allow(null, ''),
  close: Joi.string().pattern(TIME_REGEX).allow(null, ''),
}).custom((value, helpers) => {
  if (!value.isOpen) {
    return { isOpen: false, open: null, close: null };
  }

  if (!value.open) {
    return helpers.error('any.invalid', { message: 'Opening time is required' });
  }

  if (!value.close) {
    return helpers.error('any.invalid', { message: 'Closing time is required' });
  }

  const openMinutes = toMinutes(value.open);
  const closeMinutes = toMinutes(value.close);
  if (openMinutes == null || closeMinutes == null) {
    return helpers.error('any.invalid', { message: 'Provide valid times in HH:MM format' });
  }
  if (closeMinutes <= openMinutes) {
    return helpers.error('any.invalid', { message: 'Closing time must be after opening time' });
  }
  return value;
});

const holidaySchema = Joi.object({
  id: Joi.string().max(120).optional(),
  name: Joi.string().max(120).required(),
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().allow(null).optional(),
  recurring: Joi.boolean().optional(),
}).custom((value, helpers) => {
  if (!value.endDate) {
    return value;
  }
  if (new Date(value.startDate) > new Date(value.endDate)) {
    return helpers.error('any.invalid', { message: 'End date must be on or after the start date' });
  }
  return value;
});

const logoSchema = Joi.object({
  url: Joi.string().uri().allow(null),
  fileName: Joi.string().max(255).allow(null),
  uploadedAt: Joi.string().isoDate().allow(null),
  size: Joi.number().min(0).allow(null),
}).optional();

exports.updateAccountDefaults = Joi.object({
  businessInfo: Joi.object({
    name: Joi.string().max(100).optional(),
    phone: Joi.string().max(32).allow('', null).optional(),
    email: Joi.string().email().allow('', null).optional(),
    website: Joi.string().uri({ scheme: ['http', 'https'] }).allow('', null).optional(),
    notes: Joi.string().max(500).allow('', null).optional(),
    address: Joi.object({
      street: Joi.string().max(120).allow('', null).optional(),
      street2: Joi.string().max(120).allow('', null).optional(),
      city: Joi.string().max(100).allow('', null).optional(),
      state: Joi.string().max(100).allow('', null).optional(),
      postalCode: Joi.string().max(20).allow('', null).optional(),
      country: Joi.string().max(100).allow('', null).optional(),
    }).optional(),
    logo: logoSchema,
  }).optional(),

  operatingHours: Joi.object(
    DAY_KEYS.reduce((schema, key) => {
      schema[key] = daySchema.optional();
      return schema;
    }, {}),
  ).optional(),

  holidays: Joi.array().items(holidaySchema).optional(),

  regionalSettings: Joi.object({
    timeZone: Joi.string().max(120).optional(),
    dateFormat: Joi.string().valid('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD').optional(),
    timeFormat: Joi.string().valid('12-hour', '24-hour').optional(),
    weekStartsOn: Joi.string().valid('Sunday', 'Monday').optional(),
  }).optional(),

  currencySettings: Joi.object({
    supportedCurrencies: Joi.array().items(Joi.string().length(3).uppercase()).min(1).optional(),
    defaultCurrency: Joi.string().length(3).uppercase().optional(),
  }).optional(),
}).unknown(false);
