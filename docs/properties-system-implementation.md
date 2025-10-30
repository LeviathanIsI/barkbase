# Properties System Implementation Summary

## Overview

A HubSpot-style properties management system has been implemented for BarkBase. This system allows users to view **system properties** (created by BarkBase and mapped to actual database columns) and create **custom properties** (user-defined fields stored in JSONB columns).

## What Was Implemented

### 1. Database Schema ✅

**File**: `aws/scripts/add-properties-table.sql`

- Created `Property` table to store property definitions
- Added `customFields` JSONB columns to all main tables (Pet, Owner, Booking, etc.)
- Created indexes for efficient queries
- System properties have `tenantId = NULL` and `isSystem = true`
- Custom properties have `tenantId = <tenant_id>` and `isSystem = false`

**Property Table Structure**:
```sql
- recordId (PK)
- tenantId (NULL for system properties)
- objectType (pets, owners, bookings, etc.)
- name (field name like "firstName", "customField1")
- label (display name)
- description (help text)
- type (string, number, date, enum, etc.)
- isSystem (true = BarkBase property, false = custom)
- isRequired, isVisible, isSearchable, isEditable, isUnique
- group (for organization)
- order (display order)
- options (for enum fields)
- validation, defaultValue, metadata
```

### 2. Properties Mapping Documentation ✅

**File**: `docs/properties-mapping.md`

Comprehensive mapping of ALL database columns to system properties for:
- Pets (19 properties)
- Owners (8 properties)
- Bookings (12 properties)
- Kennels (14 properties)
- Services (6 properties)
- Staff (5 properties)
- Vaccinations (8 properties)
- Payments (12 properties)
- Check-Ins (7 properties)
- Check-Outs (6 properties)
- Incident Reports (7 properties)
- Communications (8 properties)
- Notes (7 properties)
- Tasks (10 properties)
- Runs (7 properties)
- Run Templates (6 properties)
- Users (9 properties)
- Tenants (8 properties)

### 3. System Properties Seed Script ⏳

**File**: `aws/scripts/seed-system-properties.sql`

Partial implementation with examples for:
- Pets properties (all fields)
- Owners properties (all fields)
- Bookings properties (all fields)
- Kennels properties (all fields)
- Services properties (all fields)

**Status**: Started but incomplete. The full seed script would need to include ALL object types from the mapping document.

### 4. Properties API Lambda ✅

**File**: `aws/lambdas/properties-api/index.js`

RESTful API endpoints:
- `GET /api/v1/properties?objectType=pets` - List all properties for an object type (system + custom)
- `GET /api/v1/properties/{propertyId}` - Get a specific property
- `POST /api/v1/properties` - Create a new custom property
- `PATCH /api/v1/properties/{propertyId}` - Update a property
- `DELETE /api/v1/properties/{propertyId}` - Delete a custom property

**Features**:
- Returns both system properties (NULL tenant) and tenant-specific custom properties
- System properties are read-only (only visibility and order can be changed)
- Custom properties are fully editable
- Validates property names (alphanumeric + underscores only)
- Prevents duplicate property names per object type
- Prevents creating/deleting system properties via API

### 5. CDK Stack Integration ✅

**File**: `aws/cdk/lib/cdk-stack.ts`

- Added Properties API Lambda function
- Configured API Gateway routes with authentication
- Granted database access permissions

### 6. Frontend API Layer ✅

**File**: `frontend/src/features/settings/api.js`

Implemented React Query hooks:
- `usePropertiesQuery(objectType)` - Fetch properties
- `useCreatePropertyMutation()` - Create custom property
- `useUpdatePropertyMutation()` - Update property
- `useDeletePropertyMutation()` - Delete custom property

### 7. Frontend UI Components ✅

**Files**:
- `frontend/src/features/settings/routes/PropertiesOverview.jsx` - Updated
- `frontend/src/features/settings/routes/components/PopulatedPropertiesView.jsx` - Updated

**Features**:
- System properties displayed with blue gradient background
- System properties show Shield icon and "System Property" badge
- System properties cannot be selected for bulk actions
- System properties show Lock icon instead of Edit icon
- Displays internal field name (e.g., `firstName`) alongside label
- Shows count of system vs custom properties in header
- Extended field type labels to include all types (currency, datetime, user, json, etc.)

## How to Deploy

### Step 1: Run Database Migrations

```bash
# Connect to your database
psql -h <db-host> -U <db-user> -d barkbase

# Run the property table creation script
\i aws/scripts/add-properties-table.sql

# Run the seed script (once completed)
\i aws/scripts/seed-system-properties.sql
```

