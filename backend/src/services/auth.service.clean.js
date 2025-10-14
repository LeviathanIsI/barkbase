const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { issueAccessToken, issueRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { resolveTenantFeatures } = require('../lib/features');
const mailer = require('../lib/mailer');
const env = require('../config/env');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
const RESERVED_SLUGS = new Set(['api', 'www', 'admin', 'app', 'mail', 'ftp', 'localhost', 'staging', 'test', 'dev']);

const normalizeRole = (role) => {
  const upper = String(role).toUpperCase();
  if (!['OWNER', 'ADMIN', 'STAFF'].includes(upper)) {
    throw Object.assign(new Error(`Unsupported role ${role}`), { statusCode: 400 });
  }
  return upper;
};

const sanitizeMembership = (membership) => ({
  recordId: membership.recordId,
  tenantId: membership.tenantId,
  role: membership.role,
  tenant: membership.tenant
    ? {
        recordId: membership.tenant.recordId,
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
    recordId: user.recordId,
    email: user.email,
    memberships,
    tenantId: current?.tenantId ?? null,
    role: current?.role ?? null,
  };
};

/**
 * Enterprise login function - delegates to enterprise auth service
 */
const login = async (tenant, email, password) => {
  const enterpriseAuth = require('./enterprise-auth.service');
  return await enterpriseAuth.login(tenant, email, password);
};

const refresh = async (tenantId, token) => {
  const payload = verifyRefreshToken(token);

  const membership = await prisma.$transaction(async (tx) => {
    // Set tenant context for RLS
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    
    return await tx.membership.findFirst({
      where: {
        recordId: payload.membershipId,
        tenantId,
        userId: payload.sub,
      },
      include: {
        user: true,
      },
    });
  });

  if (!membership || membership.refreshToken !== token) {
    throw Object.assign(new Error('Refresh token invalid'), { statusCode: 401 });
  }

  const accessToken = issueAccessToken({
    sub: payload.sub,
    tenantId,
    membershipId: membership.recordId,
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

  await prisma.$transaction(async (tx) => {
    // Set tenant GUC so Membership RLS policy allows the insert via SECURITY DEFINER helper
    await tx.$executeRaw`select app.set_tenant_id(${tenantId})`;
    
    // Use enterprise auth service to create membership
    const enterpriseAuth = require('./enterprise-auth.service');
    await enterpriseAuth.createMembership(tenantId, user.recordId, role);
  });

  const refreshedUser = await prisma.user.findUnique({
    where: { recordId: user.recordId },
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

  const { tenant, user } = await prisma.$transaction(async (tx) => {
    const createdTenant = await tx.tenant.create({
      data: {
        slug,
        name: tenantName,
      },
    });

    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    // Set tenant GUC so Membership RLS policy allows the insert via SECURITY DEFINER helper
    await tx.$executeRaw`select app.set_tenant_id(${createdTenant.recordId})`;

    // Use enterprise auth service to create membership
    const enterpriseAuth = require('./enterprise-auth.service');
    await enterpriseAuth.createMembership(createdTenant.recordId, createdUser.recordId, 'OWNER');

    return { tenant: createdTenant, user: createdUser };
  });

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.recordId,
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
      recordId: tenant.recordId,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
    },
    user: {
      recordId: user.recordId,
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
      user: true,
    },
  });

  if (!tokenRecord) {
    throw Object.assign(new Error('Verification token invalid'), { statusCode: 400 });
  }

  if (tokenRecord.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { recordId: tokenRecord.recordId } });
    throw Object.assign(new Error('Verification token expired'), { statusCode: 410 });
  }

  const user = tokenRecord.user;

  // Use enterprise auth service to get memberships
  const enterpriseAuth = require('./enterprise-auth.service');
  const userWithMemberships = await enterpriseAuth.getUserWithMemberships(user.email);

  if (!userWithMemberships || userWithMemberships.memberships.length === 0) {
    await prisma.emailVerificationToken.delete({ where: { recordId: tokenRecord.recordId } });
    throw Object.assign(new Error('Membership not found for user'), { statusCode: 400 });
  }

  const membership = userWithMemberships.memberships[0];
  const tenant = membership.tenant;

  await prisma.$transaction(async (tx) => {
    // Set tenant GUC for any RLS-protected operations via SECURITY DEFINER helper
    await tx.$executeRaw`select app.set_tenant_id(${membership.tenantId})`;
    
    await tx.user.update({
      where: { recordId: user.recordId },
      data: { emailVerified: true, isActive: true },
    });
    
    await tx.emailVerificationToken.deleteMany({ where: { userId: user.recordId } });
  });

  const payload = {
    sub: user.recordId,
    tenantId: membership.tenantId,
    membershipId: membership.recordId,
    role: membership.role,
  };

  const accessToken = issueAccessToken(payload);
  const refreshToken = issueRefreshToken(payload);

  // Use enterprise auth service to update refresh token
  await enterpriseAuth.updateMembershipRefreshToken(membership.recordId, membership.tenantId, refreshToken);

  return {
    tenant: {
      recordId: tenant.recordId,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      featureFlags: tenant.featureFlags ?? {},
      features: resolveTenantFeatures(tenant),
      theme: tenant.themeJson ?? {},
      customDomain: tenant.customDomain ?? null,
      settings: tenant.settings ?? {},
    },
    user: sanitizeUser(userWithMemberships, tenant.recordId),
    tokens: {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: env.tokens.accessTtlMinutes * 60,
      refreshTokenExpiresIn: env.tokens.refreshTtlDays * 24 * 60 * 60,
    },
  };
}

module.exports = {
  login,
  refresh,
  register,
  signup,
  verifyEmail,
};

