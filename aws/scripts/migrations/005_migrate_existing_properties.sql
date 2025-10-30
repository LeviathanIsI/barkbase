-- Migrate Existing Properties to Enhanced Property Metadata System
-- Backfills PropertyMetadata from existing Property table
-- Classifies all 232 properties into four tiers with appropriate permissions

-- Insert all existing properties with classification
INSERT INTO "PropertyMetadata" (
    "property_id",
    "property_name",
    "display_label",
    "description",
    "object_type",
    "property_type",
    "property_group",
    "is_system",
    "is_required",
    "is_protected",
    "data_type",
    "field_type",
    "created_date",
    "created_by",
    "modification_metadata",
    "permission_profiles",
    "tenant_id",
    "is_global",
    "enum_options",
    "validation_rules",
    "unique_constraint",
    "is_searchable",
    "is_filterable",
    "is_sortable"
)
SELECT 
    gen_random_uuid()::TEXT AS "property_id",
    "name" AS "property_name",
    "label" AS "display_label",
    "description",
    "objectType" AS "object_type",
    
    -- Four-Tier Classification Logic
    CASE
        -- SYSTEM TIER: Core system fields (completely immutable)
        WHEN "name" IN ('recordId', 'tenantId', 'createdAt', 'updatedAt', 'createdBy', 'modifiedBy') THEN 'system'
        
        -- PROTECTED TIER: Fields with business logic dependencies
        WHEN "name" IN ('status', 'balanceDueCents', 'totalCents', 'paidCents', 'depositCents') 
            AND "objectType" IN ('bookings', 'payments', 'invoices') THEN 'protected'
        
        -- STANDARD TIER: BarkBase-defined fields (structural protection)
        WHEN "isSystem" = true AND "tenantId" IS NULL THEN 'standard'
        
        -- CUSTOM TIER: Tenant-created fields
        ELSE 'custom'
    END AS "property_type",
    
    "group" AS "property_group",
    "isSystem" AS "is_system",
    "isRequired" AS "is_required",
    
    -- Mark protected properties
    CASE
        WHEN "name" IN ('status', 'balanceDueCents', 'totalCents', 'paidCents', 'depositCents') 
            AND "objectType" IN ('bookings', 'payments', 'invoices') THEN true
        ELSE false
    END AS "is_protected",
    
    "type" AS "data_type",
    "type" AS "field_type",
    COALESCE("createdAt", NOW()) AS "created_date",
    COALESCE("createdBy", 'BarkBase') AS "created_by",
    
    -- Modification Metadata (based on classification)
    CASE
        -- System properties: all read-only
        WHEN "name" IN ('recordId', 'tenantId', 'createdAt', 'updatedAt', 'createdBy', 'modifiedBy') THEN
            jsonb_build_object(
                'archivable', false,
                'readOnlyDefinition', true,
                'readOnlyValue', true,
                'readOnlyOptions', true
            )
        
        -- Standard properties: structure protected, values editable
        WHEN "isSystem" = true AND "tenantId" IS NULL THEN
            jsonb_build_object(
                'archivable', true,
                'readOnlyDefinition', true,
                'readOnlyValue', false,
                'readOnlyOptions', false
            )
        
        -- Custom properties: fully editable (when empty)
        ELSE
            jsonb_build_object(
                'archivable', true,
                'readOnlyDefinition', false,
                'readOnlyValue', false,
                'readOnlyOptions', false
            )
    END AS "modification_metadata",
    
    -- Permission Profiles (Field-Level Security)
    CASE
        -- System fields: read-only for all non-admin profiles
        WHEN "name" IN ('recordId', 'tenantId', 'createdAt', 'updatedAt') THEN
            jsonb_build_object(
                'front_desk', 'read-only',
                'care_staff', 'read-only',
                'managers', 'read-only',
                'owners', 'read-only'
            )
        
        -- Financial fields: restricted to managers and owners
        WHEN "name" IN ('depositCents', 'totalCents', 'balanceDueCents', 'paidCents', 'amountCents', 'priceCents', 'hourlyRate', 'dailyRate', 'weeklyRate') THEN
            jsonb_build_object(
                'front_desk', 'read-only',
                'care_staff', 'hidden',
                'managers', 'read-write',
                'owners', 'read-write'
            )
        
        -- Medical/incident fields: care staff can edit
        WHEN "name" IN ('medicalNotes', 'allergies', 'dietaryNotes', 'behaviorFlags', 'narrative', 'severity', 'vetContacted') 
            OR "objectType" IN ('vaccinations', 'incidents') THEN
            jsonb_build_object(
                'front_desk', 'read-only',
                'care_staff', 'read-write',
                'managers', 'read-write',
                'owners', 'read-write'
            )
        
        -- Default: all can edit except care staff on some fields
        ELSE
            jsonb_build_object(
                'front_desk', 'read-write',
                'care_staff', 'read-write',
                'managers', 'read-write',
                'owners', 'read-write'
            )
    END AS "permission_profiles",
    
    "tenantId" AS "tenant_id",
    CASE WHEN "tenantId" IS NULL THEN true ELSE false END AS "is_global",
    "options" AS "enum_options",
    COALESCE("validation", '[]'::jsonb) AS "validation_rules",
    COALESCE("isUnique", false) AS "unique_constraint",
    COALESCE("isSearchable", true) AS "is_searchable",
    true AS "is_filterable",  -- Default all to filterable
    true AS "is_sortable"     -- Default all to sortable
FROM "Property"
WHERE NOT EXISTS (
    SELECT 1 FROM "PropertyMetadata" pm 
    WHERE pm."property_name" = "Property"."name" 
    AND pm."object_type" = "Property"."objectType"
    AND COALESCE(pm."tenant_id"::TEXT, '') = COALESCE("Property"."tenantId"::TEXT, '')
)
ON CONFLICT ("property_name", "object_type", "tenant_id", "is_deleted") DO NOTHING;

