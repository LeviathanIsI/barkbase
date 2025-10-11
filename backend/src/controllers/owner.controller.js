const ownerService = require('../services/owner.service');

const listOwners = async (req, res) => {
  const result = await ownerService.listOwners(req.tenantId, req.query);
  res.json(result);
};

const getOwner = async (req, res) => {
  const owner = await ownerService.getOwnerById(req.tenantId, req.params.id);
  res.json(owner);
};

const createOwner = async (req, res) => {
  const owner = await ownerService.createOwner(req.tenantId, req.body);
  res.status(201).json(owner);
};

const updateOwner = async (req, res) => {
  const owner = await ownerService.updateOwner(req.tenantId, req.params.id, req.body);
  res.json(owner);
};

const deleteOwner = async (req, res) => {
  const result = await ownerService.deleteOwner(req.tenantId, req.params.id);
  res.json(result);
};

const getOwnerPets = async (req, res) => {
  const pets = await ownerService.getOwnerPets(req.tenantId, req.params.id);
  res.json(pets);
};

module.exports = {
  listOwners,
  getOwner,
  createOwner,
  updateOwner,
  deleteOwner,
  getOwnerPets,
};
