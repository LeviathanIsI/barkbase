const { Router } = require('express');
const userController = require('../controllers/user.controller');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/requireAuth');
const tenantContext = require('../middleware/tenantContext');
const { updateProfile, updatePassword } = require('../validators/user.validator');

const router = Router();

// All routes require authentication (no tenant context needed for user profile)
router.use(requireAuth());

router.get('/profile', userController.getProfile);
router.patch('/profile', validate(updateProfile), userController.updateProfile);
router.post('/password', validate(updatePassword), userController.updatePassword);
router.patch('/avatar', userController.updateAvatar);

module.exports = router;
