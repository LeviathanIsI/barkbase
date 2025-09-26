const dashboardService = require('../services/dashboard.service');

const stats = async (req, res, next) => {
  try {
    const data = await dashboardService.getStats(req.tenantId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const occupancy = async (req, res, next) => {
  try {
    const data = await dashboardService.getOccupancy(req.tenantId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const vaccinations = async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const daysAhead = req.query.daysAhead ? Number(req.query.daysAhead) : undefined;
    const data = await dashboardService.getUpcomingVaccinations(req.tenantId, { limit, daysAhead });
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  stats,
  occupancy,
  vaccinations,
};
