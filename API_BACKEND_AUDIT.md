# API & Backend Audit Report
**Date**: 2025-11-11
**Auditor**: Claude Code Autonomous Audit
**Status**: IN PROGRESS

## Executive Summary
Conducting comprehensive audit of all Lambda functions, API endpoints, and backend security.

---

## CRITICAL ISSUES FOUND

### 🔴 CRITICAL #1: Undefined Variable Crash in Login Function
**File**: `aws/lambdas/auth-api/index.js:269`
**Severity**: CRITICAL (P0)
**Impact**: **PRODUCTION BREAKING** - Login function will crash on every error

**Issue**:
```javascript
// Line 269
return errorResponse(500, ERROR_CODES.INTERNAL_ERROR, 'Internal Server Error', {
    error: err,
    context: { action: 'login', sourceIp }  // ❌ sourceIp is undefined!
});
```

**Root Cause**: Variable `sourceIp` is referenced but never defined in the login function scope.

**Fix**:
```javascript
// Option 1: Remove the undefined variable
context: { action: 'login' }

// Option 2: Extract sourceIp properly
const sourceIp = event.requestContext?.http?.sourceIp || 'unknown';
context: { action: 'login', sourceIp }
```

**Remediation Steps**:
1. Add sourceIp extraction at top of login function
2. Test login with intentional error to verify fix
3. Add similar extraction to all auth functions

**Effort**: 15 minutes

---

### 🔴 CRITICAL #2: Variable Redeclaration in Register Function
**File**: `aws/lambdas/auth-api/index.js:251,631`
**Severity**: HIGH (P1)
**Impact**: Code smell, may cause bugs in some JS engines

**Issue**:
```javascript
// Line 148 - First declaration
const metadata = getRequestMetadata(event);

// Line 251 - Redeclaration in same scope
const metadata = getRequestMetadata(event);

// Line 631 - Third declaration
const metadata = getRequestMetadata(event);
```

**Fix**: Remove redeclarations since metadata is already defined
```javascript
// Line 251 and 631 - just remove the 'const' keyword
// metadata is already available from line 148
```

**Effort**: 5 minutes

---

### 🟡 HIGH #3: Missing Input Validation on Entity Fields
**File**: `aws/lambdas/entity-service/index.js` (multiple functions)
**Severity**: HIGH (P1)
**Impact**: Data integrity issues, potential injection attacks

**Issue**: Most entity creation/update functions only validate presence of required fields, but don't validate:
- Maximum length
- Format/pattern
- Special characters
- Potential XSS vectors

**Examples**:
```javascript
// createPet (line 276) - only validates name presence
if (!name) {
    return { statusCode: 400, ... };
}
// ❌ No validation for:
// - name length (could be 10MB string)
// - medicalNotes content
// - breed validity
```

**Fix**: Add comprehensive validation
```javascript
// Validation helpers
const validatePetName = (name) => {
    if (!name || typeof name !== 'string') return false;
    if (name.length < 1 || name.length > 100) return false;
    if (!/^[a-zA-Z0-9\s'-]+$/.test(name)) return false;
    return true;
};

const validateTextArea = (text, maxLength = 5000) => {
    if (!text) return true; // optional field
    if (typeof text !== 'string') return false;
    if (text.length > maxLength) return false;
    return true;
};

// In createPet
if (!validatePetName(name)) {
    return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
            message: 'Invalid pet name (1-100 chars, letters/numbers/spaces/-/\' only)'
        }),
    };
}

if (!validateTextArea(medicalNotes)) {
    return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({
            message: 'Medical notes too long (max 5000 characters)'
        }),
    };
}
```

**Affected Functions**:
- `createPet()` - lines 276-314
- `createOwner()` - lines 624-669
- `createService()` - lines 226-278
- All update functions

**Effort**: 4 hours (need to add validation for all entity types)

---

### 🟡 HIGH #4: No Rate Limiting on API Endpoints
**File**: ALL Lambda functions
**Severity**: HIGH (P1)
**Impact**: DoS attacks, resource exhaustion, cost explosion

**Issue**: No rate limiting implemented at Lambda or API Gateway level. An attacker could:
- Spam signup endpoint to create thousands of tenants
- Spam login endpoint for brute force attacks
- Spam CRUD endpoints to exhaust database connections

