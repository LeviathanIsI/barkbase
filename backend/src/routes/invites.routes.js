const { Router } = require('express');
const validate = require('../middleware/validate');
const inviteController = require('../controllers/invite.controller');
const inviteSchemas = require('../validators/invite.validator');

const router = Router();

router.post('/:token/accept', validate(inviteSchemas.accept), inviteController.acceptInvite);

module.exports = router;
