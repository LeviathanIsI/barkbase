# Properties Consolidation Plan

## 1. Current State Overview
- **Phase 8 note:** `properties-api` (v1) is no longer deployed. It remains in the repo as a 410 tombstone for historical reference. The details below describe the pre-decommission state kept here for archival purposes.
- **v1 (`properties-api`)** – Handles CRUD against the legacy `Property` table. Returns raw records (camelCase columns) and exposes `/api/v1/properties` routes for tenants to manage custom fields.
- **v2 (`properties-api-v2`)** – Adds enterprise-grade metadata, dependency tracking, and cascade operations over the new `PropertyMetadata` graph. Routes live under `/api/v2/properties`.
- **Mixed domain is intentional.** CRUD flows (list/create/update/delete) still rely on v1 while v2 powers archive/restore/substitute/impact-analysis. Phase 5 will migrate CRUD into v2; until then the split must remain.

## 2. Endpoint Inventory

### v1 – CRUD (`aws/lambdas/properties-api`)
| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/v1/properties?objectType=<required>&includeArchived=false&onlyArchived=false` | Returns array of `Property` rows (camelCase). Requires `objectType`. Archive filters are boolean strings. |
| GET | `/api/v1/properties/{recordId}` | Returns single `Property` row or 404. |
| POST | `/api/v1/properties` | Requires `objectType`, `name`, `label`, `type`. Rejects `isSystem=true`. Responds with inserted row. |
| PATCH | `/api/v1/properties/{recordId}` | System properties limited to `isVisible`, `isRequired`, `order`, `group`. Custom props can update label/options/defaults/etc. |
| DELETE | `/api/v1/properties/{recordId}` | Permanently deletes custom property. System props blocked (403). |
| POST | `/api/v1/properties/{recordId}/archive` | Soft archive custom property (sets `isArchived`). No request body. |
| POST | `/api/v1/properties/{recordId}/restore` | Clears archive flags. |

Characteristics:
- HTTP errors: 400 (missing params), 403 (system property mutation), 404, 409 (duplicate name), 500.
- Response shape: plain JSON row with `recordId`, `tenantId`, etc. Strings like `options`, `validation` serialized JSON.
- No dependency awareness or usage metadata.

### v2 – Advanced (`aws/lambdas/properties-api-v2`)
| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/v2/properties?objectType=&propertyType=&includeArchived=false&includeDeprecated=false&includeUsage=false&includeDependencies=false` | Returns `{ properties: [], metadata: { totalCount… } }`. Query params are lowercase strings. |
| GET | `/api/v2/properties/{propertyId}` | Returns serialized metadata object (see serializer). Accepts `includeAuditTrail`. |
| POST | `/api/v2/properties` | Requires `propertyName`, `displayLabel`, `objectType`, `propertyType`, `dataType`. Inserts into `PropertyMetadata` and logs audit trail. |
| PATCH | `/api/v2/properties/{propertyId}` | Limited to displayLabel / description / propertyGroup today. |
| POST | `/api/v2/properties/{propertyId}/archive` | Body: `{ cascadeStrategy, confirmed, reason }`. Soft deletes metadata, disables dependencies, records audit trail. |
| POST | `/api/v2/properties/{propertyId}/restore` | Restores soft-deleted property, reactivates dependencies. |
| POST | `/api/v2/properties/{propertyId}/substitute` | TODO stub – currently archives with a message. |
| DELETE | `/api/v2/properties/{propertyId}/force` | TODO stub – currently calls `archive`. |
| GET | `/api/v2/properties/{propertyId}/dependencies?direction=both|upstream|downstream` | Returns `{ propertyId, direction, dependencies: [], count }`. |
| GET | `/api/v2/properties/{propertyId}/dependents` | Alias for downstream dependencies. |
| POST | `/api/v2/properties/{propertyId}/impact-analysis` | Delegates to `property-dependency-service/impact-analyzer`, returns risk report. |
| GET | `/api/v2/properties/{propertyId}/usage-report` | Combines dependency counts + audit totals + `used_in` metadata. |

Characteristics:
- Responses include `X-API-Version: v2` headers on dependency/cascade endpoints.
- Payloads use snake_case fields internally but serializer exposes camelCase keys like `propertyId`, `displayLabel`, `queryCapabilities`, `permissionProfiles`.
- Archive/restore/substitute/force depend on cascade handlers and property dependency service.