### Step 2: Deploy Lambda

```bash
cd aws/cdk

# Install dependencies for the Lambda
cd ../lambdas/properties-api
npm install
cd ../../cdk

# Deploy the CDK stack
npx cdk deploy
```

### Step 3: Verify Deployment

1. Navigate to `http://localhost:5173/settings/properties` (or your deployed URL)
2. Select an object type (Pets, Owners, Bookings, etc.)
3. You should see system properties with blue gradient backgrounds
4. Click "Create Property" to add a custom property

## Object Types Supported

The Properties system supports the following object types:

| Object Type | Label | Database Table |
|-------------|-------|----------------|
| `pets` | Pets | Pet |
| `owners` | Owners | Owner |
| `bookings` | Bookings | Booking |
| `kennels` | Kennels/Accommodations | Kennel |
| `services` | Services | Service |
| `staff` | Staff | Staff |
| `vaccinations` | Vaccinations | Vaccination |
| `payments` | Payments | Payment |
| `checkins` | Check-Ins | CheckIn |
| `checkouts` | Check-Outs | CheckOut |
| `incidents` | Incident Reports | IncidentReport |
| `communications` | Communications | Communication |
| `notes` | Notes | Note |
| `tasks` | Tasks | Task |
| `runs` | Daycare Runs | Run |
| `run_templates` | Run Templates | RunTemplate |
| `users` | Users | User |
| `tenants` | Organizations | Tenant |

## System Properties

System properties:
- Are created by BarkBase during initial database seeding
- Map directly to database columns (e.g., `Pet.name`, `Owner.email`)
- Have `isSystem = true` and `tenantId = NULL`
- Are visible to all tenants
- Can only have their visibility, requirement status, and display order changed
- Cannot be deleted or have their name/type changed
- Show with a blue gradient background and Shield icon in the UI

## Custom Properties

Custom properties:
- Are created by users via the UI or API
- Are stored in the `customFields` JSONB column of each table
- Have `isSystem = false` and `tenantId = <specific_tenant_id>`
- Are only visible to the tenant that created them
- Can be fully edited (name, type, label, description, options, validation, etc.)
- Can be deleted by the tenant
- Show with a standard white background in the UI
- Are stored in the format: `customFields: { "custom_loyalty_tier": "Gold", "custom_referral_source": "Google" }`

## Field Types Supported

The system supports all standard field types:

**Text**:
- `string` - Single-line text
- `text` - Multi-line textarea
- `phone` - Phone number
- `email` - Email address
- `url` - URL/website
- `rich_text` - Rich text editor

**Selection**:
- `enum` - Dropdown select (single choice)
- `multi_enum` - Multiple checkboxes (multiple choice)
- `radio` - Radio buttons (single choice)
- `boolean` - Yes/No toggle

**Numeric**:
- `number` - Integer or decimal
- `currency` - Money amount (stored in cents)
- `score` - Rating/score

**Date/Time**:
- `date` - Date picker
- `datetime` - Date and time picker

**Advanced**:
- `file` - File upload
- `user` - Reference to another record (Pet, Owner, Staff, etc.)
- `json` - Structured JSON data
- `calculation` - Calculated field (formula)
- `rollup` - Aggregate from related records

## Example: Creating a Custom Property

```javascript
const { mutate: createProperty } = useCreatePropertyMutation();

createProperty({
  objectType: 'pets',
  name: 'custom_loyalty_tier',
  label: 'Loyalty Tier',
  description: 'Customer loyalty program tier',
  type: 'enum',
  group: 'Custom Fields',
  isRequired: false,
  isVisible: true,
  options: {
    values: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    labels: {
      Bronze: 'Bronze Member',
      Silver: 'Silver Member',
      Gold: 'Gold Member',
      Platinum: 'Platinum Member'
    }
  }
});
```

## Example: Querying Custom Field Values

When fetching a Pet with custom fields:

```javascript
// Database query returns:
{
  recordId: 'pet-123',
  name: 'Buddy',
  species: 'Dog',
  breed: 'Golden Retriever',
  customFields: {
    custom_loyalty_tier: 'Gold',
    custom_referral_source: 'Google Ads',
    custom_favorite_treat: 'Chicken jerky'
  }
}

// Access custom field:
const loyaltyTier = pet.customFields?.custom_loyalty_tier || 'Bronze';
```

## What's Left to Complete

### 1. Complete System Properties Seed Script

