const { Router } = require('express');
const { tenantContext } = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const controller = require('../controllers/pet.controller');
const schemas = require('../validators/pet.validator');
const { upload } = require('../lib/uploads');

const router = Router();

router.use(tenantContext, requireAuth());

router.get('/', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.list);
router.post('/', requireAuth(['OWNER', 'ADMIN']), validate(schemas.create), controller.create);
router.get('/:petId', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.show);
router.put('/:petId', requireAuth(['OWNER', 'ADMIN']), validate(schemas.update), controller.update);
router.delete('/:petId', requireAuth(['OWNER', 'ADMIN']), controller.remove);
router.post(
  '/:petId/vaccinations',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(schemas.addVaccination),
  controller.addVaccination,
);
router.post(
  '/:petId/photo',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  upload.single('file'),
  controller.uploadPhoto,
);

// Vaccination expiration alerts
router.get(
  '/vaccinations/expiring',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  async (req, res, next) => {
    try {
      const vaccinationService = require('../services/vaccination.service');
      const daysAhead = parseInt(req.query.daysAhead) || 30;
      const vaccinations = await vaccinationService.getExpiringVaccinations(req.tenantId, daysAhead);
      res.json(vaccinations);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
