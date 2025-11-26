# BarkBase Codebase Audit — Round 2

**Generated:** November 26, 2025  
**Auditor:** Claude AI  
**Scope:** Full monorepo scan

---

## Table of Contents

1. [Repo Map](#1-repo-map)
2. [Unfinished / Incomplete Work](#2-unfinished--incomplete-work)
3. [API Versioning / Endpoint Issues](#3-api-versioning--endpoint-issues)
4. [Duplicate or Overlapping Code](#4-duplicate-or-overlapping-code)
5. [Unused / Orphaned Code](#5-unused--orphaned-code)
6. [UI / State Management Inconsistencies](#6-ui--state-management-inconsistencies)
7. [Backend Service Gaps](#7-backend-service-gaps)
8. [CDK / Infra Issues](#8-cdk--infra-issues)
9. [Integration Problems / Cross-Service Mismatches](#9-integration-problems--cross-service-mismatches)
10. [Top 10 Recommended Next Fixes](#10-top-10-recommended-next-fixes)

---

## 1. Repo Map

### Directory Structure

| Folder | Purpose | Status |
|--------|---------|--------|
| `frontend/src/` | React SPA - Vite + TailwindCSS | ✅ Active |
| `frontend/src/features/` | Domain-driven feature modules | ✅ Active |
| `frontend/src/features/placeholders/_archive/` | 70+ archived placeholder components | ⚠️ Orphaned |
| `frontend/src/components/` | Shared UI components (primitives, layout, navigation) | ✅ Active |
| `frontend/src/stores/` | Zustand stores (auth, tenant, ui, booking) | ✅ Active |
| `frontend/src/lib/` | Utilities, API client, query config | ✅ Active |
| `aws/lambdas/` | 55+ Lambda function directories | ⚠️ Mixed (legacy + active) |
| `aws/cdk/lib/` | CDK infrastructure stacks | ⚠️ Some empty placeholder stacks |
| `aws/cdk/bin/` | CDK app entry points | ✅ Active |
| `aws/layers/` | Shared Lambda layers (auth-layer, db-layer) | ✅ Active |
| `aws/scripts/` | Migration and schema scripts | ✅ Active |
| `backend/src/` | Express.js local dev server (mirrors Lambda logic) | ✅ Active |
| `shared/` | Shared TypeScript utilities (minimal usage) | ⚠️ Underutilized |
| `docs/` | Documentation and troubleshooting guides | ✅ Active |

### Suspicious Overlaps

| Area | Issue |
|------|-------|
| `backend/` vs `aws/lambdas/` | Parallel implementations for local dev vs Lambda - logic drift possible |
| `frontend/src/features/placeholders/_archive/` | 70+ components marked archived but still in repo |
| Legacy Lambdas (`pets-api`, `owners-api`, etc.) | Marked as "superseded" via TODO comments but folders still exist |
| Multiple modal/dialog implementations | `Modal.jsx`, `Dialog.jsx`, `AlertDialog.jsx`, `ConfirmDialog.jsx`, `SlidePanel.jsx`, `SlideOutDrawer.jsx` |

---

## 2. Unfinished / Incomplete Work

### High Severity

| Area | File | Line | Evidence | What's Missing | Severity | Recommended Action |
|------|------|------|----------|----------------|----------|-------------------|
| Handler Flows | `frontend/src/features/handlerFlows/api.js` | 3-62 | `// handler-flows endpoints DISABLED (backend not implemented)` | Entire backend Lambda missing | **HIGH** | Either implement handler-flows Lambda or remove UI feature |
| Associations API | `frontend/src/features/settings/api/associations.js` | 39-79 | `throw new Error('Associations API not implemented')` | Backend endpoints for association labels | **HIGH** | Implement associations backend or disable UI |
| Calendar API | `frontend/src/features/calendar/api.js` | 9-64 | `enabled: false, // Disabled until backend is implemented` | Dedicated calendar Lambda for occupancy/suggestions | **HIGH** | Implement calendar service or keep disabled |
| Reports API | `frontend/src/features/reports/api.js` | 8-21 | `// TODO: All reports require dedicated Lambdas` | Report aggregation Lambdas | **HIGH** | Implement analytics-service report endpoints |
| Cascade Operations | `aws/lambdas/properties-api-v2/handlers/cascade-operations.js` | 209, 221 | `// TODO: Implement full substitute logic`, `// TODO: Implement full force delete logic` | Complete substitute and force-delete property logic | **HIGH** | Complete cascade handler implementation |

### Medium Severity

| Area | File | Line | Evidence | What's Missing | Severity | Recommended Action |
|------|------|------|----------|----------------|----------|-------------------|
| Tenant Plan Refresh | `frontend/src/stores/tenant.js` | 123 | `// TODO: Create a '/tenants/current/plan' Lambda` | Endpoint to refresh plan/usage limits | **MEDIUM** | Add plan endpoint to config-service |
| Email Sending | `aws/lambdas/financial-service/index.js` | 523 | `// TODO: Integrate with AWS SES or communication service` | SES integration for invoice emails | **MEDIUM** | Implement SES integration |
| Notifications Backend | `frontend/src/components/QuickAccessBar.jsx` | 22 | `// NOTE: Backend notifications endpoint not implemented` | Notification count endpoint | **MEDIUM** | Implement notification-service |
| Property Archival Notifications | `aws/lambdas/property-archival-job/index.js` | 132 | `// TODO: Integrate with actual notification system` | SES/SNS integration | **MEDIUM** | Wire up notification sending |
| Error Logging | `frontend/src/app/ErrorBoundary.jsx` | 36 | `// NOTE: Backend error logging endpoint not implemented` | Error reporting service | **MEDIUM** | Implement error logging endpoint |

### Low Severity (UI Placeholders)

| Area | File | Line | Evidence | Severity |
|------|------|------|----------|----------|
| Messages - New Conversation | `frontend/src/features/messaging/routes/Messages.jsx` | 440 | `toast.info('New conversation modal coming soon')` | LOW |
| Messages - Templates | `frontend/src/features/messaging/routes/Messages.jsx` | 466 | `toast.info('Templates coming soon')` | LOW |
| Payments - Retry | `frontend/src/features/payments/routes/Payments.jsx` | 721 | `toast.info('Retry payment functionality coming soon')` | LOW |
| Pet Detail - Check Out | `frontend/src/features/pets/routes/PetDetail.jsx` | 910 | `toast.info('Check out feature coming soon')` | LOW |
| Customer Detail - Edit | `frontend/src/features/customers/routes/CustomerDetail.jsx` | 248 | `toast.info('Edit coming soon')` | LOW |
| Owner Detail - Edit | `frontend/src/features/owners/routes/OwnerDetail.jsx` | 74 | `toast.info('Edit functionality coming soon')` | LOW |
| Reports - Scheduling | `frontend/src/features/reports/components/ReportCategories.jsx` | 185 | `// TODO: Implement scheduling` | LOW |
| Reports - Birthday Cards | `frontend/src/features/reports/components/ReportCategories.jsx` | 206 | `// TODO: Implement birthday cards` | LOW |

### Settings Features Not Wired

| Feature | File | Evidence |
|---------|------|----------|
| Team Routing | `frontend/src/features/settings/routes/components/TeamRouting.jsx:40` | `// TODO: Open routing configuration modal` |
| Mobile Push | `frontend/src/features/settings/routes/components/MobilePush.jsx:7` | `// TODO: Implement app download` |
| Notification Schedule | `frontend/src/features/settings/routes/components/NotificationSchedule.jsx:41` | `// TODO: Open DND configuration modal` |
| Notification Testing | `frontend/src/features/settings/routes/components/NotificationTesting.jsx:25` | `// TODO: Send test notification` |
| Industry Templates | `frontend/src/features/settings/routes/components/IndustryTemplatesModal.jsx:84-94` | `// TODO: Open template preview`, `// TODO: Navigate to create service page` |
| Integration Requests | `frontend/src/features/settings/routes/components/RequestIntegrationModal.jsx:17` | `// TODO: Submit integration request` |

---

## 3. API Versioning / Endpoint Issues

### Frontend Calls Without Backend Support

| Endpoint Pattern | Called From | Backend Status | Action Needed |
|------------------|-------------|----------------|---------------|
| `/api/v1/handler-flows*` | `frontend/src/features/handlerFlows/api.js` | ❌ No Lambda | Implement or remove feature |
| `/api/associations`, `/api/v1/settings` | `frontend/src/features/settings/api/associations.js` | ❌ No Lambda | Implement associations service |
| `/api/v1/calendar*` | `frontend/src/features/calendar/api.js` | ❌ No Lambda | Keep disabled or implement |
| `/api/v1/reports/dashboard` | `frontend/src/features/reports/api.js` | ❌ No Lambda | Implement in analytics-service |
| `/api/v1/notifications/unread-count` | Referenced in QuickAccessBar | ❌ No Lambda | Implement notification service |
| `/api/v1/integrations/*` | Settings pages | ❌ No Lambda | Future work |
| `/api/v1/auth/change-password` | `frontend/src/features/settings/routes/Profile.jsx:247` | ⚠️ Needs verification | Verify auth-api supports this |
| `/api/v1/auth/sessions/*` | `frontend/src/features/settings/routes/Profile.jsx:285-303` | ⚠️ Needs verification | Verify session management routes |

### Backend Routes Not Used by Frontend

| Endpoint | Lambda | Frontend Usage | Action |
|----------|--------|----------------|--------|
| `/api/v1/segments/refresh` | features-service | ❌ Not called | Keep for future use |
| `/api/v1/admin/stats` | admin-api | ❌ Not visible in UI | Wire to admin dashboard |
| `/api/v1/billing/overview` | financial-service | ❌ Not called | Wire to billing dashboard |

### API Version Inconsistency

| Issue | Files | Details |
|-------|-------|---------|
| Properties mixed v1/v2 | `frontend/src/features/settings/api.js` | Some calls use v1, some v2 - need full v2 migration |
| Canonical endpoints file | `frontend/src/lib/canonicalEndpoints.ts` | Well-structured but not universally used |

---

## 4. Duplicate or Overlapping Code

### Modal/Dialog Implementations

| Pattern | Files | Why Duplicated | Suggested Fix |
|---------|-------|----------------|---------------|
| Modal containers | `Modal.jsx`, `Dialog.jsx`, `AlertDialog.jsx`, `ConfirmDialog.jsx`, `SlidePanel.jsx`, `SlideOutDrawer.jsx`, `AssociationModal.jsx` | Evolved independently over time | Consolidate to 2-3 base patterns: Modal, SlidePanel, AlertDialog |

**Files involved:**
- `frontend/src/components/ui/Modal.jsx`
- `frontend/src/components/ui/Dialog.jsx`
- `frontend/src/components/ui/AlertDialog.jsx`
- `frontend/src/components/ui/ConfirmDialog.jsx`
- `frontend/src/components/ui/SlidePanel.jsx`
- `frontend/src/components/ui/SlideOutDrawer.jsx`
- `frontend/src/components/ui/AssociationModal.jsx`

### API Hook Patterns

| Pattern | Files | Issue | Suggested Fix |
|---------|-------|-------|---------------|
| Disabled query stubs | `handlerFlows/api.js`, `calendar/api.js`, `reports/api.js`, `settings/api/associations.js` | Same disabled pattern repeated | Create `createDisabledHook()` factory |
| Tenant key extraction | 15+ api files | `const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default')` | Move to shared utility |

### Entity List/Table Patterns

| Pattern | Files | Issue |
|---------|-------|-------|
| DataTable + Toolbar + Filters | `Pets.jsx`, `Owners.jsx`, `Bookings.jsx`, `Kennels.jsx`, `Tasks.jsx`, `Payments.jsx`, `Invoices.jsx` | Similar structure, minor variations |
| Entity detail patterns | `PetDetail.jsx`, `OwnerDetail.jsx`, `CustomerDetail.jsx` | Similar tab structures |

### Lambda Error Response Patterns

| Pattern | Files | Issue |
|---------|-------|-------|
| `ok()`/`fail()` helpers | Each consolidated Lambda has its own copy | Should be in shared layer |
| Security headers | `entity-service`, `features-service`, `operations-service`, etc. | Copied across services |

**Suggestion:** Move common response helpers to `auth-layer` or create dedicated `response-layer`.

---

## 5. Unused / Orphaned Code

### Archived Placeholder Components (Safe to Delete)

| Path | Description | Safe to Delete |
|------|-------------|----------------|
| `frontend/src/features/placeholders/_archive/` | 70+ placeholder components | **YES** - documented as "DO NOT IMPORT" |

**Component count:** 57 components + 13 route files

Key orphaned components:
- `PaymentsDashboard.jsx` - uses deprecated patterns
- `SetupWizard.jsx` - never wired
- `StaffWizard.jsx` (archived version)
- `QuickActionsBar.jsx` - superseded by QuickAccessBar
- `ReportCategories.jsx` (archived version)

### Legacy Lambda Folders (Tombstones)

These Lambdas have TODO comments indicating they're superseded:

| Lambda | Status | Comment | Safe to Delete |
|--------|--------|---------|----------------|
| `pets-api` | Tombstone | Returns 410 Gone | **YES** |
| `owners-api` | Tombstone | Superseded by entity-service | **YES** |
| `staff-api` | Tombstone | Superseded by entity-service | **YES** |
| `bookings-api` | Tombstone | Superseded by operations-service | **YES** |
| `kennels-api` | Tombstone | Superseded by operations-service | **YES** |
| `runs-api` | Tombstone | Superseded by operations-service | **YES** |
| `check-in-api` | Tombstone | Superseded by operations-service | **YES** |
| `check-out-api` | Tombstone | Superseded by operations-service | **YES** |
| `tasks-api` | Tombstone | Superseded by features-service | **YES** |
| `notes-api` | Tombstone | Superseded by features-service | **YES** |
| `messages-api` | Tombstone | Superseded by features-service | **YES** |
| `incidents-api` | Tombstone | Superseded by features-service | **YES** |
| `communication-api` | Tombstone | Superseded by features-service | **YES** |
| `invites-api` | Tombstone | Superseded by features-service | **YES** |
| `tenants-api` | Tombstone | Superseded by config-service | **YES** |
| `roles-api` | Tombstone | Superseded by config-service | **YES** |
| `memberships-api` | Tombstone | Superseded by config-service | **YES** |
| `services-api` | Tombstone | Superseded by config-service | **YES** |
| `account-defaults-api` | Tombstone | Superseded by config-service | **YES** |
| `facility-api` | Tombstone | Superseded by config-service | **YES** |
| `user-permissions-api` | Tombstone | Superseded by config-service | **YES** |
| `dashboard-api` | Tombstone | Superseded by analytics-service | **YES** |
| `reports-api` | Tombstone | Superseded by analytics-service | **YES** |
| `schedule-api` | Tombstone | Superseded by analytics-service | **YES** |
| `properties-api` (v1) | Tombstone | Superseded by properties-api-v2 | **YES** |

### Unused Lambda Scaffolds

| Lambda | Status | Safe to Delete |
|--------|--------|----------------|
| `packages-api` | Only has `package.json`, no handler | **YES** |
| `migration-orchestrator` | Not wired in CDK | **MAYBE** - verify if used by scripts |
| `migration-runner` | Not wired in CDK | **MAYBE** - verify if used by scripts |
| `schema-version-service` | Not deployed via CDK | **MAYBE** |

### Potentially Unused Frontend Files

| File | Evidence | Safe to Delete |
|------|----------|----------------|
| `frontend/src/components/shared/PlaceholderPage.jsx` | Minimal imports found | **MAYBE** |
| `frontend/src/features/pets-people/` | Empty directory | **YES** |

---

## 6. UI / State Management Inconsistencies

### React Query vs Legacy Patterns

| Component | Issue | Files |
|-----------|-------|-------|
| useState + useEffect for data fetching | Legacy pattern still exists | ~30 files with `useState` for data |
| Inconsistent query invalidation | Some mutations don't invalidate properly | Various api.js files |

### Form Handling Patterns

| Pattern | Files Using | Issue |
|---------|-------------|-------|
| Controlled inputs + useState | Most forms | Consistent but verbose |
| Uncontrolled forms | Minimal | Not an issue |

### Accessibility Gaps

| Issue | Evidence |
|-------|----------|
| Limited ARIA usage | Only 39 matches for `aria-|role=|tabindex` across features |
| Missing keyboard navigation | Most modals/dialogs could use better focus management |
| No screen reader announcements | Live regions not implemented |

### Console.log Statements (Development Residue)

| Count | Path |
|-------|------|
| 68 total | Distributed across 30 files |

Top offenders:
- `frontend/src/features/communications/api.js` - 7 instances
- `frontend/src/features/dashboard/api.js` - 8 instances
- `frontend/src/features/pets/routes/PetDetail.jsx` - 6 instances

**Recommendation:** Add ESLint rule to warn on console statements in production builds.

### CSS Variable Usage

Generally consistent use of design tokens (`--bb-color-*`, `--bb-space-*`), but some inline styles remain with hardcoded colors.

---

## 7. Backend Service Gaps

### Entity Service (`aws/lambdas/entity-service/index.js`)

| Issue | Severity | Details |
|-------|----------|---------|
| Temporary logging | LOW | Lines 448, 465: `// TEMPORARY LOGGING` |
| Error handling | OK | Uses proper try/catch with rollback |

### Features Service (`aws/lambdas/features-service/index.js`)

| Issue | Severity | Details |
|-------|----------|---------|
| Segments refresh stub | MEDIUM | Line 527: Returns hardcoded `{ updated: 0 }` |
| Communication table fallbacks | OK | Gracefully handles missing table |
| Missing input validation | MEDIUM | Some POST routes don't validate all required fields |

### Properties API v2 (`aws/lambdas/properties-api-v2/`)

| Issue | Severity | Details |
|-------|----------|---------|
| Substitute not implemented | HIGH | `cascade-operations.js:209` |
| Force delete not implemented | HIGH | `cascade-operations.js:221` |

### Financial Service (`aws/lambdas/financial-service/index.js`)

| Issue | Severity | Details |
|-------|----------|---------|
| Email sending stub | MEDIUM | Line 523: TODO for SES integration |

### Auth API (`aws/lambdas/auth-api/index.js`)

| Issue | Severity | Details |
|-------|----------|---------|
| Session management | UNKNOWN | Frontend calls `/api/v1/auth/sessions/*` - verify implementation |
| Password change | UNKNOWN | Frontend calls `/api/v1/auth/change-password` - verify implementation |

### General Lambda Issues

| Pattern | Affected Lambdas | Issue |
|---------|------------------|-------|
| Missing rate limiting | All | No built-in rate limiting beyond API Gateway |
| Inconsistent tenant isolation | Verify all | Need audit of tenant filtering in queries |

---

## 8. CDK / Infra Issues

### Empty/Placeholder Stacks

| Stack | File | Status |
|-------|------|--------|
| `BillingAnalyticsStack` | `aws/cdk/lib/BillingAnalyticsStack.ts` | Empty - only TODOs |
| `MonitoringStack` | `aws/cdk/lib/MonitoringStack.ts` | Empty - only TODOs |
| `FrontendStack` | `aws/cdk/lib/FrontendStack.ts` | Empty - only TODOs |

**TODOs in these stacks:**
- BillingAnalyticsStack: Add financial/analytics Lambda placeholders
- MonitoringStack: Add CloudWatch dashboards, alarms, SNS topics
- FrontendStack: Provision S3 buckets, CloudFront distribution, WAF

### Services Stack Issues

| Issue | File | Line | Details |
|-------|------|------|---------|
| SKIP_HTTP_ROUTES workaround | `ServicesStack.ts` | 53-60 | Temporary flag to skip route bindings |
| Legacy export prefix | `ServicesStack.ts` | 63-73 | Creates many legacy CloudFormation exports |
| Hardcoded API ID fallback | `ServicesStack.ts` | 51 | `"ejxp74eyhe"` hardcoded |
| Hardcoded Cognito IDs | `ServicesStack.ts` | 132-134 | User pool and client IDs hardcoded |

### Auth Stack Issues

| Issue | File | Line | Details |
|-------|------|------|---------|
| Cognito domain not wired | `AuthStack.ts` | 33 | `// TODO: wire up domain-related concerns later` |
| Trigger Lambdas not attached | `AuthStack.ts` | 36 | `// TODO: Attach Cognito trigger Lambdas later` |

### Database Stack Issues

| Issue | File | Line | Details |
|-------|------|------|---------|
| RDS not managed by CDK | `DatabaseStack.ts` | 71-73 | TODOs for future RDS management |

### Unused CDK Constructs

None identified - infrastructure is lean.

### Cost Optimization Opportunities

| Area | Suggestion |
|------|------------|
| Lambda memory | Audit memory allocation vs actual usage |
| Lambda timeout | Some have 30s timeout but likely complete in <5s |
| Consolidated Lambdas | Further consolidation could reduce cold starts |

---

## 9. Integration Problems / Cross-Service Mismatches

### Frontend Expects Fields Backend Doesn't Return

| Frontend Expectation | Backend Reality | Action |
|----------------------|-----------------|--------|
| `_count.members` on segments | features-service adds this manually | OK - handled |
| Notification count | No endpoint exists | Implement endpoint |
| Calendar occupancy data | No calendar service | Implement or keep disabled |

### Schema Drift Concerns

| Area | Issue |
|------|-------|
| Communication table | features-service handles missing table gracefully |
| Segment/SegmentMember tables | May not exist in all tenants |

### Missing Pagination

| Endpoint | Current Behavior | Issue |
|----------|------------------|-------|
| `/api/v1/messages` | `LIMIT 100` hardcoded | Need proper pagination params |
| `/api/v1/communications` | `LIMIT 100` hardcoded | Need proper pagination params |

### Missing Filters

| Area | Frontend Expects | Backend Provides |
|------|------------------|------------------|
| Bookings list | Full filtering | ✅ Has filters |
| Pets list | Full filtering | ✅ Has filters |
| Payments list | Status filter | ⚠️ Verify implementation |

### WebSocket Integration

| Status | Details |
|--------|---------|
| Infrastructure | ✅ RealtimeStack deploys WebSocket API |
| Frontend hook | ✅ `useLiveQuery.ts` and `socket.js` exist |
| Integration | ⚠️ Not clear if actively used in UI |

---

## 10. Top 10 Recommended Next Fixes

### 1. **Remove Archived Placeholders** 
- **What:** Delete `frontend/src/features/placeholders/_archive/` (70+ files)
- **Why:** Dead code, creates confusion, increases bundle analysis noise
- **Difficulty:** Easy
- **Files:** Entire `_archive` directory
- **Strategy:** Delete directory, run build to verify no imports

### 2. **Implement Handler Flows Backend OR Remove Feature**
- **What:** Either implement handler-flows Lambda or remove UI feature entirely
- **Why:** UI exists but is completely non-functional
- **Difficulty:** Medium (implement) / Easy (remove)
- **Files:** 
  - `aws/lambdas/` (new handler-flows-service)
  - OR `frontend/src/features/handlerFlows/` (remove)
- **Strategy:** If feature is planned, implement MVP Lambda; otherwise remove routes and components

### 3. **Implement Associations Backend**
- **What:** Create associations service or integrate into config-service
- **Why:** Multiple UI components depend on this (AssociationsTab, OwnerDetail associations)
- **Difficulty:** Medium
- **Files:** 
  - `aws/lambdas/config-service/index.js` (add routes)
  - `frontend/src/features/settings/api/associations.js` (wire up)
- **Strategy:** Add `/api/v1/associations/*` routes to config-service

### 4. **Complete Properties Cascade Operations**
- **What:** Implement full substitute and force-delete logic
- **Why:** Property management workflows incomplete
- **Difficulty:** Medium
- **Files:** `aws/lambdas/properties-api-v2/handlers/cascade-operations.js`
- **Strategy:** Complete TODO implementations with proper dependency handling

### 5. **Remove Legacy Lambda Tombstones**
- **What:** Delete 25+ legacy Lambda folders that return 410
- **Why:** Reduces confusion, cleaner repo
- **Difficulty:** Easy
- **Files:** See Section 5 list
- **Strategy:** Delete folders, update any references, deploy to verify

### 6. **Consolidate Modal/Dialog Components**
- **What:** Reduce 7 modal variants to 3 base patterns
- **Why:** Inconsistent UX, maintenance burden
- **Difficulty:** Medium
- **Files:** `frontend/src/components/ui/Modal.jsx`, `Dialog.jsx`, `AlertDialog.jsx`, etc.
- **Strategy:** Keep Modal, SlidePanel, AlertDialog; migrate others

### 7. **Implement Notifications Service**
- **What:** Add notification count endpoint and real-time notification infrastructure
- **Why:** QuickAccessBar shows placeholder count (always 0)
- **Difficulty:** Medium-High
- **Files:** 
  - `aws/lambdas/` (new notifications-service)
  - `frontend/src/components/QuickAccessBar.jsx`
- **Strategy:** Implement notification storage and count endpoint

### 8. **Populate Empty CDK Stacks**
- **What:** Add real resources to BillingAnalyticsStack, MonitoringStack, FrontendStack
- **Why:** Placeholder stacks provide no value
- **Difficulty:** Medium
- **Files:** `aws/cdk/lib/BillingAnalyticsStack.ts`, `MonitoringStack.ts`, `FrontendStack.ts`
- **Strategy:** Add CloudWatch dashboards, S3/CloudFront for frontend

### 9. **Add Console.log ESLint Rule**
- **What:** Add ESLint rule to warn/error on console statements
- **Why:** 68 console statements in frontend code
- **Difficulty:** Easy
- **Files:** `frontend/eslint.config.js`
- **Strategy:** Add `no-console: warn` rule, gradually clean up

### 10. **Standardize API Hook Factories**
- **What:** Create shared utilities for disabled hooks and tenant key extraction
- **Why:** Same patterns repeated in 15+ files
- **Difficulty:** Easy
- **Files:** 
  - Create `frontend/src/lib/hooks/createApiHook.js`
  - Update api.js files to use factory
- **Strategy:** Extract common patterns, create typed factory functions

---

## Summary Statistics

| Category | Count |
|----------|-------|
| TODO/FIXME comments | 191 instances |
| "Coming soon" toasts | 9 instances |
| Disabled API hooks | 4 files |
| Legacy Lambda tombstones | 25 folders |
| Archived placeholder components | 70+ files |
| Empty CDK stacks | 3 stacks |
| Console.log statements | 68 instances |

---

*End of Audit Report*