**Fix**: Implement rate limiting at API Gateway level
1. Add throttling settings to CDK stack
2. Add per-user rate limits based on JWT sub
3. Add per-IP rate limits for public endpoints

**Example CDK Configuration**:
```typescript
// In API Gateway configuration
const api = new apigw.HttpApi(this, 'BarkBaseAPI', {
    defaultThrottle: {
        rateLimit: 100,  // requests per second
        burstLimit: 200   // max concurrent requests
    }
});

// Per-route throttling for sensitive endpoints
api.addRoutes({
    path: '/api/v1/auth/login',
    methods: [apigw.HttpMethod.POST],
    integration: loginIntegration,
    throttle: {
        rateLimit: 5,    // max 5 login attempts per second
        burstLimit: 10
    }
});
```

**Effort**: 2 hours (CDK configuration + testing)

---

### 🟡 HIGH #5: Insecure CORS Configuration
**File**: Multiple Lambda functions (entity-service, config-service, etc.)
**Severity**: MEDIUM-HIGH (P2)
**Impact**: Potential CSRF attacks, unauthorized API access

**Issue**:
```javascript
const HEADERS = {
    'Access-Control-Allow-Origin': '*',  // ❌ Allows ANY origin
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,...',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE'
};
```

**Recommended Fix**: Restrict CORS to known domains
```javascript
// Read allowed origins from environment variable
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',');

function getCorsHeaders(event) {
    const origin = event.headers?.origin || event.headers?.Origin;
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,PATCH,DELETE'
    };
}
```

**Effort**: 1 hour

---

### 🟠 MEDIUM #6: Public Tenant Endpoint Without Rate Limiting
**File**: `aws/lambdas/config-service/index.js:450`
**Severity**: MEDIUM (P2)
**Impact**: Information disclosure, tenant enumeration

**Issue**: `getTenantBySlug()` is public (no authentication required) and returns tenant information

```javascript
// Line 77-81
// Public endpoint - get tenant by slug (no auth required for this specific case)
const slug = event.queryStringParameters?.slug;
if (httpMethod === 'GET' && slug) {
    return await getTenantBySlug(event, slug);
}
```

**Concerns**:
1. Allows enumeration of all tenant slugs
2. No rate limiting - can be bruteforced
3. Returns potentially sensitive tenant data

**Recommended Fix**:
1. Add rate limiting specific to this endpoint
2. Limit returned data to only what's needed for public display
3. Consider adding authentication for sensitive tenant info

**Effort**: 30 minutes

---

### 🟠 MEDIUM #7: No Authorization Check on Feature Flag Updates
**File**: `aws/lambdas/config-service/index.js:597`
**Severity**: MEDIUM (P2)
**Impact**: Any authenticated user can modify tenant feature flags

**Issue**:
```javascript
// Line 97-99
if (httpMethod === 'PUT' && path === '/api/v1/tenants/features') {
    return await updateFeatureFlags(event, tenantId);
}

// No role check in updateFeatureFlags function!
async function updateFeatureFlags(event, tenantId) {
    const featureFlags = JSON.parse(event.body);
    const pool = getPool();
    // ... directly updates without checking user role
}
```

**Fix**: Add role-based access control
```javascript
async function updateFeatureFlags(event, tenantId) {
    const userInfo = getUserInfoFromEvent(event);

    // Only OWNER should be able to modify feature flags
    if (userInfo.role !== 'OWNER') {
        return {
            statusCode: 403,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Only account owners can modify feature flags' })
        };
    }

    const featureFlags = JSON.parse(event.body);
    // ... rest of function
}
```

**Effort**: 15 minutes

---

## ADDITIONAL FINDINGS

### Input Validation Issues
- No email format validation in most places
- No phone number format validation
- No URL validation for photoUrl, documentUrl fields
- No validation on enum fields (status, category, etc.)

### Error Handling
- Some functions expose internal error details in responses
- Stack traces may leak implementation details

### Database Connection
- No connection pooling timeout configuration visible
- No query timeout configuration

### Transaction Management
- Some operations that should be atomic aren't wrapped in transactions
- Example: Pet creation doesn't validate owner exists first

---

## AUDIT STATUS

