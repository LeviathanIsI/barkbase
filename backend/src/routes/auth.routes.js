const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { tenantContext } = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const schemas = require('../validators/auth.validator');

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post('/signup', signupLimiter, validate(schemas.signup), authController.signup);
router.post('/login', validate(schemas.login), authController.login);
router.post('/refresh', tenantContext, authController.refresh);
router.post('/verify-email', validate(schemas.verifyEmail), authController.verifyEmail);
router.post(
  '/register',
  tenantContext,
  requireAuth(['OWNER', 'ADMIN']),
  validate(schemas.register),
  async (req, res, next) => {
    try {
      const result = await require('../services/auth.service').register(req.tenantId, req.body);
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  },
);
router.post('/logout', tenantContext, requireAuth(), authController.logout);

module.exports = router;
