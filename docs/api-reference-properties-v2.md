# Properties API v2 - Complete Reference

## Base URL
```
https://api.barkbase.com/api/v2
```

## Authentication
All requests require Bearer token authentication:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Common Headers
```
X-API-Version: v2
X-Property-Schema-Version: 2
Content-Type: application/json
```

---

## Endpoints

### 1. List Properties

**GET** `/properties`

Returns list of properties with optional filtering.

**Query Parameters:**
- `objectType` (string): Filter by object type (pets, owners, bookings, etc.)
- `propertyType` (string): Filter by classification (system, standard, protected, custom)
- `includeArchived` (boolean): Include archived properties (default: false)
- `includeDeprecated` (boolean): Include deprecated properties (default: false)
- `includeUsage` (boolean): Include usage statistics (default: false)
- `includeDependencies` (boolean): Include dependency info (default: false)

**Example Request:**
```bash
curl -X GET "https://api.barkbase.com/api/v2/properties?objectType=pets&includeUsage=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "properties": [
    {
      "propertyId": "uuid-123",
      "propertyName": "Name",
      "displayLabel": "Pet Name",
      "objectType": "pets",
      "propertyType": "standard",
      "dataType": "text",
      "isRequired": true,
      "modificationMetadata": {
        "archivable": true,
        "readOnlyDefinition": true,
        "readOnlyValue": false,
        "readOnlyOptions": true
      },
      "usage": {
        "recordsWithValues": 1543,
        "totalRecords": 1620,
        "fillRate": 95.2,
        "usedInWorkflows": 3,
        "usedInForms": 5
      }
    }
  ],
  "metadata": {
    "totalCount": 1,
    "objectType": "pets"
  }
}
```

---

### 2. Get Property

**GET** `/properties/{propertyId}`

Returns detailed information for a single property.

**Query Parameters:**
- `includeAuditTrail` (boolean): Include recent audit trail entries

**Example Response:**
```json
{
  "propertyId": "uuid-123",
  "propertyName": "Name",
  "displayLabel": "Pet Name",
  "description": "The name of the pet",
  "objectType": "pets",
  "propertyType": "standard",
  "dataType": "text",
  "isSystem": false,
  "isRequired": true,
  "isProtected": false,
  "modificationMetadata": {...},
  "queryCapabilities": {
    "isSearchable": true,
    "isFilterable": true,
    "isSortable": true,
    "massUpdateEnabled": true
  },
  "permissionProfiles": {
    "owners": "read-write",
    "managers": "read-write",
    "front_desk": "read-write",
    "care_staff": "read-write"
  },
  "usage": {...},
  "dependencies": {
    "upstream": [],
    "downstream": [
      {
        "propertyId": "uuid-456",
        "propertyName": "FullDisplayName",
        "dependencyType": "formula",
        "isCritical": false
      }
    ],
    "totalCount": 1,
    "criticalCount": 0
  }
}
```

---

### 3. Create Property

**POST** `/properties`

Creates a new custom property.

**Request Body:**
```json
{
  "propertyName": "custom_favorite_color_ss",
  "displayLabel": "Favorite Color",
  "description": "Pet's favorite color",
  "objectType": "pets",
  "propertyType": "custom",
  "dataType": "single_select",
  "propertyGroup": "Preferences",
  "enumOptions": [
    { "value": "red", "label": "Red" },
    { "value": "blue", "label": "Blue" },
    { "value": "green", "label": "Green" }
  ],
  "permissionProfiles": {
    "owners": "read-write",
    "managers": "read-write",
    "front_desk": "read-write",
    "care_staff": "read-only"
  }
}
```

**Response:** 201 Created
```json
{
  "propertyId": "uuid-789",
  "propertyName": "custom_favorite_color_ss",
  ...
}
```

---

### 4. Update Property

**PATCH** `/properties/{propertyId}`

Updates property metadata (limited fields based on property type).

