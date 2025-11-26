# Properties Schema & DTO Differences (v1 vs v2)

> **Status: Historical Reference Only**
> 
> The v1/v2 consolidation is complete. All Properties operations now use the v2 API exclusively.
> This document is retained for historical context and for interpreting legacy payloads/logs.

## Summary

| Aspect | v1 (Retired) | v2 (Current) |
| --- | --- | --- |
| Status | Returns 410 Gone | Active |
| Table | `Property` | `PropertyMetadata` |
| Field naming | camelCase (`recordId`, `name`, `label`) | camelCase (`propertyId`, `propertyName`, `displayLabel`) |
| Response format | Bare arrays | `{ properties: [], metadata: {...} }` |
| JSON fields | Stored as strings | Parsed objects/arrays |

## Field Mapping Reference

| v1 Field | v2 Field | Notes |
| --- | --- | --- |
| `recordId` | `propertyId` | Primary identifier |
| `name` | `propertyName` | Internal name |
| `label` | `displayLabel` | User-facing label |
| `type` | `dataType` | Data type (text, number, date, enum, etc.) |
| `group` | `propertyGroup` | Property grouping |
| `options` | `enumOptions` | v1: JSON string, v2: parsed array |
| `validation` | `validationRules` | v1: JSON string, v2: parsed array |
| `isSystem` | `propertyType` / `is_global` | v1: boolean, v2: type + global flags |

## Request Payloads

### Create Property
```json
// v2 (Current)
{
  "propertyName": "custom_field",
  "displayLabel": "Custom Field",
  "objectType": "pets",
  "propertyType": "custom",
  "dataType": "text",
  "description": "Optional description",
  "propertyGroup": "Custom Fields",
  "enumOptions": [],
  "validationRules": []
}
```

### Update Property
```json
// v2 (Current)
{
  "displayLabel": "Updated Label",
  "description": "Updated description",
  "propertyGroup": "New Group"
}
```

## Response Format

### List Properties (v2)
```json
{
  "properties": [
    {
      "propertyId": "uuid",
      "propertyName": "field_name",
      "displayLabel": "Field Name",
      "objectType": "pets",
      "propertyType": "custom",
      "dataType": "text",
      "propertyGroup": "Custom Fields",
      "enumOptions": [],
      "validationRules": [],
      "permissionProfiles": {},
      "queryCapabilities": {},
      "usage": {},
      "dependencies": []
    }
  ],
  "metadata": {
    "totalCount": 1,
    "objectType": "pets"
  }
}
```

## Archive/Restore Operations

### Archive (v2)
```json
// Request
{
  "reason": "No longer needed",
  "confirmed": true,
  "cascadeStrategy": "cancel"
}

// Response
{
  "message": "Property archived successfully",
  "propertyId": "uuid",
  "deletionStage": "archived",
  "restorable": true
}
```

### Restore (v2)
```json
// Request: No body required

// Response
{
  "message": "Property restored successfully",
  "propertyId": "uuid",
  "reactivatedDependencies": 0
}
```

## Error Codes

| Code | Meaning |
| --- | --- |
| 400 | Missing required fields or validation error |
| 401 | Missing tenant context |
| 404 | Property not found |
| 405 | Method not allowed (e.g., DELETE without using archive endpoint) |
| 500 | Internal server error |

All responses include `X-API-Version: v2` header.
