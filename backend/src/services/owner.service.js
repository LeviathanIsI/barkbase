const { forTenant } = require('../lib/tenantPrisma');
const { buildWhere, parsePageLimit, toPageResult } = require('../utils/pagination');

/**
 * List all owners for a tenant with pagination
 */
const listOwners = async (tenantId, options = {}) => {
  const db = forTenant(tenantId);
  const { page, limit, skip } = parsePageLimit(options, { defaultLimit: 50, maxLimit: 200 });
  const whereClause = buildWhere(options.search, ['firstName', 'lastName', 'email', 'phone']);

  const [owners, total] = await Promise.all([
    db.owner.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
      include: {
        pets: {
          include: {
            pet: {
              select: {
                id: true,
                name: true,
                breed: true,
              },
            },
          },
        },
        bookings: {
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            status: true,
          },
          orderBy: {
            checkIn: 'desc',
          },
        },
        payments: {
          select: {
            id: true,
            amountCents: true,
            status: true,
          },
        },
      },
    }),
    db.owner.count({ where: whereClause }),
  ]);

  const data = owners.map((owner) => ({
    ...owner,
    pets: owner.pets.map((po) => po.pet),
  }));

  return toPageResult({ items: data, total, page, limit });
};

/**
 * Get a single owner by ID
 */
const getOwnerById = async (tenantId, ownerId) => {
  const db = forTenant(tenantId);

  const owner = await db.owner.findFirst({
    where: { id: ownerId },
    include: {
      pets: {
        include: {
          pet: {
            select: {
              id: true,
              name: true,
              breed: true,
              birthdate: true,
              status: true,
            },
          },
        },
      },
      bookings: {
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          status: true,
        },
        orderBy: {
          checkIn: 'desc',
        },
      },
      payments: {
        select: {
          id: true,
          amountCents: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!owner) {
    throw Object.assign(new Error('Owner not found'), { statusCode: 404 });
  }

  return {
    ...owner,
    pets: owner.pets.map((po) => po.pet),
  };
};

/**
 * Create a new owner
 */
const createOwner = async (tenantId, ownerData) => {
  const db = forTenant(tenantId);

  // Check for duplicate email within tenant
  const { email, ...otherData } = ownerData;

  if (email) {
    const existing = await db.owner.findFirst({
      where: { email },
    });

    if (existing) {
      throw Object.assign(new Error('An owner with this email already exists'), {
        statusCode: 409,
        code: 'DUPLICATE_EMAIL',
      });
    }
  }

  const owner = await db.owner.create({
    data: {
      email,
      ...otherData,
    },
  });

  return owner;
};

/**
 * Update an existing owner
 */
const updateOwner = async (tenantId, ownerId, ownerData) => {
  const db = forTenant(tenantId);

  // Verify owner exists
  const existing = await db.owner.findFirst({
    where: { id: ownerId },
  });

  if (!existing) {
    throw Object.assign(new Error('Owner not found'), { statusCode: 404 });
  }

  // Check for duplicate email if email is being updated
  if (ownerData.email && ownerData.email !== existing.email) {
    const duplicate = await db.owner.findFirst({
      where: {
        email: ownerData.email,
        id: { not: ownerId },
      },
    });

    if (duplicate) {
      throw Object.assign(new Error('An owner with this email already exists'), {
        statusCode: 409,
        code: 'DUPLICATE_EMAIL',
      });
    }
  }

  const updated = await db.owner.update({
    where: { id: ownerId },
    data: ownerData,
  });

  return updated;
};

/**
 * Delete an owner (soft delete by preventing deletion if they have active pets)
 */
const deleteOwner = async (tenantId, ownerId) => {
  const db = forTenant(tenantId);

  // Check if owner exists
  const owner = await db.owner.findFirst({
    where: { id: ownerId },
    include: {
      pets: {
        include: {
          pet: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!owner) {
    throw Object.assign(new Error('Owner not found'), { statusCode: 404 });
  }

  // Prevent deletion if owner has active pets
  const activePets = owner.pets.filter((po) => po.pet.status === 'active');
  if (activePets.length > 0) {
    throw Object.assign(
      new Error('Cannot delete owner with active pets. Please reassign or deactivate pets first.'),
      {
        statusCode: 409,
        code: 'HAS_ACTIVE_PETS',
        meta: {
          activePetCount: activePets.length,
          activePets: activePets.map((po) => ({
            id: po.pet.id,
            name: po.pet.name,
          })),
        },
      }
    );
  }

  // Delete owner (this will cascade delete PetOwner join records)
  await db.owner.delete({
    where: { id: ownerId },
  });

  return { success: true };
};

/**
 * Get all pets for an owner
 */
const getOwnerPets = async (tenantId, ownerId) => {
  const db = forTenant(tenantId);

  const owner = await db.owner.findFirst({
    where: { id: ownerId },
    include: {
      pets: {
        include: {
          pet: true,
        },
      },
    },
  });

  if (!owner) {
    throw Object.assign(new Error('Owner not found'), { statusCode: 404 });
  }

  return owner.pets.map((po) => ({
    ...po.pet,
    isPrimaryOwner: po.isPrimary,
  }));
};

/**
 * Add a pet to an owner (create PetOwner relationship)
 */
const addPetToOwner = async (tenantId, ownerId, petId, isPrimary = false) => {
  const db = forTenant(tenantId);

  // Verify owner exists
  const owner = await db.owner.findFirst({
    where: { id: ownerId },
  });

  if (!owner) {
    throw Object.assign(new Error('Owner not found'), { statusCode: 404 });
  }

  // Verify pet exists
  const pet = await db.pet.findFirst({
    where: { id: petId },
  });

  if (!pet) {
    throw Object.assign(new Error('Pet not found'), { statusCode: 404 });
  }

  // Check if relationship already exists
  const existing = await db.petOwner.findFirst({
    where: {
      petId,
      ownerId,
    },
  });

  if (existing) {
    throw Object.assign(new Error('Pet is already associated with this owner'), {
      statusCode: 409,
    });
  }

  // Create the relationship
  const petOwner = await db.petOwner.create({
    data: {
      tenantId,
      petId,
      ownerId,
      isPrimary,
    },
    include: {
      pet: true,
      owner: true,
    },
  });

  return petOwner;
};

/**
 * Remove a pet from an owner (delete PetOwner relationship)
 */
const removePetFromOwner = async (tenantId, ownerId, petId) => {
  const db = forTenant(tenantId);

  // Find the relationship
  const petOwner = await db.petOwner.findFirst({
    where: {
      petId,
      ownerId,
    },
  });

  if (!petOwner) {
    throw Object.assign(new Error('Pet is not associated with this owner'), {
      statusCode: 404,
    });
  }

  // Delete the relationship
  await db.petOwner.delete({
    where: { id: petOwner.id },
  });

  return { success: true };
};

module.exports = {
  listOwners,
  getOwnerById,
  createOwner,
  updateOwner,
  deleteOwner,
  getOwnerPets,
  addPetToOwner,
  removePetFromOwner,
};
