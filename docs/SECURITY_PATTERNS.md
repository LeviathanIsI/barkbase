# Security Patterns Documentation

## Overview
This document outlines the security patterns and best practices implemented across the Barkbase application.

## JWT Validation Standard

### Token Structure
```javascript
// JWT Claims Structure
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",    // User UUID
  "email": "user@example.com",
  "tenantId": "660e8400-e29b-41d4-a716-446655440001", // Tenant UUID
  "role": "USER",                                     // USER|ADMIN|STAFF
  "iat": 1705762800,                                  // Issued at
  "exp": 1705766400,                                  // Expiration (1 hour)
  "cognito:username": "user@example.com",            // Cognito username
  "custom:role": "USER",                             // Custom Cognito attribute
  "custom:tenantId": "660e8400..."                   // Custom Cognito attribute
}
```

### Validation Implementation
```javascript
// Standard JWT validation pattern in Lambda
async function validateRequest(event) {
    // 1. Extract claims from API Gateway
    const claims = event?.requestContext?.authorizer?.jwt?.claims;

    if (!claims) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    // 2. Validate required claims
    if (!claims.sub || !claims.email) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid token claims' })
        };
    }

    // 3. Extract tenant context (with fallback to database)
    const tenantId = await getTenantId(claims);

    if (!tenantId) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: 'No tenant association' })
        };
    }

    return { valid: true, userInfo: { ...claims, tenantId } };
}
```

### Token Refresh Pattern
```javascript
// Token refresh implementation
async function refreshToken(event) {
    const { refreshToken } = JSON.parse(event.body);

    try {
        // Validate refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

        // Generate new access token
        const newToken = jwt.sign(
            {
                sub: decoded.sub,
                email: decoded.email,
                tenantId: decoded.tenantId,
                role: decoded.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return {
            statusCode: 200,
            body: JSON.stringify({ token: newToken })
        };
    } catch (error) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Invalid refresh token' })
        };
    }
}
```

---

## Audit Logging Requirements

### What to Log
```javascript
// Audit log structure
const auditLog = {
    timestamp: new Date().toISOString(),
    userId: userInfo.sub,
    tenantId: userInfo.tenantId,
    action: 'UPDATE_PET',
    resource: 'pets',
    resourceId: petId,
    sourceIp: event.requestContext?.http?.sourceIp,
    userAgent: event.headers?.['user-agent'],
    oldValue: existingPet,  // For updates
    newValue: updatedPet,   // For updates
    success: true,
    errorMessage: null      // Populated on failure
};
```

### Implementation Pattern
```javascript
// Wrap operations with audit logging
async function auditedOperation(operation, context) {
    const startTime = Date.now();
    let success = false;
    let error = null;
    let result = null;

    try {
        result = await operation();
        success = true;
    } catch (err) {
        error = err;
        success = false;
        throw err;
    } finally {
        // Always log, even on failure
        await logAudit({
            ...context,
            success,
            duration: Date.now() - startTime,
            error: error?.message
        });
    }

    return result;
}
```

### Critical Operations to Audit
- User authentication (login/logout)
- Data modifications (CREATE, UPDATE, DELETE)
- Permission changes
- Financial transactions
- Data exports
- Failed authentication attempts
- Access to sensitive data

---

## Tenant Context Extraction

### Standard Pattern
```javascript
async function getUserInfoFromEvent(event) {
    // 1. Get claims from API Gateway JWT authorizer
    const claims = event?.requestContext?.authorizer?.jwt?.claims;

    if (claims) {
        console.log('[AUTH] Using API Gateway JWT claims');

        // 2. Check for tenantId in claims
        let tenantId = claims['custom:tenantId'] || claims.tenantId;

        // 3. Fallback to database lookup for Cognito users
        if (!tenantId && claims.sub) {
            console.log('[AUTH] Fetching tenantId from database for user:', claims.sub);
            const pool = getPool();

            try {
                const result = await pool.query(
                    `SELECT m."tenantId"
                     FROM public."Membership" m
                     JOIN public."User" u ON m."userId" = u."recordId"
                     WHERE (u."cognitoSub" = $1 OR u."email" = $2)
                     AND m."deletedAt" IS NULL
                     ORDER BY m."updatedAt" DESC
                     LIMIT 1`,
                    [claims.sub, claims.email || claims['cognito:username']]
                );

                if (result.rows.length > 0) {
                    tenantId = result.rows[0].tenantId;
                    console.log('[AUTH] Found tenantId from database:', tenantId);
                } else {
                    console.error('[AUTH] No tenant found for user:', claims.sub);
                }
            } catch (error) {
                console.error('[AUTH] Error fetching tenantId:', error.message);
            }
        }

        return {
            sub: claims.sub,
            username: claims.username || claims['cognito:username'],
            email: claims.email,
            tenantId: tenantId,
            userId: claims.sub,
            role: claims['custom:role'] || 'USER'
        };
    }

    // No valid claims
    return null;
}
```

