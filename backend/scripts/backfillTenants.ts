import { PrismaClient, Role, TenantPlan } from '../generated/prisma';

const prisma = new PrismaClient();

const DEFAULT_SLUG = process.env.TENANT_DEFAULT_SLUG ?? 'default';
const DEFAULT_NAME = process.env.TENANT_DEFAULT_NAME ?? 'Default Tenant';

async function ensureDefaultTenant() {
  let tenant = await prisma.tenant.findUnique({ where: { slug: DEFAULT_SLUG } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        slug: DEFAULT_SLUG,
        name: DEFAULT_NAME,
        plan: TenantPlan.FREE,
        featureFlags: {},
        settings: {},
      },
    });
    console.log(`Created tenant \"${tenant.name}\" (${tenant.slug}).`);
  } else {
    console.log(`Tenant \"${tenant.name}\" (${tenant.slug}) already exists.`);
  }
  return tenant;
}

async function ensureMemberships(tenantId: string) {
  const users = await prisma.user.findMany({
    include: { memberships: true },
    orderBy: { createdAt: 'asc' },
  });

  if (users.length === 0) {
    console.log('No users found to backfill memberships for.');
    return;
  }

  let index = 0;
  for (const user of users) {
    const hasMembership = user.memberships.some((membership) => membership.tenantId === tenantId);
    if (hasMembership) {
      continue;
    }

    const role = index === 0 ? Role.ADMIN : Role.STAFF;
    await prisma.membership.create({
      data: {
        tenantId,
        userId: user.id,
        role,
      },
    });
    console.log(`Linked user ${user.email} to tenant as ${role}.`);
    index += 1;
  }
}

async function backfillTenantIds(tenantId: string) {
  const tables: Array<{ label: string; table: string }> = [
    { label: 'owners', table: 'Owner' },
    { label: 'pets', table: 'Pet' },
    { label: 'pet owners', table: 'PetOwner' },
    { label: 'kennels', table: 'Kennel' },
    { label: 'bookings', table: 'Booking' },
    { label: 'booking segments', table: 'BookingSegment' },
    { label: 'booking services', table: 'BookingService' },
    { label: 'services', table: 'Service' },
    { label: 'payments', table: 'Payment' },
    { label: 'staff profiles', table: 'Staff' },
    { label: 'vaccinations', table: 'Vaccination' },
  ];

  for (const { label, table } of tables) {
    try {
      const updated = await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET "tenantId" = ? WHERE COALESCE("tenantId", '') = ''`,
        tenantId,
      );
      if (updated > 0) {
        console.log(`Updated ${updated} ${label} to tenant ${tenantId}.`);
      }
    } catch (error) {
      console.warn(`Unable to backfill ${label}:`, error);
    }
  }
}

async function main() {
  const tenant = await ensureDefaultTenant();
  await ensureMemberships(tenant.id);
  await backfillTenantIds(tenant.id);
  console.log('Tenant backfill complete.');
}

main()
  .catch((error) => {
    console.error('Backfill failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
