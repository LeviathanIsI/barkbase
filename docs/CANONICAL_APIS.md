# Canonical APIs & Domain Map

The tables below document the HTTP surfaces that the BarkBase frontend currently calls, the Lambda that owns each route, and whether that surface is canonical, legacy, or mixed. Status designations match the Phase 1 guardrails: only document existing behaviour and make any split ownership explicit so future refactors know which service is authoritative.

## Pets (status: canonical)
- **Canonical endpoints:**  
  `/api/v1/pets`, `/api/v1/pets/{id}`, `/api/v1/pets/vaccinations/expiring`, `/api/v1/pets/medical-alerts`, `/api/v1/pets/{id}/vaccinations`, `/api/v1/pets/owners`
- **Owning Lambda:** `aws/lambdas/entity-service`
- **Notes:** All CRUD, vaccination, and medical alert endpoints are routed to `EntityServiceFunction` via `cdk-stack.ts`. The legacy `pets-api` Lambda (`aws/lambdas/pets-api/index.js`) now returns `410 Gone` with a message that the entity service is canonical; it must not be targeted by new code.

## Owners (status: canonical)
- **Canonical endpoints:**  
  `/api/v1/owners`, `/api/v1/owners/{id}`, `/api/v1/owners/{id}/pets`
- **Owning Lambda:** `aws/lambdas/entity-service`
- **Notes:** Owner CRUD and owner–pet association flows are issued against `/api/v1/owners*` inside `entity-service/index.js`. The standalone `owners-api` handler remains in the repo for reference but is not mapped in CDK and should be considered legacy.

## Properties (status: mixed)
- **Canonical endpoints (v1 CRUD):** `/api/v1/properties`, `/api/v1/properties/{propertyId}`, `/api/v1/properties/{propertyId}/archive`, `/api/v1/properties/{propertyId}/restore`
- **Canonical endpoints (v2 advanced):** `/api/v2/properties`, `/api/v2/properties/{propertyId}`, `/api/v2/properties/{propertyId}/dependencies`, `/api/v2/properties/{propertyId}/impact-analysis`, `/api/v2/properties/{propertyId}/restore`, `/api/v2/properties/{propertyId}/substitute`
- **Owning Lambdas:**  
  - CRUD, tenant-visible metadata: `aws/lambdas/properties-api` (v1)  
  - Advanced restore/dependency/impact workflows: `aws/lambdas/properties-api-v2` (v2), with deeper graph/automation handled by `aws/lambdas/property-dependency-service` and archival/permanent delete jobs.
- **Notes:** Frontend code (`frontend/src/features/settings/api.js`) still calls v1 for list/create/update/delete, while restore/dependency/impact actions already use v2. Leave v1 shapes untouched until v2 fully replaces it.

## Bookings (status: canonical)
- **Canonical endpoints:**  
  `/api/v1/bookings`, `/api/v1/bookings/{bookingId}`, `/api/v1/bookings/{bookingId}/check-in`, `/api/v1/bookings/{bookingId}/check-out`, `/api/v1/bookings/{bookingId}/status`
- **Owning Lambda:** `aws/lambdas/operations-service`
- **Notes:** `OperationsServiceFunction` consolidates bookings, replacing `bookings-api`. Batch check-in (`frontend/src/features/bookings/components/BatchCheckIn.jsx`) and mobile check-in flows hit these paths today.

## Schedule (status: canonical)
- **Canonical endpoints:** `/api/v1/schedule`, `/api/v1/schedule/capacity`
- **Owning Lambda:** `aws/lambdas/analytics-service`
- **Notes:** Schedule data now comes from the analytics service (see consolidated routing in `cdk-stack.ts`). The older `schedule-api` Lambda is kept only for reference and should be treated as legacy.

## Runs (status: canonical)
- **Canonical endpoints:**  
  `/api/v1/runs`, `/api/v1/runs/{runId}`, `/api/v1/runs/{runId}/available-slots`, `/api/v1/runs/assignments`, `/api/v1/run-templates`
- **Owning Lambda:** `aws/lambdas/operations-service`
- **Notes:** Run templates and assignments are handled inside `operations-service/index.js`. The standalone `runs-api` Lambda is superseded; do not point new code at it.

