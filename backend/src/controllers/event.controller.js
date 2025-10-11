const handlerFlowService = require('../services/handlerFlow.service');

const ingestEvent = async (req, res, next) => {
  try {
    const { tenantId, type, payload, idempotencyKey } = req.body ?? {};
    if (!tenantId || tenantId !== req.tenantId) {
      return res.status(403).json({ message: 'Tenant mismatch' });
    }

    const result = await handlerFlowService.handleEvent({
      tenantId,
      eventType: type,
      payload,
      idempotencyKey,
    });

    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  ingestEvent,
};
