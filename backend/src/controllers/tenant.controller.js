const tenantService = require('../services/tenant.service');

const current = async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenant(req.tenantId);
    return res.json(tenant);
  } catch (error) {
    return next(error);
  }
};

const plan = async (req, res, next) => {
  try {
    const payload = await tenantService.getTenantPlan(req.tenantId);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

const onboarding = async (req, res, next) => {
  try {
    const payload = await tenantService.getOnboardingStatus(req.tenantId);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

const updateTheme = async (req, res, next) => {
  try {
    const tenant = await tenantService.updateTheme(req.tenantId, req.body);
    return res.json(tenant);
  } catch (error) {
    return next(error);
  }
};

const updateFeatureFlags = async (req, res, next) => {
  try {
    const tenant = await tenantService.updateFeatureFlags(req.tenantId, req.body);
    return res.json(tenant);
  } catch (error) {
    return next(error);
  }
};

const updateOnboarding = async (req, res, next) => {
  try {
    const payload = await tenantService.updateOnboardingStatus(req.tenantId, req.body);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  current,
  plan,
  onboarding,
  updateTheme,
  updateFeatureFlags,
  updateOnboarding,
};
