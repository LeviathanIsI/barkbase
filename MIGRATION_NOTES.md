# Migration Notes

## Module Restructuring
- Added `src/dashboard/` with `metrics.service`, `reports.service`, and `widgets.service`. These replace the former `src/services/dashboard.service.js` mega-file (now a thin re-export).
- Split the action registry into dedicated files under `src/flows/actions/` (`email`, `tags`, `finance`, `http`, plus `index.js` assembler).
- Broke the handler worker apart into modular units under `src/jobs/` (`context.js`, `executor.js`, `queue.js`, `retry.js`) with `handlerWorker.js` orchestrating them.

## New Shared Utilities
- Centralized logging helpers in `src/lib/logger.js`; `src/utils/logger.js` now exposes `withTenant` / `withReq` helpers.
- Introduced `src/lib/http.js` for outbound requests with retries, correlation IDs, and timeout support.
- Added pagination helpers in `src/utils/pagination.js` for consistent query handling.
- Replaced vm2-based evaluation with `src/services/criteria/evaluator.js` (safe JSON-logic execution). Existing `src/services/criteriaEvaluator.js` re-exports the new module for compatibility.

## Schema & Persistence
- New Prisma model `HandlerEvent` (migration `20250101000000_handler_event_idempotency`) enforces `(tenantId, idempotencyKey)` uniqueness for event ingestion. Run `npx prisma migrate deploy` after pulling.

## Environment Variables
Add the following keys to `backend/.env` (see `.env.example` for defaults):

```
DB_TUNE_ON_BOOT=false
DB_INTEGRITY_CHECK=false
HTTP_DEFAULT_TIMEOUT_MS=10000
HTTP_MAX_RETRIES=2
```

`DB_TUNE_ON_BOOT` and `DB_INTEGRITY_CHECK` gate SQLite pragmas and integrity checks at boot. The HTTP variables feed the new wrapper’s defaults.

## Operational Notes
- Request logging now attaches `x-request-id` to responses and exposes `logger.withReq()` for downstream correlation.
- Event ingestion flows must depend on `handlerFlowService.handleEvent`, which persists to `HandlerEvent` before scheduling runs.
- Outbound webhook actions should import from `src/flows/actions/http.js` (delegates to `lib/http`).
