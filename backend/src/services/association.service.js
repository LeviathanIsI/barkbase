const { forTenant } = require('../lib/tenantPrisma');

/**
 * List all association definitions for a tenant
 */
const listAssociations = async (tenantId, { fromObjectType, toObjectType, includeArchived = false } = {}) => {
  const db = forTenant(tenantId);

  const whereClause = {
    ...(fromObjectType && { fromObjectType }),
    ...(toObjectType && { toObjectType }),
    ...(!includeArchived && { archived: false }),
  };

  const associations = await db.associationDefinition.findMany({
    where: whereClause,
    orderBy: [
      { isSystemDefined: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return associations;
};

/**
 * Get a single association definition by ID
 */
const getAssociationById = async (tenantId, associationId) => {
  const db = forTenant(tenantId);

  const association = await db.associationDefinition.findFirst({
    where: { recordId: associationId },
  });

  if (!association) {
    throw Object.assign(new Error('Association definition not found'), { statusCode: 404 });
  }

  return association;
};

/**
 * Create a new association definition
 */
const createAssociation = async (tenantId, createdById, data) => {
  const db = forTenant(tenantId);

  // Check if an association with the same label already exists for this object type pair
  const existing = await db.associationDefinition.findFirst({
    where: {
      fromObjectType: data.fromObjectType,
      toObjectType: data.toObjectType,
      label: data.label,
    },
  });

  if (existing) {
    throw Object.assign(
      new Error('An association with this label already exists for this object type pair'),
      {
        statusCode: 409,
        code: 'DUPLICATE_ASSOCIATION_LABEL',
      }
    );
  }

  const association = await db.associationDefinition.create({
    data: {
      tenantId,
      label: data.label,
      reverseLabel: data.reverseLabel || null,
      isPaired: data.isPaired || false,
      fromObjectType: data.fromObjectType,
      toObjectType: data.toObjectType,
      limitType: data.limitType || 'MANY_TO_MANY',
      isSystemDefined: false,
      createdById,
      usageCount: 0,
    },
  });

  return association;
};

/**
 * Update an existing association definition
 */
const updateAssociation = async (tenantId, associationId, data) => {
  const db = forTenant(tenantId);

  // Verify association exists
  const existing = await db.associationDefinition.findFirst({
    where: { recordId: associationId },
  });

  if (!existing) {
    throw Object.assign(new Error('Association definition not found'), { statusCode: 404 });
  }

  // Cannot update system-defined associations
  if (existing.isSystemDefined) {
    throw Object.assign(new Error('Cannot update system-defined associations'), {
      statusCode: 403,
      code: 'SYSTEM_DEFINED_ASSOCIATION',
    });
  }

  // Check for duplicate label if label is being updated
  if (data.label && data.label !== existing.label) {
    const duplicate = await db.associationDefinition.findFirst({
      where: {
        fromObjectType: existing.fromObjectType,
        toObjectType: existing.toObjectType,
        label: data.label,
        id: { not: associationId },
      },
    });

    if (duplicate) {
      throw Object.assign(
        new Error('An association with this label already exists for this object type pair'),
        {
          statusCode: 409,
          code: 'DUPLICATE_ASSOCIATION_LABEL',
        }
      );
    }
  }

  const updated = await db.associationDefinition.update({
    where: { recordId: associationId },
    data: {
      ...(data.label !== undefined && { label: data.label }),
      ...(data.reverseLabel !== undefined && { reverseLabel: data.reverseLabel }),
      ...(data.isPaired !== undefined && { isPaired: data.isPaired }),
      ...(data.limitType !== undefined && { limitType: data.limitType }),
    },
  });

  return updated;
};

/**
 * Delete (archive) an association definition
 */
const deleteAssociation = async (tenantId, associationId) => {
  const db = forTenant(tenantId);

  // Verify association exists
  const association = await db.associationDefinition.findFirst({
    where: { recordId: associationId },
  });

  if (!association) {
    throw Object.assign(new Error('Association definition not found'), { statusCode: 404 });
  }

  // Cannot delete system-defined associations
  if (association.isSystemDefined) {
    throw Object.assign(new Error('Cannot delete system-defined associations'), {
      statusCode: 403,
      code: 'SYSTEM_DEFINED_ASSOCIATION',
    });
  }

  // Soft delete by archiving
  await db.associationDefinition.update({
    where: { recordId: associationId },
    data: {
      archived: true,
      archivedAt: new Date(),
    },
  });

  return { success: true };
};

/**
 * Increment usage count for an association
 */
const incrementUsageCount = async (tenantId, associationId) => {
  const db = forTenant(tenantId);

  await db.associationDefinition.update({
    where: { recordId: associationId },
    data: {
      usageCount: { increment: 1 },
    },
  });
};

/**
 * Get associations for a specific object type pair
 */
const getAssociationsForObjectPair = async (tenantId, fromObjectType, toObjectType) => {
  const db = forTenant(tenantId);

  const associations = await db.associationDefinition.findMany({
    where: {
      fromObjectType,
      toObjectType,
      archived: false,
    },
    orderBy: [
      { isSystemDefined: 'desc' },
      { label: 'asc' },
    ],
  });

  return associations;
};

/**
 * Seed system-defined associations for a tenant
 */
const seedSystemAssociations = async (tenantId) => {
  const db = forTenant(tenantId);

  const systemAssociations = [
    {
      tenantId,
      label: 'Primary',
      fromObjectType: 'pet',
      toObjectType: 'owner',
      limitType: 'ONE_TO_ONE',
      isSystemDefined: true,
    },
    {
      tenantId,
      label: 'Secondary',
      fromObjectType: 'pet',
      toObjectType: 'owner',
      limitType: 'ONE_TO_MANY',
      isSystemDefined: true,
    },
    {
      tenantId,
      label: 'Billing Contact',
      fromObjectType: 'owner',
      toObjectType: 'booking',
      limitType: 'ONE_TO_MANY',
      isSystemDefined: true,
    },
  ];

  for (const assoc of systemAssociations) {
    // Check if it already exists
    const existing = await db.associationDefinition.findFirst({
      where: {
        fromObjectType: assoc.fromObjectType,
        toObjectType: assoc.toObjectType,
        label: assoc.label,
      },
    });

    if (!existing) {
      await db.associationDefinition.create({ data: assoc });
    }
  }
};

module.exports = {
  listAssociations,
  getAssociationById,
  createAssociation,
  updateAssociation,
  deleteAssociation,
  incrementUsageCount,
  getAssociationsForObjectPair,
  seedSystemAssociations,
};
