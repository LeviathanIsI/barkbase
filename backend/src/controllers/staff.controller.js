const staffService = require('../services/staff.service');

const list = async (req, res, next) => {
  try {
    const staff = await staffService.listStaff(req.tenantId);
    return res.json(staff);
  } catch (error) {
    return next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const updated = await staffService.setStaffStatus(
      req.tenantId,
      req.params.staffId,
      req.body.isActive,
    );
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  list,
  updateStatus,
};
