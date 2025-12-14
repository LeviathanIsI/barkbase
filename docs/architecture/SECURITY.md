# Security Architecture

## Overview

BarkBase implements defense-in-depth security with multiple layers of protection:

1. **Authentication** - AWS Cognito JWT tokens
2. **Authorization** - Role-based access control (RBAC)
3. **Tenant Isolation** - Row-level security for multi-tenancy
4. **Input Validation** - Server-side validation for all inputs
5. **Rate Limiting** - Token bucket algorithm with DynamoDB
6. **Encryption** - TLS in transit, AES-256 at rest
7. **Audit Logging** - Structured request tracking

---

## Authentication

### JWT Token Flow

```
┌─────────┐      ┌──────────┐      ┌─────────────┐      ┌──────────┐
│  User   │──1──▶│ Cognito  │──2──▶│   Tokens    │──3──▶│ Frontend │
│ Browser │      │ Sign-In  │      │ (JWT+Refresh)│      │   App    │
└─────────┘      └──────────┘      └─────────────┘      └──────────┘
                                          │
                                          ▼
┌─────────┐      ┌──────────┐      ┌─────────────┐
│  Lambda │◀──4──│   API    │◀──5──│   Request   │
│ Handler │      │ Gateway  │      │ + JWT Token │
└─────────┘      └──────────┘      └─────────────┘
```

### Token Structure

```javascript
// Decoded JWT payload
{
  "sub": "user-uuid",                    // Cognito user ID
  "email": "user@example.com",
  "cognito:groups": ["ADMIN", "STAFF"],  // User roles
  "custom:tenant_id": "tenant-uuid",     // Tenant identifier
  "iat": 1702500000,                     // Issued at
  "exp": 1702503600,                     // Expires (1 hour)
  "iss": "https://cognito-idp.us-east-2.amazonaws.com/us-east-2_xxx"
}
```

### Token Validation

```javascript
// aws/layers/shared-layer/nodejs/index.js

async function authenticateRequest(event) {
  const token = extractToken(event);
  if (!token) {
    return { authenticated: false, error: 'No token provided' };
  }

  try {
    // Verify JWT signature against Cognito JWKS
    const decoded = await verifyToken(token);

    return {
      authenticated: true,
      user: {
        id: decoded.sub,
        email: decoded.email,
        tenantId: decoded['custom:tenant_id'],
        roles: decoded['cognito:groups'] || [],
      },
    };
  } catch (error) {
    return { authenticated: false, error: error.message };
  }
}
```

### Token Refresh Flow

```javascript
// frontend/src/lib/auth.js

async function refreshTokens() {
  const refreshToken = localStorage.getItem('refresh_token');

  const response = await cognito.initiateAuth({
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: COGNITO_CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  const { IdToken, AccessToken } = response.AuthenticationResult;
  localStorage.setItem('id_token', IdToken);
  localStorage.setItem('access_token', AccessToken);
}
```

### Session Management

- **Access Token TTL:** 1 hour
- **Refresh Token TTL:** 30 days
- **Session Timeout:** After 24 hours of inactivity
- **Concurrent Sessions:** Allowed (user can log in from multiple devices)

---

## Authorization

### Role-Based Access Control (RBAC)

#### Role Hierarchy

```
SUPER_ADMIN (System-wide)
    │
    ├── ADMIN (Tenant-wide)
    │       │
    │       ├── MANAGER (Full access within locations)
    │       │       │
    │       │       └── STAFF (Limited access)
    │       │
    │       └── VETERINARIAN (Medical records access)
    │
    └── READONLY (View-only access)
```

#### Permission Matrix

| Resource | STAFF | MANAGER | ADMIN | SUPER_ADMIN |
|----------|-------|---------|-------|-------------|
| View Bookings | ✅ | ✅ | ✅ | ✅ |
| Create Bookings | ✅ | ✅ | ✅ | ✅ |
| Delete Bookings | ❌ | ✅ | ✅ | ✅ |
| View Payments | ✅ | ✅ | ✅ | ✅ |
| Process Refunds | ❌ | ✅ | ✅ | ✅ |
| View Reports | ❌ | ✅ | ✅ | ✅ |
| Manage Staff | ❌ | ❌ | ✅ | ✅ |
| Billing Settings | ❌ | ❌ | ✅ | ✅ |
| Tenant Settings | ❌ | ❌ | ✅ | ✅ |
| System Settings | ❌ | ❌ | ❌ | ✅ |