## Tasks (status: canonical)
- **Canonical endpoints:**  
  `/api/v1/tasks`, `/api/v1/tasks/{taskId}`, `/api/v1/tasks/{taskId}/complete`
- **Owning Lambda:** `aws/lambdas/features-service`
- **Notes:** Task CRUD and completion routes live in `features-service`, which also owns notes/incidents/messages/invites. Older lambdas (`tasks-api`, `notes-api`, `incidents-api`, `communication-api`, `messages-api`, `invites-api`) are retained only as legacy references.

## Reports & Dashboard (status: canonical)
- **Canonical endpoints:**  
  `/api/v1/dashboard/stats`, `/api/v1/dashboard/today-pets`, `/api/v1/dashboard/arrivals`, `/api/v1/dashboard/departures`, `/api/v1/dashboard/revenue`, `/api/v1/dashboard/occupancy`, `/api/v1/dashboard/activity`, `/api/v1/reports/dashboard`, `/api/v1/reports/revenue`, `/api/v1/reports/occupancy`, `/api/v1/reports/arrivals`, `/api/v1/reports/departures`
- **Owning Lambda:** `aws/lambdas/analytics-service`
- **Notes:** `AnalyticsServiceFunction` consolidates the old `dashboard-api` and `reports-api`. Frontend dashboard query hooks (`frontend/src/features/dashboard/api.js`) already target these routes.

## Payments & Billing (status: canonical)
- **Canonical endpoints:**  
  `/api/v1/payments`, `/api/v1/payments/{paymentId}`, `/api/v1/invoices`, `/api/v1/invoices/{invoiceId}`, `/api/v1/invoices/{invoiceId}/status`, `/api/v1/billing/metrics`
- **Owning Lambda:** `aws/lambdas/financial-service`
- **Notes:** `financial-service/index.js` merged the historical payments/invoices/billing lambdas. Alert banners and payments UI hit these URLs.

## Settings & Tenant Configuration (status: canonical)
- **Canonical endpoints:**  
  `/api/v1/tenants` (including `/current`, `/current/plan`, `/current/onboarding`, `/current/theme`), `/api/v1/account-defaults`, `/api/v1/services`, `/api/v1/packages`, `/api/v1/facility`, `/api/v1/memberships`, `/api/v1/user-permissions`, `/api/v1/roles`
- **Owning Lambda:** `aws/lambdas/config-service`
- **Notes:** `ConfigServiceFunction` replaced `services-api`, `facility-api`, `account-defaults-api`, `roles-api`, `packages-api`, `memberships-api`, and `user-permissions-api`. Tenant bootstrapping code (`frontend/src/app/providers/TenantLoader.jsx` and `frontend/src/stores/tenant.js`) relies on these endpoints.

## User Profile & Permissions (status: canonical)
- **Canonical endpoints:**  
  `/api/v1/users/profile`, `/api/v1/profiles`, `/api/v1/profiles/{profileId}`, `/api/v1/users/{userId}/profiles`, `/api/v1/users/{userId}/effective-permissions`, `/api/v1/permissions/calculate`, `/api/v1/permissions/invalidate-cache`
- **Owning Lambda:** `aws/lambdas/user-profile-service`
- **Notes:** `user-profile-service/index.js` handles profile assignment, inheritance, and permission calculations. For broader user CRUD (admin pages) use `/api/v1/users*` owned by `aws/lambdas/users-api`, which remains canonical for tenant-scoped user administration.

## Operations (check-ins, check-outs, kennels) – status: canonical
- **Canonical endpoints:**  
  `/api/v1/check-ins`, `/api/v1/check-ins/{checkInId}`, `/api/v1/check-outs`, `/api/v1/kennels`, `/api/v1/kennels/occupancy`
- **Owning Lambda:** `aws/lambdas/operations-service`
- **Notes:** `OperationsServiceFunction` unifies run/booking/check-in/check-out/kennel flows. The older `check-in-api`, `check-out-api`, and `kennels-api` lambdas are no longer wired in CDK; treat them as legacy.


