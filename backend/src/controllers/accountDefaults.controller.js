const accountDefaultsService = require('../services/accountDefaults.service');

exports.getAccountDefaults = async (req, res, next) => {
  try {
    const defaults = await accountDefaultsService.getAccountDefaults(req.tenant);
    res.json(defaults);
  } catch (error) {
    next(error);
  }
};

exports.updateAccountDefaults = async (req, res, next) => {
  try {
    const defaults = await accountDefaultsService.updateAccountDefaults(req.tenant, req.body);
    res.json(defaults);
  } catch (error) {
    next(error);
  }
};

exports.uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }
    const logo = await accountDefaultsService.saveTenantLogo(req.tenant, req.file);
    return res.json({ logo });
  } catch (error) {
    return next(error);
  }
};
