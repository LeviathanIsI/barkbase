const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const controller = require('../controllers/kennel.controller');

const router = Router();

router.use(tenantContext, requireAuth());

router.get('/availability', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.availability);

module.exports = router;
