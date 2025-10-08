const membershipService = require('../services/membership.service');
const inviteService = require('../services/invite.service');

const listMembers = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const members = await membershipService.listMembers(tenantId);
    return res.json(members);
  } catch (error) {
    return next(error);
  }
};

const inviteMember = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const invite = await inviteService.createInvite({
      tenantId,
      email: req.body.email,
      role: req.body.role,
      createdById: req.user?.id,
      features: req.tenantFeatures,
    });
    return res.status(201).json(invite);
  } catch (error) {
    return next(error);
  }
};

const updateMemberRole = async (req, res, next) => {
  try {
    const updated = await membershipService.updateMemberRole(req.tenantId, req.params.membershipId, req.body.role);
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    await membershipService.removeMember(req.tenantId, req.params.membershipId, req.user?.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
};