## 3. Frontend Usage Summary
| File & Hook | Endpoint | Params & Notes | Migration Work |
| --- | --- | --- | --- |
| `frontend/src/features/settings/api.js` → `usePropertiesQuery` | `GET /api/v1/properties` | Sends `{ objectType }` and optional archive flags. Expects array of legacy rows. | Needs to switch to `/api/v2/properties` once CRUD migrates; requires mapping serializer output to existing UI shape. |
| `useCreatePropertyMutation` | `POST /api/v1/properties` | Sends UI form payload (fields like `name`, `label`, `type`, `options`). | Must translate to v2 DTO (propertyName/displayLabel/dataType) during migration. |
| `useUpdatePropertyMutation` | `PATCH /api/v1/properties/{id}` | Passes UI payload directly. | Will need new DTO and stricter field validations. |
| `useDeletePropertyMutation` | `DELETE /api/v1/properties/{id}` | Permanent delete. | Future state: replace with v2 cascade delete/force. |
| `usePropertiesV2Query` | `GET /api/v2/properties` | Builds `URLSearchParams` with includeUsage/includeDependencies flags as strings. | Already v2-compatible; may become the default list handler post-migration. |
| `useArchivePropertyMutation` | `POST /api/v2/properties/{id}/archive` | Sends `{ reason, confirmed, cascadeStrategy }`. | Align UI copy + error handling with final cascade UX. |
| `useRestorePropertyMutation` | `POST /api/v2/properties/{id}/restore` | No body. | Keep but ensure UI expects v2 response shape. |
| `useDependencyGraphQuery` | `GET /api/v2/properties/{id}/dependencies` | Toggled by property inspector tools. | After consolidation, this becomes primary dependency source. |
| `useImpactAnalysisMutation` | `POST /api/v2/properties/{id}/impact-analysis` | Sends `{ modificationType }`. | Needs eventual integration into archive/delete UI. |

## 4. Backend Inconsistencies
- **Field naming:** v1 uses `recordId`, `name`, `label`, `options` (JSON string). v2 uses `propertyId`, `propertyName`, `displayLabel`, `enumOptions` (JSON array). Consumers cannot swap responses without mapping.
- **Envelope vs raw arrays:** v1 returns bare arrays, v2 wraps results with `{ properties, metadata }`. Errors also include `X-API-Version` header only in v2.
- **Validation & errors:** v1 returns 400/403/409 with `{ error: string }`. v2 also returns 400/404 but some handlers throw 500 with `{ error: message }` and do not surface validation details.
- **Archive semantics:** v1 toggles `isArchived` on the same row; v2 sets `is_deleted` and writes audit/dependency records, returning a message body instead of the updated property.
- **Query params:** v1 requires `objectType`, uses `includeArchived/onlyArchived`. v2 optionally filters by `objectType` and `propertyType`, and uses strings representing booleans for `includeUsage`, `includeDependencies`.
- **Dependency coverage:** v1 has no concept of dependencies; v2 relies on `PropertyDependencies`/`PropertyChangeAudit`, making parity non-trivial.

## 5. Migration Blockers
1. **Schema mismatch:** v1 `Property` vs v2 `PropertyMetadata` have different column sets and JSON storage. Need migration scripts to move data and rebuild dependency graphs.
2. **DTO differences:** Frontend currently posts `{ name, label, type }`; v2 expects `{ propertyName, displayLabel, propertyType, dataType }`. Requires adapter or API shim.
3. **Cascade ops unfinished:** `substitute` and `forceDelete` are TODO stubs that simply call `archive`. Must complete before retiring v1 delete/archive flows.
4. **Job alignment:** Background jobs (`property-archival-job`, `property-permanent-deletion-job`, `property-dependency-service`) still rely on v2 metadata. CRUD migration must ensure those jobs see the same identifiers.
5. **UI expectations:** Existing UI expects v1 response shape (flat arrays). Switching to v2 requires normalization layer to avoid regressions.

## 6. Proposed Migration Plan (Phase 5)
1. **Feature-complete v2 CRUD:** Extend `properties-api-v2` to support full create/update/delete semantics (including validation parity, uniqueness checks, and system-property rules). Ensure responses include both legacy-friendly fields and rich metadata.
2. **Introduce translation layer:** Add server-side shim (e.g., `/api/v1/properties` proxying to v2) or frontend adapter that maps v2 payloads into the current UI shape. Maintain both routes until verification is complete.
3. **Migrate frontend calls:** Update `frontend/src/features/settings/api.js` to call `/api/v2/properties` for list/create/update/delete once the adapter exists. Add type guards to accept the new response structure.
4. **Retire v1 handler:** After CRUD flows are stable on v2, convert `properties-api` to a 410 responder (like `pets-api`). Update docs to mark /api/v1/properties as deprecated.
5. **Data backfill & jobs:** Run one-time migration from `Property` to `PropertyMetadata`, rebuild dependency rows, and verify that archival/permanent deletion jobs target the v2 tables.
6. **Schema cleanup:** Remove redundant columns/DTOs, update OpenAPI docs, and ensure error codes are consistent (ideally 422 for validation). Finalize DTO diff (see `docs/PROPERTIES_SCHEMA_DIFF.md`) as acceptance criteria.

Stay on the existing split until these blockers are resolved; see TODO markers in the backend/frontend files for reminders.