### Multi-Tenant Query Pattern
```javascript
// Always include tenant isolation
async function listPets(tenantId) {
    const query = `
        SELECT * FROM pets
        WHERE "tenantId" = $1
        AND "deletedAt" IS NULL
        ORDER BY "createdAt" DESC
    `;

    return await pool.query(query, [tenantId]);
}

// NEVER do this:
async function insecureListPets() {
    // BAD: No tenant isolation!
    return await pool.query('SELECT * FROM pets');
}
```

---

## Error Handling Best Practices

### Standard Error Response Format
```javascript
function errorResponse(statusCode, message, details = null) {
    const response = {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            error: message,
            timestamp: new Date().toISOString(),
            ...(details && { details })
        })
    };

    // Log error for monitoring
    console.error('[ERROR]', {
        statusCode,
        message,
        details,
        stack: new Error().stack
    });

    return response;
}
```

### Error Categories and Handling
```javascript
// 1. Authentication Errors (401)
if (!claims) {
    return errorResponse(401, 'Authentication required');
}

// 2. Authorization Errors (403)
if (userInfo.role !== 'ADMIN') {
    return errorResponse(403, 'Insufficient permissions');
}

// 3. Validation Errors (400)
if (!isValidEmail(email)) {
    return errorResponse(400, 'Invalid email format', {
        field: 'email',
        value: email
    });
}

// 4. Not Found Errors (404)
if (!resource) {
    return errorResponse(404, `Resource not found: ${resourceId}`);
}

// 5. Conflict Errors (409)
if (existingRecord) {
    return errorResponse(409, 'Resource already exists', {
        field: 'email',
        value: email
    });
}

// 6. Internal Errors (500)
try {
    // operation
} catch (error) {
    // Don't expose internal details to client
    return errorResponse(500, 'Internal server error');
    // But log full error internally
    console.error('Database error:', error);
}
```

### Security in Error Messages
```javascript
// DON'T: Expose sensitive information
return errorResponse(400, `User john@example.com already exists with ID 12345`);

// DO: Generic messages for sensitive operations
return errorResponse(400, 'Email address already registered');

// DON'T: Expose system internals
return errorResponse(500, `Database connection failed: ECONNREFUSED 10.0.0.5:5432`);

// DO: Generic internal error
return errorResponse(500, 'Service temporarily unavailable');
```

---

## Input Validation and Sanitization

### SQL Injection Prevention
```javascript
// ALWAYS use parameterized queries
// GOOD:
const result = await pool.query(
    'SELECT * FROM pets WHERE "tenantId" = $1 AND "name" = $2',
    [tenantId, petName]
);

// BAD - SQL Injection vulnerable:
const result = await pool.query(
    `SELECT * FROM pets WHERE name = '${petName}'`
);
```

### Input Validation Pattern
```javascript
function validatePetInput(data) {
    const errors = [];

    // Required fields
    if (!data.name) errors.push('Pet name is required');
    if (!data.species) errors.push('Species is required');

    // Format validation
    if (data.email && !isValidEmail(data.email)) {
        errors.push('Invalid email format');
    }

    // Length validation
    if (data.name && data.name.length > 100) {
        errors.push('Pet name too long (max 100 characters)');
    }

    // Enum validation
    const validSpecies = ['DOG', 'CAT', 'BIRD', 'OTHER'];
    if (data.species && !validSpecies.includes(data.species)) {
        errors.push(`Invalid species. Must be one of: ${validSpecies.join(', ')}`);
    }

    // XSS prevention - strip HTML tags
    if (data.notes) {
        data.notes = data.notes.replace(/<[^>]*>/g, '');
    }

    if (errors.length > 0) {
        throw new ValidationError(errors);
    }

    return data;
}
```

---

## Secure Configuration Management

