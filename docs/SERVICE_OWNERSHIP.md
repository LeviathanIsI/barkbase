# Service Ownership Map

Each Lambda under `aws/lambdas/` is listed below with its primary domain, example routes or triggers, current status, and consolidation notes. Status values:

- **canonical** – the service currently fronts the production API for that domain.
- **legacy** – code retained for reference but not wired through CDK (routes now terminate on a consolidated service).
- **supporting** – helper utilities, jobs, Cognito triggers, WebSocket handlers, or other non-primary endpoints.

## Canonical services
| Service | Domain(s) | Example routes / triggers | Status | Notes |
| --- | --- | --- | --- | --- |
| `admin-api` | Admin metrics | `GET /api/v1/admin/stats` | canonical | Returns tenant-wide counts for ops dashboards. |
| `analytics-service` | Dashboard, reports, schedule | `GET /api/v1/dashboard/stats`<br>`GET /api/v1/reports/revenue` | canonical | Replaces `dashboard-api`, `reports-api`, and `schedule-api`; handles `/api/v1/schedule*`. |
| `auth-api` | Authentication | `POST /api/v1/auth/login`<br>`POST /api/v1/auth/refresh` | canonical | Implements hardened login/signup/refresh/logout flows with `security-utils`. |
| `config-service` | Tenants, services, facility, account defaults, packages, roles, memberships, user permissions | `GET /api/v1/tenants/current`<br>`PUT /api/v1/account-defaults` | canonical | Consolidates the older configuration lambdas (services/facility/account-defaults/roles/packages/memberships/user-permissions). |
| `entity-service` | Pets, owners, staff | `GET /api/v1/pets`<br>`GET /api/v1/owners` | canonical | Authoritative API for entity CRUD, including vaccinations and medical alerts; supersedes `pets-api`, `owners-api`, and `staff-api`. |
| `features-service` | Tasks, notes, incidents, messages, communications, invites | `GET /api/v1/tasks`<br>`GET /api/v1/notes` | canonical | Unified service for operational workflows; replaces `tasks-api`, `notes-api`, `incidents-api`, `messages-api`, `communication-api`, and `invites-api`. |
| `financial-service` | Payments, invoices, billing | `GET /api/v1/payments`<br>`POST /api/v1/invoices` | canonical | Merged payments/invoices/billing APIs; includes `/api/v1/billing/metrics`. |
| `migration-api` | Manual migration runner | `POST /api/v1/migration` | canonical | Secure admin-only entry point to run DB migrations. |
| `operations-service` | Bookings, runs, check-ins/out, kennels | `GET /api/v1/bookings`<br>`POST /api/v1/bookings/{id}/check-in` | canonical | Consolidates `bookings-api`, `runs-api`, `check-in-api`, `check-out-api`, and `kennels-api`. |
| `properties-api-v2` | Advanced property ops (v2) | `POST /api/v2/properties/{propertyId}/restore`<br>`GET /api/v2/properties/{propertyId}/dependencies` | canonical | Adds enterprise restore/dependency/impact-analysis flows; collaborates with `property-dependency-service`. |
| `schema-version-service` | Schema/version management | `GET /api/v1/schema-versions`<br>`POST /api/v1/tenants/{tenantId}/schema-version/upgrade` | canonical | Tracks tenant schema versioning for zero-downtime migrations. |
| `user-profile-service` | User profiles & permissions | `GET /api/v1/users/profile`<br>`POST /api/v1/users/{userId}/profiles` | canonical | Manages permission profiles, inheritance, and effective permission calculations. |
| `users-api` | Tenant-scoped user admin | `GET /api/v1/users`<br>`PUT /api/v1/users/{id}` | canonical | CRUD for users/memberships within a tenant (distinct from profile service). |

