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

const shiftHandoff = async (req, res, next) => {
  try {
    const data = await dashboardService.getShiftHandoff(req.tenantId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const emergencyAccess = async (req, res, next) => {
  try {
    const data = await dashboardService.getEmergencyAccess(req.tenantId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const wellnessMonitoring = async (req, res, next) => {
  try {
    const data = await dashboardService.getWellnessMonitoring(req.tenantId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const parentCommunication = async (req, res, next) => {
  try {
    const data = await dashboardService.getParentCommunication(req.tenantId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const facilityHeatmap = async (req, res, next) => {
  try {
    const data = await dashboardService.getFacilityHeatmap(req.tenantId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const revenueOptimizer = async (req, res, next) => {
  try {
    const data = await dashboardService.getRevenueOptimizer(req.tenantId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const socialCompatibility = async (req, res, next) => {
  try {
    const data = await dashboardService.getSocialCompatibility(req.tenantId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const staffingIntelligence = async (req, res, next) => {
  try {
    const data = await dashboardService.getStaffingIntelligence(req.tenantId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const customerCLV = async (req, res, next) => {
  try {
    const data = await dashboardService.getCustomerCLV(req.tenantId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const incidentAnalytics = async (req, res, next) => {
  try {
    const data = await dashboardService.getIncidentAnalytics(req.tenantId);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  stats,
  occupancy,
  vaccinations,
  shiftHandoff,
  emergencyAccess,
  wellnessMonitoring,
  parentCommunication,
  facilityHeatmap,
  revenueOptimizer,
  socialCompatibility,
  staffingIntelligence,
  customerCLV,
  incidentAnalytics,
};
