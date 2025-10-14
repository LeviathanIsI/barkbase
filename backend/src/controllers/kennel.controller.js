const kennelService = require('../services/kennel.service');

const availability = async (req, res, next) => {
  try {
    const data = await kennelService.getAvailability(req.tenantId, req.query.date);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const kennels = await kennelService.listKennels(req.tenantId, req.query);
    return res.json(kennels);
  } catch (error) {
    return next(error);
  }
};

const get = async (req, res, next) => {
  try {
    const kennel = await kennelService.getKennel(req.tenantId, req.params.recordId);
    return res.json(kennel);
  } catch (error) {
    return next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const kennel = await kennelService.createKennel(req.tenantId, req.body);
    return res.status(201).json(kennel);
  } catch (error) {
    return next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const kennel = await kennelService.updateKennel(req.tenantId, req.params.recordId, req.body);
    return res.json(kennel);
  } catch (error) {
    return next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await kennelService.deleteKennel(req.tenantId, req.params.recordId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const checkAvailability = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const availability = await kennelService.checkKennelAvailability(
      req.tenantId,
      req.params.recordId,
      new Date(startDate),
      new Date(endDate)
    );
    return res.json(availability);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  availability,
  list,
  get,
  create,
  update,
  remove,
  checkAvailability
};