**Completed** (20/52 Lambda functions):
- ✅ auth-api/index.js (100%)
- ✅ entity-service/index.js (100%)
- ✅ config-service/index.js (100%)
- ✅ bookings-api/index.js (100%)
- ✅ financial-service/index.js (100%)
- ✅ db-layer/index.js (100%)
- ✅ check-in-api/index.js (100%)
- ✅ check-out-api/index.js (100%)
- ✅ admin-api/index.js (100%)
- ✅ invites-api/index.js (100%)
- ✅ incidents-api/index.js (100%)
- ✅ get-upload-url/index.js (100%)
- ✅ get-download-url/index.js (100%)
- ✅ facility-api/index.js (100%)
- ✅ communication-api/index.js (100%)
- ✅ analytics-service/index.js (100%)
- ✅ cognito-post-confirmation/index.js (100%)
- ✅ cognito-pre-signup/index.js (100%)
- ✅ users-api/index.js (100%)
- ✅ user-permissions-api/index.js (100%)

**In Progress**:
- 🔄 Remaining 32 Lambda functions

**Pending**:
- ⏳ Authentication layer audit
- ⏳ API Gateway configuration audit
- ⏳ IAM permissions audit
- ⏳ Frontend security audit
- ⏳ Database schema audit

---

## CRITICAL ISSUES SUMMARY

**Total Issues Found**: 21
- 🔴 **CRITICAL (P0)**: 4 issues (production breaking / security breaches)
  - #1: Undefined sourceIp in auth-api login error handler
  - #9: SSL certificate validation disabled (MITM vulnerability)
  - #14: Undefined userId in check-in/check-out functions
  - #19: Auto-confirm and auto-verify bypasses email verification

- 🟡 **HIGH (P1)**: 10 issues
  - #2: Variable redeclaration in register function
  - #3: Missing input validation on entity fields
  - #4: No rate limiting on API endpoints
  - #10: Memory leak in tenant ID cache
  - #11: Database connection pool too small
  - #12: Error messages expose stack traces
  - #15: No authorization on invite endpoint
  - #16: Unauthenticated file uploads allowed
  - #17: SQL injection via string interpolation
  - #20: Orphaned users in createUser endpoint

- 🟠 **MEDIUM (P2)**: 7 issues
  - #5: Insecure CORS configuration
  - #6: Public tenant endpoint without rate limiting
  - #7: No authorization check on feature flag updates
  - #8: Invalid GROUP BY clause in bookings query
  - #13: No query timeout configuration
  - #18: No input validation on critical fields
  - #21: Slug collision risk in user registration

---

## NEXT STEPS

1. Continue auditing remaining 36 Lambda functions
2. Test authentication flows end-to-end
3. Verify multi-tenant data isolation with test queries
4. Audit frontend security (token storage, XSS, CSRF)
5. Database schema and index audit
6. Create SECURITY_AUDIT.md with all vulnerabilities
7. Create CRITICAL_FIXES_TODO.md with prioritized action items

**Estimated Time to Complete Full Audit**: 3-4 hours remaining

---

### 🔴 CRITICAL #8: SQL Injection Vulnerability in GROUP BY Clause
**File**: `aws/lambdas/bookings-api/index.js:146`
**Severity**: HIGH (P1)
**Impact**: SQL syntax error, potentially exploitable

**Issue**:
```javascript
// Line 146
query += ` GROUP BY b."recordId", p."recordId", o."recordId", s."name", rt."name"`;
```

**Problem**: Using GROUP BY without any aggregate functions causes SQL errors and ambiguous query results. This query would fail in strict SQL mode.

**Fix**: Remove GROUP BY since there are no aggregates, or add proper aggregates
```javascript
// Remove GROUP BY entirely
query += ` ORDER BY b."checkIn" DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
```

**Effort**: 10 minutes

---

### 🔴 CRITICAL #9: Insecure SSL Configuration
**File**: `aws/layers/db-layer/nodejs/index.js:45`
**Severity**: CRITICAL (P0 for production)
**Impact**: Man-in-the-middle attacks, credential interception

**Issue**:
```javascript
// Line 45
ssl: { rejectUnauthorized: false },  // ❌ DISABLES SSL CERTIFICATE VALIDATION!
```

**Security Risk**: This completely disables SSL certificate verification, making the connection vulnerable to MITM attacks. An attacker could intercept database credentials and data.

**Fix**: Use proper SSL certificate validation
```javascript
// For AWS RDS, use the RDS CA certificate
ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/rds-ca-bundle.pem')
}

