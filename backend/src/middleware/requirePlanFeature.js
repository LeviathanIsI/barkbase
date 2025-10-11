const isFeatureEnabled = (features = {}, feature) => {
  if (!feature) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(features, feature)) {
    return false;
  }
  const value = features[feature];
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return true;
    }
    return value > 0;
  }
  if (typeof value === 'string') {
    return value.length > 0;
  }
  return Boolean(value);
};

const featureUpgradeError = (feature, message) =>
  Object.assign(new Error(message ?? 'Requested feature requires an upgraded BarkBase plan'), {
    statusCode: 402,
    code: 'FEATURE_UPGRADE_REQUIRED',
    meta: { feature },
  });

const requirePlanFeature = (feature, { message, predicate } = {}) => (req, _res, next) => {
  try {
    const features = req.tenantFeatures ?? {};
    if (predicate) {
      if (predicate(features, req)) {
        return next();
      }
      return next(featureUpgradeError(feature, message));
    }

    if (isFeatureEnabled(features, feature)) {
      return next();
    }

    return next(featureUpgradeError(feature, message));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  requirePlanFeature,
  featureUpgradeError,
};
