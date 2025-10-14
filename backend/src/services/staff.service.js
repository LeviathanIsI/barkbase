const prisma = require('../config/prisma');
const { forTenant } = require('../lib/tenantPrisma');

const staffInclude = {
  membership: {
    include: {
      user: {
        select: { recordId: true,
          email: true,
          isActive: true,
          lastLoginAt: true,
        },
      },
    },
  },
};

const mapStaffMember = (staff) => ({ recordId: staff.recordId,
  title: staff.title,
  phone: staff.phone,
  role: staff.membership.role,
  user: staff.membership.user,
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt,
});

const listStaff = async (tenantId) => {
  const tenantDb = forTenant(tenantId);
  const records = await tenantDb.staff.findMany({
    include: staffInclude,
    orderBy: { createdAt: 'desc' },
  });

  return records.map(mapStaffMember);
};

const setStaffStatus = async (tenantId, staffId, isActive) => {
  const tenantDb = forTenant(tenantId);
  const staff = await tenantDb.staff.findFirst({
    where: { recordId: staffId },
    include: staffInclude,
  });

  if (!staff) {
    throw Object.assign(new Error('Staff member not found'), { statusCode: 404 });
  }

  await prisma.user.update({
    where: { recordId: staff.membership.user.recordId },
    data: { isActive },
  });

  const refreshed = await tenantDb.staff.findFirst({
    where: { recordId: staffId },
    include: staffInclude,
  });

  return mapStaffMember(refreshed ?? staff);
};

module.exports = {
  listStaff,
  setStaffStatus,
};
