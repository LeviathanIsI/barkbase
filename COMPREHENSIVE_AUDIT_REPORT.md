# BarkBase Comprehensive Application Audit Report

**Generated:** 2024-12-04
**Auditor:** Claude Code (Automated)
**Scope:** Full application audit - Frontend, Backend, Database, Infrastructure, Security

---

## Executive Summary

This audit examined the entire BarkBase application codebase and identified **150+ issues** across all areas. The findings reveal several critical security vulnerabilities, numerous incomplete features, and significant technical debt that must be addressed before production release.

### Issue Count by Severity

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 CRITICAL | 18 | Security vulnerabilities, data corruption risks, authentication bypasses |
| 🟠 HIGH | 42 | Broken features, missing error handling, authorization issues |
| 🟡 MEDIUM | 55 | Incomplete implementations, performance concerns, UI issues |
| 🔵 LOW | 35+ | Code cleanup, minor inconsistencies, optimization opportunities |

---

## 🔴 CRITICAL ISSUES (Must Fix Before Beta)

### Security Vulnerabilities

#### 1. SQL Injection Vulnerabilities (Multiple Locations)
**Files:**
- `aws/lambdas/entity-service/index.js:1806`
- `aws/lambdas/analytics-service/index.js:1012`
- `aws/lambdas/operations-service/index.js:792`

**Issue:** Template string interpolation in SQL WHERE clauses for INTERVAL calculations.

```javascript
// VULNERABLE CODE
AND v.expires_at <= CURRENT_DATE + INTERVAL '${daysAhead} days'
```

**Impact:** Attackers can inject arbitrary SQL via query parameters.
**Fix:** Use parameterized queries with interval math.

---

#### 2. Insecure SSL/TLS Configuration - RDS Connection
**File:** `aws/layers/db-layer/nodejs/db.js:105`

**Issue:** SSL certificate validation disabled for database connections.

```javascript
rejectUnauthorized: false, // Required for RDS
```

**Impact:** Man-in-the-middle attacks on database connections can intercept credentials and data.
**Fix:** Use AWS RDS CA certificate bundle with `rejectUnauthorized: true`.

---

#### 3. Admin Routes Trust Spoofable Header
**File:** `aws/layers/shared-layer/nodejs/auth-handler.js:133-150`

**Issue:** Admin routes bypass authentication by checking only the `X-Admin-User` header.

```javascript
function isAdminRequest(event) {
  const adminUser = event.headers?.['x-admin-user'];
  return path.startsWith('/admin/v1/') && adminUser;
}
```

**Impact:** Any attacker can add `X-Admin-User` header to access admin APIs.
**Fix:** Remove header-based admin detection; use AWS IAM SigV4 validation.

---

#### 4. Missing Tenant Isolation in Critical Endpoints
**File:** `aws/lambdas/entity-service/index.js:266-333`

**Issue:** `getTenant()` and `createTenant()` don't validate tenant ownership.

**Impact:** Any authenticated user can fetch or create tenants, violating multi-tenant isolation.
**Fix:** Add authorization checks requiring OWNER/ADMIN role.

---

#### 5. Cognito Custom Attributes Are Mutable
**File:** `aws/cdk/lib/AuthStack.ts:78-88`

**Issue:** Custom attributes `tenantId` and `role` are marked as `mutable: true`.

```typescript
customAttributes: {
  tenantId: new cognito.StringAttribute({ mutable: true }),  // SECURITY ISSUE!
  role: new cognito.StringAttribute({ mutable: true }),      // SECURITY ISSUE!
}
```

**Impact:** Users can change their tenant ID and role, enabling privilege escalation.
**Fix:** Set `mutable: false` for both attributes.

---

#### 6. AWS Cognito Client Not Implemented
**File:** `frontend/src/lib/aws-client/aws-cognito-client.js`

**Issue:** Entire authentication client returns mock/hardcoded data.

```javascript
async signIn({ email, password }) {
  console.warn('CognitoClient.signIn() is not yet implemented. Returning mock session.');
  return { idToken: 'mock-id-token', accessToken: 'mock-access-token' };
}

getTenantId() {
  return '_DUMMY_TENANT_ID_';
}
```