#### Implementation

```javascript
// aws/layers/shared-layer/nodejs/index.js

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['tenant:*', 'booking:*', 'payment:*', 'report:*', 'staff:*'],
  MANAGER: ['booking:*', 'payment:*', 'report:read', 'staff:read'],
  STAFF: ['booking:read', 'booking:create', 'payment:read'],
  READONLY: ['*:read'],
};

function hasPermission(user, permission) {
  const userRoles = user.roles || [];

  for (const role of userRoles) {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];

    if (rolePermissions.includes('*')) return true;
    if (rolePermissions.includes(permission)) return true;

    // Check wildcard permissions (e.g., 'booking:*' matches 'booking:create')
    const [resource, action] = permission.split(':');
    if (rolePermissions.includes(`${resource}:*`)) return true;
    if (rolePermissions.includes(`*:${action}`)) return true;
  }

  return false;
}
```

### Route Protection

```jsx
// frontend/src/components/auth/ProtectedRoute.jsx

export function ProtectedRoute({ children, requiredPermission }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}

// Usage
<Route
  path="/settings/billing"
  element={
    <ProtectedRoute requiredPermission="billing:manage">
      <BillingSettings />
    </ProtectedRoute>
  }
/>
```

---

## Payment Security

### Webhook Signature Verification

```javascript
// aws/lambdas/financial-service/index.js

async function handleStripeWebhook(event) {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return createResponse(400, { error: 'Invalid signature' });
  }

  // Process verified event
  switch (stripeEvent.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(stripeEvent.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(stripeEvent.data.object);
      break;
    // ... other event types
  }

  return createResponse(200, { received: true });
}
```

### Idempotency Implementation

```javascript
// aws/lambdas/financial-service/index.js

async function createPayment(body, tenantId) {
  const idempotencyKey = body.idempotencyKey || body.headers?.['idempotency-key'];

  if (idempotencyKey) {
    // Check for existing payment with this key
    const existing = await query(
      `SELECT * FROM "Payment"
       WHERE idempotency_key = $1 AND tenant_id = $2`,
      [idempotencyKey, tenantId]
    );

    if (existing.rows.length > 0) {
      // Return existing payment (prevents double charge)
      return createResponse(200, {
        payment: existing.rows[0],
        idempotent: true,
        message: 'Payment already processed'
      });
    }
  }

  // Process new payment
  const payment = await processNewPayment(body, tenantId, idempotencyKey);
  return createResponse(201, { payment });
}
```

### PCI Compliance Measures

1. **No card data storage** - All card data handled by Stripe
2. **TLS 1.2+** - Encrypted in transit
3. **Tokenization** - Only payment method IDs stored
4. **Audit logging** - All payment operations logged
5. **Access control** - Payment processing limited to authorized roles

---

## Data Protection

### Encryption at Rest

| Data Type | Encryption Method | Key Management |
|-----------|------------------|----------------|
| Database | RDS encryption (AES-256) | AWS KMS |
| File uploads | S3 SSE-S3 | AWS managed |
| Secrets | Secrets Manager | AWS KMS |
| Session data | Cognito managed | AWS managed |

### Encryption in Transit

- All API traffic over HTTPS (TLS 1.2+)
- Database connections over SSL
- CloudFront distribution with HTTPS only
- Secure WebSocket for real-time features

### Sensitive Data Handling

```javascript
// Fields automatically redacted from logs
const SENSITIVE_FIELDS = [
  'password',
  'ssn',
  'card_number',
  'cvv',
  'bank_account',
  'stripe_secret_key',
  'api_key',
];

function sanitizeForLogging(obj) {
  return Object.keys(obj).reduce((acc, key) => {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
      acc[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object') {
      acc[key] = sanitizeForLogging(obj[key]);
    } else {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}
```

### PII Handling

- Email addresses hashed in analytics
- Names not sent to third-party services
- Sentry configured to strip Authorization headers
- Customer data deleted on tenant offboarding

---

## Rate Limiting

### Configuration

