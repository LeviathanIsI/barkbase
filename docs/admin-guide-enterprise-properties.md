# Administrator Guide: Enterprise Property Management System

## Table of Contents
1. [Overview](#overview)
2. [Property Classification](#property-classification)
3. [Dependency Management](#dependency-management)
4. [Permission Profile Configuration](#permission-profile-configuration)
5. [Schema Versioning](#schema-versioning)
6. [Troubleshooting](#troubleshooting)

## Overview

The Enterprise Property Management System provides comprehensive control over your BarkBase data schema with:
- 4-tier property classification
- Automatic dependency tracking
- Field-level security
- Complete audit trails
- Zero-downtime migrations

## Property Classification

### System Properties

**Characteristics:**
- Prefix: `sys_`
- Created by: BarkBase
- Modifiable: NO
- Deletable: NO
- Examples: `sys_record_id`, `sys_created_at`

**Purpose:** Core infrastructure fields required for system operation.

**Admin Actions:**
- ❌ Cannot edit or delete
- ✅ Can view in read-only mode
- ✅ Can configure permissions (read-only only)

### Standard Properties

**Characteristics:**
- Naming: UpperCamelCase
- Created by: BarkBase
- Modifiable: Display label, description, group
- Deletable: Can archive (not delete)
- Examples: `FirstName`, `DateOfBirth`, `StatusCode`

**Purpose:** Pre-defined fields that ship with BarkBase.

**Admin Actions:**
- ✅ Edit display label and description
- ✅ Change property group
- ✅ Archive (recoverable for 90 days)
- ❌ Cannot change data type
- ❌ Cannot delete permanently

### Protected Properties

**Characteristics:**
- Naming: UpperCamelCase
- Created by: BarkBase
- Modifiable: Requires approval workflow
- Deletable: Admin approval required
- Examples: `BalanceDueCents`, `DepositCents`

**Purpose:** Business-critical fields with financial/legal implications.

**Admin Actions:**
- ⚠️ Modifications trigger approval workflow
- ⚠️ Deletion requires multi-step confirmation
- ✅ Full audit trail maintained
- ✅ Impact analysis required before changes

### Custom Properties

**Characteristics:**
- Prefix: `custom_`
- Created by: Tenant users
- Modifiable: Yes (when empty)
- Deletable: Yes
- Examples: `custom_favorite_color_ss`, `custom_loyalty_points_n`

**Purpose:** Tenant-specific custom fields.

**Admin Actions:**
- ✅ Full CRUD operations
- ✅ Change display label, description, group
- ⚠️ Type conversion only for empty properties
- ✅ Delete with cascade strategies

## Dependency Management

### Understanding Dependencies

Properties can depend on each other through:
- **Formulas**: Calculated fields referencing other properties
- **Validations**: Rules checking other property values
- **Workflows**: Automation based on property changes
- **Lookups**: Foreign key relationships
- **Rollups**: Aggregations from related records

### Dependency Graph

**Accessing:**
1. Go to Settings → Properties
2. Select a property
3. Click "View Dependencies" icon

**Graph Elements:**
- **Nodes**: Individual properties (color-coded by type)
- **Edges**: Dependency relationships
- **Direction**: Arrows show dependency flow

### Impact Analysis

Before modifying/deleting a property:
1. System analyzes all dependencies
2. Calculates risk level (Low/Medium/High/Critical)
3. Shows affected properties count
4. Lists dependent assets (workflows/forms/reports)

**Risk Levels:**
- **Low**: < 5 dependencies, no critical paths
- **Medium**: 5-10 dependencies or < 100 records
- **High**: > 10 dependencies or > 100 records
- **Critical**: System properties or > 1000 records

### Cascade Strategies

When deleting a property with dependencies:

**1. Cancel (Recommended)**
- Shows dependencies
- Requires manual resolution
- Safest option

**2. Cascade Archive**
- Recursively archives all dependent properties
- Reversible (90-day window)
- Use when cleaning up unused features

**3. Substitute Property**
- Replace with compatible property
- Updates all dependencies automatically
- Use when consolidating duplicate properties

**4. Force Delete**
- Deletes anyway, marks dependents as broken
- ⚠️ Dangerous - use only as last resort
- Requires admin approval

## Permission Profile Configuration

### Default Profiles

**Owners**
- Full access to all properties
- Can configure permissions
- Can manage other profiles

**Managers**
- Read-write access to most properties
- Read-only on system properties
- Full access to financial fields

**Front Desk**
- Read-write on customer-facing properties
- Read-only on financial fields
- Read-only on medical/care fields

**Care Staff**
- Read-write on pet care, medical, incidents
- Hidden financial fields
- Read-only on bookings

### Creating Custom Profiles

1. Go to Settings → Permission Profiles
2. Click "Create Profile"
3. Set profile name and hierarchy
4. Configure property-level permissions
5. Assign users to profile

### Field-Level Security (FLS) Settings

For each property and profile:
- **Read-Write**: Full access
- **Read-Only**: View but cannot edit
- **Hidden**: No access (field not shown)

**Example Configuration:**
```
Property: BalanceDueCents
- Owners: Read-Write
- Managers: Read-Write
- Front Desk: Read-Only
- Care Staff: Hidden
```

### Bulk Permission Editor

1. Go to Settings → Properties → Bulk Editor
2. Select multiple properties (rows)
3. Select profiles (columns)
4. Set permissions for all selected combinations
5. Click "Save Changes"

**Tips:**
- Use "Copy from Profile" to duplicate permissions
- Filter by property type for faster configuration
- Preview effective permissions before saving

## Schema Versioning

### Version Management

**Current Version:**
Check in Settings → System → Schema Version

**Compatibility:**
- API supports N-1 version (backward compatible)
- Frontend automatically detects version
- Tenants can run different versions temporarily

### Zero-Downtime Migrations

Migrations use **Expand-Contract pattern**:

**Phase 1: Expand (Week 1)**
- New schema added alongside old
- Both schemas active
- No disruption

**Phase 2: Migrate (Week 2)**
- Dual-write to both schemas
- Data validation
- Monitor health metrics

**Phase 3: Contract (Week 3)**
- Old schema removed
- All tenants on new version
- Migration complete

### Staged Rollout

Tenants migrate in groups:
1. **Internal** (1-2 tenants): Immediate
2. **Beta** (10%): Day 2
3. **Standard** (70%): Day 4
4. **Enterprise** (20%): Day 6

**Monitoring Between Groups:** 24-48 hours

### Rollback Window

**30-Minute Window:**
- Instant rollback available after migration starts
- One-click revert to previous version
- Automatic data reconciliation

**After 30 Minutes:**
- Rollback requires approval
- Manual data validation needed
- Use only if critical issues found

## Troubleshooting

### Issue: Property Not Appearing in UI

**Possible Causes:**
1. Property is archived
2. User lacks permission to view
3. Property deprecated in current version

**Solutions:**
```sql
-- Check property status
SELECT 
    "property_name",
    "is_deleted",
    "is_deprecated",
    "permission_profiles"
FROM "PropertyMetadata"
WHERE "property_name" = 'YourPropertyName';

-- Check user permissions
SELECT * FROM get_accessible_properties(
    'user-id',
    tenant_id,
    'object-type',
    'read-only'
);
```

### Issue: Dependency Graph Not Loading

**Possible Causes:**
1. Dependencies not discovered yet
2. Circular dependency detected
3. Large graph (>100 nodes)

**Solutions:**
```bash
# Trigger dependency discovery
curl -X POST /api/v2/dependencies/discover \
  -H "Authorization: Bearer $TOKEN"

# Check for circular dependencies
curl -X GET /api/v2/dependencies/validate-circular \
  -H "Authorization: Bearer $TOKEN"
```

### Issue: Permission Denied Errors

**Possible Causes:**
1. User not assigned to any profile
2. Profile lacks required permission
3. Permission cache outdated

**Solutions:**
```sql
-- Check user profile assignments
SELECT * FROM "UserProfileAssignment"
WHERE "user_id" = 'user-id' AND "is_active" = true;

-- Invalidate permission cache
UPDATE "EffectivePermissionCache"
SET "is_valid" = false
WHERE "user_id" = 'user-id';
```

### Issue: Type Conversion Blocked

**Possible Causes:**
1. Property has data (populated)
2. Conversion not in compatibility matrix
3. Dependencies prevent conversion

**Solutions:**
1. **Export-Clear-Change-Import Pattern:**
   - Export data to CSV
   - Clear all property values
   - Change property type
   - Re-import transformed data

2. **Create New Property:**
   - Create property with desired type
   - Migrate data manually
   - Archive old property

### Issue: Migration Stuck

**Possible Causes:**
1. Tenant health check failing
2. Error rate > 5%
3. Dependency on failed migration

**Solutions:**
```sql
-- Check migration status
SELECT * FROM "MigrationStatusDashboard";

-- Manual migration retry
UPDATE "TenantSchemaVersion"
SET "migration_status" = 'pending',
    "error_count" = 0
WHERE "tenant_id" = tenant_id;
```

## Best Practices

### Property Management

1. **Use descriptive names and labels**
   - Property Name: Technical identifier
   - Display Label: User-friendly name

2. **Group related properties**
   - Use shared prefixes
   - Set property_group field

3. **Document custom properties**
   - Add clear descriptions
   - Include validation rules

4. **Review dependencies regularly**
   - Check for unused properties
   - Consolidate duplicates
   - Clean up archived properties

### Permission Configuration

1. **Start restrictive**
   - Default to least privilege
   - Grant access as needed

2. **Use profiles, not individual permissions**
   - Easier to manage
   - More consistent
   - Better audit trail

3. **Review permissions quarterly**
   - Remove unused profiles
   - Update for role changes
   - Check for security gaps

### Dependency Management

1. **Analyze before deleting**
   - Always run impact analysis
   - Review dependency graph
   - Choose appropriate cascade strategy

2. **Document critical dependencies**
   - Note business logic
   - Explain formulas
   - Track workflow usage

3. **Limit dependency depth**
   - Avoid deeply nested dependencies
   - Keep formulas simple
   - Break complex logic into steps

## Monitoring & Alerts

### Key Metrics

Monitor in Settings → System → Metrics:
- Property count by type
- Dependency graph complexity
- Permission cache hit rate
- Migration health status
- Audit trail volume

### Recommended Alerts

1. **Critical Dependency Broken**
   - Trigger: dependency marked as broken
   - Action: Review and fix immediately

2. **High Error Rate**
   - Trigger: > 5% error rate in migrations
   - Action: Rollback or investigate

3. **Permission Cache Miss Rate High**
   - Trigger: < 80% cache hit rate
   - Action: Review profile assignments

4. **Audit Trail Gap**
   - Trigger: No audit entries for > 24 hours
   - Action: Check audit service health

## Support & Resources

- **Documentation**: https://docs.barkbase.com
- **API Reference**: See api-reference-properties-v2.md
- **Support**: support@barkbase.com
- **Status Page**: https://status.barkbase.com

