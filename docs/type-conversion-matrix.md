# Property Type Conversion Matrix

## Overview

This document defines the strict type conversion policies for BarkBase property management. Type conversions are highly restricted to prevent data loss and maintain data integrity.

## Core Principle

**🚫 NO CONVERSIONS ON POPULATED PROPERTIES**

If a property has ANY non-null values in the database, type conversion is BLOCKED. This prevents data loss and maintains data integrity.

## Conversion Rules

### For Empty Properties Only

Type conversions are ONLY allowed when:
- Property has ZERO records with non-null values
- Property has never been used in any data records
- No dependencies exist on the current type

### Safe Conversions (Empty Properties Only)

| From Type | To Type | Risk Level | Notes |
|-----------|---------|------------|-------|
| Text | Multi-line Text | ✅ Safe | Expands field capacity |
| Multi-line Text | Text | ⚠️ Caution | May truncate if max_length set |
| Number | Currency | ✅ Safe | Adds currency formatting |
| Currency | Number | ✅ Safe | Removes currency formatting |
| Date | DateTime | ✅ Safe | Adds time component (defaults to 00:00:00) |
| Single Select | Radio | ✅ Safe | UI change only, same data structure |
| Checkbox | Multi-Select | ⚠️ Caution | Structure change |

### Blocked Conversions (Always)

These conversions are NEVER allowed, even for empty properties:

| From Type | To Type | Reason |
|-----------|---------|--------|
| DateTime | Date | Data loss (time component) |
| Multi-Select | Single Select | Data loss (multiple values → single) |
| Multi-Select | Boolean | Incompatible structure |
| Boolean | Multi-Select | Incompatible structure |
| Formula/Calculated | Any | Formula logic would be lost |
| Lookup/Relationship | Any | Relationship integrity |
| Any | Formula/Calculated | Existing data → calculated is illogical |
| Any | Lookup/Relationship | Relationship setup required |

## Export-Clear-Change-Import Pattern

For populated properties requiring type change:

### Step 1: Export Data
```sql
-- Example: Export pets.customField_favoriteColor
SELECT 
  "recordId",
  "customFields"->>'customField_favoriteColor' AS favorite_color
FROM "Pet"
WHERE "customFields"->>'customField_favoriteColor' IS NOT NULL;
```

### Step 2: Clear Property Data
```sql
-- Clear all values (creates backup first)
UPDATE "Pet"
SET "customFields" = "customFields" - 'customField_favoriteColor';
```

### Step 3: Change Property Type
```javascript
// Via API or UI
PATCH /api/v2/properties/{propertyId}
{
  "dataType": "single_select",
  "enumOptions": [
    { "value": "red", "label": "Red" },
    { "value": "blue", "label": "Blue" },
    { "value": "green", "label": "Green" }
  ]
}
```

### Step 4: Transform & Re-Import
```sql
-- Import with data transformation
UPDATE "Pet"
SET "customFields" = jsonb_set(
  "customFields",
  '{customField_favoriteColor}',
  to_jsonb(CASE 
    WHEN backup_value ILIKE '%red%' THEN 'red'
    WHEN backup_value ILIKE '%blue%' THEN 'blue'
    ELSE 'green'
  END)
)
FROM backup_table
WHERE "Pet"."recordId" = backup_table."recordId";
```

## Validation Rules

### Pre-Conversion Checks

1. **Data Population Check**
   ```sql
   SELECT COUNT(*) FROM "{table}"
   WHERE "{property}" IS NOT NULL;
   ```
   Result must be 0 to proceed.

2. **Dependency Check**
   ```sql
   SELECT COUNT(*) FROM "PropertyDependencies"
   WHERE "source_property_id" = '{propertyId}'
     AND "is_active" = true;
   ```
   Warn if > 0, require confirmation.

3. **Type Compatibility Check**
   - Lookup conversion matrix
   - If blocked, return error
   - If caution, require multi-step confirmation

4. **Formula Dependency Check**
   ```sql
   SELECT * FROM "PropertyMetadata"
   WHERE "formula_dependencies" @> '["{propertyId}"]'::jsonb;
   ```
   Warn about formula recalculation needed.

