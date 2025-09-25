const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const tenantContext = require('../middleware/tenantContext');
const { requireAuth } = require('../middleware/requireAuth');
const schemas = require('../validators/auth.validator');

const router = Router();

router.post('/login', tenantContext, validate(schemas.login), authController.login);
router.post('/refresh', tenantContext, authController.refresh);
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