-- Create audit trail entries for the migration
INSERT INTO "PropertyChangeAudit" (
    "property_id",
    "change_type",
    "before_value",
    "after_value",
    "changed_by",
    "changed_date",
    "change_reason",
    "affected_records_count",
    "risk_level",
    "is_rollback_available",
    "requires_approval"
)
SELECT 
    pm."property_id",
    'CREATE' AS "change_type",
    NULL AS "before_value",
    to_jsonb(pm.*) AS "after_value",
    'system' AS "changed_by",
    NOW() AS "changed_date",
    'Initial migration from legacy Property table to enhanced PropertyMetadata system' AS "change_reason",
    0 AS "affected_records_count",
    'low' AS "risk_level",
    false AS "is_rollback_available",
    false AS "requires_approval"
FROM "PropertyMetadata" pm
WHERE pm."created_date" >= NOW() - INTERVAL '1 minute';  -- Only newly inserted

-- Initialize TenantSchemaVersion for all existing tenants
INSERT INTO "TenantSchemaVersion" (
    "tenant_id",
    "current_schema_version",
    "migration_status",
    "rollout_group",
    "rollout_priority",
    "supports_schema_versions",
    "health_check_passed",
    "last_health_check",
    "updated_at",
    "updated_by",
    "migration_notes"
)
SELECT 
    t."recordId" AS "tenant_id",
    1 AS "current_schema_version",
    'current' AS "migration_status",
    CASE
        -- Classify tenants into rollout groups based on some criteria
        -- You can customize this logic based on your needs
        WHEN t."plan" = 'ENTERPRISE' THEN 'enterprise'
        WHEN t."recordId" IN (SELECT MIN("recordId") FROM "Tenant") THEN 'internal'  -- First tenant
        WHEN random() < 0.1 THEN 'beta'  -- Random 10% to beta
        ELSE 'standard'
    END AS "rollout_group",
    CASE
        WHEN t."plan" = 'ENTERPRISE' THEN 4
        WHEN t."recordId" IN (SELECT MIN("recordId") FROM "Tenant") THEN 1
        WHEN random() < 0.1 THEN 2
        ELSE 3
    END AS "rollout_priority",
    '[1]'::jsonb AS "supports_schema_versions",
    true AS "health_check_passed",
    NOW() AS "last_health_check",
    NOW() AS "updated_at",
    'system' AS "updated_by",
    'Initialized during PropertyMetadata migration' AS "migration_notes"
FROM "Tenant" t
WHERE NOT EXISTS (
    SELECT 1 FROM "TenantSchemaVersion" tsv WHERE tsv."tenant_id" = t."recordId"
)
ON CONFLICT ("tenant_id") DO NOTHING;

-- Initialize Schema Version Registry with version 1
INSERT INTO "SchemaVersionRegistry" (
    "version_number",
    "version_name",
    "description",
    "released_at",
    "compatible_with_versions",
    "is_stable",
    "is_active"
)
VALUES (
    1,
    'Legacy Property System',
    'Original property system with basic system/custom distinction',
    NOW(),
    '[1]'::jsonb,
    true,
    true
),
(
    2,
    'Enterprise Property Management',
    'Enhanced property system with four-tier classification, dependency tracking, FLS, and three-stage deletion',
    NOW(),
    '[1, 2]'::jsonb,
    false,  -- Not stable yet (in development)
    true
)
ON CONFLICT ("version_number") DO NOTHING;

-- Generate summary report
DO $$
DECLARE
    system_count INTEGER;
    standard_count INTEGER;
    protected_count INTEGER;
    custom_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT 
        COUNT(*) FILTER (WHERE "property_type" = 'system'),
        COUNT(*) FILTER (WHERE "property_type" = 'standard'),
        COUNT(*) FILTER (WHERE "property_type" = 'protected'),
        COUNT(*) FILTER (WHERE "property_type" = 'custom'),
        COUNT(*)
    INTO system_count, standard_count, protected_count, custom_count, total_count
    FROM "PropertyMetadata";
    
    RAISE NOTICE '=== Property Migration Complete ===';
    RAISE NOTICE 'Total properties migrated: %', total_count;
    RAISE NOTICE 'System properties: % (immutable)', system_count;
    RAISE NOTICE 'Standard properties: % (BarkBase-defined)', standard_count;
    RAISE NOTICE 'Protected properties: % (requires approval)', protected_count;
    RAISE NOTICE 'Custom properties: % (tenant-defined)', custom_count;
    RAISE NOTICE '===================================';
END $$;

-- Verification queries (commented out, run manually if needed)
/*
-- Verify migration completeness
SELECT 
    p."objectType",
    COUNT(*) AS old_count,
    COUNT(pm."property_id") AS new_count
FROM "Property" p
LEFT JOIN "PropertyMetadata" pm ON p."name" = pm."property_name" 
    AND p."objectType" = pm."object_type"
    AND COALESCE(p."tenantId"::TEXT, '') = COALESCE(pm."tenant_id"::TEXT, '')
GROUP BY p."objectType"
ORDER BY p."objectType";

-- Check property type distribution
SELECT 
    "property_type",
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM "PropertyMetadata"
GROUP BY "property_type"
ORDER BY count DESC;

-- Check permission profile distribution
SELECT 
    "object_type",
    "permission_profiles"->>'front_desk' AS front_desk_access,
    COUNT(*) AS count
FROM "PropertyMetadata"
GROUP BY "object_type", "permission_profiles"->>'front_desk'
ORDER BY "object_type", front_desk_access;
*/

