const kennelService = require('../services/kennel.service');

const availability = async (req, res, next) => {
  try {
    const data = await kennelService.getAvailability(req.tenantId, req.query.date);
    return res.json(data);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  availability,
};
