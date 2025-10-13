const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');

// Resolve DATABASE_URL the same way the app does
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

const prisma = new PrismaClient();

async function nukeAllData() {
  try {
    console.log('🚨 NUKING ALL DATA FROM DATABASE...\n');

    // Disable RLS temporarily
    console.log('Disabling RLS...');
    await prisma.$executeRaw`ALTER TABLE "Tenant" DISABLE ROW LEVEL SECURITY`;
    await prisma.$executeRaw`ALTER TABLE "User" DISABLE ROW LEVEL SECURITY`;
    await prisma.$executeRaw`ALTER TABLE "Membership" DISABLE ROW LEVEL SECURITY`;
    await prisma.$executeRaw`ALTER TABLE "EmailVerificationToken" DISABLE ROW LEVEL SECURITY`;

    // Delete all data in correct order (respecting foreign keys)
    console.log('\nDeleting data...');
    
    const deletedMemberships = await prisma.membership.deleteMany();
    console.log(`✓ Deleted ${deletedMemberships.count} memberships`);

    const deletedTokens = await prisma.emailVerificationToken.deleteMany();
    console.log(`✓ Deleted ${deletedTokens.count} email verification tokens`);

    const deletedUsers = await prisma.user.deleteMany();
    console.log(`✓ Deleted ${deletedUsers.count} users`);

    const deletedTenants = await prisma.tenant.deleteMany();
    console.log(`✓ Deleted ${deletedTenants.count} tenants`);

    // Verify
    console.log('\nVerifying deletion...');
    const tenantCount = await prisma.tenant.count();
    const userCount = await prisma.user.count();
    console.log(`Tenants remaining: ${tenantCount}`);
    console.log(`Users remaining: ${userCount}`);

    if (tenantCount === 0 && userCount === 0) {
      console.log('\n✅ All data successfully nuked! Database is clean.');
    } else {
      console.log('\n⚠️  Some data still remains.');
    }
  } catch (error) {
    console.error('\n❌ Error nuking data:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

nukeAllData();