```javascript
// aws/layers/shared-layer/nodejs/rateLimit.js

const RATE_LIMITS = {
  // Authentication endpoints - strict limits
  auth: {
    maxTokens: 5,        // Max requests
    refillRate: 1,       // Tokens per second
    windowMs: 60000,     // 1 minute window
  },

  // Standard API endpoints
  api: {
    maxTokens: 100,
    refillRate: 10,
    windowMs: 60000,
  },

  // Bulk operations - lower limits
  bulk: {
    maxTokens: 10,
    refillRate: 0.5,
    windowMs: 60000,
  },

  // Webhook endpoints
  webhook: {
    maxTokens: 50,
    refillRate: 5,
    windowMs: 60000,
  },
};
```

### Token Bucket Algorithm

```javascript
async function checkRateLimit(key, config) {
  const now = Date.now();
  const { maxTokens, refillRate, windowMs } = config;

  // Get current bucket state from DynamoDB
  const result = await docClient.send(
    new GetCommand({
      TableName: RATE_LIMIT_TABLE,
      Key: { pk: key },
    })
  );

  let tokens = maxTokens;

  if (result.Item) {
    // Refill tokens based on time elapsed
    const timePassed = (now - result.Item.lastRefill) / 1000;
    tokens = Math.min(maxTokens, result.Item.tokens + timePassed * refillRate);
  }

  if (tokens < 1) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((1 - tokens) / refillRate),
    };
  }

  // Consume token and update bucket
  await updateBucket(key, tokens - 1, now, windowMs);

  return {
    allowed: true,
    remaining: Math.floor(tokens - 1),
    retryAfter: 0,
  };
}
```

### DynamoDB Table Structure

```
Table: barkbase-rate-limits
Primary Key: pk (String)

Attributes:
- pk: "{limitType}:{identifier}" (e.g., "api:tenant:uuid" or "auth:ip:1.2.3.4")
- tokens: Number (current token count)
- lastRefill: Number (timestamp)
- ttl: Number (automatic cleanup)
```

### Response Headers

```javascript
// Added to all responses
{
  'X-RateLimit-Limit': '100',      // Max requests allowed
  'X-RateLimit-Remaining': '95',   // Requests remaining
  'X-RateLimit-Reset': '1702503600', // Unix timestamp when limit resets
}

// When rate limited (HTTP 429)
{
  'Retry-After': '30',  // Seconds to wait before retrying
}
```

---

## Input Validation

### Payment Amount Validation

```javascript
function validatePaymentInput(body) {
  const errors = [];
  const { amount, amountCents } = body;

  // Convert to cents for validation
  const cents = amountCents || (amount ? Math.round(amount * 100) : null);

  if (cents === null || cents === undefined) {
    errors.push('amount or amountCents is required');
  } else if (typeof cents !== 'number' || isNaN(cents)) {
    errors.push('amount must be a valid number');
  } else {
    if (cents <= 0) {
      errors.push('amount must be greater than 0');
    }
    if (cents > 100000000) { // $1,000,000 max
      errors.push('amount exceeds maximum allowed ($1,000,000)');
    }
  }

  // Check decimal places
  if (amount !== undefined) {
    const amountStr = amount.toString();
    if (amountStr.includes('.') && amountStr.split('.')[1].length > 2) {
      errors.push('amount cannot have more than 2 decimal places');
    }
  }

  return errors;
}
```

### Booking Date Validation

```javascript
function validateBookingDates(startDate, endDate) {
  const errors = [];
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    errors.push('Invalid start date format');
  }
  if (isNaN(end.getTime())) {
    errors.push('Invalid end date format');
  }

  if (errors.length === 0) {
    if (start < now) {
      errors.push('Booking start date cannot be in the past');
    }
    if (end <= start) {
      errors.push('End date must be after start date');
    }

    // Max booking duration: 365 days
    const maxDuration = 365 * 24 * 60 * 60 * 1000;
    if (end - start > maxDuration) {
      errors.push('Booking duration cannot exceed 365 days');
    }
  }

  return errors;
}
```

### Email Format Validation

```javascript
function validateEmail(email) {
  if (!email) {
    return { valid: true }; // Optional field
  }

  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a string' };
  }

  const trimmed = email.trim();

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email exceeds maximum length of 254 characters' };
  }

  // RFC 5322 simplified email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}
```

### Foreign Key Validation

