const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { addDays } = require('date-fns');
const prisma = require('../config/prisma');
const { forTenant } = require('../lib/tenantPrisma');
const { resolveTenantFeatures } = require('../lib/features');
const { assertSeatAndInviteCapacity } = require('./usage.service');

const INVITE_EXPIRY_DAYS = 7;

const sanitizeInvite = (invite) => ({
  id: invite.id,
  email: invite.email,
  role: invite.role,
  token: invite.token,
  expiresAt: invite.expiresAt,
  acceptedAt: invite.acceptedAt,
  createdAt: invite.createdAt,
});

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const loadPlanFeatures = async (tenantId, features) => {
  if (features) {
    return features;
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      featureFlags: true,
    },
  });
  if (!tenant) {
    throw Object.assign(new Error('Tenant not found'), { statusCode: 404 });
  }
  return resolveTenantFeatures(tenant);
};

const ensureNotMember = async (tenantId, email, client = prisma) => {
  const existing = await client.membership.findFirst({
    where: {
      tenantId,
      user: {
        email,
      },
    },
  });

  if (existing) {
    throw Object.assign(new Error('User already belongs to tenant'), { statusCode: 409 });
  }
};

const createInvite = async ({ tenantId, email, role, createdById, features }) => {
  const normalizedEmail = normalizeEmail(email);
  const planFeatures = await loadPlanFeatures(tenantId, features);

  return prisma.$transaction(async (tx) => {
    const existingPending = await tx.invite.findFirst({
      where: {
        tenantId,
        email: normalizedEmail,
        acceptedAt: null,
      },
    });

    const seatsToAdd = existingPending ? 0 : 1;
    const invitesToAdd = existingPending ? 0 : 1;

    await assertSeatAndInviteCapacity({
      tenantId,
      features: planFeatures,
      tx,
      seatsToAdd,
      invitesToAdd,
    });

    await ensureNotMember(tenantId, normalizedEmail, tx);

    const token = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = addDays(new Date(), INVITE_EXPIRY_DAYS);

    if (existingPending) {
      await tx.invite.delete({ where: { id: existingPending.id } });
    } else {
      await tx.invite.deleteMany({
        where: {
          tenantId,
          email: normalizedEmail,
          acceptedAt: null,
        },
      });
    }

    const invite = await tx.invite.create({
      data: {
        tenantId,
        email: normalizedEmail,
        role,
        token,
        expiresAt,
        createdById,
      },
    });

    return sanitizeInvite(invite);
  });
};

const acceptInvite = async (token, { password }) => {
  if (!password || password.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters'), { statusCode: 400 });
  }

  const invite = await prisma.invite.findUnique({
    where: { token },
  });

  if (!invite) {
    throw Object.assign(new Error('Invite not found'), { statusCode: 404 });
  }

  if (invite.acceptedAt) {
    throw Object.assign(new Error('Invite already accepted'), { statusCode: 409 });
  }

  if (invite.expiresAt <= new Date()) {
    throw Object.assign(new Error('Invite expired'), { statusCode: 410 });
  }

  const normalizedEmail = normalizeEmail(invite.email);
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS ?? 12));
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
    });
  } else if (!user.passwordHash) {
    const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS ?? 12));
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  }

  await ensureNotMember(invite.tenantId, normalizedEmail);

  const tenantDb = forTenant(invite.tenantId);

  const acceptedAt = new Date();

  await prisma.$transaction([
    tenantDb.membership.create({
      data: {
        userId: user.id,
        role: invite.role,
      },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt },
    }),
  ]);

  return sanitizeInvite({ ...invite, acceptedAt });
};

const revokeInvite = (inviteId) =>
  prisma.invite.delete({
    where: { id: inviteId },
  });

module.exports = {
  createInvite,
  acceptInvite,
  revokeInvite,
};