## Legacy services (kept for reference)
| Service | Domain(s) | Example routes | Status | Notes |
| --- | --- | --- | --- | --- |
| `account-defaults-api` | Tenant defaults | `GET /api/v1/account-defaults` | legacy | Functionality moved into `config-service`. |
| `bookings-api` | Bookings | `/api/v1/bookings` (returns 410) | historical | Removed from CDK/API Gateway in Phase 11; operations-service is canonical. |
| `check-in-api` | Check-ins | `/api/v1/check-ins` (returns 410) | historical | Removed from CDK/API Gateway in Phase 11; operations-service handles check-ins. |
| `check-out-api` | Check-outs | `/api/v1/check-outs` (returns 410) | historical | Removed from CDK/API Gateway in Phase 11; operations-service handles check-outs. |
| `communication-api` | Owner communications | `GET/POST /api/v1/communications` | legacy | Superseded by `features-service`. |
| `dashboard-api` | Dashboard metrics | `/api/v1/dashboard/*` (returns 410) | historical | Removed from CDK/API Gateway in Phase 12; analytics-service owns dashboard routes. |
| `facility-api` | Facility overview | `GET /api/v1/facility` | legacy | Config routines live in `config-service`. |
| `incidents-api` | Incident tracking | `GET/POST /api/v1/incidents` | legacy | Replaced by `features-service`. |
| `invites-api` | Staff/customer invites | `POST /api/v1/invites` | legacy | Replaced by `features-service`. |
| `kennels-api` | Kennel inventory | `/api/v1/kennels` (returns 410) | historical | Removed from CDK/API Gateway in Phase 11; operations-service handles kennels. |
| `memberships-api` | Tenant memberships | `GET /api/v1/memberships` | legacy | Config service owns memberships. |
| `messages-api` | Internal messaging | `GET /api/v1/messages` | legacy | Replaced by `features-service`. |
| `notes-api` | Entity notes | `GET/POST /api/v1/notes` | legacy | Replaced by `features-service`. |
| `owners-api` | Owner CRUD | `/api/v1/owners` (returns 410) | historical | Removed from CDK/API Gateway in Phase 10; entity-service handles all owner routes. |
| `packages-api` | Service packages | `GET /api/v1/services` | legacy | Functionality absorbed by `config-service` (only `index.js.backup` remains). |
| `pets-api` | Pet CRUD | `/api/v1/pets` (returns 410) | historical | Removed from CDK/API Gateway in Phase 10; entity-service is canonical. |
| `properties-api` | Property CRUD (v1) | `/api/v1/properties` (now 410) | historical | Removed from CDK/API Gateway in Phase 8; source folder retained only for investigations. |
| `reports-api` | Reports | `/api/v1/reports/*` (returns 410) | historical | Removed from CDK/API Gateway in Phase 12; analytics-service handles reports. |
| `roles-api` | Role catalog | `GET /api/v1/roles` | legacy | Provided by `config-service`. |
| `runs-api` | Run scheduling | `/api/v1/runs` (returns 410) | historical | Removed from CDK/API Gateway in Phase 11; operations-service handles all runs/routes. |
| `schedule-api` | Schedule view | `/api/v1/schedule*` (returns 410) | historical | Removed from CDK/API Gateway in Phase 12; analytics-service serves schedule routes. |
| `segments-api` | Customer segmentation (placeholder) | N/A | legacy | Directory currently empty; kept as a placeholder for future segmentation work. |
| `services-api` | Service catalog | `GET /api/v1/services` | legacy | Consolidated into `config-service`. |
| `staff-api` | Staff CRUD | `/api/v1/staff` (returns 410) | historical | Removed from CDK/API Gateway in Phase 10; entity-service handles all staff routes. |
| `tasks-api` | Task management | `GET /api/v1/tasks` | legacy | Superseded by `features-service`. |
| `tenants-api` | Tenant lookup | `GET /api/v1/tenants/current` | legacy | Config service is canonical. |
| `user-permissions-api` | User permission mapping | `GET /api/v1/user-permissions` | legacy | Replaced by `config-service` + `user-profile-service`. |

## Supporting utilities, jobs, and real-time handlers
| Service | Domain(s) | Example routes / triggers | Status | Notes |
| --- | --- | --- | --- | --- |
| `cognito-post-confirmation` | Identity lifecycle | Cognito PostConfirmation trigger | supporting | Finalizes user records after signup. |
| `cognito-pre-signup` | Identity lifecycle | Cognito PreSignUp trigger | supporting | Enforces signup validations before Cognito accepts a user. |
| `get-download-url` | File delivery | `GET /api/v1/download-url` | supporting | Generates signed S3 download URLs; bucket/IAM configured in CDK. |
| `get-upload-url` | File uploads | `POST /api/v1/upload-url` | supporting | Issues presigned upload URLs with tenant-aware prefixes. |
| `migration-orchestrator` | Migration workflows | Step Functions phases (`phases/*.js`) | supporting | Coordinates multi-phase migrations (contract/expand/migrate). |
| `migration-runner` | Migration executor | Invoked by orchestrator | supporting | Runs long-running SQL scripts for migrations. |
| `options-handler` | CORS preflight | `OPTIONS /api/v1/*` | supporting | Lightweight Lambda responding to all OPTIONS routes without auth. |
| `property-archival-job` | Property lifecycle | EventBridge schedule / job queue | supporting | Archives soft-deleted properties; part of property lifecycle tooling. |
| `property-dependency-service` | Property dependency graph | `GET /api/v2/dependencies/discover`<br>`POST /api/v2/dependencies/impact-analysis/{propertyId}` | supporting | Backing service for v2 dependency discovery, impact analysis, and cascade ops. |
| `property-permanent-deletion-job` | Property lifecycle | Scheduled job | supporting | Permanently purges archived properties after retention windows. |
| `shared` | Common utilities | N/A (layer) | supporting | Provides shared modules such as `security-utils.js` to other Lambdas. |
| `websocket-broadcast` | Real-time fan-out | Custom publish invocation | supporting | Sends payloads to all active WebSocket connections (`wss://.../production`). |
| `websocket-connect` | Real-time connect | `$connect` route | supporting | Registers new WebSocket connections. |
| `websocket-disconnect` | Real-time disconnect | `$disconnect` route | supporting | Cleans up connection metadata on disconnect. |
| `websocket-message` | Real-time messaging | `$default` route | supporting | Processes tenant-scoped real-time messages. |


