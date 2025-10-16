#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Generating Prisma Client and preparing for Supabase migration...\n');

try {
  // Step 1: Generate Prisma Client
  console.log('1️⃣ Generating Prisma Client...');
  execSync('npx prisma generate', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('✅ Prisma Client generated successfully\n');

  // Step 2: Create migration SQL
  console.log('2️⃣ Creating migration SQL...');
  console.log('Run the following command to create a new migration:');
  console.log('\n  npm run prisma:migrate:dev\n');
  console.log('Or if you want to apply existing migrations:');
  console.log('\n  npm run prisma:migrate:deploy\n');

  // Step 3: Instructions for Supabase
  console.log('\n📝 To apply migrations to Supabase:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Run the migration files from backend/prisma/migrations');
  console.log('4. Also run backend/scripts/fix-rls-policies.sql');
  console.log('\n✨ Done!');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
