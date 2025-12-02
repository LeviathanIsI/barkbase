# BarkBase Comprehensive Application Audit Report

**Generated:** December 1, 2025  
**Auditor:** AI-Assisted Code Review  
**Scope:** Full-stack production readiness audit

---

## Executive Summary

This audit evaluates BarkBase, a kennel management SaaS application, for production readiness. The application uses:
- **Frontend:** React with Vite, TanStack Query, Zustand
- **Backend:** AWS Lambda, API Gateway (HTTP API), Cognito
- **Database:** PostgreSQL (RDS)
- **Payment Processing:** Stripe

### Overall Assessment: **NOT PRODUCTION READY**

Critical issues were found in:
- JavaScript runtime errors that will crash the application
- Database schema inconsistencies
- Missing table definitions
- Security concerns with tenant isolation

---

## P0 - LAUNCH BLOCKERS
*Must fix before any customer uses the app*

### 1. **CRITICAL: `useTenantReady` Used Before Definition**

**Location:** `frontend/src/features/settings/api.js:582`

**Problem:** The function `useTenantReady()` is called on line 582, but it's not defined until line 684. In JavaScript, `const` declarations are NOT hoisted like `function` declarations. This causes a `ReferenceError: Cannot access 'useTenantReady' before initialization`.

**Impact:** The entire Settings feature crashes on load. Users cannot access any settings pages.

**Fix:**
```javascript
// Move this function definition to the TOP of the file (after imports, before any usage)
const useTenantReady = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated && Boolean(tenantId);
};
```

---

### 2. **CRITICAL: Missing "Facility" Table Definition**

**Location:** `docs/database-schema.sql:585`

**Problem:** The `Run` table references `"Facility"(id)` as a foreign key, but the `Facility` table is never defined in the schema. Only `FacilitySettings` exists.

```sql
-- Line 585 in database-schema.sql
facility_id uuid REFERENCES "Facility"(id) ON DELETE SET NULL,
```

**Impact:** Database migrations will fail. The Run feature cannot work properly.

**Fix:** Either:
1. Create a `Facility` table:
```sql
CREATE TABLE "Facility" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  capacity integer,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

2. Or change the reference to use `Kennel` table instead (if facilities are synonymous with kennels).

---

### 3. **CRITICAL: Vaccination Table Schema Mismatch**

**Location:** `aws/lambdas/entity-service/index.js:1886-1923` vs `docs/database-schema.sql:258-277`

**Problem:** The entity-service queries columns that don't exist in the schema:

| Entity Service Expects | Schema Has |
|------------------------|------------|
| `vaccine_name` | `type` |
| `vaccine_type` | - |
| `administered_date` | `administered_at` |
| `expiration_date` | `expires_at` |
| `next_due_date` | - |
| `manufacturer` | - |
| `administered_by` | - |
| `vet_clinic` | - |
| `vet_name` | - |
| `is_required` | - |
| `verified`, `verified_by`, `verified_at` | - |

**Impact:** All vaccination CRUD operations will fail with SQL errors.

**Fix:** Update the database schema to include all required columns, or update the Lambda to match the existing schema.

---

### 4. **CRITICAL: Pet Table Missing `owner_id` Column**

**Location:** `aws/lambdas/entity-service/index.js:1193-1195, 1363-1366, 1449-1453`

**Problem:** The entity-service queries `Pet` table with `owner_id` column in data export/delete functions, but the schema uses a junction table `PetOwner` for pet-owner relationships.

```javascript
// Entity service assumes:
const petsResult = await query(
  `SELECT * FROM "Pet" WHERE owner_id = $1 AND tenant_id = $2`,
  [ownerId, tenantId]
);

