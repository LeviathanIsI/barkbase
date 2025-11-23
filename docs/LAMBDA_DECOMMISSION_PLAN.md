# Lambda Decommission Plan (Preview)

This document outlines the steps BarkBase will follow when retiring legacy Lambdas in future phases. **No code changes happen during this phase.**

## 1. Scope
- **Entity-era Lambdas:** `pets-api`, `owners-api`, `staff-api`.
- **Operations-era Lambdas:** `bookings-api`, `runs-api`, `check-in-api`, `check-out-api`, `kennels-api`.
- **Analytics-era Lambdas:** `dashboard-api`, `reports-api`, `schedule-api`.
- **Features-era Lambdas:** `tasks-api`, `notes-api`, `incidents-api`, `messages-api`, `communication-api`, `invites-api`.
- **Config-era Lambdas:** `account-defaults-api`, `services-api`, `facility-api`, `packages-api` (scaffold), `tenants-api`, `memberships-api`, `roles-api`, `user-permissions-api`.
- **Mixed properties:** `properties-api` (CRUD) – will be retired after CRUD migrates into `properties-api-v2`.
- **Misc placeholders:** `segments-api` (unused).

All canonical services (`entity-service`, `operations-service`, `analytics-service`, `financial-service`, `config-service`, `user-profile-service`, `features-service`, `properties-api-v2`, `auth-api`, `users-api`) remain.

## 2. Retirement Conditions (must all be satisfied)
1. Frontend and backend callers no longer invoke the legacy endpoint (validated via code search + telemetry).
2. Canonical replacement endpoints exist, are battle-tested, and cover the same business logic.
3. v1→v2 consolidations (e.g., properties) are complete and documented.
4. Production, staging, and development environments show zero traffic to the legacy Lambda for an agreed “quiet period” (e.g., 30 days).
5. CDK and API Gateway route mappings can be removed without breaking shared authorizers or IAM policies.
6. Rollback instructions exist (e.g., ability to redeploy the Lambda or temporarily re-enable the route).

## 3. Per-era Checklist
### Entity-era (pets, owners, staff)
- Verify `entity-service` handles 100% of create/read/update/delete flows.
- Run repo-wide search for `/api/v1/pets`, `/api/v1/owners`, `/api/v1/staff` to confirm no code points to the legacy Lambdas.
- Log-based verification: CloudWatch metrics for the legacy Lambdas must be zero for the quiet period.
- Update CDK to remove the Lambda and route mappings, then redeploy.

### Operations-era (bookings, runs, check-ins, kennels)
- Ensure `operations-service` owns every `/api/v1/bookings`, `/api/v1/run-templates`, `/api/v1/check-ins`, `/api/v1/kennels` route.
- Confirm batch/bulk flows (batch check-in, mobile check-in) hit canonical routes.
- Validate there are no EventBridge triggers or cron jobs referencing the legacy Lambdas.
- Remove the Lambda, associated IAM policies, and API Gateway routes once metrics drop to zero.

### Analytics-era (dashboard, reports, schedule)
- Confirm UI dashboards exclusively call `analytics-service`.
- Compare responses to ensure parity (fields, headers, status codes).
- After quiet period, update CDK to remove `dashboard-api`, `reports-api`, and `schedule-api` plus their CloudWatch alarms.

### Config-era (tenants, account defaults, services, roles, memberships, user permissions, packages)
- Verify `config-service` exposes the canonical endpoints.
- Identify any jobs, scripts, or admin tools still calling the legacy Lambdas and migrate them.
- `packages-api` currently has no active handler; confirm no infrastructure references remain before removal.

### Features-era (tasks, notes, incidents, messages, communication, invites)
- Ensure `features-service` exposes all `/api/v1/tasks`, `/api/v1/notes`, `/api/v1/incidents`, `/api/v1/messages`, `/api/v1/communications`, `/api/v1/invites` routes.
- Remove any feature flags or toggles attempting to call the legacy Lambdas during rollout.

### Misc / Properties v1
- `properties-api` stays until CRUD moves to `/api/v2/properties`. Once migration completes, convert `properties-api` to return `410 Gone` for a validation window, then remove it entirely.
- `segments-api` is an unused scaffold; delete only after verifying no future work depends on it.

## 4. Safety Checks & Rollback
- **Logs & Metrics:** Create CloudWatch dashboards showing invocations, errors, and latency for both legacy and canonical Lambdas. Decommission only when legacy curves hit zero.
- **Temporary 410:** Before deleting, update the legacy Lambda to respond with `410 Gone` (as done for `pets-api`). Monitor for unexpected client errors; if any show up, roll back.
- **Rollback Plan:** Keep the Lambda code and CDK definitions on a branch/tag so it can be redeployed quickly if needed. Ensure infrastructure secrets/permissions are not permanently removed until confidence is high.

