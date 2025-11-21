# Lambda Functions Documentation

## Overview
Barkbase uses 7 consolidated Lambda functions (down from 44 individual functions) to handle all backend operations. Each Lambda is responsible for a specific domain of functionality.

## Lambda Functions

### 1. AuthApiFunction
**Purpose:** Handles all authentication and authorization operations

**Routes Handled:**
- POST `/api/v1/auth/login` - User login
- POST `/api/v1/auth/signup` - User registration
- POST `/api/v1/auth/refresh` - Token refresh
- POST `/api/v1/auth/logout` - User logout

**Database Tables Accessed:**
- `User` - User authentication data
- `Membership` - User-tenant associations
- `Tenant` - Tenant information

**Environment Variables:**
- `JWT_SECRET` - Primary JWT signing secret
- `COGNITO_USER_POOL_ID` - AWS Cognito user pool
- `COGNITO_CLIENT_ID` - AWS Cognito client ID
- `DB_SECRET_ARN` - AWS Secrets Manager ARN for database credentials

**Common Error Patterns:**
- `sourceIp undefined` - Fixed by extracting sourceIp at function scope level
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - User lacks permissions for operation

---

### 2. EntityServiceFunction
**Purpose:** Manages pets, owners, and staff entities

**Routes Handled:**
- **Pets:**
  - GET `/api/v1/pets` - List all pets
  - GET `/api/v1/pets/{id}` - Get pet by ID
  - POST `/api/v1/pets` - Create new pet
  - PUT `/api/v1/pets/{id}` - Update pet
  - DELETE `/api/v1/pets/{id}` - Delete pet
  - GET `/api/v1/pets/vaccinations/expiring` - Get pets with expiring vaccinations

- **Owners:**
  - GET `/api/v1/owners` - List all owners
  - GET `/api/v1/owners/{id}` - Get owner by ID
  - POST `/api/v1/owners` - Create new owner
  - PUT `/api/v1/owners/{id}` - Update owner
  - DELETE `/api/v1/owners/{id}` - Delete owner

- **Staff:**
  - GET `/api/v1/staff` - List all staff
  - GET `/api/v1/staff/{id}` - Get staff by ID
  - POST `/api/v1/staff` - Create new staff
  - PUT `/api/v1/staff/{id}` - Update staff
  - DELETE `/api/v1/staff/{id}` - Delete staff

**Database Tables Accessed:**
- `Pet` - Pet records
- `Owner` - Owner records
- `Staff` - Staff records
- `Vaccination` - Pet vaccination records
- `Membership` - For tenant isolation

**Environment Variables:**
- `DB_SECRET_ARN` - Database credentials
- `JWT_SECRET` - For JWT validation

**Common Error Patterns:**
- `Duplicate function declaration` - Fixed by removing duplicate async function declarations
- `401 on proxy routes` - Fixed by adding JWT authorizer to proxy routes in CDK

---

### 3. AnalyticsServiceFunction
**Purpose:** Generates reports and analytics dashboards

**Routes Handled:**
- GET `/api/v1/reports/arrivals` - Arrivals report
- GET `/api/v1/reports/departures` - Departures report
- GET `/api/v1/reports/dashboard` - Main dashboard data
- GET `/api/v1/analytics/*` - Various analytics endpoints

**Database Tables Accessed:**
- `Reservation` - Booking data
- `Pet` - Pet information
- `Owner` - Owner information
- `Payment` - Financial data
- `Service` - Service usage

**Environment Variables:**
- `DB_SECRET_ARN` - Database credentials
- `JWT_SECRET` - For JWT validation

---

### 4. OperationsServiceFunction
**Purpose:** Handles daily operations and bookings

**Routes Handled:**
- `/api/v1/reservations/*` - Reservation management
- `/api/v1/checkin/*` - Check-in operations
- `/api/v1/checkout/*` - Check-out operations
- `/api/v1/availability/*` - Availability checking

**Database Tables Accessed:**
- `Reservation` - Booking records
- `Room` - Room availability
- `Service` - Additional services
- `Pet` - Pet information

**Environment Variables:**
- `DB_SECRET_ARN` - Database credentials
- `JWT_SECRET` - For JWT validation

---

### 5. ConfigServiceFunction
**Purpose:** Manages system configuration and settings

**Routes Handled:**
- `/api/v1/config/*` - Configuration endpoints
- `/api/v1/settings/*` - System settings
- `/api/v1/preferences/*` - User preferences

**Database Tables Accessed:**
- `Configuration` - System config
- `TenantSettings` - Tenant-specific settings
- `UserPreferences` - User preferences

**Environment Variables:**
- `DB_SECRET_ARN` - Database credentials
- `JWT_SECRET` - For JWT validation

---

### 6. FinancialServiceFunction
**Purpose:** Handles payments, invoicing, and financial operations

**Routes Handled:**
- `/api/v1/payments/*` - Payment processing
- `/api/v1/invoices/*` - Invoice management
- `/api/v1/transactions/*` - Transaction history
- `/api/v1/billing/*` - Billing operations

**Database Tables Accessed:**
- `Payment` - Payment records
- `Invoice` - Invoice data
- `Transaction` - Transaction history
- `PaymentMethod` - Payment methods

**Environment Variables:**
- `DB_SECRET_ARN` - Database credentials
- `JWT_SECRET` - For JWT validation
- `STRIPE_SECRET_KEY` - Stripe API key (if applicable)

---

### 7. UserProfileServiceFunction
**Purpose:** Manages user profiles and preferences

**Routes Handled:**
- `/api/v1/profile/*` - User profile management
- `/api/v1/users/*` - User management (admin)
- `/api/v1/preferences/*` - User preferences

**Database Tables Accessed:**
- `User` - User data
- `UserPreferences` - User settings
- `Membership` - Tenant associations

**Environment Variables:**
- `DB_SECRET_ARN` - Database credentials
- `JWT_SECRET` - For JWT validation

---

## Common Patterns Across All Lambdas

### Database Connection
All Lambdas use a connection pool pattern:
```javascript
let pool = null;
function getPool() {
    if (!pool) {
        pool = new Pool({
            // connection config from Secrets Manager
        });
    }
    return pool;
}
```

### Multi-Tenant Isolation
All queries include tenant filtering:
```javascript
const tenantId = getUserInfoFromEvent(event).tenantId;
// All queries include: WHERE "tenantId" = $1
```

### Error Handling
Standard error response format:
```javascript
return {
    statusCode: errorCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        error: message,
        timestamp: new Date().toISOString()
    })
};
```

### JWT Validation
All Lambdas validate JWT tokens from API Gateway:
```javascript
const claims = event?.requestContext?.authorizer?.jwt?.claims;
```

## Required IAM Permissions

All Lambda functions need:
- `secretsmanager:GetSecretValue` for database credentials
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` for CloudWatch
- `xray:PutTraceSegments` for X-Ray tracing (if enabled)

## Deployment Notes

- All Lambdas are deployed with 1024MB memory and 30-second timeout
- Log retention is set to 30 days
- Lambdas are NOT deployed in VPC to avoid NAT Gateway costs
- Database access is through public endpoint with SSL