```javascript
async function validateForeignKey(tableName, id, tenantId) {
  if (!id) return true; // Null FK is valid

  const result = await query(
    `SELECT id FROM "${tableName}"
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [id, tenantId]
  );

  return result.rows.length > 0;
}

// Usage example
async function createPet(body, tenantId) {
  // Validate owner exists
  if (body.ownerId) {
    const ownerExists = await validateForeignKey('Owner', body.ownerId, tenantId);
    if (!ownerExists) {
      return createResponse(400, {
        error: 'Invalid ownerId',
        message: 'The specified owner does not exist',
      });
    }
  }

  // Proceed with pet creation...
}
```

---

## Multi-Tenant Isolation

### Tenant ID Propagation

```javascript
function resolveTenantId(event) {
  const headers = event.headers || {};

  // Priority 1: JWT claims (most trusted)
  const jwtTenantId = event.requestContext?.authorizer?.claims?.['custom:tenant_id'];

  // Priority 2: User context from authentication
  const userTenantId = event.user?.tenantId;

  // Priority 3: Header (validated against JWT)
  const headerTenantId = headers['x-tenant-id'] || headers['X-Tenant-Id'];

  // Security: If JWT tenant and header tenant don't match, reject
  if (jwtTenantId && headerTenantId && jwtTenantId !== headerTenantId) {
    console.warn('Tenant ID mismatch - possible spoofing attempt');
    return null;
  }

  return jwtTenantId || userTenantId || headerTenantId;
}
```

### Query Filtering

```javascript
// All queries include tenant_id filter
const result = await query(
  `SELECT * FROM "Owner"
   WHERE tenant_id = $1 AND deleted_at IS NULL
   ORDER BY created_at DESC`,
  [tenantId]
);

// Never query without tenant_id (except system admin)
// BAD: SELECT * FROM "Owner" WHERE id = $1
// GOOD: SELECT * FROM "Owner" WHERE id = $1 AND tenant_id = $2
```

### Row-Level Security (Future Enhancement)

```sql
-- PostgreSQL RLS policy (planned)
ALTER TABLE "Owner" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Owner"
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## Security Best Practices

### What NOT to Do

```javascript
// ❌ Never log sensitive data
console.log('User password:', password);
console.log('API key:', process.env.STRIPE_SECRET_KEY);

// ❌ Never trust client-side tenant ID alone
const tenantId = event.headers['x-tenant-id']; // Must validate against JWT

// ❌ Never query without tenant isolation
SELECT * FROM "Payment" WHERE id = $1; // Missing tenant_id

// ❌ Never store card numbers
INSERT INTO "Payment" (card_number, cvv) VALUES ...;
```

### What TO Do

```javascript
// ✅ Validate all inputs
const errors = validatePaymentInput(body);
if (errors.length > 0) {
  return createResponse(400, { errors });
}

// ✅ Always include tenant_id in queries
const result = await query(
  `SELECT * FROM "Payment" WHERE id = $1 AND tenant_id = $2`,
  [paymentId, tenantId]
);

// ✅ Use idempotency keys for payments
const payment = await stripe.paymentIntents.create({
  amount: 1000,
  currency: 'usd',
}, {
  idempotencyKey: `payment-${invoiceId}-${Date.now()}`,
});

// ✅ Log securely
logger.info('Payment processed', {
  paymentId: payment.id,
  amount: payment.amount,
  // Note: No card details logged
});
```

---

## Incident Response

### Security Event Logging

All security-relevant events are logged to CloudWatch:

```javascript
// Security events logged
{
  level: 'SECURITY',
  event: 'UNAUTHORIZED_ACCESS',
  tenantId: 'attempted-tenant-id',
  userId: 'user-id',
  ip: 'source-ip',
  path: '/api/v1/payments',
  message: 'Tenant ID mismatch detected',
  timestamp: '2024-12-13T...',
}
```

### CloudWatch Insights Queries

```sql
-- Find authentication failures
fields @timestamp, @message
| filter level = 'ERROR' and @message like /authentication/
| sort @timestamp desc
| limit 100

-- Find rate limiting events
fields @timestamp, @message
| filter statusCode = 429
| stats count() by bin(5m)

-- Find potential attack patterns
fields @timestamp, ip, path, statusCode
| filter statusCode in [400, 401, 403, 429]
| stats count() as requests by ip
| sort requests desc
| limit 20
```
