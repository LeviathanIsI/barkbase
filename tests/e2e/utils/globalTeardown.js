/**
 * Global Teardown for E2E Tests
 *
 * This file runs once after all tests complete.
 * Use it to clean up global resources.
 */

const { closePool } = require('./setup');

module.exports = async () => {
  console.log('\n🧹 Cleaning up E2E Test Suite...\n');

  // Close database pool
  await closePool();

  console.log('✅ E2E Test Suite completed');
  console.log('');
};
