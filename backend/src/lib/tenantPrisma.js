const prisma = require('../config/prisma');

const clone = (value) => (value && typeof value === 'object' ? { ...value } : value);

const expandUniqueWhere = (where = {}) => {
  if (!where || typeof where !== 'object') {
    return where;
  }

  return Object.entries(where).reduce((acc, [key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const scopeFilter = (tenantId, where) => {
  if (!where || typeof where !== 'object' || Array.isArray(where)) {
    return { tenantId };
  }

  if (where.tenantId && where.tenantId !== tenantId) {
    throw Object.assign(new Error('Cross-tenant access denied'), { statusCode: 403 });
  }

  if (where.tenantId) {
    return where;
  }

  return { ...where, tenantId };
};

const ensureTenantData = (tenantId, data, inject = false) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data;
  }

  if (data.tenantId && data.tenantId !== tenantId) {
    throw Object.assign(new Error('Cross-tenant write attempted'), { statusCode: 403 });
  }

  if (data.tenantId) {
    return data;
  }

  if (!inject) {
    return data;
  }

  return { ...data, tenantId };
};

const guardUniqueOperation = async (method, tenantId, modelName, client, args = {}) => {
  const where = scopeFilter(tenantId, expandUniqueWhere(args.where ?? {}));
  const existing = await client[modelName].findFirst({ where });
  if (!existing) {
    throw Object.assign(new Error(`${modelName} not found`), { statusCode: 404 });
  }

  if (method === 'delete') {
    return client[modelName].delete({ ...args });
  }

  if (method === 'update') {
    return client[modelName].update({
      ...args,
      data: ensureTenantData(tenantId, args.data, false),
    });
  }

  if (method === 'upsert') {
    return client[modelName].upsert({
      ...args,
      create: ensureTenantData(tenantId, args.create, true),
      update: ensureTenantData(tenantId, args.update, false),
    });
  }

  return client[modelName][method](args);
};

const wrapDelegate = (tenantId, modelName, client) => {
  const delegate = client[modelName];
  if (!delegate) {
    throw new Error(`Model ${modelName} not found on Prisma client`);
  }

  return new Proxy(delegate, {
    get(target, property) {
      if (typeof target[property] !== 'function') {
        return target[property];
      }

      return (args = {}) => {
        switch (property) {
          case 'findMany':
          case 'count':
          case 'aggregate':
          case 'deleteMany':
          case 'updateMany':
            return target[property]({
              ...args,
              where: scopeFilter(tenantId, args.where),
            });
          case 'groupBy': {
            const groupArgs = { ...args };
            groupArgs.where = scopeFilter(tenantId, args.where);
            if (groupArgs.having) {
              groupArgs.having = scopeFilter(tenantId, groupArgs.having);
            }
            return target[property](groupArgs);
          }
          case 'findFirst':
            return target.findFirst({
              ...args,
              where: scopeFilter(tenantId, args.where),
            });
          case 'findUnique':
            return target.findFirst({
              ...args,
              where: scopeFilter(tenantId, expandUniqueWhere(args.where ?? {})),
            });
          case 'create':
            return target.create({
              ...args,
              data: ensureTenantData(tenantId, args.data, true),
            });
          case 'createMany': {
            if (Array.isArray(args.data)) {
              return target.createMany({
                ...args,
                data: args.data.map((item) => ensureTenantData(tenantId, item, true)),
              });
            }
            return target.createMany({
              ...args,
              data: ensureTenantData(tenantId, args.data, true),
            });
          }
          case 'update':
          case 'delete':
          case 'upsert':
            return guardUniqueOperation(property, tenantId, modelName, client, args);
          default:
            return target[property](clone(args));
        }
      };
    },
  });
};

const forTenant = (tenantId, client = prisma) => {
  if (!tenantId) {
    throw new Error('tenantId is required for scoped Prisma access');
  }

  return new Proxy(
    {},
    {
      get(_target, modelName) {
        if (modelName === '$client') {
          return client;
        }
        if (modelName === '$withTenantGuc') {
          return async (fn) =>
            client.$transaction(async (tx) => {
              await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;
              return fn(tx);
            });
        }
        return wrapDelegate(tenantId, modelName, client);
      },
    },
  );
};

module.exports = {
  forTenant,
};
