-- Enhanced Property Metadata Table
-- Implements four-tier classification with comprehensive tracking
-- Based on HubSpot, Salesforce, Zoho CRM, and Pipedrive patterns

CREATE TABLE IF NOT EXISTS "PropertyMetadata" (
    -- Identification (stable UUIDs for integrations)
    "property_id" VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "property_name" VARCHAR(255) NOT NULL,
    "display_label" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "object_type" VARCHAR(50) NOT NULL,
    
    -- Four-Tier Classification
    "property_type" VARCHAR(50) NOT NULL CHECK ("property_type" IN ('system', 'standard', 'protected', 'custom')),
    "property_group" VARCHAR(100),
    "is_system" BOOLEAN DEFAULT FALSE,
    "is_required" BOOLEAN DEFAULT FALSE,
    "is_protected" BOOLEAN DEFAULT FALSE,
    
    -- Data Type Configuration
    "data_type" VARCHAR(50) NOT NULL,
    "field_type" VARCHAR(50),
    "max_length" INTEGER,
    "decimal_places" INTEGER,
    "default_value" TEXT,
    
    -- Schema Versioning
    "schema_version" INTEGER DEFAULT 1,
    "deprecated_in_version" INTEGER,
    "migration_path" TEXT,
    "is_deprecated" BOOLEAN DEFAULT FALSE,
    
    -- Three-Stage Deletion Lifecycle
    "is_deleted" BOOLEAN DEFAULT FALSE,
    "deleted_at" TIMESTAMP,
    "deleted_by" VARCHAR(100),
    "deletion_reason" TEXT,
    "deletion_stage" VARCHAR(50) CHECK ("deletion_stage" IN ('soft_delete', 'archived', 'permanent', NULL)),
    
    -- Audit Trail
    "created_date" TIMESTAMP DEFAULT NOW(),
    "created_by" VARCHAR(100) DEFAULT 'system',
    "modified_date" TIMESTAMP DEFAULT NOW(),
    "modified_by" VARCHAR(100),
    
    -- Modification Permissions (HubSpot modificationMetadata pattern)
    "modification_metadata" JSONB DEFAULT jsonb_build_object(
        'archivable', true,
        'readOnlyDefinition', false,
        'readOnlyValue', false,
        'readOnlyOptions', false
    ),
    
    -- Dependencies (will be populated by dependency service)
    "depends_on" JSONB DEFAULT '[]'::jsonb,
    "used_in" JSONB DEFAULT jsonb_build_object(
        'workflows', '[]'::jsonb,
        'validations', '[]'::jsonb,
        'forms', '[]'::jsonb,
        'reports', '[]'::jsonb,
        'api_integrations', '[]'::jsonb
    ),
    
    -- Multi-Tenancy
    "tenant_id" TEXT,
    "is_global" BOOLEAN DEFAULT TRUE,
    
    -- Display Configuration
    "display_order" INTEGER DEFAULT 0,
    "help_text" TEXT,
    "placeholder_text" VARCHAR(255),
    
    -- Validation Rules
    "validation_rules" JSONB DEFAULT '[]'::jsonb,
    "unique_constraint" BOOLEAN DEFAULT FALSE,
    
    -- Enumeration Options (for dropdown/select/checkbox fields)
    "enum_options" JSONB DEFAULT '[]'::jsonb,
    "options_are_mutable" BOOLEAN DEFAULT TRUE,
    
    -- Query Capabilities (Zoho-inspired)
    "is_searchable" BOOLEAN DEFAULT TRUE,
    "is_filterable" BOOLEAN DEFAULT TRUE,
    "is_sortable" BOOLEAN DEFAULT TRUE,
    "mass_update_enabled" BOOLEAN DEFAULT TRUE,
    
    -- Field-Level Security (permission profiles)
    "permission_profiles" JSONB DEFAULT jsonb_build_object(
        'front_desk', 'read-write',
        'care_staff', 'read-write',
        'managers', 'read-write',
        'owners', 'read-write'
    ),
    
    -- Calculated Field Configuration
    "is_calculated" BOOLEAN DEFAULT FALSE,
    "calculation_formula" TEXT,
    "formula_dependencies" JSONB DEFAULT '[]'::jsonb,
    
    -- Rollup Configuration
    "is_rollup" BOOLEAN DEFAULT FALSE,
    "rollup_config" JSONB,
    
    -- Foreign Key Relationships
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    
    -- Unique Constraints
    CONSTRAINT "unique_property_per_tenant" UNIQUE ("property_name", "object_type", "tenant_id", "is_deleted")
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS "idx_property_metadata_tenant" ON "PropertyMetadata"("tenant_id") WHERE "tenant_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_property_metadata_object_type" ON "PropertyMetadata"("object_type");
CREATE INDEX IF NOT EXISTS "idx_property_metadata_type" ON "PropertyMetadata"("property_type");
CREATE INDEX IF NOT EXISTS "idx_property_metadata_active" ON "PropertyMetadata"("object_type", "is_deleted") WHERE "is_deleted" = FALSE;
CREATE INDEX IF NOT EXISTS "idx_property_metadata_global" ON "PropertyMetadata"("object_type", "is_global") WHERE "is_global" = TRUE;
CREATE INDEX IF NOT EXISTS "idx_property_metadata_name_lookup" ON "PropertyMetadata"("property_name", "object_type", "tenant_id");
CREATE INDEX IF NOT EXISTS "idx_property_metadata_deleted" ON "PropertyMetadata"("is_deleted", "deleted_at") WHERE "is_deleted" = TRUE;
CREATE INDEX IF NOT EXISTS "idx_property_metadata_deprecated" ON "PropertyMetadata"("is_deprecated", "deprecated_in_version") WHERE "is_deprecated" = TRUE;

-- GIN Index for JSONB searches
CREATE INDEX IF NOT EXISTS "idx_property_metadata_modification" ON "PropertyMetadata" USING GIN ("modification_metadata");
CREATE INDEX IF NOT EXISTS "idx_property_metadata_permissions" ON "PropertyMetadata" USING GIN ("permission_profiles");
CREATE INDEX IF NOT EXISTS "idx_property_metadata_used_in" ON "PropertyMetadata" USING GIN ("used_in");

-- Trigger for updated timestamp
CREATE OR REPLACE FUNCTION update_property_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW."modified_date" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_property_metadata_updated
    BEFORE UPDATE ON "PropertyMetadata"
    FOR EACH ROW
    EXECUTE FUNCTION update_property_metadata_timestamp();

-- Comments for Documentation
COMMENT ON TABLE "PropertyMetadata" IS 'Comprehensive property metadata tracking system and custom properties with enterprise-grade classification';
COMMENT ON COLUMN "PropertyMetadata"."property_type" IS 'Four-tier classification: system (immutable), standard (BarkBase-defined), protected (requires approval), custom (tenant-defined)';
COMMENT ON COLUMN "PropertyMetadata"."modification_metadata" IS 'HubSpot-style permission flags: archivable, readOnlyDefinition, readOnlyValue, readOnlyOptions';
COMMENT ON COLUMN "PropertyMetadata"."deletion_stage" IS 'Three-stage lifecycle: soft_delete (0-90d), archived (90d-7y), permanent (>7y)';
COMMENT ON COLUMN "PropertyMetadata"."permission_profiles" IS 'Field-level security per profile: read-write, read-only, hidden';
COMMENT ON COLUMN "PropertyMetadata"."is_global" IS 'TRUE for system/standard properties available to all tenants, FALSE for tenant-specific custom properties';

