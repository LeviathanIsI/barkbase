const express = require('express');
const router = express.Router();
const communicationController = require('../controllers/communication.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { tenantContext } = require('../middleware/tenantContext');
const { validate } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

// All routes require authentication and tenant context
router.use(requireAuth());
router.use(tenantContext);

// Create a communication
router.post(
  '/',
  validate([
    body('type').isIn(['EMAIL', 'SMS', 'CALL', 'NOTE', 'SYSTEM']),
    body('direction').isIn(['INBOUND', 'OUTBOUND', 'INTERNAL']),
    body('ownerId').isString().notEmpty(),
    body('content').isString().notEmpty(),
    body('subject').optional().isString(),
    body('metadata').optional().isObject(),
    body('attachments').optional().isArray(),
  ]),
  communicationController.createCommunication
);

// Get communications for a customer
router.get(
  '/owner/:ownerId',
  validate([
    param('ownerId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('type').optional().isIn(['EMAIL', 'SMS', 'CALL', 'NOTE', 'SYSTEM']),
    query('direction').optional().isIn(['INBOUND', 'OUTBOUND', 'INTERNAL']),
  ]),
  communicationController.getCustomerCommunications
);

// Get customer timeline
router.get(
  '/owner/:ownerId/timeline',
  validate([
    param('ownerId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ]),
  communicationController.getCustomerTimeline
);

// Get communication statistics
router.get(
  '/owner/:ownerId/stats',
  validate([param('ownerId').isString().notEmpty()]),
  communicationController.getCommunicationStats
);

module.exports = router;
