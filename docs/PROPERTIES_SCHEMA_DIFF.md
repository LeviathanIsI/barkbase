# Properties Schema & DTO Differences (v1 vs v2)

This reference captures the structural mismatches between the legacy `/api/v1/properties` surface (backed by the `Property` table) and the new `/api/v2/properties` stack (backed by `PropertyMetadata`, dependency graphs, and cascade handlers). Use this when planning the Phase 5 consolidation.

## 1. Create / Update Requests

| Concern | v1 (`properties-api`) | v2 (`properties-api-v2`) | Migration Impact |
| --- | --- | --- | --- |
| Required fields | `objectType`, `name`, `label`, `type` | `propertyName`, `displayLabel`, `objectType`, `propertyType`, `dataType` | Frontend must remap naming (`name`→`propertyName`, `type`→`dataType`, etc.) or server must shim. |
| Optional fields | `description`, `group`, `order`, `isRequired`, `isVisible`, `options`, `validation`, `defaultValue`, `metadata` (all camelCase) | Rich metadata: `propertyGroup`, `fieldType`, `enumOptions`, `validationRules`, `permissionProfiles`, `queryCapabilities`, `isCalculated`, `rollupConfig`, etc. | Many v2 fields have no analog in v1; decide whether to expose them in UI or default them server-side. |
| Validation | Regex on `name`, duplicate check per tenant/objectType | Basic “required field” validation only; no duplicate check implemented yet | Need to port v1 validation rules into v2 before switching CRUD. |
| System properties | `isSystem` hard-coded false for POST; PATCH allows limited fields when `isSystem=true` | System vs custom is driven by `property_type` and `is_global` flags | Ensure parity by enforcing the same restrictions in v2 PATCH. |

## 2. CRUD Responses

| Concern | v1 Response | v2 Response | Migration Impact |
| --- | --- | --- | --- |
| Shape | Plain row from `Property` with camelCase keys (`recordId`, `objectType`, `isArchived`, etc.) | Serialized metadata object with nested sections (`propertyId`, `propertyName`, `queryCapabilities`, `permissionProfiles`, `usage`, etc.) | Need a normalization layer so existing UI fields (`recordId`, `label`, `options`) keep working even though v2 uses different keys. |
| Envelope | Arrays or single objects; no metadata wrapper | `{ properties: [...], metadata: { totalCount, objectType, propertyType } }` | List consumers must extract `.properties`. |
| Option/validation fields | Stored as JSON strings (e.g., `"options": "[...]"`) | Already parsed arrays/objects (`enumOptions`, `validationRules`) | UI should stop manually `JSON.parse` once on v2; transitional adapter required. |

## 3. Archive / Restore / Delete

| Concern | v1 | v2 | Migration Impact |
| --- | --- | --- | --- |
| Archive request | `POST /api/v1/properties/{id}/archive` (no body) | `POST /api/v2/properties/{id}/archive` with `{ cascadeStrategy, confirmed, reason }` | UI must start sending cascade strategy + user intent when migrating to v2. |
| Archive result | Returns updated `Property` row (`isArchived` toggled) | Returns message payload `{ message, propertyId, deletionStage, restorable }` | Need to update UI toast logic to use new payload or build shim that returns the old row. |
| Restore request | `POST /api/v1/properties/{id}/restore` | `POST /api/v2/properties/{id}/restore` | v2 response includes counts of reactivated dependencies. |
| Delete | `DELETE /api/v1/properties/{id}` permanently removes row | v2 only has soft-delete today; `substitute`/`forceDelete` are TODO stubs | Cannot fully retire v1 DELETE until v2 implements real substitute/force workflows. |

## 4. Dependency & Impact Outputs

| Concern | v1 | v2 | Migration Impact |
| --- | --- | --- | --- |
| Dependency graph | Not available | `/api/v2/properties/{id}/dependencies` returns `{ propertyId, direction, dependencies: [{ dependency_type, is_critical, ... }] }` | When CRUD moves to v2, we can remove ad-hoc dependency lookups from the UI and rely on this endpoint. |
| Impact analysis | Not available | `/api/v2/properties/{id}/impact-analysis` returns risk report via `property-dependency-service` | Archive/delete confirmation modals should start calling this before allowing destructive actions. |
| Usage report | Not available | `/api/v2/properties/{id}/usage-report` aggregates dependency counts + audit history + `used_in` metadata | Potential future enhancement once CRUD runs on v2. |

## 5. Error Codes & Headers

| Concern | v1 | v2 | Notes |
| --- | --- | --- | --- |
| Error payloads | `{ error: string }` with 400/403/404/409/500 | `{ error: string }` but some endpoints also set `X-API-Version: v2` | Keep error format consistent when shimming responses. |
| Validation codes | 400 for missing params, 403 for system operations, 409 for duplicates | Currently 400/404; duplicates not enforced | Need parity before switching consumers. |
| Authorization | 401 if tenant missing | 401 if tenant missing + `X-API-Version` header | No action; same behavior. |

## 6. Items Requiring Alignment in Phase 5
1. **DTO Mapping:** Provide a deterministic mapping between `recordId`↔`propertyId`, `name`↔`propertyName`, `label`↔`displayLabel`, `options`↔`enumOptions`, etc.
2. **Validation Parity:** Port v1 duplicate-name and naming regex checks into v2 create/update endpoints.
3. **System-property Rules:** Maintain v1 restrictions on system properties once CRUD moves to v2 (currently enforced only in v1).
4. **Archive/Delete Behavior:** Finish v2 `substitute` and `forceDelete` logic so the UI can stop calling `/api/v1/properties/{id}` for hard deletes.
5. **Response Envelope:** Decide whether v2 should emit a legacy-compatible envelope (for smoother rollout) or whether the frontend should normalize responses before touching downstream components.
6. **Error Messaging:** Standardize on a shared error helper (`security-utils` style) so both v1 and v2 return identical status codes/messages during the migration window.

Track these gaps in the consolidation backlog so they can be closed before v1 is retired.

