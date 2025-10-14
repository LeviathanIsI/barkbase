const ownerService = require('../services/owner.service');

const listOwners = async (req, res) => {
  const result = await ownerService.listOwners(req.tenantId, req.query);
  res.json(result);
};

const getOwner = async (req, res) => {
  const owner = await ownerService.getOwnerById(req.tenantId, req.params.recordId);
  res.json(owner);
};

const createOwner = async (req, res) => {
  const owner = await ownerService.createOwner(req.tenantId, req.body);
  res.status(201).json(owner);
};

const updateOwner = async (req, res) => {
  const owner = await ownerService.updateOwner(req.tenantId, req.params.recordId, req.body);
  res.json(owner);
};

const deleteOwner = async (req, res) => {
  const result = await ownerService.deleteOwner(req.tenantId, req.params.recordId);
  res.json(result);
};

const getOwnerPets = async (req, res) => {
  const pets = await ownerService.getOwnerPets(req.tenantId, req.params.recordId);
  res.json(pets);
};

const addPetToOwner = async (req, res) => {
  const result = await ownerService.addPetToOwner(
    req.tenantId,
    req.params.recordId,
    req.body.petId,
    req.body.isPrimary
  );
  res.json(result);
};

const removePetFromOwner = async (req, res) => {
  const result = await ownerService.removePetFromOwner(
    req.tenantId,
    req.params.recordId,
    req.params.petId
  );
  res.json(result);
};

module.exports = {
  listOwners,
  getOwner,
  createOwner,
  updateOwner,
  deleteOwner,
  getOwnerPets,
  addPetToOwner,
  removePetFromOwner,
};
