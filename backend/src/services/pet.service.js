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

const listPets = (tenantId, options = {}) => {
  const tenantDb = forTenant(tenantId);
  const { limit, skip } = parsePageLimit(options, { defaultLimit: 100, maxLimit: 500 });
  const where = buildWhere(options.search, ['name', 'breed']);

  return tenantDb.pet.findMany({
    where,
    include: petIncludes,
    orderBy: { updatedAt: 'desc' },
    take: limit,
    skip,
  });
};

const getPetById = (tenantId, petId) =>
  forTenant(tenantId).pet.findFirst({ where: { id: petId }, include: petIncludes });

const createPet = async (tenantId, payload) => {
  const ownerIds = payload.ownerIds || [];
  const petData = {
    name: payload.name,
    breed: payload.breed,
    birthdate: payload.birthdate ? new Date(payload.birthdate) : undefined,
    photoUrl: payload.photoUrl,
    medicalNotes: payload.medicalNotes,
    dietaryNotes: payload.dietaryNotes,
    behaviorFlags: payload.behaviorFlags ?? [],
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

  const pet = await forTenant(tenantId).pet.create({
    data: petData,
    include: petIncludes,
  });
  return pet;
};

const updatePet = async (tenantId, petId, payload) => {
  const tenantDb = forTenant(tenantId);
  const existing = await tenantDb.pet.findFirst({ where: { id: petId } });
  if (!existing) {
    throw Object.assign(new Error('Pet not found'), { statusCode: 404 });
  }

  const data = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.breed !== undefined) data.breed = payload.breed;
  if (payload.birthdate !== undefined) {
    data.birthdate = payload.birthdate ? new Date(payload.birthdate) : null;
  }
  if (payload.photoUrl !== undefined) data.photoUrl = payload.photoUrl;
  if (payload.medicalNotes !== undefined) data.medicalNotes = payload.medicalNotes;
  if (payload.dietaryNotes !== undefined) data.dietaryNotes = payload.dietaryNotes;
  if (payload.behaviorFlags !== undefined) data.behaviorFlags = payload.behaviorFlags;

  const pet = await tenantDb.pet.update({
    where: { id: petId },
    data,
    include: petIncludes,
  });
  return pet;
};

const deletePet = async (tenantId, petId) => {
  const tenantDb = forTenant(tenantId);
  const existing = await tenantDb.pet.findFirst({ where: { id: petId } });
  if (!existing) {
    throw Object.assign(new Error('Pet not found'), { statusCode: 404 });
  }

  await tenantDb.pet.delete({ where: { id: petId } });
};

const addVaccination = async (tenantId, petId, payload) => {
  const tenantDb = forTenant(tenantId);
  const pet = await tenantDb.pet.findFirst({ where: { id: petId } });
  if (!pet) {
    throw Object.assign(new Error('Pet not found'), { statusCode: 404 });
  }

  return tenantDb.vaccination.create({
    data: {
      petId,
      type: payload.type,
      administeredAt: new Date(payload.administeredAt),
      expiresAt: new Date(payload.expiresAt),
      documentUrl: payload.documentUrl,
      notes: payload.notes,
    },
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
