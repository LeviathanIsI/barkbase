const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const controller = require('../controllers/event.controller');
const schemas = require('../validators/events.validator');

const router = Router();

router.use(tenantContext, requireAuth());

router.post('/', validate(schemas.ingestEvent), controller.ingestEvent);

module.exports = router;
