# Enterprise Property Management System - Migration Guide

## Overview

This guide covers the migration from BarkBase's legacy Property system to the new Enterprise Property Management System with 4-tier classification, dependency tracking, field-level security, and zero-downtime deployment.

## Migration Timeline

- **Week 1-2**: Database foundation (Phases 1-3)
- **Week 3-4**: Security & permissions (Phase 4)
- **Week 5-6**: Testing & validation
- **Week 7-8**: Staged production rollout

## Pre-Migration Checklist

- [ ] Complete database backup
- [ ] Verify all tenants are on latest application version
- [ ] Review and document custom properties per tenant
- [ ] Identify protected properties requiring special handling
- [ ] Communicate migration timeline to all tenants
- [ ] Set up monitoring and alerting
- [ ] Prepare rollback procedures

## Phase 1: Database Schema Migration

### Step 1: Run Foundation Migrations

```bash
# Connect to database
psql -h <host> -U postgres -d barkbase

# Run migrations in order
\i aws/scripts/migrations/001_create_enhanced_property_metadata.sql
\i aws/scripts/migrations/002_create_property_dependencies.sql
\i aws/scripts/migrations/003_create_property_change_audit.sql
\i aws/scripts/migrations/004_create_tenant_schema_version.sql
```

**Validation:**
```sql
-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('PropertyMetadata', 'PropertyDependencies', 'PropertyChangeAudit', 'TenantSchemaVersion');

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'PropertyMetadata';
```

### Step 2: Migrate Existing Properties

```bash
\i aws/scripts/migrations/005_migrate_existing_properties.sql
```

**Expected Output:**
```
=== Property Migration Complete ===
Total properties migrated: 232
System properties: 24 (immutable)
Standard properties: 156 (BarkBase-defined)
Protected properties: 12 (requires approval)
Custom properties: 40 (tenant-defined)
===================================
```

**Validation:**
```sql
-- Verify migration completeness
SELECT 
    property_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM "PropertyMetadata"
GROUP BY property_type
ORDER BY count DESC;

-- Check for unmigrated properties
SELECT COUNT(*) as unmigrated_count
FROM "Property" p
LEFT JOIN "PropertyMetadata" pm 
    ON p."name" = pm."property_name" 
    AND p."objectType" = pm."object_type"
WHERE pm."property_id" IS NULL;
```

## Phase 2: Field-Level Security Setup

### Step 1: Create Permission Profiles

```bash
\i aws/scripts/migrations/007_create_permission_profiles.sql
\i aws/scripts/seed-permission-profiles.sql
```

**Validation:**
```sql
-- Verify profiles created
SELECT * FROM "PermissionProfile" WHERE "is_global" = true;

-- Check property permissions seeded
SELECT 
    pp."profile_name",
    COUNT(*) as property_count
FROM "PropertyPermission" perm
INNER JOIN "PermissionProfile" pp ON perm."profile_id" = pp."profile_id"
GROUP BY pp."profile_name";
```

### Step 2: Assign Users to Profiles

```sql
-- Example: Assign users based on existing roles
INSERT INTO "UserProfileAssignment" ("user_id", "profile_id", "tenant_id", "is_primary", "assigned_by")
SELECT 
    u."recordId",
    pp."profile_id",
    m."tenantId",
    true,
    'migration_script'
FROM "User" u
INNER JOIN "Membership" m ON u."recordId" = m."userId"
INNER JOIN "PermissionProfile" pp ON 
    CASE 
        WHEN m."role" = 'OWNER' THEN pp."profile_key" = 'owners'
        WHEN m."role" = 'MANAGER' THEN pp."profile_key" = 'managers'
        WHEN m."role" = 'STAFF' THEN pp."profile_key" = 'care_staff'
        ELSE pp."profile_key" = 'front_desk'
    END
WHERE pp."is_global" = true;
```

## Phase 3: Lambda Function Deployment

### Step 1: Deploy Dependencies Service

```bash
cd aws/cdk
npm run cdk deploy -- --require-approval never
```

**New Lambda Functions Deployed:**
- `property-dependency-service`
- `property-archival-job`
- `property-permanent-deletion-job`
- `user-profile-service`
- `schema-version-service`
- `migration-orchestrator`
- `properties-api-v2`

### Step 2: Configure Scheduled Jobs

```typescript
// In aws/cdk/lib/cdk-stack.ts
const archivalJob = new events.Rule(this, 'PropertyArchivalSchedule', {
  schedule: events.Schedule.cron({ hour: '2', minute: '0' }),
});
archivalJob.addTarget(new targets.LambdaFunction(propertyArchivalJobFunction));

const permanentDeletionJob = new events.Rule(this, 'PropertyPermanentDeletionSchedule', {
  schedule: events.Schedule.cron({ weekDay: 'SUN', hour: '3', minute: '0' }),
});
permanentDeletionJob.addTarget(new targets.LambdaFunction(propertyPermanentDeletionJobFunction));
```

## Phase 4: API Version Transition

### Step 1: Enable API v2 (Parallel to v1)

Both v1 and v2 APIs run simultaneously:
- `/api/v1/properties` - Legacy API (maintained for backward compatibility)
- `/api/v2/properties` - New API with rich metadata

### Step 2: Update Frontend to Use v2

