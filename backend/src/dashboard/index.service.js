const metricsService = require('./metrics.service');
const reportsService = require('./reports.service');
const widgetsService = require('./widgets.service');

module.exports = {
  ...metricsService,
  ...reportsService,
  ...widgetsService,
  metrics: metricsService,
  reports: reportsService,
  widgets: widgetsService,
};
