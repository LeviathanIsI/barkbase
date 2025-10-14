const { forTenant } = require('../lib/tenantPrisma');
const { AppError } = require('../utils/errors');

/**
 * Create a note
 */
const createNote = async (tenantId, userId, data) => {
  const tenantDb = forTenant(tenantId);
  
  // Validate entity exists
  let entity;
  switch (data.entityType) {
    case 'owner':
      entity = await tenantDb.owner.findUnique({
        where: { recordId: data.entityId },
      });
      break;
    case 'pet':
      entity = await tenantDb.pet.findUnique({
        where: { recordId: data.entityId },
      });
      break;
    case 'booking':
      entity = await tenantDb.booking.findUnique({
        where: { recordId: data.entityId },
      });
      break;
    default:
      throw new AppError('Invalid entity type', 400);
  }

  if (!entity) {
    throw new AppError(`${data.entityType} not found`, 404);
  }

  const note = await tenantDb.note.create({
    data: {
      ...data,
      tenantId,
      authorId: userId,
    },
    include: {
      author: {
        select: {
          recordId: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return note;
};

/**
 * Get notes for an entity
 */
const getEntityNotes = async (tenantId, entityType, entityId, options = {}) => {
  const tenantDb = forTenant(tenantId);
  const { visibility, category, authorId } = options;

  const where = {
    tenantId,
    entityType,
    entityId,
  };

  if (visibility) {
    where.visibility = visibility;
  }

  if (category) {
    where.category = category;
  }

  if (authorId) {
    where.authorId = authorId;
  }

  const notes = await tenantDb.note.findMany({
    where,
    include: {
      author: {
        select: {
          recordId: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { isPinned: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return notes;
};

/**
 * Update a note
 */
const updateNote = async (tenantId, noteId, userId, data) => {
  const tenantDb = forTenant(tenantId);

  // Check if note exists and user has permission
  const existingNote = await tenantDb.note.findFirst({
    where: {
      recordId: noteId,
      tenantId,
    },
  });

  if (!existingNote) {
    throw new AppError('Note not found', 404);
  }

  // Only author can update their notes
  if (existingNote.authorId !== userId) {
    throw new AppError('You can only edit your own notes', 403);
  }

  const note = await tenantDb.note.update({
    where: { recordId: noteId },
    data: {
      content: data.content,
      category: data.category,
      visibility: data.visibility,
      isPinned: data.isPinned,
    },
    include: {
      author: {
        select: {
          recordId: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return note;
};

/**
 * Delete a note
 */
const deleteNote = async (tenantId, noteId, userId, isAdmin = false) => {
  const tenantDb = forTenant(tenantId);

  const existingNote = await tenantDb.note.findFirst({
    where: {
      recordId: noteId,
      tenantId,
    },
  });

  if (!existingNote) {
    throw new AppError('Note not found', 404);
  }

  // Only author or admin can delete notes
  if (!isAdmin && existingNote.authorId !== userId) {
    throw new AppError('You can only delete your own notes', 403);
  }

  await tenantDb.note.delete({
    where: { recordId: noteId },
  });

  return { success: true };
};

/**
 * Get note categories used in the tenant
 */
const getNoteCategories = async (tenantId) => {
  const tenantDb = forTenant(tenantId);

  const categories = await tenantDb.note.findMany({
    where: {
      tenantId,
      category: {
        not: null,
      },
    },
    select: {
      category: true,
    },
    distinct: ['category'],
  });

  return categories.map((c) => c.category);
};

/**
 * Pin/unpin a note
 */
const toggleNotePin = async (tenantId, noteId, userId) => {
  const tenantDb = forTenant(tenantId);

  const existingNote = await tenantDb.note.findFirst({
    where: {
      recordId: noteId,
      tenantId,
    },
  });

  if (!existingNote) {
    throw new AppError('Note not found', 404);
  }

  const note = await tenantDb.note.update({
    where: { recordId: noteId },
    data: {
      isPinned: !existingNote.isPinned,
    },
    include: {
      author: {
        select: {
          recordId: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return note;
};

module.exports = {
  createNote,
  getEntityNotes,
  updateNote,
  deleteNote,
  getNoteCategories,
  toggleNotePin,
};

