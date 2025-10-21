# BarkBase Lambda Functions

All Lambda functions for the BarkBase backend API.

## Lambda Functions Created

### 🔐 Authentication & Users
- `auth-api` - Login, signup, logout, refresh tokens, user registration
- `users-api` - User CRUD operations
- `owners-api` - Pet owner management

### 🏢 Multi-Tenancy
- `tenants-api` - Tenant settings, plan info, onboarding, themes
- `memberships-api` - User-tenant memberships
- `roles-api` - Role definitions and permissions
- `user-permissions-api` - Permission system

### 📅 Bookings & Operations
- `bookings-api` - Full booking lifecycle (create, update, check-in, check-out)
- `pets-api` - Pet management
- `kennels-api` - Kennel/facility management
- `services-api` - Service definitions
- `calendar-api` - Calendar view of bookings

### 💰 Financials
- `payments-api` - Payment processing
- `invoices-api` - Invoice generation
- `packages-api` - Prepaid package management
- `billing-api` - Billing metrics

### 📊 Reporting & Admin
- `reports-api` - Dashboard metrics, revenue, occupancy reports
- `dashboard-api` - Dashboard overview stats
- `admin-api` - Admin statistics
- `facility-api` - Facility overview

### 👥 Staff & Operations
- `staff-api` - Staff management
- `tasks-api` - Task assignments (feeding, medication, etc.)
- `runs-api` - Daycare run assignments
- `messages-api` - Staff messaging
- `incidents-api` - Incident reporting

### 📝 Communications
- `communication-api` - Communication logs
- `notes-api` - Note management
- `invites-api` - User invitations

### ⚙️ Configuration
- `account-defaults-api` - Account default settings

### 📁 File Management
- `get-upload-url` - Generate S3 upload URLs
- `get-download-url` - Generate S3 download URLs

### ✅ Check-in/Out (Existing)
- `check-in-api` - Booking check-ins
- `check-out-api` - Booking check-outs

## Structure

Each Lambda function folder contains:
- `index.js` - Main handler code
- `package.json` - Dependencies (if any)

## Shared Resources

### Layers
- `db-layer` - Shared PostgreSQL connection pool using `pg`
- Location: `../layers/db-layer/`

### Common Pattern

All Lambda functions follow this pattern:

```javascript
const { getPool } = require('/opt/nodejs/db-layer');

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
};

exports.handler = async (event) => {
    const httpMethod = event.requestContext.http.method;
    const path = event.requestContext.http.path;
    const tenantId = event.headers['x-tenant-id'];

    try {
        // Route logic here
        const pool = getPool();
        const { rows } = await pool.query('SELECT * FROM "Table" WHERE "tenantId" = $1', [tenantId]);
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify(rows) };
    } catch (error) {
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: error.message }) };
    }
};
```

## Environment Variables

All Lambda functions receive these environment variables from CDK:

```
DB_HOST - PostgreSQL host
DB_PORT - PostgreSQL port (usually 5432)
DB_NAME - Database name
DB_USER - Database user
DB_PASSWORD - Database password
JWT_SECRET - Secret for JWT tokens (auth-api only)
```

## API Routes

All APIs are prefixed with `/api/v1/` and require:
- `x-tenant-id` header for multi-tenant isolation
- `Authorization: Bearer <token>` header for authenticated endpoints

Example:
```bash
curl https://your-api.amazonaws.com/api/v1/bookings \
  -H "x-tenant-id: tenant-uuid" \
  -H "Authorization: Bearer eyJhbGc..."
```

## Local Development

To test Lambda functions locally:

1. Install AWS SAM CLI
2. Run `sam local invoke FunctionName`

## Deployment

See `../DEPLOYMENT_GUIDE.md` for full deployment instructions.

Quick deploy:
```bash
cd ../cdk
cdk deploy
```

## Adding New Lambda Functions

1. Create new directory: `mkdir aws/lambdas/new-api`
2. Create `index.js` and `package.json`
3. Add to CDK stack: `aws/cdk/lib/cdk-stack.ts`
4. Deploy: `cdk deploy`

## Notes

- All Lambda functions use raw SQL queries with `pg` library
- This was chosen over Prisma for faster cold starts and smaller bundle sizes
- Multi-tenant isolation is enforced via `tenantId` in WHERE clauses
- Authentication is handled in each Lambda (JWT verification)

