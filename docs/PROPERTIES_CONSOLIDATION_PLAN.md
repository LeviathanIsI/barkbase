# Properties Consolidation Plan

## Status: COMPLETE ✓

The Properties v1/v2 consolidation has been completed. All Properties operations now use the v2 API exclusively.

## 1. Current State Overview
- **v1 (`properties-api`)** – Retired. Returns 410 Gone. Kept as a tombstone for historical reference only.
- **v2 (`properties-api-v2`)** – The sole authoritative API for all Properties operations (CRUD + advanced).
- **Consolidation complete.** All CRUD flows and advanced operations (archive/restore/dependencies/impact-analysis) now use `/api/v2/properties` exclusively.

## 2. Active Endpoints (v2)

### CRUD Operations (`/api/v2/properties`)
| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/v2/properties?objectType=&propertyType=&includeArchived=false&includeDeprecated=false&includeUsage=false&includeDependencies=false` | Returns `{ properties: [], metadata: { totalCount… } }`. Query params are lowercase strings. |
| GET | `/api/v2/properties/{propertyId}` | Returns serialized metadata object. Accepts `includeAuditTrail`. |
| POST | `/api/v2/properties` | Requires `propertyName`, `displayLabel`, `objectType`, `propertyType`, `dataType`. Inserts into `PropertyMetadata` and logs audit trail. |
| PATCH | `/api/v2/properties/{propertyId}` | Accepts displayLabel / description / propertyGroup. |

### Advanced Operations (`/api/v2/properties/{propertyId}/...`)
| Method | Endpoint | Notes |
| --- | --- | --- |
| POST | `/api/v2/properties/{propertyId}/archive` | Body: `{ cascadeStrategy, confirmed, reason }`. Soft deletes metadata, disables dependencies, records audit trail. |
| POST | `/api/v2/properties/{propertyId}/restore` | Restores soft-deleted property, reactivates dependencies. |
| POST | `/api/v2/properties/{propertyId}/substitute` | Replaces property with another and updates references. |
| DELETE | `/api/v2/properties/{propertyId}/force` | Force delete with reason. |
| GET | `/api/v2/properties/{propertyId}/dependencies?direction=both|upstream|downstream` | Returns `{ propertyId, direction, dependencies: [], count }`. |
| GET | `/api/v2/properties/{propertyId}/dependents` | Alias for downstream dependencies. |
| POST | `/api/v2/properties/{propertyId}/impact-analysis` | Returns risk report via `property-dependency-service/impact-analyzer`. |
| GET | `/api/v2/properties/{propertyId}/usage-report` | Combines dependency counts + audit totals + `used_in` metadata. |

Characteristics:
- Responses include `X-API-Version: v2` headers.
- Payloads use snake_case fields internally but serializer exposes camelCase keys like `propertyId`, `displayLabel`, `queryCapabilities`, `permissionProfiles`.
- Archive/restore/substitute/force depend on cascade handlers and property dependency service.

## 3. Frontend Usage Summary

All frontend code now uses the v2 endpoints exclusively:

| File & Hook | Endpoint | Notes |
| --- | --- | --- |
| `frontend/src/features/settings/api.js` → `usePropertiesQuery` | `GET /api/v2/properties` | Sends `objectType` and optional flags. Returns normalized v2 response. |
| `useCreatePropertyMutation` | `POST /api/v2/properties` | Sends v2 payload (propertyName, displayLabel, dataType, etc.). |
| `useUpdatePropertyMutation` | `PATCH /api/v2/properties/{id}` | Sends v2 payload (displayLabel, description, propertyGroup). |
| `useDeletePropertyMutation` | `POST /api/v2/properties/{id}/archive` | Uses archive for soft-delete behavior. |
| `usePropertiesV2Query` | `GET /api/v2/properties` | Same as usePropertiesQuery with richer options (includeUsage, includeDependencies). |
| `useArchivePropertyMutation` | `POST /api/v2/properties/{id}/archive` | Sends `{ reason, confirmed, cascadeStrategy }`. |
| `useRestorePropertyMutation` | `POST /api/v2/properties/{id}/restore` | No body. |
| `useDependencyGraphQuery` | `GET /api/v2/properties/{id}/dependencies` | Returns dependency graph. |
| `useImpactAnalysisMutation` | `POST /api/v2/properties/{id}/impact-analysis` | Sends `{ modificationType }`. |

## 4. Historical Reference (v1 – Retired)

The v1 API (`/api/v1/properties`) has been fully retired and returns 410 Gone. The following information is kept for historical reference only:

### Former v1 Schema (Property table)
- Used camelCase fields: `recordId`, `name`, `label`, `options`, `validation`, `defaultValue`, `metadata`
- Returned bare arrays without envelope
- Options/validation stored as JSON strings

### Migration Notes
- v1 `recordId` → v2 `propertyId`
- v1 `name` → v2 `propertyName`
- v1 `label` → v2 `displayLabel`
- v1 `options` (JSON string) → v2 `enumOptions` (parsed array)
- v1 `group` → v2 `propertyGroup`

## 5. Remaining Work

All core consolidation work is complete. Potential future enhancements:
1. **Substitute workflow** – Complete the substitute operation UI integration.
2. **Force delete** – Add confirmation UI for force delete operations.
3. **Impact analysis integration** – Show impact analysis before archive/delete in the UI.
