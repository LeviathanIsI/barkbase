/**
 * Global Setup for E2E Tests
 *
 * This file runs once before all tests.
 * Use it to set up global resources like database connections.
 */

const { testConnection } = require('./setup');

module.exports = async () => {
  console.log('\n🚀 Starting E2E Test Suite...\n');

  // Verify database connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Database connection failed. Ensure LocalStack/PostgreSQL is running.');
    process.exit(1);
  }

  console.log('✅ Database connection verified');
  console.log('');
};