### Environment Variables
```javascript
// Required security environment variables
const requiredEnvVars = [
    'JWT_SECRET',
    'DB_SECRET_ARN',
    'COGNITO_USER_POOL_ID',
    'COGNITO_CLIENT_ID'
];

// Validate on Lambda cold start
function validateEnvironment() {
    const missing = requiredEnvVars.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

// Use AWS Secrets Manager for sensitive data
async function getDatabaseCredentials() {
    const client = new SecretsManagerClient({ region: 'us-east-2' });
    const command = new GetSecretValueCommand({
        SecretId: process.env.DB_SECRET_ARN
    });

    const response = await client.send(command);
    return JSON.parse(response.SecretString);
}
```

---

## Rate Limiting and DDoS Protection

### API Gateway Configuration
```typescript
// CDK configuration for rate limiting
httpApi.addRoutes({
    path: '/api/v1/auth/login',
    methods: [HttpMethod.POST],
    integration: authIntegration,
    throttle: {
        rateLimit: 10,    // requests per second
        burstLimit: 20    // burst capacity
    }
});
```

### Lambda-Level Rate Limiting
```javascript
// In-memory rate limiting (for single Lambda instance)
const rateLimitMap = new Map();

function checkRateLimit(userId, limit = 100, window = 60000) {
    const now = Date.now();
    const userLimits = rateLimitMap.get(userId) || [];

    // Remove old entries
    const recentRequests = userLimits.filter(
        timestamp => now - timestamp < window
    );

    if (recentRequests.length >= limit) {
        return false; // Rate limit exceeded
    }

    recentRequests.push(now);
    rateLimitMap.set(userId, recentRequests);

    return true;
}
```

---

## CORS Configuration

### Secure CORS Headers
```javascript
function addCorsHeaders(response, origin) {
    // Validate origin against whitelist
    const allowedOrigins = [
        'https://barkbase.com',
        'https://*.barkbase.com',
        'http://localhost:3000' // Development only
    ];

    const isAllowed = allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
            const pattern = allowed.replace('*', '.*');
            return new RegExp(pattern).test(origin);
        }
        return allowed === origin;
    });

    if (isAllowed) {
        response.headers['Access-Control-Allow-Origin'] = origin;
    } else {
        response.headers['Access-Control-Allow-Origin'] = allowedOrigins[0];
    }

    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
    response.headers['Access-Control-Max-Age'] = '86400';
    response.headers['Access-Control-Allow-Credentials'] = 'true';

    return response;
}
```

---

## Recent Security Fixes

### 1. Missing JWT Authorizer on Proxy Routes
**Issue:** Proxy routes were missing JWT authorization
**Impact:** Unauthenticated access to protected endpoints
**Fix:** Added `authorizer: httpAuthorizer` to all proxy routes
```typescript
// Fixed in cdk-stack.ts
httpApi.addRoutes({
    path: '/api/v1/pets/{proxy+}',
    methods: [HttpMethod.GET, HttpMethod.POST, ...],
    integration: entityIntegration,
    authorizer: httpAuthorizer  // ADDED
});
```

### 2. SourceIP Extraction Scope Issue
**Issue:** sourceIp variable was scoped inside try block
**Impact:** Audit logging failed on errors
**Fix:** Moved sourceIp extraction to function scope
```javascript
// Fixed pattern
async function login(event) {
    const sourceIp = event.requestContext?.http?.sourceIp || 'unknown';
    try {
        // ... operation
    } catch (error) {
        // sourceIp now accessible here
        await logFailedLogin(sourceIp, error);
    }
}
```

### 3. Tenant Context for Cognito Users
**Issue:** Cognito tokens don't include tenantId
**Impact:** Multi-tenant isolation failure
**Fix:** Database lookup fallback for tenant association
```javascript
// Implemented fallback pattern
if (!tenantId && claims.sub) {
    tenantId = await lookupTenantForUser(claims.sub);
}
```

---

## Security Checklist for New Features

- [ ] JWT validation implemented
- [ ] Tenant context extracted and validated
- [ ] All database queries include tenant isolation
- [ ] Input validation and sanitization
- [ ] Error messages don't expose sensitive data
- [ ] Audit logging for critical operations
- [ ] Rate limiting considered
- [ ] CORS headers properly configured
- [ ] Secrets stored in AWS Secrets Manager
- [ ] Permissions follow principle of least privilege
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (HTML sanitization)
- [ ] Soft delete pattern for data retention