// But schema uses:
// PetOwner(pet_id, owner_id) junction table
```

**Impact:** GDPR data export and deletion for owners will fail.

**Fix:** Update the queries to use the `PetOwner` junction table:
```javascript
const petsResult = await query(
  `SELECT p.* FROM "Pet" p
   JOIN "PetOwner" po ON p.id = po.pet_id
   WHERE po.owner_id = $1 AND p.tenant_id = $2`,
  [ownerId, tenantId]
);
```

---

### 5. **SECURITY: Potential Tenant Isolation Bypass**

**Location:** `aws/lambdas/entity-service/index.js:49-81`

**Problem:** The `resolveTenantId` function has a fallback chain that could potentially return `null` and then queries proceed anyway in some handlers if the null check is missing or inconsistent.

Additionally, the tenant ID resolution from headers is trusted without validation against the authenticated user's actual tenant.

**Impact:** A malicious user could potentially send a forged `X-Tenant-Id` header to access another tenant's data.

**Fix:** Always validate that the X-Tenant-Id header matches the user's tenant from the JWT:
```javascript
function resolveTenantId(event) {
  const headerTenantId = /* from headers */;
  const jwtTenantId = event.user?.tenantId;
  
  // SECURITY: Validate header matches JWT
  if (headerTenantId && jwtTenantId && headerTenantId !== jwtTenantId) {
    console.error('[SECURITY] Tenant ID mismatch - possible attack');
    return null; // Force auth failure
  }
  
  return jwtTenantId || headerTenantId;
}
```

---

### 6. **CRITICAL: Missing Webhook Endpoint Route**

**Location:** `aws/cdk/lib/ApiCoreStack.ts:580-584`

**Problem:** The Stripe webhook route is defined as:
```typescript
path: '/api/v1/webhooks/stripe',
```

But the financial-service handler checks for:
```javascript
path === '/api/v1/financial/stripe/webhook'
```

**Impact:** Stripe webhooks will 404 and payment confirmations will never be processed.

**Fix:** Align the CDK route with the Lambda handler, or add both paths.

---

## P1 - HIGH PRIORITY
*Fix within first week of beta*

### 7. **Generate Invoice Endpoint Missing**

**Location:** `frontend/src/features/invoices/api.js:152-162`

**Problem:** Frontend calls `/api/v1/financial/invoices/generate/{bookingId}` but this endpoint doesn't exist in financial-service.

**Impact:** Cannot auto-generate invoices from bookings.

**Fix:** Add the endpoint to financial-service or remove the feature from UI.

---

### 8. **Owner Queries Missing `deleted_at` Filter**

**Location:** `aws/lambdas/entity-service/index.js:934-944`

**Problem:** The `getOwners` query doesn't filter by `deleted_at IS NULL`:
```javascript
const result = await query(
  `SELECT ... FROM "Owner" o WHERE o.tenant_id = $1
   ORDER BY o.last_name, o.first_name`,  // Missing: AND deleted_at IS NULL
  [tenantId]
);
```

**Impact:** Soft-deleted owners will still appear in lists.

**Fix:** Add `AND deleted_at IS NULL` to all owner queries.

---

### 9. **Reports/Analytics Disabled**

**Location:** `frontend/src/features/settings/api.js:493-545`

**Problem:** Multiple report queries are disabled with `enabled: false`:
```javascript
queryFn: disabledQuery, // Needs custom Lambda
enabled: false,
```

Affected features:
- Calendar Capacity
- Reports Dashboard  
- Bookings Insights

**Impact:** Reports page shows no data.

**Fix:** Implement the analytics-service endpoints or show appropriate "coming soon" messaging.

---

### 10. **Platform Billing Invoices Not Implemented**

**Location:** `frontend/src/features/settings/api.js:866-892`

**Problem:** The billing invoices query returns a hardcoded empty array:
```javascript
return {
  invoices: [],
  total: 0,
  message: 'Platform billing invoices coming soon',
};
```

**Impact:** Settings > Billing > Invoices tab shows no data.

**Fix:** Integrate with Stripe billing API or clearly mark as "coming soon" in UI.

---

### 11. **Email Sending Not Fully Implemented**

**Location:** `aws/layers/shared-layer/nodejs/email-utils.js` (referenced but needs verification)

**Problem:** Email sending functions are exported but SES configuration needs verification. Operations-service has email handlers but they may not be connected.

**Impact:** Booking confirmations, reminders, and notifications may not send.

**Fix:** Verify SES configuration and test all email flows.

---

## P2 - MEDIUM PRIORITY
*Fix during beta period*

### 12. **Inconsistent Error Handling Across Lambdas**

**Problem:** Each Lambda has slightly different error response formats and logging patterns.

**Impact:** Frontend error handling is inconsistent, user experience varies.

**Fix:** Standardize error response format:
```javascript
return createResponse(statusCode, {
  success: false,
  error: 'ErrorType',
  message: 'User-friendly message',
  code: 'UNIQUE_ERROR_CODE',
});
```

---

### 13. **Debug Console Logs in Production**

**Location:** Multiple files including `frontend/src/features/invoices/api.js:71-88`

**Problem:** Debug console.log statements left in production code:
```javascript
console.log('[useInvoicesQuery] raw response keys:', Object.keys(root || {}));
console.log('[useInvoicesQuery] raw response:', root);
```

**Impact:** Console spam in production, potential data exposure in browser devtools.

**Fix:** Remove or gate behind `process.env.NODE_ENV !== 'production'`.

---

### 14. **Missing Loading States on Some Pages**

**Problem:** Some settings pages show blank content during loading instead of skeleton or spinner states.

**Impact:** Poor user experience during data fetching.

**Fix:** Add `LoadingState` component usage consistently.

---

### 15. **Form Validation Inconsistency**

**Problem:** Some forms use Zod validation (AccountDefaults) while others have no validation.

**Impact:** Invalid data could be submitted to backend.

**Fix:** Implement consistent form validation across all input forms.

---

### 16. **Kennel/Facility Naming Confusion**

**Location:** Throughout codebase

**Problem:** The codebase uses both "Kennel" and "Facility" terminology inconsistently:
- Database has `Kennel` table
- API uses `/facilities` endpoints
- Entity-service maps Kennel → Facility

**Impact:** Confusing for developers and potential query errors.

**Fix:** Standardize on one term throughout.

---

## P3 - LOW PRIORITY
*Post-launch improvements*

### 17. **Performance: N+1 Query Patterns**

**Location:** Various handlers fetching related data

**Problem:** Some handlers make multiple queries instead of using JOINs.

**Fix:** Optimize queries with appropriate JOINs.

---

### 18. **Missing Database Indexes**

**Problem:** Some frequently queried columns lack indexes:
- `Booking.status` combined with date ranges
- `Task.scheduled_for` for date range queries

**Fix:** Add appropriate composite indexes.

---

### 19. **API Versioning Strategy**

**Problem:** Mixed use of v1 and v2 API paths without clear migration strategy.

**Fix:** Document API versioning strategy and deprecation timeline.

---

### 20. **TypeScript Migration**

**Problem:** Frontend uses `.jsx` files (JavaScript) rather than `.tsx` (TypeScript).

**Fix:** Consider migrating to TypeScript for better type safety.

---

## Database Table Checklist

| Table | Exists | Has tenant_id | Has deleted_at | Used in API | Notes |
|-------|--------|---------------|----------------|-------------|-------|
| Tenant | ✅ | N/A | ✅ | ✅ | |
| User | ✅ | ✅ | ✅ | ✅ | |
| Owner | ✅ | ✅ | ✅ | ✅ | Missing deleted_at filter in queries |
| Pet | ✅ | ✅ | ✅ | ✅ | |
| PetOwner | ✅ | ✅ | ❌ | ⚠️ | Not used consistently |
| Booking | ✅ | ✅ | ✅ | ✅ | |
| Vaccination | ✅ | ✅ | ✅ | ⚠️ | Schema mismatch |
| Invoice | ✅ | ✅ | ✅ | ✅ | |
| Payment | ✅ | ✅ | ❌ | ✅ | |
| Task | ✅ | ✅ | ✅ | ✅ | |
| Staff | ✅ | ✅ | ❌ | ✅ | |
| Service | ✅ | ✅ | ✅ | ⚠️ | Needs verification |
| Kennel | ✅ | ✅ | ✅ | ✅ | |
| Facility | ❌ | - | - | ⚠️ | **MISSING** |
| Run | ✅ | ✅ | ✅ | ⚠️ | Has FK to missing Facility |
| RunTemplate | ✅ | ✅ | ✅ | ⚠️ | |
| Package | ✅ | ✅ | ❌ | ✅ | |
| PaymentMethod | ✅ | ✅ | ❌ | ✅ | Added in migration |

---

## API Route Coverage

### Entity Service (`/api/v1/entity/*`)
| Route | Handler | Status |
|-------|---------|--------|
| GET /entity/pets | getPets | ✅ Working |
| POST /entity/pets | createPet | ✅ Working |
| GET /entity/pets/:id | getPet | ✅ Working |
| PUT /entity/pets/:id | updatePet | ✅ Working |
| DELETE /entity/pets/:id | deletePet | ✅ Working |
| GET /entity/pets/:id/vaccinations | getPetVaccinations | ⚠️ Schema mismatch |
| GET /entity/owners | getOwners | ⚠️ Missing deleted_at filter |
| GET /entity/facilities | getFacilities | ✅ Working (uses Kennel) |

### Operations Service (`/api/v1/operations/*`)
| Route | Handler | Status |
|-------|---------|--------|
| GET /operations/bookings | handleGetBookings | ✅ Working |
| POST /operations/bookings | handleCreateBooking | ✅ Working |
| POST /operations/bookings/:id/checkin | handleCheckIn | ✅ Working |
| POST /operations/bookings/:id/checkout | handleCheckOut | ✅ Working |
| GET /operations/tasks | handleGetTasks | ✅ Working |
| POST /notifications/email | handleSendEmail | ⚠️ Needs verification |

### Financial Service (`/api/v1/financial/*`)
| Route | Handler | Status |
|-------|---------|--------|
| GET /financial/invoices | handleGetInvoices | ✅ Working |
| POST /financial/invoices | handleCreateInvoice | ✅ Working |
| POST /financial/stripe/payment-intent | handleCreatePaymentIntent | ✅ Working |
| POST /webhooks/stripe | handleStripeWebhook | ⚠️ Route mismatch |

### Config Service (`/api/v1/config/*`, `/api/v1/settings/*`)
| Route | Handler | Status |
|-------|---------|--------|
| GET /config/tenant | handleGetTenantConfig | ✅ Working |
| GET /settings/sms | handleGetSmsSettings | ✅ Working |
| GET /settings/email | handleGetEmailSettings | ✅ Working |
| GET /settings/payments | handleGetPaymentSettings | ✅ Working |
| GET /account-defaults | handleGetAccountDefaults | ✅ Working |

---

## Recommended Fix Priority Order

### Week 1 (Before any beta user access):
1. Fix `useTenantReady` definition order (30 min)
2. Add `Facility` table or fix FK reference (1 hour)
3. Fix Vaccination schema mismatch (2-3 hours)
4. Fix Pet/Owner junction table queries (1-2 hours)
5. Add tenant ID validation security check (1 hour)
6. Fix Stripe webhook route (30 min)

### Week 2:
7. Add missing `deleted_at` filters (2 hours)
8. Implement invoice generation endpoint (4 hours)
9. Remove debug console.logs (1 hour)
10. Standardize error handling (4 hours)

### Week 3-4:
11. Implement disabled analytics queries (8 hours)
12. Add consistent loading states (4 hours)
13. Form validation standardization (4 hours)
14. Email flow verification (4 hours)

---

## Testing Recommendations

Before launch, verify these critical paths end-to-end:

1. **New Customer Flow:**
   - Create owner → Create pet → Add vaccination → Sign waiver → Create booking

2. **Daily Operations:**
   - View today's arrivals → Check in booking → Update task → Check out → Generate invoice

3. **Payment Flow:**
   - Create invoice → Send invoice → Process Stripe payment → Verify webhook received

4. **Settings:**
   - Update business info → Save → Refresh → Verify persistence

5. **Multi-tenant:**
   - Create two tenants → Verify data isolation → Test header manipulation

---

*End of Audit Report*

