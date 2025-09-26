#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');
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

const result = spawnSync('npx', ['prisma', command, ...rest, '--schema', schemaPath], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