// Or for development only
ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true, ca: RDS_CA_BUNDLE }
    : { rejectUnauthorized: false }
```

**Remediation Steps**:
1. Download AWS RDS CA bundle
2. Include in Lambda layer
3. Update SSL configuration
4. Test all database connections

**Effort**: 1 hour

---

### 🔴 CRITICAL #10: Memory Leak in Tenant ID Cache
**File**: `aws/layers/db-layer/nodejs/index.js:128`
**Severity**: HIGH (P1)
**Impact**: Memory exhaustion, Lambda crashes

**Issue**:
```javascript
// Line 128
const tenantIdCache = new Map();

// Line 151-153 - Cache grows indefinitely
if (tenantIdCache.has(cognitoSub)) {
    return tenantIdCache.get(cognitoSub);
}
// ...
tenantIdCache.set(cognitoSub, tenantId); // ❌ No expiration, no max size
```

**Problems**:
1. Cache grows unbounded - will eventually exhaust Lambda memory
2. No TTL - stale data stays forever
3. No cache invalidation - user tenant changes won't be reflected

**Fix**: Implement LRU cache with TTL
```javascript
// Use a proper LRU cache library
const LRU = require('lru-cache');

const tenantIdCache = new LRU({
    max: 1000,              // Max 1000 entries
    ttl: 1000 * 60 * 15,   // 15 minute TTL
    updateAgeOnGet: true
});

// Usage remains the same - LRU handles eviction automatically
```

**Effort**: 30 minutes

---

### 🟡 HIGH #11: Database Connection Pool Too Small
**File**: `aws/layers/db-layer/nodejs/index.js:46-48`
**Severity**: MEDIUM (P2)
**Impact**: Connection exhaustion under load, poor performance

**Issue**:
```javascript
// Line 46-48
max: 5,                      // Only 5 connections per Lambda instance
idleTimeoutMillis: 30000,    // 30 seconds
connectionTimeoutMillis: 10000, // 10 seconds
```

**Problem**: With only 5 connections per Lambda instance and potentially hundreds of concurrent invocations, this will cause connection queue backup and timeouts.

**Recommended Configuration**:
```javascript
max: 10,                     // More connections per instance
min: 2,                      // Maintain minimum ready connections
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 5000,  // Fail faster
statement_timeout: 30000,   // Prevent runaway queries
```

**Effort**: 15 minutes

---

### 🟡 HIGH #12: Error Messages Expose Stack Traces
**File**: `aws/lambdas/financial-service/index.js:121`
**Severity**: MEDIUM (P2)
**Impact**: Information disclosure, aids attackers in reconnaissance

**Issue**:
```javascript
// Line 116-122
} catch (error) {
    console.error('Financial service error:', error);
    return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({ message: error.message })  // ❌ Exposes error details
    };
}
```

**Security Risk**: Returns internal error messages to client, potentially exposing:
- File paths
- Database schema details
- Library versions
- Implementation details

**Fix**: Return generic error, log details server-side
```javascript
} catch (error) {
    console.error('Financial service error:', {
        message: error.message,
        stack: error.stack,
        context: { path, tenantId: userInfo.tenantId }
    });

    return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({
            message: 'An error occurred processing your request',
            errorId: generateErrorId()  // For support reference
        })
    };
}
```

**Effort**: 30 minutes (apply to all Lambda functions)

---

### 🟡 HIGH #13: No Query Timeout Configuration
**File**: `aws/layers/db-layer/nodejs/index.js:39-49`
**Severity**: MEDIUM (P2)
**Impact**: Runaway queries can lock database tables, exhaust connections

**Issue**: No statement_timeout configured for PostgreSQL queries

**Fix**: Add query timeout
```javascript
return {
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,  // 30 second query timeout
    query_timeout: 30000        // Alternative parameter name
};
```

**Effort**: 10 minutes

---

### 🔴 CRITICAL #14: Undefined userId in Check-In/Check-Out Functions
**File**: `aws/lambdas/check-in-api/index.js:151` and `aws/lambdas/check-out-api/index.js:159`
**Severity**: CRITICAL (P0)
**Impact**: **PRODUCTION BREAKING** - Check-in and check-out will fail on every request

**Issue**:
```javascript
// check-in-api/index.js Line 151
const checkInResult = await client.query(
    `INSERT INTO "CheckIn" (
        "recordId", "bookingId", "checkedInBy",
        "weight", "conditionRating", "vaccinationsVerified",
        "belongings", "photoUrls", "notes", "checkedInAt"
     ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW()
     ) RETURNING *`,
    [
        bookingId,
        userInfo.userId,  // ❌ userInfo doesn't have userId property!
        weight,
        conditionRating,
        // ...
    ]
);

