# Row Level Security (RLS) Setup Guide

This guide walks you through enabling RLS for multi-tenant isolation in your BarkBase Supabase database.

## What I've Already Done

✅ Renamed all primary keys to `recordId` in the database (visible in Supabase schema visualizer)
✅ Enabled RLS on all tenant-scoped tables
✅ Created SQL file with all RLS policies (`backend/scripts/sql/create_rls_policies.sql`)
✅ Added `$withTenantGuc()` helper to tenant-scoped Prisma client for transaction-based GUC setting

## What You Need to Do

### Step 1: Create `app_user` role in Supabase

Run this in the Supabase SQL Editor (pick a strong password):

```sql
-- Create restricted DB user
create user app_user with password 'YOUR_STRONG_PASSWORD_HERE';

-- Grant schema access
grant usage on schema public to app_user;

-- Grant table permissions
grant select, insert, update, delete on all tables in schema public to app_user;
alter default privileges in schema public grant select, insert, update, delete on tables to app_user;

-- Grant sequence permissions (for ID generation)
grant usage, select on all sequences in schema public to app_user;
alter default privileges in schema public grant usage, select on sequences to app_user;
```

### Step 2: Create RLS Policies

Copy and paste the entire contents of `backend/scripts/sql/create_rls_policies.sql` into the Supabase SQL Editor and run it.

This creates policies for all tenant-scoped tables:
- Owner, Pet, PetOwner
- Booking, BookingSegment, Service, BookingService
- Payment, Vaccination
- Staff, Membership
- AuditLog, UsageCounter
- CheckIn, CheckOut, IncidentReport

Each table gets 3 policies:
- `tenant read`: SELECT only where tenantId matches app.tenant_id
- `tenant write`: INSERT only if tenantId matches app.tenant_id
- `tenant update`: UPDATE only where tenantId matches app.tenant_id

### Step 3: Update backend/.env to use app_user

Replace the username and password in all database URLs:

```ini
# Example (URL-encode special characters in password)
DEV_DATABASE_URL="postgresql://app_user:YOUR_ENCODED_PASSWORD@db.ozavnfvdeiiaydtdjoyy.supabase.co:5432/postgres?sslmode=require"
PROD_DATABASE_URL="postgresql://app_user:YOUR_ENCODED_PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://app_user:YOUR_ENCODED_PASSWORD@db.ozavnfvdeiiaydtdjoyy.supabase.co:5432/postgres?sslmode=require"
```

Then regenerate Prisma:
```bash
cd backend
npm run prisma:generate
npm run db:push
```

### Step 4: Test RLS is Working

In Supabase SQL Editor, run this test:

```sql
-- Simulate tenant A
begin;
set local app.tenant_id = 'YOUR_TENANT_A_ID';  -- use actual tenant recordId from your Tenant table
select count(*) from "Owner";  -- should show only tenant A's owners
rollback;

-- Simulate tenant B
begin;
set local app.tenant_id = 'YOUR_TENANT_B_ID';
select count(*) from "Owner";  -- should show different count
rollback;

-- Try without setting tenant (should return 0 rows)
select count(*) from "Owner";  -- returns 0 because app.tenant_id is not set
```

If counts differ per tenant and return 0 without the GUC, RLS is working!

### Step 5: Update Controllers to Use Transactions (Gradual Rollout)

Your existing code already uses `forTenant(tenantId)` which adds tenantId filters. RLS adds a second layer of defense.

To fully enforce RLS with PgBouncer (production), wrap DB operations in a transaction that sets the GUC.

#### Option A: Update services to accept a transaction client

Example for `pet.service.js`:

```js
const listPets = async (tenantId, options = {}, tx = null) => {
  const client = tx || forTenant(tenantId);
  const { limit, skip } = parsePageLimit(options, { defaultLimit: 100, maxLimit: 500 });
  const where = buildWhere(options.search, ['name', 'breed']);

  return client.pet.findMany({
    where,
    include: petIncludes,
    orderBy: { updatedAt: 'desc' },
    take: limit,
    skip,
  });
};
```

Then in controller:

```js
const list = async (req, res, next) => {
  try {
    const pets = await req.tenantScopedClient.$withTenantGuc(async (tx) => {
      const db = forTenant(req.tenantId, tx);
      return petService.listPets(req.tenantId, req.query, db);
    });
    return res.json(pets);
  } catch (error) {
    return next(error);
  }
};
```

#### Option B: Add middleware that wraps all requests in a transaction

Create `backend/src/middleware/rlsTransaction.js`:

```js
const { forTenant } = require('../lib/tenantPrisma');

const rlsTransaction = async (req, res, next) => {
  if (!req.tenantId) {
    return next();
  }

  // Wrap the entire request in a transaction with GUC set
  req.tenantScopedClient.$withTenantGuc(async (tx) => {
    req.rlsDb = forTenant(req.tenantId, tx);
    // Store the transaction for the request lifecycle
    req.rlsTx = tx;
    next();
  }).catch(next);
};

module.exports = rlsTransaction;
```

Then in `app.js`, add after `tenantContext`:

```js
const rlsTransaction = require('./middleware/rlsTransaction');
// ...
app.use(tenantContext);
app.use(rlsTransaction);  // <-- add this
```

And update services to use `req.rlsDb` instead of `forTenant(tenantId)`.

## Verification Checklist

- [ ] Created `app_user` role in Supabase
- [ ] Ran `create_rls_policies.sql` in Supabase SQL Editor
- [ ] Updated backend/.env to use `app_user` credentials
- [ ] Regenerated Prisma client (`npm run prisma:generate`)
- [ ] Tested RLS in Supabase SQL Editor (counts differ per tenant)
- [ ] Started updating controllers/services to use `$withTenantGuc()` transactions
- [ ] Verified API still works: `npm run dev` and test endpoints

## Security Benefits

**Before RLS:**
- If code forgets to filter by tenantId, all tenants' data leaks
- Application-level enforcement only

**After RLS:**
- Even if code has bugs, Postgres enforces tenant isolation
- Defense in depth: app-level filters + database-level policies
- Impossible to accidentally query cross-tenant data

## Rollout Strategy

1. Complete steps 1-3 above (create app_user, policies, update .env)
2. Test with existing code (app-level filters still work, RLS adds safety net)
3. Gradually add `$withTenantGuc()` wrappers to controllers over time
4. Once all controllers use transactions, you can optionally remove app-level `forTenant()` filters (but keeping both is fine for defense in depth)

## Troubleshooting

**"permission denied for table X"**
- Run the GRANT statements from Step 1 again
- Ensure `app_user` has permissions on all tables

**"current_setting: unrecognized configuration parameter"**
- You forgot to SET LOCAL app.tenant_id inside the transaction
- Wrap operations in `$withTenantGuc()` or manually `SET LOCAL`

**Queries return 0 rows**
- Check that `app.tenant_id` is set correctly
- Verify tenantId value matches actual recordId in Tenant table
- Run test query in Supabase SQL Editor to confirm

**PgBouncer errors in production**
- Ensure you're using `SET LOCAL` (not `SET`) inside a transaction
- PgBouncer transaction pooling requires per-transaction GUC setting

