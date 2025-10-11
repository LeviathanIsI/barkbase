const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const env = require('../config/env');
const logger = require('../utils/logger');
const { issueAccessToken, issueRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const mailer = require('../lib/mailer');
const { resolveTenantFeatures } = require('../lib/features');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const ROLE_VALUES = ['OWNER', 'ADMIN', 'STAFF', 'READONLY'];
const RESERVED_SLUGS = new Set(['admin', 'api', 'app', 'www', 'barkbase', 'support', 'login', 'signup']);
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;

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

  if (!user.emailVerified) {
    throw Object.assign(new Error('Email verification required'), { statusCode: 403 });
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

const signup = async ({
  tenantName,
  tenantSlug,
  email,
  password,
  honeypot,
  acknowledgeSupabaseHosting,
  consentMeta = {},
}) => {
  if (honeypot) {
    throw Object.assign(new Error('Invalid submission'), { statusCode: 400 });
  }
  if (acknowledgeSupabaseHosting !== true) {
    throw Object.assign(new Error('Supabase hosting acknowledgement is required'), { statusCode: 400 });
  }
  if (!PASSWORD_PATTERN.test(password)) {
    throw Object.assign(
      new Error('Password must be at least 12 characters and include upper/lowercase, number, and symbol'),
      { statusCode: 400 },
    );
  }

  const slug = String(tenantSlug).toLowerCase();

  if (RESERVED_SLUGS.has(slug) || slug.startsWith('tenant')) {
    throw Object.assign(new Error('Tenant slug is reserved'), { statusCode: 409 });
  }

  const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
  if (existingTenant) {
    throw Object.assign(new Error('Tenant slug already in use'), { statusCode: 409 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw Object.assign(new Error('Account already exists for this email'), { statusCode: 409 });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const consentRecord = {
    agreedAt: new Date().toISOString(),
    ip: consentMeta.ip ?? null,
    appVersion: consentMeta.appVersion ?? null,
  };

  const { tenant, user } = await prisma.$transaction(async (tx) => {
    const createdTenant = await tx.tenant.create({
      data: {
        name: tenantName,
        slug,
        plan: 'FREE',
      },
    });

    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    await tx.membership.create({
      data: {
        tenantId: createdTenant.id,
        userId: createdUser.id,
        role: 'OWNER',
        localDataConsent: consentRecord,
      },
    });

    return { tenant: createdTenant, user: createdUser };
  });

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token: verificationToken,
      expiresAt,
    },
  });

  const verifyUrl = new URL('/verify-email', env.appUrl);
  verifyUrl.searchParams.set('token', verificationToken);

  let emailSent = true;
  try {
    await mailer.sendMail({
      to: email,
      subject: `Verify your BarkBase workspace: ${tenantName}`,
      text: `Welcome to BarkBase! Click the link below to verify your email and activate your workspace.\n\n${verifyUrl.toString()}\n\nThis link expires in 24 hours.`,
      html: `<p>Welcome to BarkBase!</p><p><a href="${verifyUrl.toString()}">Click here to verify your email and activate your workspace</a>.</p><p>This link expires in 24 hours.</p>`,
    });
  } catch (error) {
    emailSent = false;
    logger.warn({ error: error.message, email }, 'Failed to send verification email');
  }

  if (env.email.provider !== 'smtp' || !emailSent) {
    return verifyEmail(verificationToken);
  }

  return {
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
    },
    user: {
      id: user.id,
      email: user.email,
    },
    verification: {
      emailSent,
      expiresAt,
      token: env.nodeEnv === 'production' ? undefined : verificationToken,
    },
  };
};

async function verifyEmail(tokenValue) {
  const tokenRecord = await prisma.emailVerificationToken.findUnique({
    where: { token: tokenValue },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              tenant: true,
            },
          },
        },
      },
    },
  });

  if (!tokenRecord) {
    throw Object.assign(new Error('Verification token invalid'), { statusCode: 400 });
  }

  if (tokenRecord.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { id: tokenRecord.id } });
    throw Object.assign(new Error('Verification token expired'), { statusCode: 410 });
  }

  const user = tokenRecord.user;

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { tenant: true },
  });

  if (!membership) {
    await prisma.emailVerificationToken.delete({ where: { id: tokenRecord.id } });
    throw Object.assign(new Error('Membership not found for user'), { statusCode: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, isActive: true },
    }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }),
  ]);

  const payload = {
    sub: user.id,
    tenantId: membership.tenantId,
    membershipId: membership.id,
    role: membership.role,
  };

  const accessToken = issueAccessToken(payload);
  const refreshToken = issueRefreshToken(payload);

  await prisma.membership.update({
    where: { id: membership.id },
    data: { refreshToken },
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

  const tenant = membership.tenant;

  return {
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      featureFlags: tenant.featureFlags ?? {},
      features: resolveTenantFeatures(tenant),
      theme: tenant.themeJson ?? {},
      customDomain: tenant.customDomain ?? null,
      settings: tenant.settings ?? {},
    },
    user: sanitizeUser(refreshedUser, tenant.id),
    tokens: {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: env.tokens.accessTtlMinutes * 60,
      refreshTokenExpiresIn: env.tokens.refreshTtlDays * 24 * 60 * 60,
    },
  };
}

const revokeRefreshToken = (membershipId) =>
  prisma.membership.update({
    where: { id: membershipId },
    data: { refreshToken: null },
  });

module.exports = {
  login,
  refresh,
  register,
  signup,
  verifyEmail,
  revokeRefreshToken,
};
