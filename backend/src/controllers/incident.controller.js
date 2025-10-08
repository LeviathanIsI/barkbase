const incidentService = require('../services/incident.service');

const create = async (req, res, next) => {
  try {
    const incident = await incidentService.createIncident(req.tenantId, req.body);
    return res.status(201).json(incident);
  } catch (error) {
    return next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const incidents = await incidentService.listIncidents(req.tenantId, req.query);
    return res.json(incidents);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  create,
  list,
};
