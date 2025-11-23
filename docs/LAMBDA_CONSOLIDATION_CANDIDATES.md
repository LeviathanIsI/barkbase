# Lambda Consolidation Candidates

This analysis builds on `docs/LAMBDA_COST_PROFILE.md`, `docs/LAMBDA_OWNERSHIP.md`,
and `docs/CANONICAL_APIS.md` to highlight which legacy Lambdas should be folded into
their canonical counterparts in upcoming phases. Each table lists the current route
surface, the recommended canonical target, the expected amount of work, and a qualitative
decommission risk.

## 1. Entity / People / Pets

| Candidate | Current Routes | Target Canonical Service | Consolidation Type | Decommission Risk | Notes |
| --- | --- | --- | --- | --- | --- |
| `pets-api` | `/api/v1/pets`, `/api/v1/pets/{id}` | `entity-service` | Route move only (DTOs already aligned) | Low | CRUD + vaccinations already exist in `entity-service`; need to remove the historical `/api/v1/pets` mapping after verifying no straggler callers. |
| `owners-api` | `/api/v1/owners*` | `entity-service` | Route move only | Low | Owner CRUD + association logic now lives in `entity-service`; telemetry and docs confirm v1 is unused. |
| `staff-api` | `/api/v1/staff*` | `entity-service` | Route move only | Low | Staff CRUD migrated; Lambda can be removed once monitoring confirms zero calls. |

## 2. Operations / Bookings / Runs / Check-ins

| Candidate | Current Routes | Target Canonical Service | Consolidation Type | Decommission Risk | Notes |
| --- | --- | --- | --- | --- | --- |
| `bookings-api` | `/api/v1/bookings*` | `operations-service` | Route move only | Low | Bookings already handled by consolidated service; v1 kept purely for history. |
| `runs-api` | `/api/v1/runs*`, `/api/v1/run-templates` | `operations-service` | Route move only | Low | All run template endpoints live inside `operations-service`. |
| `check-in-api` | `/api/v1/check-ins` | `operations-service` | Route move only | Low | UI now hits `operations-service`; legacy Lambda can be removed. |
| `check-out-api` | `/api/v1/check-outs` | `operations-service` | Route move only | Low | Same as above. |
| `kennels-api` | `/api/v1/kennels` | `operations-service` | Route move only | Low | Kennel inventory now served by canonical service. |

## 3. Analytics / Reports / Dashboard / Schedule

| Candidate | Current Routes | Target Canonical Service | Consolidation Type | Decommission Risk | Notes |
| --- | --- | --- | --- | --- | --- |
| `dashboard-api` | `/api/v1/dashboard/*` | `analytics-service` | Route move only | Low | `analytics-service` already responds to the dashboard routes; this Lambda can be deleted. |
| `reports-api` | `/api/v1/reports/*` | `analytics-service` | Route move only | Low | Same DTOs; simply remove unused v1 mapping. |
| `schedule-api` | `/api/v1/schedule`, `/api/v1/schedule/capacity` | `analytics-service` | Route move only | Low | Canonical service already exposes identical routes. |
| `segments-api` | (placeholder) | `analytics-service` (future) | Needs deeper schema/contract work | Medium | No current implementation; if segmentation features are revived they should be built as modules inside `analytics-service`. |

## 4. Config / Tenants / Facility / Services

| Candidate | Current Routes | Target Canonical Service | Consolidation Type | Decommission Risk | Notes |
| --- | --- | --- | --- | --- | --- |
| `account-defaults-api` | `/api/v1/account-defaults` | `config-service` | Route move only | Low | Routes already remapped; Lambda is dead code. |
| `services-api` | `/api/v1/services*` | `config-service` | Route move only | Low | Config service now owns service catalog CRUD. |
| `facility-api` | `/api/v1/facility` | `config-service` | Route move only | Low | Facility endpoints migrated. |
| `tenants-api` | `/api/v1/tenants*` | `config-service` | Route move only | Low | Tenant lookup now canonical; remove v1. |
| `memberships-api` | `/api/v1/memberships*` | `config-service` | Route move + small DTO adapter | Medium | Config service already enforces membership logic; confirm DTO parity before removal. |
| `roles-api` | `/api/v1/roles` | `config-service` | Route move only | Low | Roles now part of config service. |
| `user-permissions-api` | `/api/v1/user-permissions` | `config-service` + `user-profile-service` | Route move + small DTO adapter | Medium | Permissions flow now spans both services; ensure audit log parity when decommissioning. |
| `packages-api` | (backup only) | `config-service` | Needs deeper schema/contract work | Medium | No active handler; if packages are reintroduced they should be implemented directly inside config service modules. |

## 5. Features (Tasks / Notes / Incidents / Messages)

| Candidate | Current Routes | Target Canonical Service | Consolidation Type | Decommission Risk | Notes |
| --- | --- | --- | --- | --- | --- |
| `tasks-api` | `/api/v1/tasks*` | `features-service` | Route move only | Low | Features service already handles all task endpoints; v1 Lambda is vestigial. |
| `notes-api` | `/api/v1/notes*` | `features-service` | Route move only | Low | Same as above. |
| `incidents-api` | `/api/v1/incidents*` | `features-service` | Route move only | Low | Incident workflows consolidated. |
| `messages-api` | `/api/v1/messages*` | `features-service` | Route move only | Low | Messaging is part of canonical service. |
| `communication-api` | `/api/v1/communications*` | `features-service` | Route move only | Low | Communications timeline now served via features service. |
| `invites-api` | `/api/v1/invites*` | `features-service` | Route move only | Low | Invite lifecycle handled in canonical service. |

## 6. Financial / Payments / Invoices

| Candidate | Current Routes | Target Canonical Service | Consolidation Type | Decommission Risk | Notes |
| --- | --- | --- | --- | --- | --- |
| _None – all payments/invoice/billing routes already terminate on `financial-service`._ |  |  |  |  |  |

## 7. Identity / Auth Helpers

While not part of the cost-reduction target, note that:

- `auth-api` and `users-api` run with 1024 MB memory via the shared helper. If we later
  downsize those allocations or move certain lightweight routes into `user-profile-service`,
  we could lower baseline costs.
- Cognito triggers (`cognito-pre-signup`, `cognito-post-confirmation`) are already lean and
  should remain isolated for clarity.

