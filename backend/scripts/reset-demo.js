/*
  Reset demo data for tenants: barkbase, acme, globex
  - Deletes only those tenants and their related rows (via FK cascade)
  - Also removes uploads directories for those tenants if present
*/

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const { PrismaClient } = require('@prisma/client');

const DEFAULT_DB_NAME = process.env.SUPABASE_DB_NAME || 'postgres';
const DEFAULT_SSL_MODE = process.env.SUPABASE_SSLMODE || 'require';
const expandTemplate = (raw) => {
  if (!raw) return raw;
  return raw.replace(/\$\{([^}]+)\}/g, (_, key) => {
    if (key === 'SUPABASE_DB_NAME') return DEFAULT_DB_NAME;
    if (key === 'SUPABASE_SSLMODE') return DEFAULT_SSL_MODE;
    return process.env[key] ?? '';
  });
};

const resolvedUrl = expandTemplate(process.env.DATABASE_URL || process.env.DEV_DATABASE_URL);
if (resolvedUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolvedUrl;
}

const DEMO_SLUGS = ['barkbase', 'acme', 'globex'];

const prisma = new PrismaClient();

async function removeUploads(slugs) {
  const root = path.resolve(process.cwd(), process.env.UPLOADS_ROOT || './uploads');
  for (const slug of slugs) {
    const dir = path.join(root, 'tenants', slug);
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        // eslint-disable-next-line no-console
        console.log(`Removed uploads for tenant ${slug}`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to remove uploads for ${slug}: ${err.message}`);
      }
    }
  }
}

async function resetDemo() {
  // Find tenants first
  const tenants = await prisma.tenant.findMany({ where: { slug: { in: DEMO_SLUGS } } });
  if (tenants.length === 0) {
    // eslint-disable-next-line no-console
    console.log('No demo tenants found. Nothing to reset.');
    return;
  }

  const ids = tenants.map((t) => t.recordId);

  // Delete tenants (FK onDelete: Cascade should clean children)
  const result = await prisma.tenant.deleteMany({ where: { recordId: { in: ids } } });
  // eslint-disable-next-line no-console
  console.log(`Deleted ${result.count} demo tenants`);

  // Remove uploads for these slugs
  await removeUploads(tenants.map((t) => t.slug));

  // Also remove seed users created with demo domains to avoid unique email conflicts on reseed
  const usersDeleted = await prisma.user.deleteMany({ where: { email: { endsWith: '.demo' } } });
  // eslint-disable-next-line no-console
  console.log(`Deleted ${usersDeleted.count} demo users`);
}

resetDemo()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error('Reset demo failed:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  });


