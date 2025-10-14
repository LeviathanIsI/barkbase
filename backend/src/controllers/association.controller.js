const associationService = require('../services/association.service');

const listAssociations = async (req, res) => {
  const { fromObjectType, toObjectType, includeArchived } = req.query;
  const associations = await associationService.listAssociations(req.tenantId, {
    fromObjectType,
    toObjectType,
    includeArchived: includeArchived === 'true',
  });
  res.json(associations);
};

const getAssociation = async (req, res) => {
  const association = await associationService.getAssociationById(req.tenantId, req.params.recordId);
  res.json(association);
};

const createAssociation = async (req, res) => {
  const association = await associationService.createAssociation(
    req.tenantId,
    req.userId,
    req.body
  );
  res.status(201).json(association);
};

const updateAssociation = async (req, res) => {
  const association = await associationService.updateAssociation(
    req.tenantId,
    req.params.recordId,
    req.body
  );
  res.json(association);
};

const deleteAssociation = async (req, res) => {
  const result = await associationService.deleteAssociation(req.tenantId, req.params.recordId);
  res.json(result);
};

const getAssociationsForObjectPair = async (req, res) => {
  const { fromObjectType, toObjectType } = req.params;
  const associations = await associationService.getAssociationsForObjectPair(
    req.tenantId,
    fromObjectType,
    toObjectType
  );
  res.json(associations);
};

const seedSystemAssociations = async (req, res) => {
  await associationService.seedSystemAssociations(req.tenantId);
  res.json({ success: true, message: 'System associations seeded' });
};

module.exports = {
  listAssociations,
  getAssociation,
  createAssociation,
  updateAssociation,
  deleteAssociation,
  getAssociationsForObjectPair,
  seedSystemAssociations,
};
