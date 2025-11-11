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

**Completed**:
- ✅ auth-api/index.js (100%)
- ✅ entity-service/index.js (100%)
- ✅ config-service/index.js (100%)

**In Progress**:
- 🔄 bookings-api/index.js
- 🔄 financial-service/index.js
- 🔄 Other Lambda functions (70+ remaining)

**Pending**:
- ⏳ Authentication layer audit
- ⏳ Database layer audit
- ⏳ API Gateway configuration audit
- ⏳ IAM permissions audit

---

## NEXT STEPS

1. Continue auditing remaining Lambda functions
2. Test authentication flows end-to-end
3. Verify multi-tenant data isolation
4. Test edge cases and error scenarios
5. Create prioritized fix list

**Estimated Time to Complete Full Audit**: 4-6 hours

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
