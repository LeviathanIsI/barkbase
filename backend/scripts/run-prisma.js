#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { getDatabaseUrl } = require('../src/config/databaseUrl');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// Basic template expansion for DIRECT/SHADOW URLs (e.g., ${SUPABASE_DB_NAME})
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
// Ensure DATABASE_URL is resolved consistently with runtime behavior
try {
  const resolved = getDatabaseUrl();
  process.env.DATABASE_URL = resolved;
  // Ensure migrations use the direct connection (5432) by default in dev
  const directCandidate = process.env.DIRECT_URL || process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
  process.env.DIRECT_URL = expandTemplate(directCandidate);
  if (process.env.SHADOW_DATABASE_URL) {
    process.env.SHADOW_DATABASE_URL = expandTemplate(process.env.SHADOW_DATABASE_URL);
  }
} catch (_) {
  // leave as-is; prisma will error with a clear message
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/run-prisma.js <command> [args...]');
  process.exit(1);
}

const [command, ...rest] = args;

const inferProvider = () => {
  const providerEnv = process.env.DATABASE_PROVIDER?.toLowerCase();
  if (providerEnv === 'postgresql' || providerEnv === 'postgres') {
    return 'postgresql';
  }

  const url = process.env.DATABASE_URL ?? '';
  if (url.startsWith('postgres')) {
    return 'postgresql';
  }

  return 'sqlite';
};

const provider = inferProvider();
const schemaPath = provider === 'postgresql'
  ? path.resolve(process.cwd(), 'prisma', 'schema.postgres.prisma')
  : path.resolve(process.cwd(), 'prisma', 'schema.prisma');

const storageRoot = path.resolve(process.cwd(), process.env.UPLOADS_ROOT ?? './uploads');
const backupTenantSlug = process.env.TENANT_DEFAULT_SLUG || 'system';
const backupRoot = path.join(storageRoot, 'tenants', backupTenantSlug, 'backups');

const shouldCreateBackup = () => {
  // Only backup for 'migrate deploy' and 'migrate dev'
  // Skip 'db push' as it's for development and may fail with restricted roles
  if (command === 'migrate') return true;
  if (command === 'db' && rest[0] === 'push') return false;
  return command === 'db';
};

const backupSqlite = () => {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('file:')) {
    return;
  }

  const relativePath = url.replace('file:', '').split('?')[0];
  const dbPath = path.resolve(process.cwd(), relativePath.startsWith('./') ? relativePath.slice(2) : relativePath);

  if (!fs.existsSync(dbPath)) {
    return;
  }

  fs.mkdirSync(backupRoot, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.basename(dbPath, path.extname(dbPath));
  const backupPath = path.join(backupRoot, `${base}-before-${command}-${timestamp}.db`);

  try {
    fs.copyFileSync(dbPath, backupPath);
    // eslint-disable-next-line no-console
    console.log(`[prisma] SQLite backup created at ${path.relative(process.cwd(), backupPath)}`);
  } catch (error) {
    console.error('[prisma] Failed to create SQLite backup', error.message);
    process.exit(1);
  }
};

const findPgDump = () => {
  // Try PATH first
  const where = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['pg_dump'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (where.status === 0 && where.stdout) {
    const first = where.stdout.split(/\r?\n/).find((l) => l.trim().length > 0);
    if (first) return first.trim();
  }

  // Common Windows install locations by version
  const versions = ['17', '16', '15', '14', '13', '12'];
  const baseDirs = [
    'C\\\\Program Files\\\\PostgreSQL',
    'C:\\Program Files\\PostgreSQL',
    'C:\\Program Files (x86)\\PostgreSQL',
  ];
  for (const base of baseDirs) {
    for (const v of versions) {
      const candidate = path.join(base, v, 'bin', process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump');
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  // Fallback to command name
  return 'pg_dump';
};

const backupPostgres = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[prisma] DATABASE_URL is required for pg_dump backups');
    process.exit(1);
  }
  fs.mkdirSync(backupRoot, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupRoot, `postgres-before-${command}-${timestamp}.sql`);
  const pgDumpCmd = findPgDump();
  const args = [`--dbname=${url}`, '--format=plain', `--file=${backupPath}`];
  const hasPathSep = /[\\/]/.test(pgDumpCmd);
  const dump = spawnSync(pgDumpCmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32' ? !hasPathSep : false,
  });
  if (dump.error || dump.status !== 0) {
    console.error('[prisma] pg_dump failed; aborting migration');
    process.exit(1);
  }
  console.log(`[prisma] Postgres backup created at ${path.relative(process.cwd(), backupPath)}`);
};

if (shouldCreateBackup()) {
  if (provider === 'sqlite') {
    backupSqlite();
  } else if (provider === 'postgresql') {
    backupPostgres();
  }
}

const result = spawnSync('npx', ['prisma', command, ...rest, '--schema', schemaPath], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
