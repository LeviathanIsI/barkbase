# Lambda Ownership & Status Map

This reference lists every Lambda under `aws/lambdas/`, the domain(s) it serves, current status, example routes, overlap with other services, and the recommended action.

## Canonical Services
| Lambda | Domain(s) | Status | Example Endpoints / Triggers | Overlap | Recommendation |
| --- | --- | --- | --- | --- | --- |
| `entity-service` | Pets, Owners, Staff | canonical | `GET/POST /api/v1/pets`, `/api/v1/owners`, `/api/v1/staff` | Supersedes `pets-api`, `owners-api`, `staff-api` | Keep canonical |
| `operations-service` | Bookings, Runs, Check-ins, Kennels | canonical | `/api/v1/bookings`, `/api/v1/run-templates`, `/api/v1/check-ins`, `/api/v1/kennels` | Supersedes `bookings-api`, `runs-api`, `check-in/-out`, `kennels-api` | Keep canonical |
| `analytics-service` | Dashboard, Reports, Schedule | canonical | `/api/v1/dashboard/stats`, `/api/v1/reports/revenue`, `/api/v1/schedule/capacity` | Supersedes `dashboard-api`, `reports-api`, `schedule-api` | Keep canonical |
| `financial-service` | Payments, Invoices, Billing | canonical | `/api/v1/payments`, `/api/v1/invoices`, `/api/v1/billing/metrics` | Supersedes any earlier payments/invoices Lambdas | Keep canonical |
| `config-service` | Tenants, Facility, Services, Account Defaults, Roles | canonical | `/api/v1/tenants/current`, `/api/v1/account-defaults`, `/api/v1/services`, `/api/v1/roles` | Supersedes `account-defaults-api`, `services-api`, `facility-api`, `tenants-api`, `memberships-api`, `roles-api`, `user-permissions-api` | Keep canonical |
| `user-profile-service` | User profiles & permission assignments | canonical | `/api/v1/users/profile`, `/api/v1/profiles`, `/api/v1/users/{id}/profiles` | Backstops field-level security; overlaps with config-service for permissions | Keep canonical |
| `features-service` | Tasks, Notes, Incidents, Messages, Communications, Invites | canonical | `/api/v1/tasks`, `/api/v1/notes`, `/api/v1/incidents`, `/api/v1/messages`, `/api/v1/communications`, `/api/v1/invites` | Supersedes `tasks-api`, `notes-api`, `incidents-api`, `messages-api`, `communication-api`, `invites-api` | Keep canonical |
| `properties-api-v2` | Advanced properties (metadata, dependencies, cascade ops) | canonical | `/api/v2/properties`, `/api/v2/properties/{id}/dependencies`, `/api/v2/properties/{id}/archive` | Sole properties backend; handles CRUD + advanced flows | Keep canonical; decommission legacy aids |
| `auth-api` | Authentication (login/signup/refresh/logout) | canonical | `/api/v1/auth/login`, `/api/v1/auth/signup`, `/api/v1/auth/refresh` | N/A | Keep canonical |
| `users-api` | User administration & tenant membership | canonical | `/api/v1/users`, `/api/v1/users/{id}`, `/api/v1/users/password` | Works with user-profile-service | Keep canonical |