// check-out-api/index.js Line 159 - Same issue
const checkOutResult = await client.query(
    `INSERT INTO "CheckOut" (
        "recordId", "bookingId", "checkedOutBy",
        // ...
     ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
     ) RETURNING *`,
    [
        bookingId,
        userInfo.userId,  // ❌ userInfo doesn't have userId property!
        // ...
    ]
);

// getUserInfoFromEvent() only returns:
// { sub, username, email, tenantId }
// No userId property!
```

**Root Cause**: `getUserInfoFromEvent()` returns `{sub, username, email, tenantId}` but code references `userInfo.userId` which doesn't exist.

**Fix**:
```javascript
// Option 1: Use sub instead of userId
userInfo.sub

// Option 2: Add userId to getUserInfoFromEvent
function getUserInfoFromEvent(event) {
    const claims = event?.requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
        console.error('No JWT claims found in event');
        return null;
    }

    return {
        sub: claims.sub,
        userId: claims.sub,  // Add this
        username: claims.username,
        email: claims.email,
        tenantId: claims['custom:tenantId'] || claims.tenantId
    };
}
```

**Affected Files**:
- `check-in-api/index.js:151`
- `check-out-api/index.js:159`

**Remediation Steps**:
1. Update getUserInfoFromEvent() to include userId OR use userInfo.sub
2. Test check-in/check-out flows end-to-end
3. Search all Lambda functions for similar userInfo.userId references

**Effort**: 30 minutes

---

### 🟡 HIGH #15: No Authorization on Invite Endpoint
**File**: `aws/lambdas/invites-api/index.js:16-23`
**Severity**: HIGH (P1)
**Impact**: Any authenticated user can send invites with any role (including OWNER)

**Issue**:
```javascript
// Line 16-23
if (httpMethod === 'POST') {
    const { email, role } = JSON.parse(event.body);
    const { rows } = await pool.query(
        `INSERT INTO "Invite" ("recordId", "tenantId", "email", "role", "token", "expiresAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, gen_random_uuid(), NOW() + INTERVAL '7 days', NOW()) RETURNING *`,
        [tenantId, email, role || 'STAFF']
    );
    return { statusCode: 201, headers: HEADERS, body: JSON.stringify(rows[0]) };
}
```

**Problems**:
1. No authorization check - any authenticated user can send invites
2. No role validation - could invite someone as 'OWNER', 'ADMIN', or any role
3. No email format validation
4. No duplicate invite check

**Fix**:
```javascript
if (httpMethod === 'POST') {
    // Get current user's role
    const userInfo = getUserInfoFromEvent(event);
    const userRole = await getUserRole(pool, tenantId, userInfo.sub);

    // Only OWNER can send invites
    if (userRole !== 'OWNER') {
        return {
            statusCode: 403,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Only account owners can send invites' })
        };
    }

    const { email, role } = JSON.parse(event.body);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Invalid email format' })
        };
    }

    // Validate role
    const validRoles = ['STAFF', 'MANAGER', 'OWNER'];
    if (!validRoles.includes(role)) {
        return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Invalid role' })
        };
    }

    // Check for duplicate invite
    const existingInvite = await pool.query(
        `SELECT * FROM "Invite" WHERE "tenantId" = $1 AND "email" = $2 AND "status" = 'PENDING'`,
        [tenantId, email]
    );
    if (existingInvite.rows.length > 0) {
        return {
            statusCode: 409,
            headers: HEADERS,
            body: JSON.stringify({ message: 'Invite already exists for this email' })
        };
    }

    // Proceed with invite creation...
}
```

**Effort**: 1 hour

---

### 🟡 HIGH #16: Unauthenticated File Uploads Allowed
**File**: `aws/lambdas/get-upload-url/index.js:30-33`
**Severity**: HIGH (P1)
**Impact**: Unauthenticated users can upload files to S3, storage abuse, malware uploads

**Issue**:
```javascript
// Line 30-33
const tenantId = event.requestContext?.authorizer?.jwt?.claims?.tenantId
    || event.requestContext?.authorizer?.jwt?.claims?.['custom:tenantId']
    || event.headers['x-tenant-id']
    || 'unauthenticated';  // ❌ Allows unauthenticated uploads!
