const router = require('express').Router();
const billingService = require('../services/billing.service');
const { logger } = require('../lib/logger');

/**
 * Get billing overview
 * GET /api/v1/billing/overview
 */
router.get('/overview', async (req, res, next) => {
  try {
    const { tenantId } = req.user;

    const overview = await billingService.getBillingOverview(tenantId);

    res.json(overview);
  } catch (err) {
    logger.error({ err }, 'Failed to get billing overview');
    next(err);
  }
});

module.exports = router;

