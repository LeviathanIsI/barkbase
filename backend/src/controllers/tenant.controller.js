const tenantService = require('../services/tenant.service');
const { featureUpgradeError } = require('../middleware/requirePlanFeature');

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

const exportData = async (req, res, next) => {
  try {
    const { filePath, filename } = await tenantService.getTenantExport(req.tenantId);
    if (!filePath) {
      return res.status(204).send();
    }
    return res.download(filePath, filename, (error) => {
      if (error) {
        return next(error);
      }
      return undefined;
    });
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
    if (!req.tenantFeatures?.themeEditor) {
      throw featureUpgradeError('themeEditor', 'Custom theming is available on BarkBase Pro and above.');
    }
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
  exportData,
};
