#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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

const shouldCreateBackup = () => command === 'migrate' || command === 'db';

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

const backupPostgres = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[prisma] DATABASE_URL is required for pg_dump backups');
    process.exit(1);
  }
  fs.mkdirSync(backupRoot, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupRoot, `postgres-before-${command}-${timestamp}.sql`);
  const dump = spawnSync('pg_dump', [`--dbname=${url}`, '--format=plain', `--file=${backupPath}`], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
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