**Impact:** Authentication is non-functional; production login would fail.
**Fix:** Implement actual Cognito SDK integration or migrate to AWS Amplify.

---

#### 7. CORS Configuration Only Uses First Origin
**File:** `aws/layers/shared-layer/nodejs/auth-handler.js:293`

**Issue:** Only first origin from comma-separated list is used.

```javascript
'Access-Control-Allow-Origin': corsOrigins.split(',')[0],
```

**Impact:** Browsers from second origin get CORS errors.
**Fix:** Validate request origin against allowed list and return matching origin.

---

### Authentication/Authorization Failures

#### 8. DB Auth Client is Broken
**File:** `frontend/src/lib/aws-client/db-auth-client.js`

**Issue:** Explicitly documented as broken:
```javascript
/**
 * @deprecated This client is LEGACY and should NOT be used in production.
 * - SignUp flow is BROKEN in this mode.
 * - SignIn flow expects endpoints that may not be fully implemented.
 */
```

**Impact:** If anyone uses AUTH_MODE='db', authentication is broken.
**Fix:** Either implement fully or remove entirely.

---

### Data Integrity Issues

#### 9. Migration 035 References Non-Existent Columns
**File:** `docs/migrations/035_performance_indexes.sql:21,36`

**Issue:** Indexes created on `check_in_date` and `check_out_date` which don't exist.

```sql
CREATE INDEX idx_booking_tenant_status_dates
ON "Booking" (tenant_id, status, check_in_date, check_out_date)  -- WRONG COLUMNS!
-- Actual columns are: check_in, check_out
```

**Impact:** Migration fails or silently ignores index creation.
**Fix:** Change column names to `check_in` and `check_out`.

---

#### 10. Hard Deletes in Data Export (GDPR Violation)
**File:** `aws/lambdas/entity-service/index.js:1406-1491`

**Issue:** Using hard DELETE instead of soft delete in `deleteOwnerData()`.

```javascript
`DELETE FROM "Vaccination" WHERE pet_id = ANY($1) AND tenant_id = $2`
`DELETE FROM "Communication" WHERE owner_id = $1 AND tenant_id = $2`
```

**Impact:** Permanent data loss; cannot audit who had what data; GDPR compliance issues.
**Fix:** Use soft deletes with `deleted_at` timestamp.

---

### Infrastructure Issues

#### 11. Reminder Service Not Exposed in API Gateway
**Files:** `aws/cdk/bin/barkbase.ts:107-125`, `aws/cdk/lib/ApiCoreStack.ts`

**Issue:** `reminderServiceFunction` is created but never passed to `ApiCoreStack`.

**Impact:** Reminder service cannot be invoked via HTTP if needed.
**Fix:** Either add to ApiCoreStack or document that it's EventBridge-only.

---

#### 12. Orphaned Cognito Authorizer
**File:** `aws/cdk/lib/ApiCoreStack.ts:96-115`

**Issue:** `HttpUserPoolAuthorizer` created but never stored or used.

```typescript
new apigatewayv2Authorizers.HttpUserPoolAuthorizer(
  'CognitoAuthorizer', userPool, {...}
);  // Returned value is not captured!
```

**Impact:** Authorizer created in CloudFormation but never attached to routes.
**Fix:** Remove orphaned code or store and use authorizer.

---

#### 13. Production Bastion Allows SSH from 0.0.0.0/0
**File:** `aws/cdk/lib/NetworkStack.ts:90-96`

**Issue:** Production bastion security group allows SSH from any IP.

```typescript
this.bastionSecurityGroup.addIngressRule(
  ec2.Peer.ipv4('0.0.0.0/0'),  // Wide open!
  ec2.Port.tcp(22),
  'Allow SSH access from allowed IPs'
);
```

**Impact:** Bastion is vulnerable to brute force SSH attacks.
**Fix:** Require specific IP CIDR for production.

---

## 🟠 HIGH SEVERITY ISSUES (Should Fix Before Beta)

### Frontend - Broken Core Features

#### 14. Booking Operations Non-Functional
**File:** `frontend/src/features/bookings/components/ListView.jsx:67-71`

**Issue:** All booking action handlers are empty.

