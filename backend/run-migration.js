/**
 * Helper script to run migrations manually
 * Usage: node run-migration.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Running BarkBase Production Migrations...\n');

try {
  // Step 1: Format schema
  console.log('1️⃣  Formatting Prisma schema...');
  execSync('npx prisma format', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Schema formatted\n');

  // Step 2: Run migration
  console.log('2️⃣  Running database migration...');
  execSync('npx prisma migrate dev --name add_runs_and_messaging', { 
    stdio: 'inherit', 
    cwd: __dirname 
  });
  console.log('✅ Migration complete\n');

  // Step 3: Generate Prisma client
  console.log('3️⃣  Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Prisma client generated\n');

  console.log('🎉 ALL MIGRATIONS COMPLETE!\n');
  console.log('📊 New tables created:');
  console.log('   - runs (daycare run management)');
  console.log('   - run_assignments (pet assignments)');
  console.log('   - messages (staff messaging)');
  console.log('\n✨ Your app is now production-ready!\n');
  console.log('👉 Start the backend: npm run dev');
  console.log('👉 Start the frontend: cd ../frontend && npm run dev\n');

} catch (error) {
  console.error('\n❌ Migration failed!\n');
  console.error('Error:', error.message);
  console.log('\n📝 Manual steps if needed:');
  console.log('1. Check your DATABASE_URL environment variable');
  console.log('2. Ensure database is accessible');
  console.log('3. Run: npx prisma migrate dev --name add_runs_and_messaging');
  console.log('4. Or run SQL manually from: prisma/migrations/add_runs_and_messaging.sql\n');
  process.exit(1);
}