**Allowed Updates:**
- `displayLabel`: Yes (all types)
- `description`: Yes (all types)
- `propertyGroup`: Yes (all types)
- `dataType`: No (use type conversion workflow)
- `permissionProfiles`: Yes (custom properties only)

**Request Body:**
```json
{
  "displayLabel": "Updated Label",
  "description": "Updated description",
  "propertyGroup": "New Group"
}
```

**Response:** 200 OK

---

### 5. Get Dependencies

**GET** `/properties/{propertyId}/dependencies`

Returns dependency graph for a property.

**Query Parameters:**
- `direction` (string): `upstream`, `downstream`, or `both` (default: both)

**Example Response:**
```json
{
  "propertyId": "uuid-123",
  "direction": "both",
  "dependencies": [
    {
      "propertyId": "uuid-456",
      "propertyName": "FullDisplayName",
      "displayLabel": "Full Display Name",
      "dependencyType": "formula",
      "isCritical": false,
      "direction": "downstream"
    }
  ],
  "count": 1
}
```

---

### 6. Analyze Impact

**POST** `/properties/{propertyId}/impact-analysis`

Analyzes impact of modifying or deleting a property.

**Request Body:**
```json
{
  "modificationType": "delete"
}
```

**Response:**
```json
{
  "propertyId": "uuid-123",
  "propertyName": "Name",
  "modificationType": "delete",
  "riskAssessment": {
    "level": "high",
    "score": 65,
    "color": "orange",
    "bypassAllowed": false,
    "factors": [
      "Standard property (structural importance)",
      "5 dependent properties",
      "1,543 records with values"
    ]
  },
  "impactSummary": {
    "affectedPropertiesCount": 5,
    "criticalDependenciesCount": 2,
    "recordsWithValuesCount": 1543,
    "maxDependencyDepth": 2,
    "totalDependencyChains": 5
  },
  "affectedProperties": [...],
  "recommendations": [...],
  "canProceed": false,
  "requiresApproval": true
}
```

---

### 7. Get Usage Report

**GET** `/properties/{propertyId}/usage-report`

Returns detailed usage statistics for a property.

**Response:**
```json
{
  "propertyId": "uuid-123",
  "propertyName": "Name",
  "usage": {
    "dependencies": {
      "total": 5,
      "critical": 2
    },
    "assets": {
      "workflows": ["workflow-1", "workflow-2"],
      "validations": [],
      "forms": ["form-1", "form-2", "form-3"],
      "reports": ["report-1"],
      "apiIntegrations": []
    },
    "modifications": 12
  }
}
```

---

### 8. Archive Property

**POST** `/properties/{propertyId}/archive`

Soft-deletes a property (Stage 1: 0-90 days, instant restoration).

**Request Body:**
```json
{
  "cascadeStrategy": "cancel",
  "confirmed": true,
  "reason": "No longer needed"
}
```

**Cascade Strategies:**
- `cancel`: Show dependencies, require manual fix
- `cascade`: Recursively archive all dependents
- `substitute`: Replace with another property (requires `replacementPropertyId`)
- `force`: Archive anyway, mark dependents as broken

**Response:**
```json
{
  "message": "Property soft deleted successfully",
  "propertyId": "uuid-123",
  "deletionStage": "soft_delete",
  "restorable": true,
  "restorationWindow": "90 days",
  "autoArchivalDate": "2025-04-30T00:00:00Z"
}
```

---

### 9. Restore Property

**POST** `/properties/{propertyId}/restore`

Restores a soft-deleted property.

**Response:**
```json
{
  "message": "Property restored successfully",
  "propertyId": "uuid-123",
  "restoredDependencies": 5,
  "deletedDaysAgo": 15
}
```

---

### 10. Substitute Property

**POST** `/properties/{propertyId}/substitute`

Replaces a property with another compatible property.

**Request Body:**
```json
{
  "replacementPropertyId": "uuid-456"
}
```

