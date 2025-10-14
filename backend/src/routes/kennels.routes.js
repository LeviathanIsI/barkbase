const { Router } = require('express');
const { tenantContext } = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const controller = require('../controllers/kennel.controller');
const validate = require('../middleware/validate');
const { kennelSchemas } = require('../validators/kennel.validator');

const router = Router();

router.use(tenantContext, requireAuth());

// Kennel availability (legacy endpoint)
router.get('/availability', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.availability);

// CRUD operations
router.get('/', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.list);
router.get('/:recordId', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.get);
router.post('/', requireAuth(['OWNER', 'ADMIN']), validate(kennelSchemas.create), controller.create);
router.put('/:recordId', requireAuth(['OWNER', 'ADMIN']), validate(kennelSchemas.update), controller.update);
router.delete('/:recordId', requireAuth(['OWNER', 'ADMIN']), controller.remove);

// Check specific kennel availability
router.get('/:recordId/availability', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.checkAvailability);

module.exports = router;
