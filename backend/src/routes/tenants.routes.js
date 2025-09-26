const { Router } = require('express');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const validate = require('../middleware/validate');
const controller = require('../controllers/tenant.controller');
const membershipController = require('../controllers/membership.controller');
const tenantSchemas = require('../validators/tenant.validator');
const inviteSchemas = require('../validators/invite.validator');

const requireMatchingTenantParam = (req, res, next) => {
  const { tenantId } = req.params;
  if (!tenantId) {
    return next();
  }
  if (tenantId !== req.tenantId && tenantId !== req.tenant?.slug) {
    return res.status(400).json({ message: 'Tenant parameter mismatch' });
  }
  return next();
};

const router = Router();

router.use(tenantContext);

router.get('/current', controller.current);
router.get('/current/plan', controller.plan);

router.get(
  '/:tenantId/members',
  requireAuth(['OWNER', 'ADMIN', 'STAFF', 'READONLY']),
  requireMatchingTenantParam,
  membershipController.listMembers,
);

router.use(requireAuth());

router.get('/current/onboarding', controller.onboarding);
router.patch(
  '/current/onboarding',
  requireAuth(['OWNER', 'ADMIN']),
  validate(tenantSchemas.onboardingUpdate),
  controller.updateOnboarding,
);

router.post(
  '/:tenantId/invites',
  requireAuth(['OWNER', 'ADMIN']),
  requireMatchingTenantParam,
  validate(inviteSchemas.create),
  membershipController.inviteMember,
);

router.put(
  '/theme',
  requireAuth(['OWNER', 'ADMIN']),
  validate(tenantSchemas.theme),
  controller.updateTheme,
);
router.put(
  '/current/theme',
  requireAuth(['OWNER', 'ADMIN']),
  validate(tenantSchemas.theme),
  controller.updateTheme,
);
router.put(
  '/features',
  requireAuth(['OWNER', 'ADMIN']),
  validate(tenantSchemas.featureFlags),
  controller.updateFeatureFlags,
);

module.exports = router;
