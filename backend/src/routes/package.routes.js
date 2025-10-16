const router = require('express').Router();
const packageService = require('../services/package.service');
const { logger } = require('../lib/logger');

/**
 * Create a new package
 * POST /api/v1/packages
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { ownerId, name, creditsPurchased, priceCents, expiresAt } = req.body;

    if (!ownerId || !name || !creditsPurchased || !priceCents) {
      return res.status(400).json({ 
        error: 'Missing required fields: ownerId, name, creditsPurchased, priceCents' 
      });
    }

    const pkg = await packageService.createPackage({
      tenantId,
      ownerId,
      name,
      creditsPurchased,
      priceCents,
      expiresAt
    });

    logger.info({ packageId: pkg.recordId, ownerId }, 'Package created');

    res.status(201).json(pkg);
  } catch (err) {
    logger.error({ err }, 'Failed to create package');
    next(err);
  }
});

/**
 * Get packages for an owner
 * GET /api/v1/packages/owner/:ownerId
 */
router.get('/owner/:ownerId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { ownerId } = req.params;

    const packages = await packageService.getOwnerPackages(tenantId, ownerId);

    res.json(packages);
  } catch (err) {
    logger.error({ err, ownerId: req.params.ownerId }, 'Failed to get owner packages');
    next(err);
  }
});

/**
 * Get all packages
 * GET /api/v1/packages
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const filters = {
      status: req.query.status,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const packages = await packageService.getAllPackages(tenantId, filters);

    res.json(packages);
  } catch (err) {
    logger.error({ err }, 'Failed to get packages');
    next(err);
  }
});

/**
 * Apply package to booking
 * POST /api/v1/packages/:packageId/apply/:bookingId
 */
router.post('/:packageId/apply/:bookingId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { packageId, bookingId } = req.params;
    const { creditsUsed } = req.body;

    if (!creditsUsed || creditsUsed < 1) {
      return res.status(400).json({ error: 'creditsUsed must be a positive number' });
    }

    const result = await packageService.applyPackageToBooking({
      tenantId,
      packageId,
      bookingId,
      creditsUsed
    });

    logger.info({ packageId, bookingId, creditsUsed }, 'Package applied to booking');

    res.json(result);
  } catch (err) {
    logger.error({ err, packageId: req.params.packageId, bookingId: req.params.bookingId }, 
      'Failed to apply package');
    next(err);
  }
});

/**
 * Get package usage history
 * GET /api/v1/packages/:packageId/usage-history
 */
router.get('/:packageId/usage-history', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { packageId } = req.params;

    const usage = await packageService.getPackageUsageHistory(tenantId, packageId);

    res.json(usage);
  } catch (err) {
    logger.error({ err, packageId: req.params.packageId }, 'Failed to get package usage history');
    next(err);
  }
});

module.exports = router;