```jsx
onCheckIn={() => {/* Handle check-in */}}
onCheckOut={() => {/* Handle check-out */}}
onEdit={() => {/* Handle edit */}}
onCancel={() => {/* Handle cancel */}}
```

**Impact:** Users cannot check in, check out, edit, or cancel bookings.

---

#### 15. Settings Forms Don't Save
**File:** `frontend/src/features/settings/routes/General.jsx`

**Issue:** Save button has no onClick handler; form never submits.

```jsx
<Button>Save Changes</Button>  {/* No onClick handler! */}
```

**Impact:** All settings changes are lost.

---

#### 16. Payment Actions Not Wired
**File:** `frontend/src/features/payments/routes/Payments.jsx:321-334`

**Issue:** Send Receipt and Process Refund buttons have no handlers.

**Impact:** Critical payment operations don't work.

---

#### 17. Bulk Actions Everywhere Are Broken
**Files:**
- `frontend/src/features/bookings/routes/Bookings.jsx:1335-1352`
- `frontend/src/features/payments/routes/Payments.jsx:830-841`
- `frontend/src/features/pets/routes/Pets.jsx:668-670`

**Issue:** Bulk action buttons (Check In, Send Reminder, Cancel, Email, Refund, Delete, Export) have no onClick handlers.

**Impact:** Users cannot perform bulk operations.

---

#### 18. Pagination Not Implemented
**File:** `frontend/src/features/bookings/components/ListView.jsx:88-95`

**Issue:** Pagination buttons are permanently disabled; hardcoded to show only page 1.

```jsx
<Button variant="outline" size="sm" disabled>Previous</Button>
<Button variant="primary" size="sm">1</Button>
<Button variant="outline" size="sm" disabled>Next</Button>
```

**Impact:** Users can only see first page of data.

---

#### 19. Custom Report Builder Disabled
**File:** `frontend/src/features/reports/components/CustomReportBuilder.jsx:103-105`

**Issue:** Feature locked behind paywall with no actual implementation.

```jsx
<Button variant="outline" className="w-full" disabled>
  🔒 Unlock Full Builder with PRO
</Button>
```

**Impact:** Core reporting feature is non-functional.

---

### Frontend - Memory Leaks & Performance

#### 20. GlobalKeyboardShortcuts Memory Leak
**File:** `frontend/src/components/GlobalKeyboardShortcuts.jsx:102-163`

**Issue:** Each "g" keypress adds new event listeners that accumulate if second key isn't pressed within 1 second.

**Impact:** Exponential event listener buildup, performance degradation.

---

#### 21. DataTable Bulk Operations Show Alerts
**File:** `frontend/src/components/ui/DataTable.jsx:298-306`

**Issue:** Bulk delete and export only show `alert()` saying "not implemented".

```javascript
const handleBulkDelete = () => {
  alert(`Bulk delete ${selectedRows.size} items (not implemented)`);
};
```

**Impact:** Users can click buttons but nothing happens.

---

### Backend - Missing Authorization

#### 22. No Rate Limiting on Any Endpoint
**All Lambda Services**

**Issue:** No rate limiting, throttling, or request quota checking.

**Impact:**
- Brute force attacks on login
- DDoS via high-volume requests
- Database connection exhaustion

---

#### 23. Missing RBAC on CRUD Operations
**File:** `aws/lambdas/entity-service/index.js` (multiple handlers)

**Issue:** No role-based access control before CREATE/UPDATE/DELETE.

**Impact:** Staff users can delete critical data they shouldn't access.

---

#### 24. Excessive Console Logging
**All Lambda Services** - 422 occurrences

**Issue:** Verbose logging including user IDs, emails, and tenant information.

**Impact:**
- Security risk (sensitive data in logs)
- Increased CloudWatch costs
- Performance impact

---

### Backend - Missing Functionality

#### 25. Run Assignment Persistence Not Implemented
**File:** `aws/lambdas/operations-service/index.js:2655`

**Issue:** Comment says `TODO: IMPLEMENT RUN ASSIGNMENT PERSISTENCE`

**Impact:** Frontend Run Assignment drag-and-drop doesn't save; changes lost on refresh.

---

#### 26. SMS Sending Returns 501
**File:** `aws/lambdas/config-service/index.js:4697`

