const { Router } = require('express');
const { tenantContext } = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const controller = require('../controllers/handlerFlow.controller');
const schemas = require('../validators/handlerFlow.validator');

const router = Router();

router.use(tenantContext, requireAuth());

// Flow management
router.get(
  '/',
  requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']),
  validate(schemas.listQuery, 'query'),
  controller.listFlows,
);
router.post(
  '/',
  requireAuth(['OWNER', 'ADMIN']),
  validate(schemas.createFlow),
  controller.createFlow,
);
router.get(
  '/:flowId',
  requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']),
  controller.getFlowById,
);
router.post(
  '/:flowId',
  requireAuth(['OWNER', 'ADMIN']),
  validate(schemas.updateFlow),
  controller.updateFlow,
);
router.delete('/:flowId', requireAuth(['OWNER', 'ADMIN']), controller.deleteFlow);
router.post(
  '/:flowId/publish',
  requireAuth(['OWNER', 'ADMIN']),
  validate(schemas.publishFlow),
  controller.publishFlow,
);

// Flow validation
router.post(
  '/validate',
  requireAuth(['OWNER', 'ADMIN']),
  validate(schemas.validateDefinition),
  controller.validateFlow,
);

// Manual run trigger
router.post(
  '/:flowId/run',
  requireAuth(['OWNER', 'ADMIN', 'STAFF']),
  validate(schemas.manualRun),
  controller.manualRun,
);

module.exports = router;
