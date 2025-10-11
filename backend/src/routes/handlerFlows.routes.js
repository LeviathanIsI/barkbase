const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const controller = require('../controllers/handlerFlow.controller');
const schemas = require('../validators/handlerFlows.validator');

const router = Router();

router.use(tenantContext, requireAuth());

router.get('/', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.list);
router.post('/', requireAuth(['OWNER', 'ADMIN']), validate(schemas.createFlow), controller.createDraft);
router.get('/:flowId', requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']), controller.getById);
router.put('/:flowId/publish', requireAuth(['OWNER', 'ADMIN']), controller.publish);
router.post(
  '/:flowId/run',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(schemas.manualRun),
  controller.manualRun,
);

module.exports = router;