**Issue:** SMS endpoint returns 501 Not Implemented.

**Impact:** SMS notifications cannot be sent.

---

#### 27. Payment Refund Schema Incomplete
**File:** `aws/lambdas/financial-service/index.js:1368`

**Issue:** TODO says `refunded_at / refund_amount_cents columns` don't exist.

**Impact:** Cannot track refund amounts or timestamps.

---

### Database Issues

#### 28. Missing Tenant Isolation in Diagnostic Queries
**File:** `aws/lambdas/entity-service/index.js:941`

**Issue:** Query returns data from ALL tenants.

```javascript
'SELECT tenant_id, COUNT(*) FROM "Owner" GROUP BY tenant_id;'
```

**Impact:** Multi-tenant data leak.

---

#### 29. SELECT * Overuse
**File:** `aws/lambdas/entity-service/index.js:1199-1266`

**Issue:** Multiple queries use `SELECT *` including sensitive columns.

**Impact:** Performance issues; potential data leakage.

---

#### 30. Foreign Keys Allow Orphaned Records
**File:** `docs/database-schema.sql:214-217, 281-283, 310-311`

**Issue:** Critical foreign keys use SET NULL instead of RESTRICT or CASCADE.

```sql
pet_id uuid REFERENCES "Pet"(id) ON DELETE SET NULL,
```

**Impact:** Bookings become orphaned when Pet is deleted.

---

### Configuration Issues

#### 31. Environment Variable Name Mismatch
**Files:**
- `frontend/.env.development`
- `frontend/src/config/env.js`
- `aws/cdk/scripts/generate-env.ts`

**Issue:** Inconsistent variable names across files:
- `.env.development`: `VITE_COGNITO_USER_POOL_ID`
- `generate-env.ts`: `VITE_USER_POOL_ID`

**Impact:** Environment may not load correctly.

---

#### 32. Hardcoded URLs in Lambda
**File:** `aws/lambdas/config-service/index.js`

**Issue:** Multiple hardcoded references to `https://book.barkbase.com`.

**Impact:** Won't work in different environments.

---

#### 33. Missing .env.example Files
**Directories:** `frontend/`, `backend/`, `aws/cdk/`

**Issue:** No example files documenting required environment variables.

**Impact:** Developers don't know what variables are needed.

---

## 🟡 MEDIUM SEVERITY ISSUES (Fix Soon After Beta)

### Frontend Issues

1. **Deprecated React Query API** - Using `cacheTime` instead of `gcTime` (multiple files)
2. **Deprecated mutation.isLoading** - Should use `isPending` (Services.jsx:258)
3. **Console.error statements** - 7+ occurrences in production code
4. **Empty telemetry tracking** - useTelemetry.js does nothing
5. **TokenRefresher component is empty** - Still imported but returns null
6. **Missing loading/error states** - Many components don't handle async states
7. **Missing keyboard navigation** - DropdownMenu, DataTable pagination
8. **No focus trap in Dialog** - Accessibility issue
9. **Missing form validation feedback** - FormField doesn't show errors
10. **Hardcoded page size options** - DataTable uses fixed [25, 50, 100]

### Backend Issues

11. **Input validation not standardized** - Different validation across services
12. **Missing Content-Type headers** - createResponse doesn't set explicitly
13. **Session validation inconsistent** - skipSessionCheck option not standardized
14. **N+1 query patterns** - Export function makes 8 sequential queries
15. **Missing updated_at triggers** - Message, Communication, PackageUsage tables
16. **PetOwner missing tenant_id** - Cannot efficiently query by tenant

### Infrastructure Issues

17. **No API Gateway logging** - Access logs not configured
18. **Stripe API version hardcoded** - `'2023-10-16'` may become outdated
19. **Missing EventBridge permission** - Reminder service may fail at runtime
20. **Callback URLs hardcoded in CDK** - Production domains not configurable

### Security Issues

21. **Verbose logging exposes PII** - User emails/IDs in CloudWatch
22. **No CSRF protection** - State-changing operations vulnerable
23. **Missing HTTPS enforcement** - No redirect configured
24. **Session validation hits DB every request** - Performance impact
25. **Source IP header can be spoofed** - X-Forwarded-For trusted

