const noteService = require('../services/note.service');
const { AppError } = require('../utils/errors');

/**
 * Create a note
 */
const createNote = async (req, res, next) => {
  try {
    const { entityType, entityId, content, category, visibility } = req.body;

    if (!entityType || !entityId || !content) {
      throw new AppError('Missing required fields', 400);
    }

    const note = await noteService.createNote(req.tenantId, req.user.recordId, {
      entityType,
      entityId,
      content,
      category,
      visibility,
    });

    return res.status(201).json(note);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get notes for an entity
 */
const getEntityNotes = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { visibility, category, authorId } = req.query;

    const notes = await noteService.getEntityNotes(req.tenantId, entityType, entityId, {
      visibility,
      category,
      authorId,
    });

    return res.json(notes);
  } catch (error) {
    return next(error);
  }
};

/**
 * Update a note
 */
const updateNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const { content, category, visibility, isPinned } = req.body;

    const note = await noteService.updateNote(req.tenantId, noteId, req.user.recordId, {
      content,
      category,
      visibility,
      isPinned,
    });

    return res.json(note);
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete a note
 */
const deleteNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'OWNER';

    await noteService.deleteNote(req.tenantId, noteId, req.user.recordId, isAdmin);

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

/**
 * Get note categories
 */
const getNoteCategories = async (req, res, next) => {
  try {
    const categories = await noteService.getNoteCategories(req.tenantId);

    return res.json(categories);
  } catch (error) {
    return next(error);
  }
};

/**
 * Toggle note pin status
 */
const toggleNotePin = async (req, res, next) => {
  try {
    const { noteId } = req.params;

    const note = await noteService.toggleNotePin(req.tenantId, noteId, req.user.recordId);

    return res.json(note);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createNote,
  getEntityNotes,
  updateNote,
  deleteNote,
  getNoteCategories,
  toggleNotePin,
};

