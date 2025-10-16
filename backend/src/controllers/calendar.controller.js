const calendarService = require('../services/calendar.service');
const logger = require('../utils/logger');

const getCalendarView = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const data = await calendarService.getCalendarView(req.tenantId, { from, to });
    return res.json(data);
  } catch (error) {
    logger.warn({ err: error, tenantId: req.tenantId }, 'Calendar view failed; returning empty payload');
    const now = new Date();
    return res.json({
      bookings: [],
      vaccinations: [],
      staff: [],
      dateRange: {
        from: (req.query.from ?? now.toISOString()),
        to: (req.query.to ?? now.toISOString()),
      },
    });
  }
};

const getOccupancy = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const data = await calendarService.getOccupancy(req.tenantId, { from, to });
    return res.json(data);
  } catch (error) {
    logger.warn({ err: error, tenantId: req.tenantId }, 'Occupancy calc failed; returning empty payload');
    const now = new Date();
    return res.json({
      summary: {
        totalCapacity: 0,
        totalOccupied: 0,
        totalAvailable: 0,
        overallUtilization: 0,
      },
      kennels: [],
      dateRange: {
        from: (req.query.from ?? now.toISOString()),
        to: (req.query.to ?? now.toISOString()),
      },
    });
  }
};

const suggestKennel = async (req, res, next) => {
  try {
    const { startDate, endDate, petSize, kennelType } = req.query;
    const suggestions = await calendarService.suggestBestKennel(req.tenantId, {
      startDate,
      endDate,
      petSize,
      kennelType,
    });
    return res.json(suggestions);
  } catch (error) {
    return next(error);
  }
};

const assignKennel = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const segment = await calendarService.assignKennel(req.tenantId, bookingId, req.body);
    return res.status(201).json(segment);
  } catch (error) {
    return next(error);
  }
};

const reassignKennel = async (req, res, next) => {
  try {
    const { segmentId } = req.params;
    const segment = await calendarService.reassignKennel(req.tenantId, segmentId, req.body);
    return res.json(segment);
  } catch (error) {
    return next(error);
  }
};

const getCapacity = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate query parameters are required' });
    }

    const data = await calendarService.getCapacityForDateRange(req.tenantId, startDate, endDate);
    return res.json(data);
  } catch (error) {
    logger.error({ err: error, tenantId: req.tenantId }, 'Capacity calculation failed');
    return next(error);
  }
};

module.exports = {
  getCalendarView,
  getOccupancy,
  suggestKennel,
  assignKennel,
  reassignKennel,
  getCapacity,
};
