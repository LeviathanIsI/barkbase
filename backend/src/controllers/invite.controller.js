const inviteService = require('../services/invite.service');

const acceptInvite = async (req, res, next) => {
  try {
    const accepted = await inviteService.acceptInvite(req.params.token, req.body ?? {});
    return res.json({ invite: accepted, message: 'Invite accepted' });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  acceptInvite,
};