```

**Problems**:
1. Falls back to 'unauthenticated' if no tenantId - allows anonymous uploads
2. No file size limit validation
3. No file type whitelist - could upload executables, scripts, malware
4. No validation on fileName - could have path traversal characters

**Fix**:
```javascript
// Require authentication
const tenantId = event.requestContext?.authorizer?.jwt?.claims?.tenantId
    || event.requestContext?.authorizer?.jwt?.claims?.['custom:tenantId'];

if (!tenantId) {
    return {
        statusCode: 401,
        headers: HEADERS,
        body: JSON.stringify({ message: 'Authentication required' }),
    };
}

// Validate file type
const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain'
];

if (!allowedTypes.includes(fileType)) {
    return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: 'File type not allowed' }),
    };
}

// Validate file size (add to request body)
const maxSizeMB = 10;
if (fileSize && fileSize > maxSizeMB * 1024 * 1024) {
    return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: `File size exceeds ${maxSizeMB}MB limit` }),
    };
}

// Sanitize fileName to prevent path traversal
const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
```

**Effort**: 30 minutes

---

### 🟡 HIGH #17: SQL Injection via String Interpolation
**File**: `aws/lambdas/analytics-service/index.js:341, 384`
**Severity**: HIGH (P1)
**Impact**: SQL injection attack, unauthorized data access

**Issue**:
```javascript
// Line 341
const result = await pool.query(
    `SELECT ...
     FROM "Booking" b
     JOIN "Pet" p ON b."petId" = p."recordId"
     JOIN "Owner" o ON b."ownerId" = o."recordId"
     WHERE b."tenantId" = $1
     AND b."status" IN ('PENDING', 'CONFIRMED')
     AND b."checkIn" >= CURRENT_DATE
     AND b."checkIn" <= CURRENT_DATE + INTERVAL '${daysNum} days'  // ❌ String interpolation!
     ORDER BY b."checkIn", p."name"`,
    [tenantId]
);

// Line 384 - Same issue
AND b."checkOut" <= CURRENT_DATE + INTERVAL '${daysNum} days'
```

**Problem**: Using string interpolation for `daysNum` instead of parameterized query. If `daysNum` comes from user input (query parameter), it could be exploited.

**Attack Example**:
```
GET /api/v1/dashboard/arrivals?days=7'; DROP TABLE "Booking"; --
```

**Fix**:
```javascript
// Use parameterized INTERVAL
const result = await pool.query(
    `SELECT ...
     WHERE b."tenantId" = $1
     AND b."status" IN ('PENDING', 'CONFIRMED')
     AND b."checkIn" >= CURRENT_DATE
     AND b."checkIn" <= CURRENT_DATE + ($2 || ' days')::interval
     ORDER BY b."checkIn", p."name"`,
    [tenantId, daysNum]
);
```

**Effort**: 15 minutes (fix all occurrences)

---

### 🟠 MEDIUM #18: No Input Validation on Critical Fields
**File**: Multiple Lambda functions
**Severity**: MEDIUM (P2)
**Impact**: Data corruption, XSS attacks, database bloat

**Affected Functions**:
- `incidents-api/index.js:17` - No validation on description (could be 10MB), severity, petId
- `communication-api/index.js:16` - No validation on content length, type, metadata
- `check-in-api/index.js:85-92` - No validation on weight, belongings array, photoUrls array
- `check-out-api/index.js:85-93` - No validation on financial amounts, signatureUrl format

**Examples**:
```javascript
// incidents-api - No validation
const { petId, description, severity, reportedBy } = JSON.parse(event.body);
// ❌ description could be 100MB string
// ❌ severity not validated against enum ['MINOR', 'MODERATE', 'SEVERE', 'CRITICAL']
// ❌ petId not validated to exist