## API Implementation

### Type Conversion Endpoint

```javascript
POST /api/v2/properties/{propertyId}/convert-type
{
  "newDataType": "single_select",
  "confirmed": true,
  "exportedDataPath": "s3://backups/property-export-123.csv"
}
```

**Response (Populated Property):**
```json
{
  "canConvert": false,
  "reason": "Property has 1,234 records with values",
  "suggestedApproach": "export-clear-change-import",
  "exportEndpoint": "/api/v2/properties/{propertyId}/export-data",
  "recordCount": 1234
}
```

**Response (Empty Property with Safe Conversion):**
```json
{
  "canConvert": true,
  "riskLevel": "safe",
  "conversionPath": "text → multiline_text",
  "requiresConfirmation": false
}
```

**Response (Empty Property with Risky Conversion):**
```json
{
  "canConvert": true,
  "riskLevel": "caution",
  "conversionPath": "multiline_text → text",
  "requiresConfirmation": true,
  "warnings": [
    "Text will be truncated to max_length if set",
    "Line breaks will be preserved but may affect display"
  ]
}
```

## UI Flow

### Type Conversion Wizard

1. **Initial Check**
   - Display current type
   - Show record count with values
   - If populated: Show "Export-Clear-Change-Import" workflow
   - If empty: Show type conversion options

2. **Conversion Selection**
   - Show only compatible target types
   - Mark safe/caution/blocked conversions
   - Display warnings for caution conversions

3. **Dependency Review**
   - List formulas that reference this property
   - List workflows that use this property
   - Warn about recalculation needs

4. **Confirmation**
   - Multi-step confirmation for risky changes
   - Type property name to confirm
   - Checkbox: "I understand this cannot be undone"

5. **Execution & Validation**
   - Perform conversion
   - Run validation queries
   - Update dependencies if needed
   - Log to audit trail

## Error Messages

### Blocked Conversion
```
❌ Cannot convert {currentType} to {targetType}

This conversion is not supported because it would result in data loss or structural incompatibility.

Reason: {specific reason}

Alternative: Create a new property with the desired type and migrate data manually.
```

### Populated Property
```
❌ Cannot change type of populated property

This property has 1,234 records with values. Type conversion would risk data loss.

Required Steps:
1. Export existing data
2. Clear property values
3. Change property type
4. Transform and re-import data

Export Data →
```

### Successful Conversion
```
✅ Property type converted successfully

{propertyLabel} has been converted from {oldType} to {newType}.

⚠️ Important Next Steps:
- Update any formulas that reference this property
- Verify workflows and validations still function correctly
- Test data entry with the new type
```

## Migration Strategy

When rolling out type conversion control:

1. **Phase 1: Validation Only**
   - Log blocked conversions
   - Show warnings but allow (with confirmation)

2. **Phase 2: Soft Enforcement**
   - Block risky conversions on populated properties
   - Allow safe conversions
   - Show export-clear-change workflow

3. **Phase 3: Strict Enforcement**
   - Fully block all conversions on populated properties
   - No exceptions (even for admins)
   - Require export-clear-change pattern

## Audit Trail

All type conversion attempts logged to `PropertyChangeAudit`:

```sql
INSERT INTO "PropertyChangeAudit" (
  "property_id",
  "change_type",
  "before_value",
  "after_value",
  "changed_by",
  "change_reason",
  "affected_records_count",
  "risk_level"
) VALUES (
  '{propertyId}',
  'TYPE_CHANGE',
  jsonb_build_object('dataType', '{oldType}'),
  jsonb_build_object('dataType', '{newType}'),
  '{userId}',
  'Type conversion via UI',
  0,
  'medium'
);
```

## Testing Checklist

- [ ] Validate all safe conversions work
- [ ] Validate all blocked conversions are rejected
- [ ] Validate populated property detection
- [ ] Test export-clear-change workflow
- [ ] Verify dependency updates
- [ ] Test formula recalculation
- [ ] Verify audit trail logging
- [ ] Test rollback for failed conversions

