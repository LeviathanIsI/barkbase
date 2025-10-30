# Enterprise Property Management - Quick Reference Card

## 🎯 Essential Commands

### Database Access
```bash
# Connect to database
$env:PGPASSWORD = (aws secretsmanager get-secret-value --secret-id "Barkbase-dev-db-credentials" --query SecretString --output text | ConvertFrom-Json).password
psql -h barkbase-dev-public.ctuea6sg4d0d.us-east-2.rds.amazonaws.com -U postgres -d barkbase
$env:PGPASSWORD = $null
```

### View All Properties
```sql
SELECT 
  property_name, 
  property_type, 
  object_type, 
  created_by,
  is_deleted
FROM "PropertyMetadata"
WHERE object_type = 'pets'
ORDER BY property_type, property_name;
```

### Check Permission Profiles
```sql
SELECT * FROM "PermissionProfile" WHERE is_global = true;
```

### View User Permissions
```sql
SELECT * FROM get_accessible_properties(
  'user-id-here',
  'tenant-id-here',
  'pets',
  'read-only'
);
```

---

## 📡 API Endpoints (After Deployment)

### Properties API v2
```bash
# List properties
GET /api/v2/properties?objectType=pets

# Get single property
GET /api/v2/properties/{propertyId}

# Create custom property
POST /api/v2/properties
{
  "propertyName": "custom_favorite_toy_t",
  "displayLabel": "Favorite Toy",
  "objectType": "pets",
  "propertyType": "custom",
  "dataType": "text"
}

# Archive property (soft delete)
POST /api/v2/properties/{propertyId}/archive
{
  "reason": "No longer needed",
  "confirmed": true
}

# Restore property
POST /api/v2/properties/{propertyId}/restore
```

### User Profiles API
```bash
# List profiles
GET /api/v1/profiles

# Get user's profiles
GET /api/v1/users/{userId}/profiles

# Assign profile
POST /api/v1/users/{userId}/profiles
{
  "profileId": 1,
  "isPrimary": true
}
```

---

## 🧩 Property Types

| Type | Prefix | Example | Can Edit? | Can Delete? |
|------|--------|---------|-----------|-------------|
| **System** | `sys_` | `sys_record_id` | ❌ No | ❌ No |
| **Standard** | None | `FirstName` | ✅ Label only | ⚠️ Archive only |
| **Protected** | None | `BalanceDueCents` | ⚠️ Approval required | ⚠️ Admin only |
| **Custom** | `custom_` | `custom_vip_level_ss` | ✅ Yes | ✅ Yes |

---

## 🔐 Permission Profiles

| Profile | Level | Financial Fields | Medical Fields | System Fields |
|---------|-------|------------------|----------------|---------------|
| **Owners** | 4 | Read-Write | Read-Write | Read-Only |
| **Managers** | 3 | Read-Write | Read-Write | Read-Only |
| **Front Desk** | 2 | Read-Only | Read-Only | Read-Only |
| **Care Staff** | 1 | Hidden | Read-Write | Read-Only |

---

## 🗑️ Deletion Lifecycle

| Stage | Duration | Recovery | Method |
|-------|----------|----------|--------|
| **Soft Delete** | 0-90 days | Instant | Click "Restore" in UI |
| **Archive** | 90 days - 7 years | 24-hour SLA | Request restoration |
| **Permanent** | After 7 years | Impossible | Auto-deleted |

---

## 🔄 Type Conversion Rules

### ✅ Safe (Empty Properties Only)
- Text → Multi-line Text
- Number → Currency
- Date → DateTime
- Single Select ↔ Radio

### ❌ Blocked (Always)
- DateTime → Date (data loss)
- Multi-Select → Single Select (data loss)
- Anything → Formula (logic required)
- Lookup/Relationship changes (integrity)

### ⚠️ Populated Properties
If property has data: **Export → Clear → Change → Import**

---

## 📊 Monitoring