The `aws/scripts/seed-system-properties.sql` file needs to be extended to include ALL object types. Currently only Pets, Owners, Bookings, Kennels, and Services are partially seeded.

**Remaining object types to seed**:
- Staff (complete)
- Vaccinations (complete)
- Payments (complete)
- CheckIns (complete)
- CheckOuts (complete)
- Incident Reports (complete)
- Communications (complete)
- Notes (complete)
- Tasks (complete)
- Runs (complete)
- RunTemplates (complete)
- Users (complete)
- Tenants (complete)

**Reference**: Use `docs/properties-mapping.md` as the source of truth for all properties.

### 2. Implement Property Edit Modal

The `EnhancedCreatePropertyModal` component needs to be updated to:
- Handle both creating new custom properties and editing existing properties
- For system properties: Only allow editing visibility, requirement status, and order
- For custom properties: Allow full editing of all fields
- Show different UI/messaging for system vs custom properties

### 3. Test the Complete Flow

1. Seed the database with system properties
2. Verify system properties appear for all object types
3. Create a custom property
4. Edit the custom property
5. Use the custom property in a Pet/Owner/Booking form
6. Query custom field values via API
7. Delete the custom property

### 4. Add Property Usage Analytics

Enhance the UI to show:
- How many records have this property populated
- Usage percentage
- Last used date
- Which forms/views display this property

## Architecture Decisions

### Why JSONB for Custom Fields?

**Chosen**: JSONB column on each table

**Pros**:
- Simple schema - no additional tables needed
- Fast queries - GIN indexes support efficient JSONB queries
- Easy to work with in code - just a JSON object
- No JOIN overhead

**Cons**:
- All custom data in one column (less normalized)
- Can't easily enforce constraints on custom field values
- Migrations can't easily change custom field types

**Alternative**: Separate PropertyValue table with generic EAV structure
- More normalized but requires JOINs
- More complex queries
- Better for extremely dynamic schemas

### Why NULL tenantId for System Properties?

This design allows:
- One canonical definition of system properties
- All tenants see the same system properties
- Efficient queries (system + tenant-specific in one query)
- Clear distinction between BarkBase properties and user properties

## API Examples

### List Properties for Pets

```bash
GET /api/v1/properties?objectType=pets
Authorization: Bearer <token>
X-Tenant-Id: tenant-abc-123

Response:
[
  {
    "recordId": "prop-123",
    "tenantId": null,
    "objectType": "pets",
    "name": "name",
    "label": "Pet Name",
    "type": "string",
    "isSystem": true,
    "isRequired": true,
    "isVisible": true,
    "group": "Basic Information",
    "order": 1
  },
  {
    "recordId": "prop-456",
    "tenantId": "tenant-abc-123",
    "objectType": "pets",
    "name": "custom_loyalty_tier",
    "label": "Loyalty Tier",
    "type": "enum",
    "isSystem": false,
    "isRequired": false,
    "isVisible": true,
    "group": "Custom Fields",
    "order": 1000,
    "options": { "values": ["Bronze", "Silver", "Gold"] }
  }
]
```

### Create Custom Property

```bash
POST /api/v1/properties
Authorization: Bearer <token>
X-Tenant-Id: tenant-abc-123
Content-Type: application/json

{
  "objectType": "pets",
  "name": "custom_vip_status",
  "label": "VIP Status",
  "description": "Indicates if this is a VIP customer",
  "type": "boolean",
  "isRequired": false,
  "isVisible": true,
  "group": "Custom Fields",
  "defaultValue": false
}

Response: 201 Created
{
  "recordId": "prop-789",
  "tenantId": "tenant-abc-123",
  "objectType": "pets",
  "name": "custom_vip_status",
  "label": "VIP Status",
  "type": "boolean",
  "isSystem": false,
  ...
}
```

## Future Enhancements

1. **Conditional Logic**: Show/hide properties based on other property values
2. **Calculated Fields**: Auto-calculate values from formulas
3. **Property Dependencies**: Require property A if property B is set
4. **Property Sync**: Sync property values between related records
5. **Property History**: Track changes to property values over time
6. **Property Import/Export**: Bulk import/export property definitions
7. **Property Templates**: Pre-built property sets for common use cases
8. **Field-Level Permissions**: Control who can view/edit specific properties

## Conclusion

The Properties system is now largely complete with:
- ✅ Database schema
- ✅ API endpoints
- ✅ Frontend UI
- ⏳ System properties seeding (partial)

The main remaining task is to complete the seed script with all object types, which is a straightforward (but time-consuming) data entry task following the pattern already established in the partial seed file.