## 5. CDK & Infrastructure Steps
1. Remove the Lambda definition from the stack (code, layers, environment variables).
2. Remove API Gateway route mappings and integrations.
3. Clean up IAM permissions, CloudWatch alarms, and log retention rules associated with the Lambda.
4. Update documentation (API routes, ownership tables) to reflect the removal.

## 6. Observability & Monitoring
- Add alarms for unexpected traffic to legacy endpoints during the sunset window.
- Enable structured logging on canonical Lambdas to detect any fallback to legacy URLs.
- After removal, monitor 4xx/5xx rate increases on canonical services for at least one full release cycle.

Following this plan will let us retire the duplicate Lambdas safely without introducing regressions.

### Phase 7 Milestone
- `properties-api` (v1) now returns `410 Gone` as a legacy tombstone.
- All frontend traffic uses `/api/v2/properties` (verified during Phase 5/6).
- Next phase (Phase 8): remove CDK integration, API Gateway routes, and the Lambda deployment entirely.

### Phase 8 Milestone
- `properties-api` (v1) has been removed from CDK stacks and API Gateway routing.
- Only `properties-api-v2` remains deployed for the properties domain; `/api/v2/properties*` is the single canonical surface.
- The legacy source folder stays in the repo for historical reference and contingency testing, but it is no longer part of any stack.

### Phase 9 Milestone
- 26 legacy Lambdas were documented as consolidation candidates (see `docs/LAMBDA_CONSOLIDATION_CANDIDATES.md`).
- The densest opportunities are in the Config era (8 services) and Features era (6 services), followed by Operations (5) and Analytics (4).
- Entity-era clean-up (pets/owners/staff) and Properties (already tombstoned) remain straightforward removals once telemetry confirms zero traffic.
- Actual consolidation work (route moves, DTO adapters, schema cleanup) will occur in later phases (Phase 10+); this phase is analysis/documentation only.

### Phase 10 Milestone
- `pets-api`, `owners-api`, and `staff-api` have been removed from CDK stacks and API Gateway routing.
- `entity-service` is now the sole deployed backend for all `/api/v1/pets`, `/api/v1/owners`, and `/api/v1/staff` traffic (with OPTIONS handled by the shared handler).
- The legacy Lambda source folders remain for historical reference and continue to return `410 Gone`, but they are no longer part of any infrastructure deployment.

### Phase 11 Milestone
- `bookings-api`, `runs-api`, `check-in-api`, `check-out-api`, and `kennels-api` have been removed from the CDK stack and API Gateway routing.
- `operations-service` is now the only deployed backend for `/api/v1/bookings*`, `/api/v1/runs*`, `/api/v1/check-ins*`, `/api/v1/check-outs*`, and `/api/v1/kennels*`.
- Legacy source folders are retained in the repo as 410 tombstones for historical reference and emergency rollback, but they are no longer synthesized or deployed.

### Phase 12 Milestone
- `dashboard-api`, `reports-api`, and `schedule-api` have been removed from CDK stacks and API Gateway routing.
- `analytics-service` is now the sole deployed backend for all `/api/v1/dashboard*`, `/api/v1/reports*`, and `/api/v1/schedule*` routes.
- Legacy Lambda folders remain in the repo as 410 tombstones for historical reference; no runtime usage.

### Phase 13 Milestone
- `account-defaults-api`, `services-api`, `facility-api`, `packages-api`, `tenants-api`, `memberships-api`, `roles-api`, and `user-permissions-api` have been removed from CDK stacks and API Gateway routing.
- `config-service` is now the only deployed backend for all `/api/v1/tenants*`, `/api/v1/services*`, `/api/v1/account-defaults*`, `/api/v1/facility*`, `/api/v1/packages*`, `/api/v1/memberships*`, `/api/v1/roles*`, and `/api/v1/user-permissions*` endpoints.
- Legacy Lambda folders remain as 410 tombstones/backups for historical reference; no runtime usage.

### Phase 14 Milestone
- `tasks-api`, `notes-api`, `incidents-api`, `messages-api`, `communication-api`, and `invites-api` have been removed from CDK stacks and API Gateway routing.
- `features-service` is now the only deployed backend for all `/api/v1/tasks*`, `/api/v1/notes*`, `/api/v1/incidents*`, `/api/v1/messages*`, `/api/v1/communications*`, and `/api/v1/invites*` endpoints.
- Legacy Lambda folders remain in the repo as 410 tombstones for historical reference; no runtime usage.

