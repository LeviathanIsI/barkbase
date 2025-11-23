# Test Coverage Audit (QA0)

## Overview

- **Runner / Tooling:** Frontend tests use Vitest + Testing Library with a single `setupTests.js` file (Jest DOM). No Cypress/Playwright or backend unit-test harness is configured.  
- **Scope:** Only a handful of component-level unit tests exist; there are no automated integration tests, no API contract tests, and the lone `aws/cdk/test/cdk.test.ts` file is a commented-out placeholder.

## Existing Automated Tests

| File | Type | Coverage Focus | Notes / Gaps |
| --- | --- | --- | --- |
| `frontend/src/lib/__tests__/apiClient.test.jsx` | Unit | Verifies tenant slug/request-id headers on a direct `apiClient` invocation. | Does **not** exercise GET/POST helpers, interceptors, or 401 auto-logout logic. No network mocking beyond header assertions. |
| `frontend/src/features/payments/routes/__tests__/Payments.test.jsx` | Component snapshot-ish | Renders the Payments route when billing features are disabled and asserts the upgrade CTA. | Mutates stores directly; does not cover actual payments data, filters, capture totals, or API errors. |
| `frontend/src/features/dashboard/components/__tests__/OnboardingChecklist.test.jsx` | Component | Ensures checklist renders and dismissal callback fires. | Static props only; no data loading, no routing integration. |
| `frontend/src/features/bookings/components/__tests__/BookingCalendar.test.jsx` | Component/store mock | Mocks booking store + drag-and-drop to assert `updateBooking` is called. | Heavy mocking, no real bookings API usage, no tenant/auth coverage, no regression tests for check-in/out flows. |
| `frontend/src/components/ui/__tests__/Button.test.jsx` | Unit | Confirms button renders and click handler fires. | Pure presentational test; no effect on routing or data. |
| `frontend/src/components/primitives/__tests__/SectionCard.test.jsx` | Unit | Ensures slots render properly. | Styling/content only. |
| `frontend/src/components/primitives/__tests__/InfoRow.test.jsx` | Unit | Tests copy-to-clipboard affordance. | Relies on DOM mocks, no user data. |
| `frontend/src/components/RecordDetailsView/RecordDetailsView.test.jsx` | Component | Renders owner summary + tabs with fixture data. | `apiClient` mocked away; no real fetches or tenant logic. |
| `frontend/src/app/providers/__tests__/TenantLoader.test.jsx` | Component/integration | Confirms `/api/v1/tenants/current` is fetched and theme variables applied. | Good start, but only covers happy path; no error/401 handling, no multiple tenant transitions. |
| `frontend/src/app/__tests__/ProtectedRoute.test.jsx` | Routing | Ensures unauthenticated users redirect to `/login`. | Does not test token expiry, tenant mismatch, or role-based gating; simply checks presence of token. |
| `aws/cdk/test/cdk.test.ts` | Placeholder | Commented example for SQS queue creation. | Completely disabled and references resources not present in stack—effectively dead.

## Manual / Scripted Checks

| Script | Purpose | Notes |
| --- | --- | --- |
| `test-routing.js` | Manual checklist for verifying SPA routes load the expected component. | Requires developer to step through UI manually; no assertions, no automation. |
| `test-endpoints.js` | Browser-console script hitting production API Gateway (`/api/v1/pets`, `/api/v1/owners`, `/api/v1/reports/...`). | Hard-codes prod URL and reads tokens from local/session storage (security risk). No CI hook. |
| `test-fixed-endpoints.js` | Node script that pings `/api/v1/runs/assignments` and `/api/v1/kennels/occupancy`. | Requires hand-inserted JWT; not run anywhere automatically. |

These scripts are useful for manual smoke tests but do **not** protect us in CI/CD.

## Coverage Gaps (Critical Flows)

- **Authentication / Auto-logout:** No tests simulate expired tokens, 401 intercepts, or tenant isolation logic.  
- **Routing Protection:** Only `ProtectedRoute`’s happy/unhappy path is tested. No coverage for nested routes, lazy loaders, `Today` default redirect, or command-center routing.  
- **Pets CRUD:** Zero automated verification of `/api/v1/pets` normalization, filter logic, editing, or deletion flows. Recent “`pets.filter`” runtime regression went undetected.  
- **User Profile Updates:** `useUserProfileQuery`/mutations are untested. No assurance that `/api/v1/users/profile` updates or avatar uploads behave correctly.  
- **Bookings & Schedule:** Aside from the mocked drag test, we lack coverage for arrivals/departures lists, batch check-in/out modals, kennel assignments, or scheduling edge cases.  
- **Payments & Reports:** Only the PRO upsell path is tested. Captured revenue, payment statuses, report filters, CSV exports, etc., have zero coverage.  
- **Settings:** Numerous settings panes (business defaults, runs, notifications, packages) have no tests ensuring they render, save, or respect permissions.  
- **Security / Tenant Isolation:** No tests assert that APIs include `X-Tenant-Id`, that cross-tenant data is blocked, or that the new routing guard prevents leakage.  
- **Backend Infrastructure:** The CDK test suite is effectively empty, so CloudFormation/Lambda resource drift is entirely untested.

## Static Scan Findings

- **Dead / Commented Tests:** `aws/cdk/test/cdk.test.ts` is a stub; it references a “MyTestStack” SQS Queue that isn’t part of the current infra. Marked as dead code.  
- **Legacy Endpoint Scripts:** `test-endpoints.js` and `test-fixed-endpoints.js` still call the public API Gateway (`https://smvidb1rd0…`) directly. These scripts bypass the new `/api/v1` routing + auto-logout stack and should be retired or updated once automated API tests exist.  
- **No Coverage for Recently Refactored Routes:** After the `/api/v1/pets` normalization and Today/Pets page rewrites, no regression tests were added; all consumers remain unverified.  
- **No Tests Reference `pets-api` Legacy Lambda**, so there is no direct risk of tests hitting deprecated code, but conversely nothing ensures the new Entity Service is working.

## Untested Critical Areas Summary

- Authentication expiry & tenant isolation.
- `/api/v1/pets` list/edit/delete flows and normalization.
- `/api/v1/users/profile` fetch + mutation (name/phone/avatar/password).
- Bookings arrivals/departures lists, scheduling calendar interactions beyond drag stub.
- Payments capture/refund workflows & financial reporting.
- Vaccination reminders, medical alerts, Today Command Center KPIs.
- Settings (business defaults, run templates, notifications, packages, feature flags).
- Any backend Lambda logic (no Jest/Vitest coverage).

## Conclusion

- The current automated safety net touches only a handful of UI widgets and a single route guard.  
- Mission-critical flows (auth, bookings, payments, reports, settings, vaccinations) have **zero** automated coverage.  
- Manual scripts still hit production APIs with ad-hoc tokens, providing no repeatable CI assurance.  
- Without an expanded test suite, regressions like the recent `/api/v1/pets` normalization issue will continue to reach production unnoticed.