## Legacy / Duplicate Services
| Lambda | Domain(s) | Status | Example Endpoints | Overlap | Recommendation |
| --- | --- | --- | --- | --- | --- |
| `pets-api` | Pets CRUD | historical (CDK removed; 410 tombstone) | `/api/v1/pets` (returns 410) | Superseded by `entity-service` | Source retained for history only |
| `owners-api` | Owner CRUD | historical (CDK removed; 410 tombstone) | `/api/v1/owners` (returns 410) | Superseded by `entity-service` | Source retained for history only |
| `staff-api` | Staff CRUD | historical (CDK removed; 410 tombstone) | `/api/v1/staff` (returns 410) | Superseded by `entity-service` | Source retained for history only |
| `bookings-api` | Booking CRUD | legacy | `/api/v1/bookings` | Superseded by `operations-service` | Decommission |
| `check-in-api` | Check-in workflow | legacy | `/api/v1/check-ins` | Superseded by `operations-service` | Decommission |
| `check-out-api` | Check-out workflow | legacy | `/api/v1/check-outs` | Superseded by `operations-service` | Decommission |
| `runs-api` | Run templates & assignments | legacy | `/api/v1/runs`, `/api/v1/run-templates` | Superseded by `operations-service` | Decommission |
| `kennels-api` | Kennel inventory | legacy | `/api/v1/kennels` | Superseded by `operations-service` | Decommission |
| `dashboard-api` | Dashboard metrics | legacy | `/api/v1/dashboard/stats` | Superseded by `analytics-service` | Decommission |
| `reports-api` | Reporting | legacy | `/api/v1/reports/*` | Superseded by `analytics-service` | Decommission |
| `schedule-api` | Calendar capacity | legacy | `/api/v1/schedule`, `/api/v1/schedule/capacity` | Superseded by `analytics-service` | Decommission |
| `tasks-api` | Task management | legacy | `/api/v1/tasks` | Superseded by `features-service` | Decommission |
| `notes-api` | Notes | legacy | `/api/v1/notes` | Superseded by `features-service` | Decommission |
| `incidents-api` | Incidents | legacy | `/api/v1/incidents` | Superseded by `features-service` | Decommission |
| `messages-api` | Messaging | legacy | `/api/v1/messages` | Superseded by `features-service` | Decommission |
| `communication-api` | Communications timeline | legacy | `/api/v1/communications` | Superseded by `features-service` | Decommission |
| `invites-api` | Invite management | legacy | `/api/v1/invites` | Superseded by `features-service` | Decommission |
| `account-defaults-api` | Account defaults/settings | legacy | `/api/v1/account-defaults` | Superseded by `config-service` | Merge/decommission |
| `services-api` | Service catalog | legacy | `/api/v1/services` | Superseded by `config-service` | Merge/decommission |
| `facility-api` | Facility info | legacy | `/api/v1/facility` | Superseded by `config-service` | Merge/decommission |
| `packages-api` | Packages (scaffold) | legacy/placeholder | (no active routes; only backup file remains) | `features-service` handles packages logic | Remove once confirmed unused |
| `tenants-api` | Tenant lookup | legacy | `/api/v1/tenants` | Superseded by `config-service` | Decommission |
| `memberships-api` | Membership management | legacy | `/api/v1/memberships` | Superseded by `config-service` | Decommission |
| `roles-api` | Role definitions | legacy | `/api/v1/roles` | Superseded by `config-service` | Decommission |
| `user-permissions-api` | Permission assignments | legacy | `/api/v1/user-permissions` | Superseded by `config-service` + user-profile-service | Decommission |
| `properties-api` | Properties CRUD (v1) | historical (removed from CDK; 410 sentinel only) | `/api/v1/properties` (now 410) | Superseded by `properties-api-v2`; repo copy kept for archeology/safeguards | Source kept for history; no deployment |
| `segments-api` | Segmentation scaffold | unused placeholder | (no handler file) | Future analytics/marketing | Remove once strategy decided |

## Supporting / Jobs / Utilities
| Lambda | Domain(s) / Purpose | Status | Example Triggers / Notes | Recommendation |
| --- | --- | --- | --- | --- |
| `auth-api` | Authentication | canonical | `/api/v1/auth/*` | Keep |
| `admin-api` | Tenant stats dashboard | supporting | `/api/v1/admin/stats` | Keep until replaced |
| `options-handler` | Global CORS OPTIONS | supporting | Handles `OPTIONS /api/v1/*` | Keep |
| `get-upload-url` | File uploads | supporting | `/api/v1/upload-url` | Keep |
| `get-download-url` | File downloads | supporting | `/api/v1/download-url` | Keep |
| `cognito-pre-signup` / `cognito-post-confirmation` | Cognito triggers | supporting | Triggered by Cognito events | Keep |
| `migration-api` / `migration-runner` / `migration-orchestrator` | DB migrations | supporting | Invoked manually / Step Functions | Keep |
| `property-archival-job` / `property-permanent-deletion-job` | Background cleanup | supporting | Scheduled jobs | Keep |
| `property-dependency-service` | Dependency analysis worker | supporting | Called by v2 cascade endpoints | Keep |
| `schema-version-service` | Tenant schema tracking | supporting | `/api/v1/schema-versions`, `/api/v1/tenants/{id}/schema-version` | Keep |
| `shared` | Layer utilities | supporting | Imported by other Lambdas | Keep |
| `websocket-connect` / `websocket-disconnect` / `websocket-message` / `websocket-broadcast` | Real-time updates | supporting | WebSocket routes `$connect`, `$disconnect`, `$default` | Keep |

## Recommended Decommission Order
1. **Unused scaffolds / placeholders:** `segments-api`, `packages-api`.
2. **Entity-era duplicates:** `pets-api`, `owners-api`, `staff-api`.
3. **Features-era duplicates:** `tasks-api`, `notes-api`, `incidents-api`, `messages-api`, `communication-api`, `invites-api`.
4. **Operations-era duplicates:** `check-in-api`, `check-out-api`, `runs-api`, `kennels-api`, `bookings-api`.
5. **Analytics-era duplicates:** `dashboard-api`, `reports-api`, `schedule-api`.
6. **Config-era duplicates:** `account-defaults-api`, `services-api`, `facility-api`, `tenants-api`, `memberships-api`, `roles-api`, `user-permissions-api`.
7. **Properties CRUD:** `properties-api` (tombstoned; delete in Phase 8 after monitoring window).