```javascript
// frontend/src/features/settings/api.js
// Gradually migrate queries to v2
export const usePropertiesQueryV2 = (objectType, options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: [...queryKeys.properties(tenantKey, { objectType }), 'v2'],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v2/properties?objectType=${objectType}`);
      return res.data;
    },
    ...options,
  });
};
```

## Phase 5: Staged Tenant Rollout

### Rollout Groups

| Group | Tenants | Start | Monitor Period |
|-------|---------|-------|----------------|
| Internal | 1-2 | Day 1 | 24 hours |
| Beta | 10% | Day 2 | 48 hours |
| Standard | 70% | Day 4 | 48 hours |
| Enterprise | 20% | Day 6 | 72 hours |

### Rollout Execution

```sql
-- Assign tenants to rollout groups
UPDATE "TenantSchemaVersion"
SET "rollout_group" = 
    CASE
        WHEN "tenant_id" IN (1, 2) THEN 'internal'
        WHEN RANDOM() < 0.1 THEN 'beta'
        WHEN t."plan" = 'ENTERPRISE' THEN 'enterprise'
        ELSE 'standard'
    END
FROM "Tenant" t
WHERE "TenantSchemaVersion"."tenant_id" = t."recordId";
```

### Monitor Health Metrics

```sql
-- Check migration status
SELECT 
    "rollout_group",
    COUNT(*) as total_tenants,
    COUNT(*) FILTER (WHERE "migration_status" = 'completed') as completed,
    COUNT(*) FILTER (WHERE "health_check_passed" = false) as unhealthy,
    AVG("error_rate") as avg_error_rate
FROM "TenantSchemaVersion"
GROUP BY "rollout_group";
```

## Rollback Procedures

### Emergency Rollback (Within 30 Minutes)

```sql
-- Rollback specific tenant
UPDATE "TenantSchemaVersion"
SET "current_schema_version" = "previous_schema_version",
    "target_schema_version" = NULL,
    "migration_status" = 'rolled_back',
    "rollback_reason" = 'Emergency rollback due to critical issue',
    "use_new_schema" = false
WHERE "tenant_id" = <tenant_id>;
```

### Full System Rollback

```bash
# Use CDK to rollback Lambda deployments
cd aws/cdk
npm run cdk deploy --previous-version

# Rollback database migrations
psql -h <host> -U postgres -d barkbase
\i aws/scripts/migrations/rollback/rollback_all.sql
```

## Breaking Changes & API Differences

### v1 → v2 API Changes

**Property Object Structure:**

**v1:**
```json
{
  "name": "firstName",
  "label": "First Name",
  "type": "text",
  "isSystem": true
}
```

**v2:**
```json
{
  "propertyId": "uuid-here",
  "propertyName": "firstName",
  "displayLabel": "First Name",
  "dataType": "text",
  "propertyType": "standard",
  "modificationMetadata": {
    "archivable": false,
    "readOnlyDefinition": true
  },
  "queryCapabilities": {...},
  "permissionProfiles": {...}
}
```

### Frontend Component Updates Required

1. **Property Creation Forms**: Add property type selection
2. **Property Editing**: Check `modificationMetadata` before allowing edits
3. **Deletion Flows**: Integrate impact analysis and cascade strategies
4. **Permission UI**: Show FLS indicators

## Post-Migration Validation

### Automated Tests

```bash
# Run integration tests
cd aws/lambdas
npm run test:integration

# Run frontend tests
cd frontend
npm run test
```

### Manual Validation Checklist

- [ ] Create new custom property
- [ ] Edit existing standard property
- [ ] Attempt to delete system property (should be blocked)
- [ ] Delete custom property with dependencies
- [ ] Restore archived property
- [ ] View dependency graph
- [ ] Check permission filtering
- [ ] Verify audit trail entries

## Troubleshooting

### Issue: Properties not appearing in v2 API

**Solution:**
```sql
-- Check if property was migrated
SELECT * FROM "PropertyMetadata" 
WHERE "property_name" = 'yourPropertyName';

-- If not found, run migration again
\i aws/scripts/migrations/005_migrate_existing_properties.sql
```

### Issue: Permission errors after migration

**Solution:**
```sql
-- Verify user has profile assignment
SELECT * FROM "UserProfileAssignment" 
WHERE "user_id" = 'user-id-here' AND "is_active" = true;

-- Assign if missing
INSERT INTO "UserProfileAssignment" (...)
VALUES (...);
```

### Issue: Dependency graph not building

**Solution:**
```bash
# Manually trigger dependency discovery
curl -X POST https://api.barkbase.com/api/v2/dependencies/discover \
  -H "Authorization: Bearer $TOKEN"
```

## Communication Templates

### Tenant Notification Email

**Subject: BarkBase Property Management System Upgrade - [Date]**

Dear BarkBase User,

We're excited to announce an upgrade to our property management system that will provide:
- Enhanced security with field-level permissions
- Better dependency tracking
- Improved audit trails
- More flexible custom properties

**Timeline:**
- [Date]: System upgrade begins
- [Date]: Your tenant group migration
- [Date]: Full rollout complete

**What You Need to Do:**
- No action required! The upgrade is automatic.
- Existing properties will continue to work normally.
- New features will be gradually enabled.

**Questions?**
Contact support at support@barkbase.com

## Success Metrics

- ✅ Zero data loss
- ✅ < 100ms API response time
- ✅ 100% property migration
- ✅ < 1% error rate during rollout
- ✅ 90-day recovery window active
- ✅ All audit trails capturing events

## Support & Resources

- **Migration Dashboard**: https://admin.barkbase.com/migrations
- **Status Page**: https://status.barkbase.com
- **Documentation**: https://docs.barkbase.com/enterprise-properties
- **Support**: support@barkbase.com

