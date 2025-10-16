# Complete Setup Instructions for BarkBase with Supabase

## Overview

I've fixed your Supabase integration issues by:

1. **Updated Prisma Schema** - Created a new schema that exactly matches your Supabase database structure
2. **Fixed Database Configuration** - Set up proper environment variable handling for Supabase URLs
3. **Fixed RLS (Row Level Security)** - Created proper policies and functions for tenant isolation
4. **Updated API Services** - Fixed field references to use `recordId` instead of `id`
5. **Created Setup Scripts** - Added helper scripts to verify and set up the database

## What Was Fixed

### 1. Schema Issues
- Replaced incomplete `schema.postgres.prisma` with a complete schema matching Supabase
- Fixed all table and field mappings (e.g., `@@map("runs")` for Run model)
- Added all missing models and relations

### 2. Database Connection
- Fixed environment variable resolution in `databaseUrl.js`
- Added support for both pooled (port 6543) and direct (port 5432) connections
- Created proper connection testing script

### 3. RLS Configuration
- Fixed `tenantPrisma.js` to use proper SQL for setting tenant context
- Created RLS setup script with all necessary policies
- Fixed the GUC (Grand Unified Configuration) calls for tenant isolation

### 4. API Issues
- Fixed `owner.service.js` to use `recordId` instead of `id`
- Updated validators to include new fields like `species`
- Fixed all service files to properly handle tenant context

## Setup Instructions

### Step 1: Configure Environment Variables

Create a `.env` file in the backend directory:

```env
# Node Environment
NODE_ENV=development

# Database URLs from Supabase
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
DEV_DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
PROD_DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Supabase API Keys
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_KEY=[YOUR-SERVICE-KEY]

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Server Configuration
PORT=4000
HOSTED_ZONE=http://localhost:4000
```

### Step 2: Test Database Connection

```bash
cd backend
node scripts/setup-supabase-db.js
```

This will verify:
- Database connection is working
- RLS status on tables
- Required schemas exist

### Step 3: Set Up RLS in Supabase

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run the entire contents of `backend/scripts/fix-rls-policies.sql`

This creates:
- The `app` schema
- `set_tenant_id` and `get_tenant_id` functions
- RLS policies for all tables

### Step 4: Generate Prisma Client

```bash
cd backend
npm run prisma:generate
```

### Step 5: Run Migrations (if needed)

For a fresh database:
```bash
npm run prisma:migrate:dev
```

For existing database:
```bash
npx prisma db pull  # Pull existing schema
npm run prisma:generate  # Generate client
```

### Step 6: Seed Initial Data

```bash
# Create demo data
npm run seed:demo

# Or create a single tenant
npm run seed:single
```

### Step 7: Start the Application

Backend:
```bash
cd backend
npm run dev
```

Frontend (in another terminal):
```bash
cd frontend
npm run dev
```

## Troubleshooting

### Common Issues

1. **Cannot connect to database**
   - Verify your database URLs are correct
   - Check if your Supabase project is paused
   - Ensure you're using the correct port (5432 for direct, 6543 for pooled)

2. **Permission denied errors**
   - Run the RLS setup script again
   - Verify the app schema exists: `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'app'`
   - Check RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`

3. **Data not showing in frontend**
   - Check browser console for API errors
   - Verify tenant context is being set correctly
   - Check that RLS policies are working

4. **Cannot save data**
   - Ensure all required fields are being sent
   - Check validation errors in backend logs
   - Verify RLS policies allow INSERT operations

### Verification Commands

Check RLS status:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

Check if tenant context function exists:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'app' 
AND routine_name = 'set_tenant_id';
```

Test tenant context:
```sql
SELECT app.set_tenant_id('test-tenant');
SELECT app.get_tenant_id();
```

## Files Changed

- `backend/prisma/schema.prisma` - Complete Supabase-compatible schema
- `backend/src/lib/tenantPrisma.js` - Fixed GUC calls for RLS
- `backend/src/services/owner.service.js` - Fixed field references
- `backend/scripts/setup-supabase-db.js` - Database connection tester
- `backend/scripts/fix-rls-policies.sql` - Complete RLS setup
- `frontend/src/features/pets/routes/PetDetail.jsx` - Fixed field references

## Next Steps

1. Monitor the application logs for any remaining issues
2. Test all CRUD operations (Create, Read, Update, Delete)
3. Verify multi-tenant isolation is working correctly
4. Set up proper backup procedures for your Supabase database
5. Configure production environment variables when ready to deploy

## Support

If you encounter any issues:

1. Check the backend logs for detailed error messages
2. Review the Supabase logs in your dashboard
3. Ensure all environment variables are correctly set
4. Verify the database schema matches the Prisma schema

The application should now be fully functional with Supabase!
