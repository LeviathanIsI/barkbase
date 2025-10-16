# Supabase Setup Guide for BarkBase

This guide will help you set up your Supabase database to work with BarkBase.

## Prerequisites

- A Supabase account and project
- Node.js installed
- Access to your Supabase project dashboard

## Step 1: Get Your Database Credentials

1. Log in to [Supabase](https://app.supabase.com)
2. Select your project
3. Go to **Settings** > **Database**
4. Copy the following:
   - **Connection string** (URI) - this will be your `DATABASE_URL`
   - Note both the **Session mode** (port 5432) and **Transaction mode** (port 6543) URLs

5. Go to **Settings** > **API**
6. Copy:
   - **URL** - your `SUPABASE_URL`
   - **anon public** key - your `SUPABASE_ANON_KEY`
   - **service_role secret** key - your `SUPABASE_SERVICE_KEY` (keep this secret!)

## Step 2: Configure Environment Variables

1. Copy the template:
   ```bash
   cp .env.supabase.template .env
   ```

2. Edit `.env` and fill in your credentials:
   ```env
   # For development (direct connection)
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   DEV_DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   
   # For production (pooled connection)
   PROD_DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   
   # Supabase API
   SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
   SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
   SUPABASE_SERVICE_KEY=[YOUR-SERVICE-KEY]
   ```

## Step 3: Test Database Connection

Run the setup script to verify your connection:

```bash
cd backend
node scripts/setup-supabase-db.js
```

This will:
- Test your database connection
- Check if RLS is enabled
- Verify required schemas exist

## Step 4: Set Up Database Schema

### Option A: Fresh Installation

1. Generate Prisma Client:
   ```bash
   npm run prisma:generate
   ```

2. Create initial migration:
   ```bash
   npm run prisma:migrate:dev -- --name init
   ```

3. Apply RLS policies in Supabase SQL Editor:
   - Go to your Supabase dashboard
   - Navigate to **SQL Editor**
   - Run the contents of `backend/scripts/fix-rls-policies.sql`

### Option B: Existing Database

1. Pull existing schema:
   ```bash
   npx prisma db pull
   ```

2. Generate Prisma Client:
   ```bash
   npm run prisma:generate
   ```

3. Ensure RLS is properly configured by running `backend/scripts/fix-rls-policies.sql`

## Step 5: Seed Initial Data

1. Create a demo tenant:
   ```bash
   npm run seed:demo
   ```

2. Or create a single tenant:
   ```bash
   npm run seed:single
   ```

## Step 6: Verify Setup

1. Start the backend:
   ```bash
   npm run dev
   ```

2. Check database health:
   ```bash
   npm run db:health
   ```

3. Run smoke tests:
   ```bash
   npm run db:smoke
   ```

## Troubleshooting

### Connection Issues

- **Error: P1001 (Connection timeout)**
  - Check your database URL is correct
  - Verify your Supabase project is active
  - Ensure your network allows connections to Supabase

- **Error: P1002 (Server rejected connection)**
  - Verify your password is correct
  - Check if the database user exists

### RLS Issues

If you're getting permission errors:

1. Check RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

2. Verify the app schema exists:
   ```sql
   SELECT schema_name 
   FROM information_schema.schemata 
   WHERE schema_name = 'app';
   ```

3. Re-run the RLS setup script if needed

### Migration Issues

- Always use `DIRECT_URL` for migrations (port 5432)
- Use `DATABASE_URL` with pooling (port 6543) for the application
- If migrations fail, check the Supabase logs in your dashboard

## Best Practices

1. **Security**:
   - Never commit `.env` files
   - Keep `SUPABASE_SERVICE_KEY` secure
   - Use RLS policies for tenant isolation

2. **Performance**:
   - Use connection pooling in production
   - Monitor your connection limits in Supabase dashboard

3. **Development**:
   - Use direct connections for development
   - Test with RLS enabled to catch permission issues early

## Next Steps

1. Configure the frontend environment:
   ```bash
   cd ../frontend
   cp .env.example .env
   # Update VITE_API_URL if needed
   ```

2. Start the full application:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

3. Access the application at http://localhost:5173

## Support

If you encounter issues:

1. Check the Supabase logs in your dashboard
2. Review the backend logs for detailed error messages
3. Ensure all environment variables are correctly set
4. Verify RLS policies are properly configured
