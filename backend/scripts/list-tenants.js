const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

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

console.log('DATABASE_URL being used:', resolvedUrl);

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listTenants() {
  try {
    console.log('Fetching all tenants from database...\n');
    
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        plan: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (tenants.length === 0) {
      console.log('No tenants found in database.');
    } else {
      console.log(`Found ${tenants.length} tenant(s):\n`);
      tenants.forEach((tenant, index) => {
        console.log(`${index + 1}. Slug: "${tenant.slug}"`);
        console.log(`   Name: ${tenant.name}`);
        console.log(`   Plan: ${tenant.plan}`);
        console.log(`   ID: ${tenant.id}`);
        console.log(`   Created: ${tenant.createdAt}`);
        console.log('');
      });
    }

    // Also check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    console.log(`\nFound ${users.length} user(s):\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Verified: ${user.emailVerified}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error fetching tenants:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listTenants();

