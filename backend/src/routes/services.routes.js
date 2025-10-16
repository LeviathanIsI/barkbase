const router = require('express').Router();
const { forTenant } = require('../lib/tenantPrisma');
const { logger } = require('../lib/logger');

/**
 * Get all services
 * GET /api/v1/services
 */
router.get('/', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const tenantDb = forTenant(tenantId);

    const services = await tenantDb.service.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json(services);
  } catch (err) {
    logger.error({ err }, 'Failed to get services');
    next(err);
  }
});

/**
 * Create a service
 * POST /api/v1/services
 */
router.post('/', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const tenantDb = forTenant(tenantId);
    const { name, description, priceCents, category, isActive } = req.body;

    if (!name || priceCents === undefined) {
      return res.status(400).json({ error: 'name and priceCents are required' });
    }

    const service = await tenantDb.service.create({
      data: {
        tenantId,
        name,
        description,
        priceCents: parseInt(priceCents),
        category: category || 'BOARDING',
        isActive: isActive !== undefined ? isActive : true
      }
    });

    logger.info({ serviceId: service.recordId, name }, 'Service created');

    res.status(201).json(service);
  } catch (err) {
    logger.error({ err }, 'Failed to create service');
    next(err);
  }
});

/**
 * Update a service
 * PUT /api/v1/services/:serviceId
 */
router.put('/:serviceId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { serviceId } = req.params;
    const tenantDb = forTenant(tenantId);

    const service = await tenantDb.service.update({
      where: { recordId: serviceId },
      data: req.body
    });

    logger.info({ serviceId }, 'Service updated');

    res.json(service);
  } catch (err) {
    logger.error({ err, serviceId: req.params.serviceId }, 'Failed to update service');
    next(err);
  }
});

/**
 * Delete a service
 * DELETE /api/v1/services/:serviceId
 */
router.delete('/:serviceId', async (req, res, next) => {
  try {
    const { tenantId } = req.user;
    const { serviceId } = req.params;
    const tenantDb = forTenant(tenantId);

    await tenantDb.service.delete({
      where: { recordId: serviceId }
    });

    logger.info({ serviceId }, 'Service deleted');

    res.json({ success: true });
  } catch (err) {
    logger.error({ err, serviceId: req.params.serviceId }, 'Failed to delete service');
    next(err);
  }
});

module.exports = router;

