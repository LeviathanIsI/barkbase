const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const membershipController = require('../controllers/membership.controller');
const membershipSchemas = require('../validators/membership.validator');

const router = Router();

router.use(tenantContext, requireAuth());

router.patch(
  '/:membershipId',
  requireAuth(['OWNER', 'ADMIN']),
  validate(membershipSchemas.updateRole),
  membershipController.updateMemberRole,
);

router.delete(
  '/:membershipId',
  requireAuth(['OWNER', 'ADMIN']),
  membershipController.removeMember,
);

module.exports = router;
