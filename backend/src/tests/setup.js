const path = require('path');
const { execSync } = require('child_process');
const prisma = require('../config/prisma');
const { resetAndSeed } = require('./utils/testSeed');

jest.setTimeout(20000);

let migrationsApplied = false;

const ensureMigrations = () => {
  if (migrationsApplied) return;
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../../'),
    env: { ...process.env },
    stdio: 'inherit',
  });
  migrationsApplied = true;
};

beforeAll(() => {
  ensureMigrations();
});

beforeEach(async () => {
  await resetAndSeed();
});

afterAll(async () => {
  await prisma.$disconnect();
});
