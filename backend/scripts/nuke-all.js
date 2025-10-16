/*
  Nuke ALL data from the database (development only).
  - Disables RLS per table (best-effort)
  - Truncates tables with CASCADE (fallback to DELETE if TRUNCATE not permitted)
  - Safe to run repeatedly
*/

const path = require('path');
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

const prisma = new PrismaClient();

// Known application tables (superset; missing ones are ignored gracefully)
const tables = [
  // Workflow/handlers
  'handler_variables', 'handler_jobs', 'handler_run_logs', 'handler_runs', 'handler_steps', 'handler_triggers', 'handler_flows',
  // Messaging/notifications
  'BookingNotification', 'NotificationQueue', 'PushSubscription', 'messages',
  // CRM/Segments/Tags/Campaigns
  'CustomerSegmentMember', 'CustomerSegment', 'CustomerTagMember', 'CustomerTag', 'Communication', 'Note', 'Campaign',
  // Financials
  'FinancialTransaction', 'PackageUsage', 'Package', 'Invoice', 'Payment',
  // Ops/Audit
  'EnhancedAuditLog', 'AuditLog', 'IdempotencyKey',
  // Legal/Templates
  'SignedWaiver', 'Waiver', 'MessageTemplate',
  // Support
  'SupportMessage', 'SupportTicket',
  // Integrations/Sync
  'SyncError', 'Integration',
  // Core domain
  'BookingService', 'BookingSegment', 'Booking', 'Vaccination', 'RunAssignment', 'runs', 'Service', 'Kennel',
  'PetOwner', 'Pet', 'Owner', 'Task', 'UsageCounter', 'ActivityFeed',
  // Permissions
  'UserRole', 'UserPermission', 'PermissionSet', 'CustomRole',
  // Staff/Users/Tenants
  'Staff', 'Membership', 'EmailVerificationToken', 'User', 'Tenant',
];

async function disableRls(table) {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
  } catch (_) {
    // ignore if table not found or lacks RLS
  }
}

async function truncateTable(table) {
  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
    return true;
  } catch (_) {
    return false;
  }
}

async function deleteAll(table) {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  } catch (_) {
    // ignore
  }
}

async function nuke() {
  console.log('🚨 Nuking ALL data (development only)');

  // Best-effort: disable RLS and truncate/delete
  for (const table of tables) {
    await disableRls(table);
  }

  for (const table of tables) {
    const ok = await truncateTable(table);
    if (!ok) {
      await deleteAll(table);
    }
  }

  console.log('✅ Nuke complete');
}

nuke()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('❌ Nuke failed:', err?.message || err);
    await prisma.$disconnect();
    process.exit(1);
  });


