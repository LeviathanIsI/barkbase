const express = require('express');
const router = express.Router();
const segmentController = require('../controllers/segment.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { tenantContext } = require('../middleware/tenantContext');
const { validate } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

// All routes require authentication and tenant context
router.use(requireAuth());
router.use(tenantContext);

// Create a segment (admin only)
router.post(
  '/',
  requireAuth(['OWNER', 'ADMIN']),
  validate([
    body('name').isString().notEmpty(),
    body('description').optional().isString(),
    body('conditions').optional().isObject(),
    body('isAutomatic').optional().isBoolean(),
  ]),
  segmentController.createSegment
);

// Get all segments
router.get(
  '/',
  validate([query('isActive').optional().isBoolean()]),
  segmentController.getSegments
);

// Update a segment (admin only)
router.put(
  '/:segmentId',
  requireAuth(['OWNER', 'ADMIN']),
  validate([
    param('segmentId').isString().notEmpty(),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('conditions').optional().isObject(),
    body('isActive').optional().isBoolean(),
  ]),
  segmentController.updateSegment
);

// Get segment members
router.get(
  '/:segmentId/members',
  validate([
    param('segmentId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ]),
  segmentController.getSegmentMembers
);

// Add members to segment (admin only)
router.post(
  '/:segmentId/members',
  requireAuth(['OWNER', 'ADMIN']),
  validate([
    param('segmentId').isString().notEmpty(),
    body('ownerIds').isArray().notEmpty(),
    body('ownerIds.*').isString(),
  ]),
  segmentController.addSegmentMembers
);

// Remove members from segment (admin only)
router.delete(
  '/:segmentId/members',
  requireAuth(['OWNER', 'ADMIN']),
  validate([
    param('segmentId').isString().notEmpty(),
    body('ownerIds').isArray().notEmpty(),
    body('ownerIds.*').isString(),
  ]),
  segmentController.removeSegmentMembers
);

// Delete a segment (admin only)
router.delete(
  '/:segmentId',
  requireAuth(['OWNER', 'ADMIN']),
  validate([param('segmentId').isString().notEmpty()]),
  segmentController.deleteSegment
);

// Refresh automatic segments (admin only)
router.post(
  '/refresh',
  requireAuth(['OWNER', 'ADMIN']),
  segmentController.refreshSegments
);

module.exports = router;
