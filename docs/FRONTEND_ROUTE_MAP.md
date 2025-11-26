# Frontend Route Map (Phase B:1)

This document captures the current routing structure that lives in `frontend/src/app/router.jsx`. All routes ultimately flow through `createBrowserRouter` and (for authenticated areas) the `ProtectedRoute` → `RoutePersistence` → `AppShell` stack.

## Public Entry Points

| Path | Component | Layout Wrappers | Notes / Data Sources |
| --- | --- | --- | --- |
| `/` (index) | `PublicHome` | none | Marketing/landing splash. No app shell. |
| `/signup` | `Signup` | none | Public signup form. |
| `/verify-email` | `VerifyEmail` | none | Email confirmation micro-flow. |
| `/login` | `Login` | none | Auth surface outside of AppShell. |

## Authenticated Shell (`ProtectedRoute` → `RoutePersistence` → `AppShell`)

All paths below inherit the global nav (JumboHeader + JumboSidebar), QuickAccessBar, keyboard shortcuts, etc.

### Command Center & Operations

| Path | Component | Notes on Data / Domains |
| --- | --- | --- |
| `/today` | `TodayCommandCenter` | Pulls `/api/v1/bookings` for arrivals/departures, `/api/v1/dashboard/stats`, `/api/v1/notifications` (attention items), wraps BatchCheckIn modal. |
| `/dashboard` | `DashboardEnhanced` | Uses dashboard React Query hooks (analytics-service). |
| `/bookings` | `Bookings` | Booking CRUD: `/api/v1/bookings`, tasks for check-in/out. |
| `/schedule` | `Schedule` | `/api/v1/schedule`, capacity endpoints. |
| `/calendar` | `Calendar` | Calendar-specific fetchers (`api.js`). |
| `/tasks` | `Tasks` | Features-service tasks endpoints. |
| `/runs` | `RunAssignment` | Operations-service run templates/assignments. |
| `/daycare/checkin` | `Tasks` | Alias to tasks view. |
| `/daycare/runs` | `RunAssignment` | Alias to run assignment. |
| `/operations` | `Operations` | Aggregate ops tooling. |
| `/mobile/tasks` | `MobileTasks` | Mobile-friendly task ui. |
| `/mobile/check-in` | `MobileCheckIn` | Simplified check-in flow. |

### Directory (Pets / People / Segments)

| Path | Component | Notes |
| --- | --- | --- |
| `/pets-people` | `UnifiedPetPeopleView` | Combined list view. Hits pets + owners APIs. |
| `/pets` | `Pets` | `/api/v1/pets` listings. |
| `/pets/:petId` | `PetDetail` | Pet record detail route; uses `usePet` hook. |
| `/owners` | `Owners` | `/api/v1/owners`. |
| `/owners/:ownerId` | `OwnerDetail` | Owner detail view. |
| `/customers/:ownerId` | `CustomerDetail` | CRM-centric owner detail. |
| `/segments` | `SegmentList` | Analytics segmentation; pulls `/api/v1/segments`. |
| `/vaccinations` | `Vaccinations` | `/api/v1/vaccinations`. |

### Financial / Reporting

| Path | Component | Notes |
| --- | --- | --- |
| `/payments` | `Payments` | Financial-service endpoints; invoices + payments. |
| `/invoices` | `Invoices` | Billing/invoice views. |
| `/reports` | `Reports` | Analytics-service reporting endpoints. |

### Resource Records / Catalogs

| Path | Component | Notes |
| --- | --- | --- |
| `/kennels` | `Kennels` | Ops kennel inventory. |
| `/facilities` | `Facilities` | Config/facility resources. |
| `/services` | `Services` | Config-service service catalog. |
| `/packages` | `Packages` | Config-service packages. |

### Automations & Handler Flows

> **Note:** The handler-flows feature has been removed from the current version of BarkBase and may return in a future release.

### Messaging & Staff

| Path | Component | Notes |
| --- | --- | --- |
| `/messages` | `Messages` | messaging module. |
| `/staff` | `Staff` | Staff roster via staff APIs. |

### Tenant / Admin shortcuts

| Path | Component | Notes |
| --- | --- | --- |
| `/tenants` | `TenantSettings` | Legacy admin route. |
| `/admin` | `Admin` | Tenant-wide metrics. |

### Legacy Redirects (Still in router)

Routes such as `/properties` and `/objects/*` use `<Navigate>` to send users into `settings/*` equivalents. These exist to help older deep links survive.

### Settings Layout

`/settings/*` nests dozens of sub-routes inside `SettingsLayout`. Major groups:

* **Preferences:** `/settings/profile`, `/settings/notifications`, `/settings/security`.
* **Account & Team:** `/settings/account`, `/settings/business`, `/settings/branding`, `/settings/team`, `/settings/team/roles/*`, `/settings/members`, `/settings/billing`.
* **Automation & Logs:** `/settings/automation`, `/settings/audit-log`.
* **Facility & Data:** `/settings/facility`, `/settings/custom-fields`, `/settings/records`, `/settings/record-keeping`, `/settings/data-quality`, `/settings/forms`, `/settings/documents`.
* **Data transport:** `/settings/import-export`, `/settings/exports`.
* **Communication:** `/settings/email`, `/settings/sms`, `/settings/communication-notifications`.
* **Booking:** `/settings/booking-config`, `/settings/calendar-settings`, `/settings/online-booking`.
* **Commerce:** `/settings/services`, `/settings/payment-processing`, `/settings/invoicing`, `/settings/products-services`.
* **Integrations & Presence:** `/settings/domain`, `/settings/integrations`, `/settings/mobile`.
* **Compliance:** `/settings/privacy`, `/settings/terms-policies`.
* **Insights:** `/settings/reporting`.
* **Properties & Object setup:** `/settings/properties`, `/settings/properties/:objectType/:propertyId`, `/settings/objects/...` (which lead to Pets/Owners/Bookings/Facilities/etc setup screens such as `PetsSetup`, `OwnersSetup`, `ServicesSetup`, etc.).

## Layout Notes

* **AppShell** wraps every authenticated route except the workflow builder. It injects `JumboSidebar`, `JumboHeader`, `GlobalKeyboardShortcuts`, and the `QuickAccessBar`.
* **RoutePersistence** stores the last visited path in `localStorage` and restores it if the user lands on `/` while already authenticated.
* **SettingsLayout** is a nested layout that renders its own left nav + content area inside the main AppShell.

## Data & Domain Summary

* **Today/Operations:** heavy `/api/v1/bookings`, `/api/v1/dashboard/*`, `/api/v1/tasks`, `/api/v1/runs`.
* **Directory:** `/api/v1/pets`, `/api/v1/owners`, `/api/v1/vaccinations`.
* **Financial:** `/api/v1/payments`, `/api/v1/invoices`.
* **Records/Catalog:** `/api/v1/services`, `/api/v1/packages`, `/api/v1/facilities`.
* **Messaging:** `/api/v1/messages` + notifications endpoints.
* **Settings:** mix of config-service endpoints (tenants/services/packages), roles-service, user-profile-service, etc.

> This map intentionally mirrors the structure inside `router.jsx` so later phases (B:2+) can spot route duplication, legacy redirects, or sections that should merge. No runtime code was modified for this documentation pass.

