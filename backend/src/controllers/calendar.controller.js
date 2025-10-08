const calendarService = require('../services/calendar.service');

const getCalendarView = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const data = await calendarService.getCalendarView(req.tenantId, { from, to });
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const getOccupancy = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const data = await calendarService.getOccupancy(req.tenantId, { from, to });
    return res.json(data);
  } catch (error) {
    return next(error);
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

module.exports = {
  getCalendarView,
  getOccupancy,
  suggestKennel,
  assignKennel,
  reassignKennel,
};
