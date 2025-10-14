const express = require('express');
const router = express.Router();
const noteController = require('../controllers/note.controller');
const { requireAuth } = require('../middleware/requireAuth');
const { tenantContext } = require('../middleware/tenantContext');
const { validate } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

// All routes require authentication and tenant context
router.use(requireAuth());
router.use(tenantContext);

// Create a note
router.post(
  '/',
  validate([
    body('entityType').isIn(['owner', 'pet', 'booking']),
    body('entityId').isString().notEmpty(),
    body('content').isString().notEmpty(),
    body('category').optional().isString(),
    body('visibility').optional().isIn(['ALL', 'STAFF', 'ADMIN', 'PRIVATE']),
  ]),
  noteController.createNote
);

// Get notes for an entity
router.get(
  '/:entityType/:entityId',
  validate([
    param('entityType').isIn(['owner', 'pet', 'booking']),
    param('entityId').isString().notEmpty(),
    query('visibility').optional().isIn(['ALL', 'STAFF', 'ADMIN', 'PRIVATE']),
    query('category').optional().isString(),
    query('authorId').optional().isString(),
  ]),
  noteController.getEntityNotes
);

// Update a note
router.put(
  '/:noteId',
  validate([
    param('noteId').isString().notEmpty(),
    body('content').optional().isString(),
    body('category').optional().isString(),
    body('visibility').optional().isIn(['ALL', 'STAFF', 'ADMIN', 'PRIVATE']),
    body('isPinned').optional().isBoolean(),
  ]),
  noteController.updateNote
);

// Delete a note
router.delete(
  '/:noteId',
  validate([param('noteId').isString().notEmpty()]),
  noteController.deleteNote
);

// Get note categories
router.get('/categories', noteController.getNoteCategories);

// Toggle note pin
router.post(
  '/:noteId/pin',
  validate([param('noteId').isString().notEmpty()]),
  noteController.toggleNotePin
);

module.exports = router;
