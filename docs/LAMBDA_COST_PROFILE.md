# Lambda Cost & Configuration Profile

This document captures a static view of every Lambda under `aws/lambdas/`, including
their current deployment status, resource settings drawn from `aws/cdk/lib/cdk-stack.ts`,
and a lightweight cost-risk heuristic. Memory/timeout values come from CDK defaults unless
explicitly configured. Functions that are no longer wired into CDK/API Gateway are marked
as historical; they remain in the repo for reference only.

## Key

- **Env Vars** – number of environment variables injected (e.g., `dbEnvironment` has 7 keys).
- **Concurrency** – indicates if reserved/provisioned concurrency is configured (none today).
- **Cost Risk Score**
  - **HIGH**: wide surface area or high memory/timeout allocation.
  - **MEDIUM**: moderate footprint or scheduled/real-time workloads.
  - **LOW**: lightweight helper or niche Lambda.
  - **UNUSED / PLACEHOLDER**: not deployed in the current CDK stack.

### Canonical & Customer-Facing Services

| Lambda | Domain / Purpose | Status | Memory (MB) | Timeout (s) | Concurrency | Env Vars | API / Trigger | Cost Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `analytics-service` | Dashboards, reports, schedule metrics | canonical | 128 (default) | 30 | none | db env + Cognito IDs (≈9) | `/api/v1/dashboard/*`, `/api/v1/reports/*`, `/api/v1/schedule*` | HIGH |
| `auth-api` | Login/signup/refresh flows | canonical | 1024 (helper default) | 30 | none | db env + JWT + Cognito config (≈12) | `/api/v1/auth/*` | HIGH |
| `config-service` | Tenants, services, roles, defaults | canonical | 128 | 30 | none | db env + Cognito IDs (≈9) | `/api/v1/tenants/current`, `/api/v1/account-defaults`, `/api/v1/services`, `/api/v1/roles`, `/api/v1/facility`, etc. | HIGH |
| `entity-service` | Pets, owners, staff | canonical | 128 | 30 | none | db env + Cognito IDs (≈9) | `/api/v1/pets*`, `/api/v1/owners*`, `/api/v1/staff*` | HIGH |
| `features-service` | Tasks, notes, incidents, messages, invites | canonical | 128 | 30 | none | db env + Cognito IDs (≈9) | `/api/v1/tasks*`, `/api/v1/notes*`, `/api/v1/incidents*`, `/api/v1/messages*`, `/api/v1/communications*`, `/api/v1/invites*` | HIGH |
| `financial-service` | Payments, invoices, billing metrics | canonical | 128 | 30 | none | db env + Cognito IDs (≈9) | `/api/v1/payments*`, `/api/v1/invoices*`, `/api/v1/billing/*` | HIGH |
| `operations-service` | Bookings, runs, check-ins/outs, kennels | canonical | 128 | 30 | none | db env + Cognito IDs (≈9) | `/api/v1/bookings*`, `/api/v1/runs*`, `/api/v1/check-ins`, `/api/v1/check-outs`, `/api/v1/kennels` | HIGH |
| `properties-api-v2` | Properties CRUD + metadata/dependencies | canonical | 128 | 30 | none | db env (7) | `/api/v2/properties*`, dependency/cascade endpoints | HIGH |
| `user-profile-service` | Permission profiles & field-level security | canonical | 128 | 30 | none | db env (7) | `/api/v1/profiles`, `/api/v1/users/{id}/profiles`, `/api/v1/users/profile`, `/api/v1/users/password`, `/api/v1/users/avatar` | MEDIUM |
| `users-api` | Tenant-scoped user admin | canonical | 1024 (helper default) | 30 | none | db env (7) | `/api/v1/users*` | HIGH |

### Supporting APIs, Jobs, Identity, and Real-Time

| Lambda | Domain / Purpose | Status | Memory (MB) | Timeout (s) | Concurrency | Env Vars | API / Trigger | Cost Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `admin-api` | Internal tenant stats dashboard | supporting | 128 | 30 | none | db env (7) | `/api/v1/admin/stats` | MEDIUM |
| `cognito-post-confirmation` | Finalize user records after signup | supporting | 128 | 30 | none | db env (7) | Cognito PostConfirmation trigger | LOW |
| `cognito-pre-signup` | Lightweight signup validation/autoconfirm | supporting | 128 | 10 | none | none | Cognito PreSignUp trigger | LOW |
| `get-download-url` | Issue signed S3 download URLs | supporting | 128 | default (~3) | none | S3 env (3) | `/api/v1/download-url` | LOW |
| `get-upload-url` | Issue signed S3 upload URLs | supporting | 128 | 30 | none | S3 env (3) | `/api/v1/upload-url` | LOW |
| `migration-api` | Secure migration runner entrypoint | supporting | 128 | 60 | none | db env (7) | `/api/v1/migration` | HIGH |
| `migration-orchestrator` | Step Functions orchestration helpers | supporting | n/a | n/a | n/a | n/a | Not wired in CDK (scripts only) | UNUSED |
| `migration-runner` | Long-running SQL executor helpers | supporting | n/a | n/a | n/a | n/a | Not wired in CDK (scripts only) | UNUSED |
| `options-handler` | Dedicated OPTIONS/CORS responder | supporting | 128 | 3 | none | none | All `/api/*` OPTIONS traffic | LOW |
| `property-archival-job` | Daily archival sweep | supporting | 128 | 900 (15 min) | none | db env (7) | EventBridge cron (daily 02:00 UTC) | MEDIUM |
| `property-dependency-service` | Graph/dependency helpers for properties | supporting | n/a | n/a | n/a | n/a | Invoked internally by v2 (not standalone in CDK) | MEDIUM |
| `property-permanent-deletion-job` | Weekly purge job | supporting | 128 | 900 | none | db env (7) | EventBridge cron (Sun 03:00 UTC) | MEDIUM |
| `schema-version-service` | Track tenant schema migrations | supporting | n/a | n/a | n/a | n/a | Not currently deployed via CDK | UNUSED |
| `shared` | Shared node modules/utilities for layers | supporting | n/a | n/a | n/a | n/a | Not a Lambda (library folder) | UNUSED |
| `user-profile-service` | (listed above) | canonical | — | — | — | — | — | — |
| `websocket-broadcast` | Push outbound notifications | supporting | 128 | 30 | none | db env (7) | Invoked by other Lambdas to call WebSocket management API | MEDIUM |
| `websocket-connect` | Handle `$connect` handshake | supporting | 128 | 30 | none | db env (7) | WebSocket connect route | MEDIUM |
| `websocket-disconnect` | Handle `$disconnect` cleanup | supporting | 128 | 30 | none | db env (7) | WebSocket disconnect route | MEDIUM |
| `websocket-message` | Default WebSocket route | supporting | 128 | 30 | none | db env (7) | WebSocket default route | MEDIUM |

