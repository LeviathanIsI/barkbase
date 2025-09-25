const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const env = require('../config/env');
const { issueAccessToken, issueRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const ROLE_VALUES = ['OWNER', 'ADMIN', 'STAFF', 'READONLY'];

const normalizeRole = (role = 'STAFF') => {
  const upper = String(role).toUpperCase();
  if (!ROLE_VALUES.includes(upper)) {
    throw Object.assign(new Error(`Unsupported role ${role}`), { statusCode: 400 });
  }
  return upper;
};

const sanitizeMembership = (membership) => ({
  id: membership.id,
  tenantId: membership.tenantId,
  role: membership.role,
  tenant: membership.tenant
    ? {
        id: membership.tenant.id,
        slug: membership.tenant.slug,
        name: membership.tenant.name,
        plan: membership.tenant.plan,
      }
    : undefined,
});

const sanitizeUser = (user, tenantId) => {
  const memberships = (user.memberships ?? []).map(sanitizeMembership);
  const current = memberships.find((membership) => membership.tenantId === tenantId) ?? null;
  return {
    id: user.id,
    email: user.email,
    memberships,
    tenantId: current?.tenantId ?? null,
    role: current?.role ?? null,
  };
};

const login = async (tenant, email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  if (user.isActive === false) {
    throw Object.assign(new Error('Account disabled'), { statusCode: 403 });
  }

  const membership = user.memberships.find((entry) => entry.tenantId === tenant.id);
  if (!membership) {
    throw Object.assign(new Error('Membership required for tenant'), { statusCode: 403 });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const payload = {
    sub: user.id,
    tenantId: tenant.id,
    membershipId: membership.id,
    role: membership.role,
  };

  const accessToken = issueAccessToken(payload);
  const refreshToken = issueRefreshToken(payload);

  await prisma.$transaction([
    prisma.membership.update({
      where: { id: membership.id },
      data: { refreshToken },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
  ]);

  return {
    user: sanitizeUser(user, tenant.id),
    tokens: {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: env.tokens.accessTtlMinutes * 60,
      refreshTokenExpiresIn: env.tokens.refreshTtlDays * 24 * 60 * 60,
    },
  };
};

const refresh = async (tenantId, token) => {
  const payload = verifyRefreshToken(token);

  if (payload.tenantId !== tenantId) {
    throw Object.assign(new Error('Tenant mismatch'), { statusCode: 403 });
  }

  const membership = await prisma.membership.findFirst({
    where: {
      id: payload.membershipId,
      tenantId,
      userId: payload.sub,
    },
    include: {
      user: true,
    },
  });

  if (!membership || membership.refreshToken !== token) {
    throw Object.assign(new Error('Refresh token invalid'), { statusCode: 401 });
  }

  const accessToken = issueAccessToken({
    sub: payload.sub,
    tenantId,
    membershipId: membership.id,
    role: membership.role,
  });

  return {
    accessToken,
    role: membership.role,
  };
};

const register = async (tenantId, data) => {
  const role = normalizeRole(data.role ?? data.roles?.[0] ?? 'STAFF');

  let user = await prisma.user.findUnique({
    where: { email: data.email },
    include: { memberships: true },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
      },
      include: { memberships: true },
    });
  }

  const existingMembership = user.memberships.find((membership) => membership.tenantId === tenantId);
  if (existingMembership) {
    throw Object.assign(new Error('User already belongs to tenant'), { statusCode: 409 });
  }

  await prisma.membership.create({
    data: {
      tenantId,
      userId: user.id,
      role,
    },
  });

  const refreshedUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      memberships: {
        include: {
          tenant: true,
        },
      },
    },
  });

  return sanitizeUser(refreshedUser, tenantId);
};

const revokeRefreshToken = (membershipId) =>
  prisma.membership.update({
    where: { id: membershipId },
    data: { refreshToken: null },
  });

module.exports = {
  login,
  refresh,
  register,
  revokeRefreshToken,
};