### CloudWatch Logs
```bash
# View Lambda logs
aws logs tail /aws/lambda/Barkbase-dev-PropertiesApiV2Function --follow --region us-east-2

# View scheduled job logs
aws logs tail /aws/lambda/Barkbase-dev-PropertyArchivalJobFunction --since 1h --region us-east-2
```

### Check Scheduled Jobs
```bash
# View EventBridge rules
aws events list-rules --name-prefix "BarkbaseProperty" --region us-east-2

# View last execution
aws events list-rule-names-by-target --target-arn <lambda-arn> --region us-east-2
```

---

## 🚨 Emergency Procedures

### Rollback Migration
```sql
UPDATE "TenantSchemaVersion"
SET current_schema_version = previous_schema_version,
    migration_status = 'rolled_back',
    rollback_reason = 'Emergency rollback'
WHERE tenant_id = 'your-tenant-id';
```

### Restore Archived Property
```sql
-- For soft-deleted (within 90 days)
UPDATE "PropertyMetadata"
SET is_deleted = false,
    deleted_at = NULL,
    deletion_stage = NULL
WHERE property_id = 'property-id-here';

-- For archived (90+ days)
SELECT restore_property_from_archive('property-id-here', 'admin-user-id');
```

### Invalidate Permission Cache
```sql
UPDATE "EffectivePermissionCache"
SET is_valid = false
WHERE user_id = 'user-id-here';
```

---

## 📖 Documentation Quick Links

| Guide | Purpose | Location |
|-------|---------|----------|
| **Deployment Summary** | Current status | `DEPLOYMENT-SUMMARY.md` |
| **Quick Start** | Getting started | `QUICK-START.md` |
| **Migration Guide** | Full deployment steps | `docs/enterprise-property-system-migration.md` |
| **Admin Guide** | Day-to-day operations | `docs/admin-guide-enterprise-properties.md` |
| **API Reference** | Complete API docs | `docs/api-reference-properties-v2.md` |
| **Type Conversion** | Type change rules | `docs/type-conversion-matrix.md` |
| **Naming Conventions** | Property naming rules | `docs/naming-conventions.md` |

---

## 🛠️ Common Tasks

### Create Custom Property
```sql
INSERT INTO "PropertyMetadata" (
  property_name, display_label, object_type, property_type, data_type, created_by, tenant_id, is_global
) VALUES (
  'custom_loyalty_tier_ss', 'Loyalty Tier', 'owners', 'custom', 'single_select', 'user-id', 'tenant-id', false
);
```

### Check Property Usage
```sql
SELECT 
  property_name,
  (used_in->>'workflows')::jsonb AS workflows,
  (used_in->>'forms')::jsonb AS forms,
  (used_in->>'reports')::jsonb AS reports
FROM "PropertyMetadata"
WHERE property_id = 'property-id-here';
```

### View Audit Trail
```sql
SELECT * FROM "PropertyAuditTrail"
WHERE property_id = 'property-id-here'
ORDER BY changed_date DESC
LIMIT 10;
```

---

## 💾 Backup & Recovery

### Export All Properties
```sql
\copy (SELECT * FROM "PropertyMetadata") TO 'properties-backup.csv' CSV HEADER
```

### Export All Permissions
```sql
\copy (SELECT * FROM "PropertyPermission") TO 'permissions-backup.csv' CSV HEADER
```

---

## 🎯 Key Files to Know

| File | Purpose |
|------|---------|
| `aws/cdk/lib/cdk-stack.ts` | Main infrastructure (496 resources) |
| `aws/scripts/migrations/` | Database migrations (8 files) |
| `aws/lambdas/properties-api-v2/` | Enhanced properties API |
| `frontend/src/features/settings/components/EnterprisePropertiesTable.jsx` | Main UI table |
| `docs/` | All documentation |

---

**Status**: Deployment in progress  
**ETA**: 10-15 minutes  
**Next**: Test endpoints after deployment completes

🚀 **Enterprise Property System - Cheat Sheet**

