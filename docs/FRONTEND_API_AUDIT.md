# Frontend API Usage Audit (Phase 2)

This document captures every HTTP endpoint reference found under `frontend/src/` (70 files / 198 unique endpoint strings). The scan relied on a repo-wide regex against `/api/…`, followed by manual review of each file to determine whether the call is active, canonical, mixed, legacy, placeholder, or test-only. Canonical status aligns with `docs/CANONICAL_APIS.md` and the service inventory in `docs/SERVICE_OWNERSHIP.md`.

- **Canonical** → matches the documented source of truth and the owning Lambda.
- **Mixed** → known split domains (currently only Properties, which still straddles `/api/v1/properties*` and `/api/v2/properties*`).
- **Legacy/Unknown** → endpoint has no backing Lambda in this repo or is intentionally disabled; flagged for follow-up.

## Summary
- **Files scanned:** 70 (entire `frontend/src` tree, including tests/placeholders).
- **Unique endpoint strings:** 198 (includes template literals and disabled stubs).
- **Mixed domain calls:** Properties CRUD (`/api/v1/properties*`) plus advanced flows (`/api/v2/properties*`).
- **Suspicious / non-canonical calls identified:**
  - `/api/v1/errors/log` (ErrorBoundary) – no backend owner found.
  - `/api/v1/upload` (Profile photo upload) – backend exposes `/api/v1/upload-url` instead.
  - `/api/v1/notifications/unread-count` (QuickAccessBar) – no Lambda references.
  - `/api/v1/integrations/*`, `/api/v1/reports/email`, `/api/v1/payments/export/csv` in placeholder components – mock only.
  - `/api/v1/handler-flows*` – **REMOVED** (feature removed from current version).
  - `/api/v1/segments*` – no Lambda; feature is placeholder.
  - `/api/v1/associations` – **IMPLEMENTED** in config-service (list, create, update, delete, seed).
  - `/api/v1/calendar*` – commented-out experimental hooks.
  - Booking check-in calls use `/api/v1/bookings/{id}/check-in`, while `operations-service` currently matches `/checkin` (no hyphen); needs alignment before enabling guardrails.

Everything else traces back to canonical services (entity-service, operations-service, analytics-service, financial-service, features-service, config-service, user-profile-service, auth-api, get-upload-url, etc.).

---

