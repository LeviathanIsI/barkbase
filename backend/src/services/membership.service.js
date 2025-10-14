const { forTenant } = require('../lib/tenantPrisma');

const memberSelect = { recordId: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { recordId: true,
      email: true,
      isActive: true,
      lastLoginAt: true,
    },
  },
};

const inviteSelect = { recordId: true,
  email: true,
  role: true,
  token: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
};

const listMembers = async (tenantId) => {
  const tenantDb = forTenant(tenantId);
  const [memberships, invites] = await Promise.all([
    tenantDb.membership.findMany({
      select: memberSelect,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    }),
    tenantDb.invite.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      select: inviteSelect,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    members: memberships.map((membership) => ({ recordId: membership.recordId,
      role: membership.role,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      user: membership.user,
    })),
    invites,
  };
};

const assertRoleChangeAllowed = (memberships, membershipId, nextRole) => {
  const target = memberships.find((member) => member.recordId === membershipId);
  if (!target) {
    throw Object.assign(new Error('Membership not found'), { statusCode: 404 });
  }

  const owners = memberships.filter((member) => member.role === 'OWNER');
  if (target.role === 'OWNER' && owners.length === 1 && nextRole !== 'OWNER') {
    throw Object.assign(new Error('Tenant must retain at least one owner'), { statusCode: 400 });
  }

  return target;
};

const updateMemberRole = async (tenantId, membershipId, role) => {
  const tenantDb = forTenant(tenantId);
  const members = await tenantDb.membership.findMany({ include: { user: true } });
  assertRoleChangeAllowed(members, membershipId, role);

  const updated = await tenantDb.membership.update({
    where: { recordId: membershipId },
    data: { role },
    select: memberSelect,
  });

  return { recordId: updated.recordId,
    role: updated.role,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    user: updated.user,
  };
};

const removeMember = async (tenantId, membershipId, actingUserId) => {
  const tenantDb = forTenant(tenantId);
  const memberships = await tenantDb.membership.findMany({ include: { user: true } });
  const target = assertRoleChangeAllowed(memberships, membershipId, null);

  if (target.user.recordId === actingUserId) {
    throw Object.assign(new Error('Cannot remove your own membership'), { statusCode: 400 });
  }

  await tenantDb.membership.delete({ where: { recordId: membershipId } });
};

module.exports = {
  listMembers,
  updateMemberRole,
  removeMember,
};
