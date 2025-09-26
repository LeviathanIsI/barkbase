const reportService = require('../services/report.service');

const dashboard = async (req, res, next) => {
  try {
    const metrics = await reportService.dashboard(req.tenantId, req.query);
    return res.json(metrics);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  dashboard,
};