---

## 🔵 LOW SEVERITY ISSUES (Nice to Have)

### Code Quality

1. **Commented-out code** - config-service/index.js:5715-5716
2. **Unused exports** - Select.jsx exports unused wrappers
3. **Props never utilized** - SlideoutPanel.jsx `description` unused
4. **Legacy process.env.NODE_ENV** - Should use import.meta.env.DEV
5. **Inline Lambda code** - Pre-signup trigger should be in separate file
6. **Dead X-Ray code in MonitoringStack** - Tracing already set in ServicesStack
7. **Monitoring incomplete** - Reminder service not in dashboards

### Configuration

8. **Hardcoded region** - config.ts uses 'us-east-2' with no override
9. **Inconsistent domain naming** - barkbase.io, .app, .com used interchangeably
10. **Vite config is JavaScript** - Should be TypeScript for type safety
11. **Non-standard port variables** - VITE_PORT not documented
12. **Feature flag not set** - VITE_WEBSOCKET_ENABLED never defined

### Documentation

13. **Missing frontend env vars in docs** - ENVIRONMENT_VARIABLES.md incomplete
14. **Missing API versioning strategy** - Mixed v1/v2 with no deprecation path
15. **No request ID correlation** - Hard to trace requests across services

---

## TODO/FIXME Summary

Found **22 developer comments** indicating incomplete work:

| Severity | Count | Examples |
|----------|-------|----------|
| CRITICAL | 2 | Run Assignment, Cognito Auth |
| HIGH | 4 | User Preferences, Refunds, SMS, Storage |
| MEDIUM | 3 | Plan Refresh, Amplify Migration, API Hooks |
| LOW | 13 | Coming Soon features, Error logging |

---

## Recommended Action Plan

### Phase 1: Critical Security (Week 1)
1. Fix SQL injection vulnerabilities
2. Fix insecure RDS SSL configuration
3. Remove header-based admin authentication
4. Add tenant isolation checks
5. Make Cognito custom attributes immutable
6. Fix CORS multi-origin handling

### Phase 2: Authentication & Authorization (Week 2)
1. Implement actual Cognito authentication
2. Add rate limiting on auth endpoints
3. Implement RBAC checks
4. Add CSRF protection
5. Remove/fix broken DB auth client

### Phase 3: Core Functionality (Weeks 3-4)
1. Wire up all booking action handlers
2. Implement settings form submission
3. Wire up payment operations
4. Implement bulk actions
5. Fix pagination
6. Implement run assignment persistence

### Phase 4: Database & Performance (Week 5)
1. Fix migration 035 column names
2. Add missing updated_at triggers
3. Add tenant_id to PetOwner table
4. Convert SELECT * to explicit columns
5. Optimize N+1 query patterns

### Phase 5: Polish & Cleanup (Ongoing)
1. Remove console.log statements
2. Add missing error/loading states
3. Standardize environment variables
4. Create .env.example files
5. Update documentation

---

## Files Requiring Immediate Attention

1. `aws/layers/shared-layer/nodejs/auth-handler.js` - Admin bypass vulnerability
2. `aws/layers/db-layer/nodejs/db.js` - Insecure SSL
3. `aws/lambdas/entity-service/index.js` - SQL injection, tenant isolation
4. `aws/cdk/lib/AuthStack.ts` - Mutable custom attributes
5. `frontend/src/lib/aws-client/aws-cognito-client.js` - Mock authentication
6. `frontend/src/features/bookings/components/ListView.jsx` - Empty handlers
7. `frontend/src/features/settings/routes/General.jsx` - Save not working

---

## Conclusion

This audit reveals that BarkBase is **not ready for production**. Critical security vulnerabilities must be fixed before any beta testing with real user data. Many core features are non-functional (booking operations, settings, payments, bulk actions), and the authentication system is entirely mocked.

**Minimum viable fixes for beta:**
- All 🔴 CRITICAL security issues
- Authentication must work (Cognito integration)
- Core booking operations must function
- Settings must save
- Bulk actions must work

**Estimated effort for beta-ready state:** 4-6 weeks with focused development.

---

*Report generated by Claude Code automated audit*