> _Note:_ The table above omits duplicate entries already covered in the canonical list
(e.g., `user-profile-service`). Supporting Lambdas that are not wired in CDK are explicitly
marked **UNUSED** even though their source exists.

### Legacy / Historical Lambdas (kept in repo for reference)

| Lambda | Domain / Purpose | Status | Memory (MB) | Timeout (s) | Concurrency | Env Vars | API / Trigger | Cost Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `account-defaults-api` | Tenant defaults | legacy | n/a | n/a | n/a | n/a | `/api/v1/account-defaults` (now served by `config-service`) | LOW |
| `bookings-api` | Booking CRUD | legacy | n/a | n/a | n/a | n/a | `/api/v1/bookings*` (migrated to `operations-service`) | LOW |
| `check-in-api` | Check-in workflow | legacy | n/a | n/a | n/a | n/a | `/api/v1/check-ins` (now in `operations-service`) | LOW |
| `check-out-api` | Check-out workflow | legacy | n/a | n/a | n/a | n/a | `/api/v1/check-outs` (now in `operations-service`) | LOW |
| `communication-api` | Owner communications | legacy | n/a | n/a | n/a | n/a | `/api/v1/communications` (now features-service) | LOW |
| `dashboard-api` | Dashboard metrics | legacy | n/a | n/a | n/a | n/a | `/api/v1/dashboard/*` (now analytics-service) | LOW |
| `facility-api` | Facility info | legacy | n/a | n/a | n/a | n/a | `/api/v1/facility` (config-service) | LOW |
| `incidents-api` | Incident tracking | legacy | n/a | n/a | n/a | n/a | `/api/v1/incidents` (features-service) | LOW |
| `invites-api` | Staff/customer invites | legacy | n/a | n/a | n/a | n/a | `/api/v1/invites` (features-service) | LOW |
| `kennels-api` | Kennel inventory | legacy | n/a | n/a | n/a | n/a | `/api/v1/kennels` (operations-service) | LOW |
| `memberships-api` | Tenant memberships | legacy | n/a | n/a | n/a | n/a | `/api/v1/memberships` (config-service) | LOW |
| `messages-api` | Internal messaging | legacy | n/a | n/a | n/a | n/a | `/api/v1/messages` (features-service) | LOW |
| `notes-api` | Entity notes | legacy | n/a | n/a | n/a | n/a | `/api/v1/notes` (features-service) | LOW |
| `owners-api` | Owner CRUD | legacy | n/a | n/a | n/a | n/a | `/api/v1/owners` (entity-service) | LOW |
| `packages-api` | Packages scaffold | legacy/placeholder | n/a | n/a | n/a | n/a | Not wired; features handled in config-service | UNUSED |
| `pets-api` | Pet CRUD | legacy | n/a | n/a | n/a | n/a | `/api/v1/pets` (entity-service) | LOW |
| `properties-api` | Legacy properties CRUD | historical (410 tombstone) | 128 | 0 (always returns 410) | none | none | `/api/v1/properties` – returns 410 | LOW |
| `reports-api` | Reports API v1 | legacy | n/a | n/a | n/a | n/a | `/api/v1/reports/*` (analytics-service) | LOW |
| `roles-api` | Role definitions | legacy | n/a | n/a | n/a | n/a | `/api/v1/roles` (config-service) | LOW |
| `runs-api` | Run templates/assignments | legacy | n/a | n/a | n/a | n/a | `/api/v1/runs*` (operations-service) | LOW |
| `schedule-api` | Schedule availability | legacy | n/a | n/a | n/a | n/a | `/api/v1/schedule*` (analytics-service) | LOW |
| `segments-api` | Segmentation placeholder | placeholder | n/a | n/a | n/a | n/a | No routes – kept for future analytics | UNUSED |
| `services-api` | Service catalog | legacy | n/a | n/a | n/a | n/a | `/api/v1/services` (config-service) | LOW |
| `staff-api` | Staff CRUD | legacy | n/a | n/a | n/a | n/a | `/api/v1/staff` (entity-service) | LOW |
| `tasks-api` | Task management | legacy | n/a | n/a | n/a | n/a | `/api/v1/tasks` (features-service) | LOW |
| `tenants-api` | Tenant lookup | legacy | n/a | n/a | n/a | n/a | `/api/v1/tenants*` (config-service) | LOW |
| `user-permissions-api` | Permission assignments v1 | legacy | n/a | n/a | n/a | n/a | `/api/v1/user-permissions` (config + user-profile services) | LOW |

> Because legacy Lambdas are no longer synthesized, their memory/timeout entries are
listed as “n/a”. They still exist on disk but are inactive in deployment.