**Response:**
```json
{
  "strategy": "substitute",
  "status": "success",
  "message": "Successfully substituted property",
  "originalPropertyId": "uuid-123",
  "replacementPropertyId": "uuid-456",
  "affectedDependencies": 5
}
```

---

### 11. Force Delete

**DELETE** `/properties/{propertyId}/force`

Force deletes a property, breaking dependencies.

**⚠️ Dangerous Operation - Use with Caution**

**Request Body:**
```json
{
  "reason": "Emergency cleanup required"
}
```

**Response:**
```json
{
  "strategy": "force",
  "status": "success",
  "brokenDependencies": 5,
  "warning": "Dependent properties may not function correctly"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields",
  "details": ["propertyName is required"]
}
```

### 401 Unauthorized
```json
{
  "error": "Missing tenant context"
}
```

### 403 Forbidden
```json
{
  "error": "Cannot modify system property",
  "propertyType": "system"
}
```

### 404 Not Found
```json
{
  "error": "Property not found"
}
```

### 409 Conflict
```json
{
  "requiresConfirmation": true,
  "confirmationSteps": [...],
  "warnings": [...]
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "requestId": "req-123"
}
```

---

## Property Object Schema

```typescript
interface Property {
  // Core identification
  propertyId: string;          // Stable UUID
  propertyName: string;         // API name
  displayLabel: string;         // UI name
  description?: string;
  
  // Classification
  objectType: string;           // pets, owners, bookings, etc.
  propertyType: 'system' | 'standard' | 'protected' | 'custom';
  propertyGroup?: string;
  
  // Flags
  isSystem: boolean;
  isRequired: boolean;
  isProtected: boolean;
  isDeleted: boolean;
  isDeprecated: boolean;
  
  // Data type
  dataType: string;             // text, number, date, etc.
  fieldType?: string;
  maxLength?: number;
  decimalPlaces?: number;
  defaultValue?: any;
  
  // Modification metadata
  modificationMetadata: {
    archivable: boolean;
    readOnlyDefinition: boolean;
    readOnlyValue: boolean;
    readOnlyOptions: boolean;
  };
  
  // Query capabilities
  queryCapabilities: {
    isSearchable: boolean;
    isFilterable: boolean;
    isSortable: boolean;
    massUpdateEnabled: boolean;
  };
  
  // Permissions (FLS)
  permissionProfiles: {
    [profileKey: string]: 'read-write' | 'read-only' | 'hidden';
  };
  
  // Enumeration (for select fields)
  enumOptions?: Array<{ value: string; label: string }>;
  
  // Validation
  validationRules?: any[];
  uniqueConstraint?: boolean;
  
  // Usage statistics (if requested)
  usage?: {
    recordsWithValues: number;
    totalRecords: number;
    fillRate: number;
    usedInWorkflows: number;
    usedInForms: number;
    usedInReports: number;
  };
  
  // Dependencies (if requested)
  dependencies?: {
    upstream: Dependency[];
    downstream: Dependency[];
    totalCount: number;
    criticalCount: number;
  };
  
  // Timestamps
  createdDate: string;
  createdBy: string;
  modifiedDate?: string;
  modifiedBy?: string;
}
```

---

## Rate Limits

- **Standard**: 1000 requests/hour per tenant
- **Burst**: 100 requests/minute per tenant
- **Impact Analysis**: 10 requests/minute (computationally expensive)

**Rate Limit Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1640000000
```

---

## Webhooks

Subscribe to property events:
- `property.created`
- `property.updated`
- `property.archived`
- `property.restored`
- `property.deleted`

**Webhook Payload:**
```json
{
  "event": "property.updated",
  "timestamp": "2025-01-30T12:00:00Z",
  "data": {
    "propertyId": "uuid-123",
    "changes": ["displayLabel", "description"],
    "changedBy": "user-id"
  }
}
```

---

## Support

- **Documentation**: https://docs.barkbase.com
- **API Status**: https://status.barkbase.com/api
- **Support**: support@barkbase.com