## Diagnostics & Error Logging
| File | Function / Hook | Endpoint(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| `frontend/src/app/ErrorBoundary.jsx` | `componentDidCatch` | `/api/v1/errors/log` | ⚠ Unknown | Endpoint not defined in backend sources; currently a best-effort POST with no canonical owner. Needs either a Lambda or migration to existing logging stack. |

## Auth & Tenant Context
| File | Function / Hook | Endpoint(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| `frontend/src/app/providers/AuthLoader.jsx` | `attemptRefresh` effect | `/api/v1/tenants/current` | ✅ Canonical | Fetches tenant context after Cognito/OAuth flow via config-service. |
| `frontend/src/app/providers/TenantLoader.jsx` | `initTenant` | `/api/v1/tenants/current` | ✅ | Final fallback to load tenant via canonical endpoint. |
| `frontend/src/app/providers/__tests__/TenantLoader.test.jsx` | Jest mocks | `/api/v1/tenants/current` | Test-only | Verifies loader behavior with mocked axios. |
| `frontend/src/stores/tenant.js` | `loadTenant`, `loadTenantById` | `/api/v1/tenants?slug=<slug>`, `/api/v1/tenants/current` | ✅ | Canonical config-service routes; `refreshPlan` TODO still pending backend support. |
| `frontend/src/features/tenants/api.js` | `updateTheme`, `useOnboardingQuery`, etc. | `/api/v1/tenants/current/theme`, `/api/v1/tenants/current/onboarding`, `/api/v1/tenants` | ✅ | All handled by `config-service`. |
| `frontend/src/features/settings/api-user.js` | `useProfileQuery`, `usePasswordMutation`, `useAvatarMutation` | `/api/v1/users/profile`, `/api/v1/users/password`, `/api/v1/users/avatar` | ✅ | User profile service is canonical for profile management. |
| `frontend/src/hooks/usePermissions.js` | `usePermissions` | `/api/v1/user-permissions/me` | ✅ | Config-service permission snapshot endpoint. |
| `frontend/src/features/settings/routes/Profile.jsx` | `handleProfilePhotoUpload`, `handlePasswordSubmit`, `handleSignOutSession`, `handleSignOutAllSessions` | `/api/v1/upload` ⚠, `/api/v1/auth/change-password`, `/api/v1/auth/sessions/{id}`, `/api/v1/auth/sessions/all` | `/api/v1/upload` ❓ (missing Lambda); auth endpoints ✅ (auth-api). |
| `frontend/src/features/settings/routes/components/ActiveSessions.jsx` | `handleRevokeSession` | `/api/v1/auth/sessions/{id}`, `/api/v1/auth/sessions/all` | ✅ | Auth API. |
| `frontend/src/features/settings/routes/SecurityOverview.jsx` | `handlePasswordReset` | `/api/v1/auth/change-password` | ✅ | Auth API. |
| `frontend/src/lib/aws-client/db-auth-client.js` | `login`, `refreshSession`, `logout`, `signup` | `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, `/api/v1/auth/signup` | ✅ | Thin client for the canonical auth Lambda. |
| `frontend/src/lib/aws-client/aws-api-client.js` | `customAction`, CRUD helpers | `/api/v1/${table}` (dynamic) | ✅ | Guarded generic client that ultimately hits the canonical CRUD endpoints defined in `canonicalEndpoints`. |
| `frontend/src/lib/__tests__/apiClient.test.jsx` | Jest tests | `/api/test`, `/api/default-test`, `/api/id-test` | Test-only | Local smoke tests for the HTTP client. |

## Pets & Owners
| File | Function / Hook | Endpoint(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| `frontend/src/components/AlertBanner.jsx` | `alerts` query | `/api/v1/pets/vaccinations/expiring`, `/api/v1/pets/medical-alerts`, `/api/v1/payments?status=PENDING` | ✅ (pets/payments canonical) | Cross-domain query used for alerting; all routed to entity-service / financial-service. |
| `frontend/src/features/pets/api.js` | `usePetsQuery`, `usePetDetailsQuery`, `usePetVaccinationsQuery`, `useCreatePetMutation`, `useUpdatePetMutation`, `useDeletePetMutation` | `/api/v1/pets`, `/api/v1/pets/{id}`, `/api/v1/pets/{id}/vaccinations` | ✅ | Entity-service canonical. |
| `frontend/src/features/pets/api-vaccinations.js` | `useExpiringVaccinationsQuery` | `/api/v1/pets/vaccinations/expiring` | ✅ | Entity-service canonical. |
| `frontend/src/features/owners/api.js` | CRUD hooks & owner-pet associations | `/api/v1/owners`, `/api/v1/owners/{id}`, `/api/v1/owners/{id}/pets`, `/api/v1/owners/{id}/pets/{petId}` | ✅ | Entity-service canonical. |
| `frontend/src/features/pets-people/UnifiedPetPeopleView.jsx` | Inline fetches | `/api/v1/owners?expand=pets`, `/api/v1/pets` | ✅ | Extend entity-service queries when consolidate. |
| `frontend/src/hooks/useHoverDataFetch.js` | `usePetHoverData`, `useOwnerHoverData` | `/api/v1/${resourceType}s/${resourceId}` | ✅ | Dynamic helper restricted to entity-service resources. |
| `frontend/src/features/vaccinations/routes/Vaccinations.jsx` | `handleDeleteVaccination` | `/api/v1/pets/{petId}/vaccinations/{vaccinationId}` | ✅ | Entity-service canonical. |

## Bookings, Runs & Daily Operations
| File | Function / Hook | Endpoint(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| `frontend/src/features/bookings/api.js` | `useBookingsQuery`, `useCreateBookingMutation`, `useUpdateBookingMutation`, `useDeleteBookingMutation`, `useBookingCheckInMutation`, `useBookingCheckOutMutation` | `/api/v1/bookings`, `/api/v1/bookings/{id}`, `/api/v1/bookings/{id}/checkin`, `/api/v1/bookings/{id}/checkout` | ✅ (operations-service) | Canonical; note difference vs UI components that call `/check-in`. |
| `frontend/src/features/bookings/components/BatchCheckIn.jsx` | `useQuery` + `checkInMutation` | `/api/v1/bookings?date=...`, `/api/v1/bookings/{id}/check-in` | ⚠ Route mismatch | Uses dashed `/check-in` path; backend currently matches `/checkin`. Needs alignment. |
| `frontend/src/features/bookings/components/VisualRunBoard.jsx` | `updateBooking` | `/api/v1/bookings/{id}` | ✅ | Canonical booking update from board. |
| `frontend/src/features/mobile/MobileCheckIn.jsx` | `loadArrivals`, `handleUpload`, `handleCheckIn` | `/api/v1/bookings?date=...`, `/api/v1/upload-url`, `/api/v1/bookings/{id}/check-in` | Upload URL ✅, check-in ⚠ (same mismatch as above). |
| `frontend/src/features/today/TodayCommandCenter.jsx` | Multiple queries & checkout flow | `/api/v1/bookings`, `/api/v1/dashboard/stats`, `/api/v1/bookings/{id}/check-out` | Bookings 📌 (see mismatch), dashboard stats ✅. |
| `frontend/src/features/daycare/api.js` | `useRunsQuery`, `useCreateRunMutation`, etc. | `/api/v1/runs`, `/api/v1/runs/{id}`, `/api/v1/runs/assignments`, `/api/v1/runs/{id}/remove-pet` | ✅ | Handled by operations-service. |
| `frontend/src/features/daycare/api-templates.js` | Template helpers | `/api/v1/run-templates`, `/api/v1/runs/{id}/available-slots` | ✅ | ops-service canonical. |
| `frontend/src/features/kennels/api.js` | `useKennelsQuery`, `useCreateKennelMutation`, etc. | `/api/v1/kennels`, `/api/v1/kennels/{id}`, `/api/v1/kennels/occupancy` | ✅ | ops-service canonical. |
| `frontend/src/features/facilities/api.js` | `useFacilitySettings` | `/api/v1/facility/settings` | ✅ | Config-service’s facility slice. |
| `frontend/src/features/tasks/api.js` | `useTasksQuery`, `useCreateTaskMutation`, `useCompleteTaskMutation`, etc. | `/api/v1/tasks`, `/api/v1/tasks/{id}`, `/api/v1/tasks/{id}/complete` | ✅ | features-service canonical. |
| `frontend/src/features/staff/api.js` | CRUD hooks | `/api/v1/staff`, `/api/v1/staff/{id}` | ✅ | entity-service (staff) canonical. |
| `frontend/src/features/facilities/api.js` | `saveFacilitySettings` | `/api/v1/facility/settings` | ✅ | Config-service. |

## Dashboard & Reports
| File | Function / Hook | Endpoint(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| `frontend/src/features/dashboard/api.js` | `useDashboardMetrics`, `useDashboardArrivals`, etc. | `/api/v1/reports/dashboard`, `/api/v1/reports/today-pets`, `/api/v1/reports/arrivals`, `/api/v1/reports/departures`, `/api/v1/reports/occupancy`, `/api/v1/reports/revenue`, `/api/v1/reports/activity`, `/api/v1/pets/vaccinations/expiring` | ✅ | All analytics-service endpoints. |
| `frontend/src/features/reports/api.js` | `useReportDashboard` | (disabled) `/api/v1/reports/dashboard` | Disabled | Stubbed until dedicated Lambdas land. |
| `frontend/src/features/calendar/api-capacity.js` | `useCapacity` | `/api/v1/schedule/capacity` | ✅ | analytics-service schedule routes. |
| `frontend/src/features/schedule/api/api.js` | `useScheduleRange`, `useScheduleCapacity` | `/api/v1/schedule?from=…`, `/api/v1/schedule/capacity` | ✅ | analytics-service schedule routes. |
| `frontend/src/features/calendar/api.js` | Disabled hooks | `/api/v1/calendar*` | ⚠ Disabled | Old calendar endpoints commented out; no backend match. |
| `frontend/src/components/QuickAccessBar.jsx` | `fetchUnreadCount` | `/api/v1/notifications/unread-count` | ❓ Unknown | Endpoint not mapped in backend. Should be removed or re-routed. |

## Payments, Invoices & Billing
| File | Function / Hook | Endpoint(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| `frontend/src/features/payments/api.js` | `usePaymentsQuery`, `usePaymentsSummaryQuery` (disabled) | `/api/v1/payments`, `/api/v1/payments/summary` | ✅ (list), summary is TODO (disabled). |
| `frontend/src/features/invoices/api.js` | CRUD hooks | `/api/v1/invoices`, `/api/v1/invoices/{id}`, `/api/v1/invoices/generate/{bookingId}`, `/api/v1/invoices/{id}/send-email`, `/api/v1/invoices/{id}/paid` | ✅ | Handled by financial-service. |
| `frontend/src/features/placeholders/components/PaymentsDashboard.jsx` | Placeholder actions | `/api/v1/payments/{id}/charge`, `/api/v1/payments/{id}/retry`, `/api/v1/payments/export/csv` | ⚠ Placeholder | Endpoints not implemented; UI is demo-only. |
| `frontend/src/features/placeholders/components/QuickIntegrations.jsx` | Placeholder buttons | `/api/v1/integrations/google-sheets/export`, `/api/v1/reports/email`, `/api/v1/integrations/quickbooks/sync`, `/api/v1/payments/export/csv` | ⚠ Placeholder | No backing Lambdas; document remains for future integration work. |
| `frontend/src/features/settings/routes/components/FinancialDashboard.jsx` | `loadFinancialOverview` | `/api/v1/billing/overview` | ✅ | financial-service. |
| `frontend/src/features/settings/routes/AccountDefaults.jsx` / `Business.jsx` / `components/HolidayManager.jsx` | Account defaults hooks | `/api/v1/account-defaults`, `/api/v1/account-defaults/logo` | ✅ | config-service. |

## Communications, Notes, Messaging & Segments
| File | Function / Hook | Endpoint(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| `frontend/src/features/communications/api.js` | Messaging + notes + segments hooks | `/api/v1/communications*`, `/api/v1/notes*`, `/api/v1/segments*` | Communications/notes ✅ (features-service); `/api/v1/segments*` ❓ (no Lambda yet). |
| `frontend/src/features/messaging/api.js` | Conversations + read receipts | `/api/v1/messages*` | ✅ | features-service messaging routes. |
| `frontend/src/features/packages/api.js` | Package management | `/api/v1/packages`, `/api/v1/packages/{id}/apply/{bookingId}`, `/api/v1/packages/{id}/usage-history`, `/api/v1/packages/owner/{ownerId}` | ✅ | features-service / config-service hybrid; canonical per service map. |
| `frontend/src/features/objects/components/AssociationsTab.jsx`, `frontend/src/features/owners/routes/OwnerDetail.jsx`, `frontend/src/features/settings/components/AssociationLabelModal.jsx`, `frontend/src/features/settings/api/associations.js`, `frontend/src/features/settings/routes/AssociationsSettings.jsx` | Associations hooks | `/api/associations`, `/api/v1/settings` (comments) | ⚠ Disabled | All association hooks are stubs that throw; backend endpoints do not exist yet. |
| `frontend/src/features/settings/components/UserRoleManager.jsx` | Role assignments | `/api/v1/user-permissions/{userId}/roles` | ✅ | config-service. |

## Properties (Mixed Domain)
| File | Function / Hook | Endpoint(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| `frontend/src/features/settings/api.js` | `usePropertiesQuery`, `usePropertiesV2Query`, CRUD + archive/restore/dependency/impact hooks | `/api/v1/properties*` (CRUD) & `/api/v2/properties*` (advanced) | ⚠ Mixed | v1 still powers CRUD, v2 handles archive/dependency flows. TODO comments added per Phase 2 instructions. |
| `frontend/src/features/settings/routes/PropertyDetail.jsx`, `frontend/src/hooks/useProperties.js` | `loadPropertyDetail`, `useProperties`, etc. | `/api/v1/settings/properties*` | ✅ | These hit the config-service "settings" endpoints (canonical), distinct from the mixed `/api/v1/properties`. |

## Settings & Configuration (Non-property)
| File | Function / Hook | Endpoint(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| `frontend/src/features/settings/api.js` (non-property sections) | Services, staff, memberships, invites | `/api/v1/services*`, `/api/v1/staff*`, `/api/v1/memberships*`, `/api/v1/invites` | ✅ | Config-service / entity-service canonical. |
| `frontend/src/features/services/api.js` | CRUD hooks | `/api/v1/services`, `/api/v1/services/{id}` | ✅ | Config-service. |
| `frontend/src/features/roles/api.js` | `useRolesQuery`, `useRoleDetailQuery`, role mutations | `/api/v1/roles`, `/api/v1/roles/{id}`, `/api/v1/roles/{id}/clone`, `/api/v1/roles/{id}/users`, `/api/v1/roles/{id}/permissions`, `/api/v1/roles/system/initialize` | ✅ | Config-service role management endpoints. |
| `frontend/src/features/facilities/api.js` (referenced above) | Facility overview | `/api/v1/facility/settings` | ✅ | Config-service. |
| `frontend/src/features/settings/routes/BookingConfig.jsx`, `CommunicationNotifications.jsx`, `Mobile.jsx`, `NotificationsOverview.jsx`, `Records.jsx`, `Reporting.jsx` | Page loaders | `/api/v1/settings/booking`, `/api/v1/settings/communication`, `/api/v1/settings/mobile`, `/api/v1/settings/notifications`, `/api/v1/settings/records`, `/api/v1/settings/reporting` | ✅ | Config-service `settings/*` routes. |
| `frontend/src/features/settings/routes/Business.jsx` | `handleBusinessSave` | `/api/v1/account-defaults` | ✅ | Config-service. |
| `frontend/src/features/settings/routes/Profile.jsx` (also above) | Notification settings | `/api/v1/settings/notifications` | ✅ | Config-service. |

## Communications Uploads & File Utilities
| File | Function / Hook | Endpoint(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| `frontend/src/features/mobile/MobileCheckIn.jsx` | `handlePhotoUpload` | `/api/v1/upload-url` | ✅ | Uses get-upload-url Lambda. |
| `frontend/src/features/settings/routes/Profile.jsx` | `handleProfilePhotoUpload` | `/api/v1/upload` | ⚠ Unknown | Should migrate to `/api/v1/upload-url` flow; backend lacks `/api/v1/upload`. |

## Handler Flows (Placeholder)
> **Note:** The handler-flows feature has been removed from the current version of BarkBase and may return in a future release.

## Messaging / Segments / Integrations
Covered above under Communications & Messaging and Payments placeholder sections.

## Tests & Disabled Utilities
| File | Function / Hook | Endpoint(s) | Status | Notes |
| --- | --- | --- | --- | --- |
| `frontend/src/app/providers/__tests__/TenantLoader.test.jsx`, `frontend/src/lib/__tests__/apiClient.test.jsx` | Jest | `/api/v1/tenants/current`, `/api/test`, `/api/default-test`, `/api/id-test` | Test-only | No production impact. |
| `frontend/src/features/reports/api.js`, `frontend/src/features/settings/api/associations.js`, `frontend/src/features/calendar/api.js` | Disabled hooks | `/api/v1/reports/dashboard`, `/api/v1/settings`, `/api/v1/calendar*` | Disabled | Documented stubs awaiting backend work. |
| `frontend/src/features/placeholders/components/PaymentsDashboard.jsx`, `frontend/src/features/placeholders/components/QuickIntegrations.jsx`, `frontend/src/features/objects/components/AssociationsTab.jsx`, `frontend/src/features/owners/routes/OwnerDetail.jsx`, `frontend/src/features/settings/routes/AssociationsSettings.jsx`, `frontend/src/features/settings/components/AssociationLabelModal.jsx` | Placeholder UI | `/api/v1/payments/export/csv`, `/api/v1/integrations/*`, `/api/associations`, etc. | ⚠ Placeholder | Either toast errors immediately or rely on disabled hooks; no backend support yet. |
| `frontend/src/features/calendar/components/EnhancedStatsDashboard.jsx` | Import path `@/features/schedule/api/api` | N/A | False positive from regex; no HTTP call. |

---

### Key Follow-ups
1. **Properties** – still mixed between `/api/v1/properties` and `/api/v2/properties`; TODO comments added where these calls originate.
2. **Missing endpoints** – implement or retire:
   - `/api/v1/errors/log`, `/api/v1/upload`, `/api/v1/notifications/unread-count`, `/api/v1/integrations/*`, `/api/v1/reports/email`, `/api/v1/segments*`, `/api/associations`.
3. **Booking check-in route** – align frontend and backend on either `/check-in` or `/checkin` before enforcing guardrails.
4. **Guardrails** – `src/lib/canonicalEndpoints.ts` now documents that these constants are the only approved endpoints for new code, and it highlights the properties split until consolidation.

No business logic was altered during this audit; only documentation and TODO guardrails were introduced per Phase 2 requirements.

