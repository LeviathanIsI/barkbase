const { forTenant } = require('../lib/tenantPrisma');
const { buildWhere, parsePageLimit } = require('../utils/pagination');

const petIncludes = {
  owners: {
    include: { owner: true },
  },
  vaccinations: true,
  bookings: {
    orderBy: { checkIn: 'desc' },
    take: 5,
  },
};

const listPets = async (tenantId, options = {}) => {
  const tenantDb = forTenant(tenantId);
  const { limit, skip } = parsePageLimit(options, { defaultLimit: 100, maxLimit: 500 });
  const where = buildWhere(options.search, ['name', 'breed']);

  return tenantDb.$withTenantGuc(async (tx) => {
    const txDb = forTenant(tenantId, tx);
    return txDb.pet.findMany({
      where,
      include: petIncludes,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip,
    });
  });
};

const getPetById = async (tenantId, petId) => {
  const tenantDb = forTenant(tenantId);
  return tenantDb.$withTenantGuc(async (tx) => {
    const txDb = forTenant(tenantId, tx);
    return txDb.pet.findFirst({ where: { recordId: petId }, include: petIncludes });
  });
};

const createPet = async (tenantId, payload) => {
  const ownerIds = payload.ownerIds || [];
  const petData = {
    name: payload.name,
    species: payload.species,
    breed: payload.breed,
    birthdate: payload.birthdate ? new Date(payload.birthdate) : undefined,
    photoUrl: payload.photoUrl,
    weight: payload.weight ? parseFloat(payload.weight) : undefined,
    allergies: payload.allergies,
    medicalNotes: payload.medicalNotes,
    dietaryNotes: payload.dietaryNotes,
    lastVetVisit: payload.lastVetVisit ? new Date(payload.lastVetVisit) : undefined,
    nextAppointment: payload.nextAppointment ? new Date(payload.nextAppointment) : undefined,
    behaviorFlags: payload.behaviorFlags ?? [],
    tenantId, // Explicitly set tenantId for RLS
  };

  // Only add owners if ownerIds array is not empty
  if (ownerIds.length > 0) {
    petData.owners = {
      create: ownerIds.map((ownerId, index) => ({
        tenantId,
        ownerId,
        isPrimary: index === 0,
      })),
    };
  }

  // Use $withTenantGuc to set the GUC for RLS
  const pet = await forTenant(tenantId).$withTenantGuc(async (tx) => {
    const db = forTenant(tenantId, tx);
    return db.pet.create({
      data: petData,
      include: petIncludes,
    });
  });

  return pet;
};

const updatePet = async (tenantId, petId, payload) => {
  const tenantDb = forTenant(tenantId);

  // Check if pet exists using RLS
  const existing = await tenantDb.$withTenantGuc(async (tx) => {
    const txDb = forTenant(tenantId, tx);
    return txDb.pet.findFirst({ where: { recordId: petId } });
  });

  if (!existing) {
    throw Object.assign(new Error('Pet not found'), { statusCode: 404 });
  }

  const data = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.species !== undefined) data.species = payload.species;
  if (payload.breed !== undefined) data.breed = payload.breed;
  if (payload.birthdate !== undefined) {
    data.birthdate = payload.birthdate ? new Date(payload.birthdate) : null;
  }
  if (payload.photoUrl !== undefined) data.photoUrl = payload.photoUrl;
  if (payload.weight !== undefined) data.weight = payload.weight ? parseFloat(payload.weight) : null;
  if (payload.allergies !== undefined) data.allergies = payload.allergies;
  if (payload.medicalNotes !== undefined) data.medicalNotes = payload.medicalNotes;
  if (payload.dietaryNotes !== undefined) data.dietaryNotes = payload.dietaryNotes;
  if (payload.lastVetVisit !== undefined) {
    data.lastVetVisit = payload.lastVetVisit ? new Date(payload.lastVetVisit) : null;
  }
  if (payload.nextAppointment !== undefined) {
    data.nextAppointment = payload.nextAppointment ? new Date(payload.nextAppointment) : null;
  }
  if (payload.behaviorFlags !== undefined) data.behaviorFlags = payload.behaviorFlags;
  if (payload.status !== undefined) data.status = payload.status;

  const pet = await tenantDb.$withTenantGuc(async (tx) => {
    const txDb = forTenant(tenantId, tx);
    return txDb.pet.update({
      where: { recordId: petId },
      data,
      include: petIncludes,
    });
  });

  return pet;
};

const deletePet = async (tenantId, petId) => {
  const tenantDb = forTenant(tenantId);

  // Check if pet exists using RLS
  const existing = await tenantDb.$withTenantGuc(async (tx) => {
    const txDb = forTenant(tenantId, tx);
    return txDb.pet.findFirst({ where: { recordId: petId } });
  });

  if (!existing) {
    throw Object.assign(new Error('Pet not found'), { statusCode: 404 });
  }

  await tenantDb.$withTenantGuc(async (tx) => {
    const txDb = forTenant(tenantId, tx);
    return txDb.pet.delete({ where: { recordId: petId } });
  });
};

const addVaccination = async (tenantId, petId, payload) => {
  const tenantDb = forTenant(tenantId);

  // Check if pet exists using RLS
  const pet = await tenantDb.$withTenantGuc(async (tx) => {
    const txDb = forTenant(tenantId, tx);
    return txDb.pet.findFirst({ where: { recordId: petId } });
  });

  if (!pet) {
    throw Object.assign(new Error('Pet not found'), { statusCode: 404 });
  }

  return tenantDb.$withTenantGuc(async (tx) => {
    const txDb = forTenant(tenantId, tx);
    return txDb.vaccination.create({
      data: {
        tenantId,
        petId,
        type: payload.type,
        administeredAt: new Date(payload.administeredAt),
        expiresAt: new Date(payload.expiresAt),
        documentUrl: payload.documentUrl,
        notes: payload.notes,
      },
    });
  });
};

module.exports = {
  listPets,
  getPetById,
  createPet,
  updatePet,
  addVaccination,
  deletePet,
};