// communication-api - No validation
const { ownerId, type, direction, content, metadata } = JSON.parse(event.body);
// ❌ content could be unlimited length
// ❌ type not validated against enum
// ❌ metadata could be malicious JSON
```

**Recommended Validations**:
- **Text fields**: Max 5000 characters for description/content, max 500 for notes
- **Enums**: Validate against allowed values
- **Foreign keys**: Verify referenced records exist
- **Arrays**: Validate max length (e.g., max 50 items)
- **URLs**: Validate URL format and allowed domains
- **Numbers**: Validate ranges (e.g., weight > 0, conditionRating 1-10)

**Effort**: 3 hours (apply to all affected functions)

---

### 🔴 CRITICAL #19: Auto-Confirm and Auto-Verify in Production
**File**: `aws/lambdas/cognito-pre-signup/index.js:7-12`
**Severity**: CRITICAL (P0)
**Impact**: **SECURITY BREACH** - Bypasses all email verification, allows fake accounts

**Issue**:
```javascript
// Line 7-12
exports.handler = async (event) => {
    // Auto-confirm the user
    event.response.autoConfirmUser = true;  // ❌ BYPASSES ACCOUNT VERIFICATION

    // Auto-verify email
    if (event.request.userAttributes.hasOwnProperty('email')) {
        event.response.autoVerifyEmail = true;  // ❌ BYPASSES EMAIL VERIFICATION
    }

    return event;
};
```

**Security Problems**:
1. **Auto-confirms ALL users** - No email verification required
2. **Auto-verifies email** - Users can sign up with any email (even ones they don't own)
3. **Allows fake accounts** - Attacker can create thousands of accounts with fake emails
4. **Bypasses spam prevention** - No CAPTCHA or rate limiting can help if emails aren't verified

**Attack Scenario**:
```
1. Attacker signs up with admin@targetcompany.com (email they don't own)
2. Account is auto-confirmed (no verification needed)
3. Attacker immediately gets access
4. Could impersonate real users or spam the system
```

**Fix**:
```javascript
// PRODUCTION VERSION - Remove auto-confirm/verify
exports.handler = async (event) => {
    // Let Cognito handle verification flow normally
    // Users will receive verification email and must confirm

    // Optional: Add custom validation logic here
    const email = event.request.userAttributes.email;

    // Block disposable email domains
    const disposableEmailDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
    const emailDomain = email.split('@')[1];
    if (disposableEmailDomains.includes(emailDomain)) {
        throw new Error('Disposable email addresses are not allowed');
    }

    return event;  // Don't modify response - use Cognito defaults
};
```

**Environment-Specific Solution**:
```javascript
// Use environment variable to control auto-confirm (dev only)
exports.handler = async (event) => {
    const IS_DEV = process.env.ENVIRONMENT === 'development' || process.env.ENVIRONMENT === 'local';

    if (IS_DEV) {
        event.response.autoConfirmUser = true;
        event.response.autoVerifyEmail = true;
    }
    // In production, Cognito will send verification emails normally

    return event;
};
```

**Remediation Steps**:
1. **IMMEDIATE**: Check if this is deployed to production
2. If in production, deploy fixed version ASAP
3. Audit all existing accounts for suspicious emails
4. Consider forcing re-verification of all accounts
5. Add monitoring for bulk signups

**Effort**: 1 hour (critical hotfix)

---

### 🟡 HIGH #20: Orphaned Users in createUser Endpoint
**File**: `aws/lambdas/users-api/index.js:223-266`
**Severity**: HIGH (P1)
**Impact**: Users created without tenant membership, cannot access system

**Issue**:
```javascript
// Line 247-250
const { rows } = await pool.query(
    'INSERT INTO "User" ("recordId", "email", "passwordHash", "name", "phone", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
     RETURNING "recordId", "email", "name", "createdAt"',
    [email.toLowerCase(), passwordHash, name, phone]
);

// ❌ No Membership record created!
// User exists but has no tenant association
// User cannot login or access any resources
```

**Problems**:
1. Creates user without Membership record
2. User has no tenant association
3. User cannot access any resources (all endpoints require tenantId)
4. No authorization check - any authenticated user can create users

**Fix**:
```javascript
const createUser = async (event, requestingUser) => {
    // SECURITY: Only OWNER/ADMIN can create users
    if (!['OWNER', 'ADMIN'].includes(requestingUser.role)) {
        return errorResponse(403, ERROR_CODES.FORBIDDEN, 'Insufficient permissions');
    }

    const body = JSON.parse(event.body);
    const { email, password, name, phone, role = 'STAFF' } = body;

    if (!email || !password) {
        return errorResponse(400, ERROR_CODES.INVALID_INPUT, "Email and password are required");
    }

    // Validate role
    const validRoles = ['STAFF', 'MANAGER', 'ADMIN'];
    if (!validRoles.includes(role)) {
        return errorResponse(400, ERROR_CODES.INVALID_INPUT, "Invalid role");
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const pool = getPool();

    // Begin transaction
    await pool.query('BEGIN');

    try {
        // Create user
        const { rows } = await pool.query(
            'INSERT INTO "User" ("recordId", "email", "passwordHash", "name", "phone", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
             RETURNING "recordId", "email", "name", "createdAt"',
            [email.toLowerCase(), passwordHash, name, phone]
        );

        const newUserId = rows[0].recordId;

        // Create membership linking user to requesting user's tenant
        await pool.query(
            `INSERT INTO "Membership" ("recordId", "userId", "tenantId", "role", "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())`,
            [newUserId, requestingUser.tenantId, role]
        );

        await pool.query('COMMIT');

        console.log(`[USERS] User created with membership: ${newUserId} by ${requestingUser.sub}`);

        return {
            statusCode: 201,
            headers: HEADERS,
            body: JSON.stringify(rows[0]),
        };
    } catch (error) {
        await pool.query('ROLLBACK');

        if (error.code === "23505") {
            return errorResponse(409, ERROR_CODES.DUPLICATE, "A user with this email already exists");
        }
        throw error;
    }
};
```

**Effort**: 30 minutes

---

### 🟠 MEDIUM #21: Slug Collision Risk in User Registration
**File**: `aws/lambdas/cognito-post-confirmation/index.js:47`
**Severity**: MEDIUM (P2)
**Impact**: Tenant slug collisions, registration failures for simultaneous signups

**Issue**:
```javascript
// Line 47
const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
```

**Problems**:
1. Uses `Date.now()` for uniqueness - millisecond precision
2. Multiple users signing up in same millisecond will generate same slug
3. Will cause unique constraint violation and registration failure
4. No validation on name length before using in slug

**Fix**:
```javascript
const { randomUUID } = require('crypto');

// Generate truly unique slug
const randomSuffix = randomUUID().slice(0, 8);
const sanitizedName = name.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .slice(0, 50)  // Limit length
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing dashes

const slug = `${sanitizedName}-${randomSuffix}`;

// Verify uniqueness (optional double-check)
const existingSlug = await pool.query(
    'SELECT "recordId" FROM "Tenant" WHERE "slug" = $1',
    [slug]
);

if (existingSlug.rows.length > 0) {
    // Extremely rare, but regenerate if collision
    const newSuffix = randomUUID().slice(0, 8);
    slug = `${sanitizedName}-${newSuffix}`;
}
```

**Effort**: 20 minutes

---

## SECURITY AUDIT - Frontend Integration

### Findings from Frontend API Calls

**Note**: Need to audit frontend src/lib/api.js and src/hooks/ for:
- [ ] Token storage (localStorage vs httpOnly cookies)
- [ ] Token refresh implementation
- [ ] CSRF protection
- [ ] XSS sanitization on user input
- [ ] API error handling

**Status**: PENDING (will audit in Phase 2)

---

## DATABASE SCHEMA CONCERNS

### Potential Issues to Investigate:
1. **No audit trail** - No created_by/updated_by columns visible
2. **Soft delete strategy** - Some tables use soft delete, others don't (inconsistent)
3. **Foreign key constraints** - Need to verify CASCADE behavior
4. **Index optimization** - Need to check if tenantId is indexed on all tables
5. **Data retention** - No apparent archival strategy for old data

**Status**: NEEDS INVESTIGATION

---

## PERFORMANCE CONCERNS

### Lambda Configuration
- **Memory allocation** - Need to check if Lambdas have appropriate memory (affects CPU)
- **Cold start optimization** - Check if using provisioned concurrency for critical paths
- **Bundle size** - Need to analyze if dependencies are properly tree-shaken

### Database Queries
- **N+1 queries** - Seen in getOwnerById (line 710 in entity-service) - fetches bookings separately
- **Missing indexes** - Need to verify indexes on foreign keys
- **Pagination limits** - Some endpoints default to 50 records, no max limit validation

**Status**: NEEDS INVESTIGATION

---

**Estimated Time to Complete Full Audit**: 4-6 hours
