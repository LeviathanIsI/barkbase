const prisma = require('../config/prisma');
const env = require('../config/env');
const logger = require('../utils/logger');
const { resolveTenantFeatures } = require('../lib/features');
const { getDbForTenant } = require('../lib/dbRouter');
const { forTenant } = require('../lib/tenantPrisma');

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

const clearTenantCache = () => {
  cache.clear();
};

const resolveFromCache = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const saveToCache = (key, value) => {
  cache.set(key, { value, timestamp: Date.now() });
};

const resolveTenantWhere = (slug, hostHint) => {
  const slugFilter = slug ? [{ slug }] : [];
  const hostFilter = hostHint ? [{ customDomain: hostHint }] : [];

  const filters = [...slugFilter, ...hostFilter];
  if (filters.length === 0) {
    return { slug: env.tenancy.defaultSlug };
  }

  return {
    OR: filters,
  };
};

async function tenantContext(req, res, next) {
  let slug;

  try {
    slug = (req.tenantSlug ?? env.tenancy.defaultSlug).toLowerCase();
    const hostHint = req.tenantHost;

    const cacheKey = slug || hostHint || env.tenancy.defaultSlug;

    const cached = resolveFromCache(cacheKey);
    if (cached) {
      req.tenant = cached;
      req.tenantId = cached.id;
      req.tenantSlug = cached.slug;
      req.tenantPlan = cached.plan;
      req.tenantFeatures = resolveTenantFeatures(cached);
      req.tenantDb = getDbForTenant(cached);
      req.tenantScopedClient = forTenant(cached.id, req.tenantDb);
      return next();
    }

    const tenant = await prisma.tenant.findFirst({
      where: resolveTenantWhere(slug, hostHint),
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    saveToCache(cacheKey, tenant);

    req.tenant = tenant;
    req.tenantId = tenant.id;
    req.tenantSlug = tenant.slug;
    req.tenantPlan = tenant.plan;
    req.tenantFeatures = resolveTenantFeatures(tenant);
    req.tenantDb = getDbForTenant(tenant);
    req.tenantScopedClient = forTenant(tenant.id, req.tenantDb);
    return next();
  } catch (error) {
    const errorSummary = error?.message ? ` Reason: ${error.message}.` : '';
    const tenantDescriptor = slug ? ` for tenant ${slug}` : '';
    logger.error(
      `Could not establish tenant context${tenantDescriptor}.${errorSummary}`
    );
    return next(error);
  }
}

module.exports = tenantContext;
module.exports.clearCache = clearTenantCache;

