module.exports = {
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/frontend/',
    '/backend/',
    '/aws/cdk/cdk.out/',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/aws/cdk/cdk.out/',
  ],
  testEnvironment: 'node',
  passWithNoTests: true,
  // E2E test configuration
  testTimeout: 30000,
  // Run tests serially in E2E mode to avoid database conflicts
  maxWorkers: process.env.E2E_TEST ? 1 : '50%',
  // Setup and teardown
  globalSetup: process.env.E2E_TEST ? '<rootDir>/tests/e2e/utils/globalSetup.js' : undefined,
  globalTeardown: process.env.E2E_TEST ? '<rootDir>/tests/e2e/utils/globalTeardown.js' : undefined,
  // Verbose output for E2E tests
  verbose: process.env.E2E_TEST ? true : false,
  // Collect coverage for E2E tests
  collectCoverageFrom: [
    'aws/lambdas/**/*.js',
    '!aws/lambdas/**/node_modules/**',
    '!aws/lambdas/**/*.test.js',
  ],
};
