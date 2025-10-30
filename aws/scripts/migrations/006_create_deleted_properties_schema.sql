-- Deleted Properties Archive Schema
-- Stage 2 storage (90 days - 7 years) for compliance and recovery
-- Separate schema to isolate deleted data from active operations

-- Create dedicated schema for archived properties
CREATE SCHEMA IF NOT EXISTS deleted_properties;

-- Mirror PropertyMetadata structure in archive schema
CREATE TABLE IF NOT EXISTS deleted_properties."PropertyMetadata" (
    -- All fields from original PropertyMetadata
    "property_id" VARCHAR(36) PRIMARY KEY,
    "property_name" VARCHAR(255) NOT NULL,
    "display_label" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "object_type" VARCHAR(50) NOT NULL,
    "property_type" VARCHAR(50) NOT NULL,
    "property_group" VARCHAR(100),
    "is_system" BOOLEAN DEFAULT FALSE,
    "is_required" BOOLEAN DEFAULT FALSE,
    "is_protected" BOOLEAN DEFAULT FALSE,
    "data_type" VARCHAR(50) NOT NULL,
    "field_type" VARCHAR(50),
    "max_length" INTEGER,
    "decimal_places" INTEGER,
    "default_value" TEXT,
    "schema_version" INTEGER DEFAULT 1,
    "deprecated_in_version" INTEGER,
    "migration_path" TEXT,
    "is_deprecated" BOOLEAN DEFAULT FALSE,
    "is_deleted" BOOLEAN DEFAULT TRUE,
    "deleted_at" TIMESTAMP,
    "deleted_by" VARCHAR(100),
    "deletion_reason" TEXT,
    "deletion_stage" VARCHAR(50) DEFAULT 'archived',
    "created_date" TIMESTAMP,
    "created_by" VARCHAR(100),
    "modified_date" TIMESTAMP,
    "modified_by" VARCHAR(100),
    "modification_metadata" JSONB,
    "depends_on" JSONB,
    "used_in" JSONB,
    "tenant_id" TEXT,
    "is_global" BOOLEAN DEFAULT TRUE,
    "display_order" INTEGER DEFAULT 0,
    "help_text" TEXT,
    "placeholder_text" VARCHAR(255),
    "validation_rules" JSONB,
    "unique_constraint" BOOLEAN DEFAULT FALSE,
    "enum_options" JSONB,
    "options_are_mutable" BOOLEAN DEFAULT TRUE,
    "is_searchable" BOOLEAN DEFAULT TRUE,
    "is_filterable" BOOLEAN DEFAULT TRUE,
    "is_sortable" BOOLEAN DEFAULT TRUE,
    "mass_update_enabled" BOOLEAN DEFAULT TRUE,
    "permission_profiles" JSONB,
    "is_calculated" BOOLEAN DEFAULT FALSE,
    "calculation_formula" TEXT,
    "formula_dependencies" JSONB,
    "is_rollup" BOOLEAN DEFAULT FALSE,
    "rollup_config" JSONB,
    
    -- Archive-specific fields
    "archived_at" TIMESTAMP DEFAULT NOW(),
    "archived_from_stage" VARCHAR(50) DEFAULT 'soft_delete',
    "retention_until" TIMESTAMP,
    "restoration_requested_at" TIMESTAMP,
    "restoration_requested_by" VARCHAR(100),
    "restoration_approved" BOOLEAN DEFAULT FALSE,
    "restoration_notes" TEXT
);

-- Mirror PropertyDependencies in archive schema
CREATE TABLE IF NOT EXISTS deleted_properties."PropertyDependencies" (
    "dependency_id" SERIAL PRIMARY KEY,
    "source_property_id" VARCHAR(36) NOT NULL,
    "dependent_property_id" VARCHAR(36) NOT NULL,
    "dependency_type" VARCHAR(50) NOT NULL,
    "dependency_context" JSONB DEFAULT '{}'::jsonb,
    "created_date" TIMESTAMP,
    "is_active" BOOLEAN DEFAULT FALSE,
    "is_system_discovered" BOOLEAN DEFAULT FALSE,
    "is_critical" BOOLEAN DEFAULT FALSE,
    "break_on_source_delete" BOOLEAN DEFAULT TRUE,
    "discovered_at" TIMESTAMP,
    "discovered_by" VARCHAR(100),
    "last_validated" TIMESTAMP,
    
    -- Archive-specific
    "archived_at" TIMESTAMP DEFAULT NOW(),
    "archived_reason" TEXT
);

-- Indexes for archived properties
CREATE INDEX IF NOT EXISTS "idx_deleted_property_archived_at" 
    ON deleted_properties."PropertyMetadata"("archived_at");
CREATE INDEX IF NOT EXISTS "idx_deleted_property_retention" 
    ON deleted_properties."PropertyMetadata"("retention_until") 
    WHERE "retention_until" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_deleted_property_tenant" 
    ON deleted_properties."PropertyMetadata"("tenant_id") 
    WHERE "tenant_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_deleted_property_object_type" 
    ON deleted_properties."PropertyMetadata"("object_type");
CREATE INDEX IF NOT EXISTS "idx_deleted_property_restoration" 
    ON deleted_properties."PropertyMetadata"("restoration_requested_at") 
    WHERE "restoration_requested_at" IS NOT NULL;

-- Function to automatically set retention period (7 years from archival)
CREATE OR REPLACE FUNCTION deleted_properties.set_retention_period()
RETURNS TRIGGER AS $$
BEGIN
    NEW."retention_until" = NOW() + INTERVAL '7 years';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_retention_period
    BEFORE INSERT ON deleted_properties."PropertyMetadata"
    FOR EACH ROW
    EXECUTE FUNCTION deleted_properties.set_retention_period();

-- Function to move property to archive (called by archival job)
CREATE OR REPLACE FUNCTION move_property_to_archive(prop_id VARCHAR(36))
RETURNS BOOLEAN AS $$
DECLARE
    property_record RECORD;
    deps_moved INTEGER;
BEGIN
    -- Get the property from main table
    SELECT * INTO property_record
    FROM "PropertyMetadata"
    WHERE "property_id" = prop_id
      AND "is_deleted" = true
      AND "deletion_stage" = 'soft_delete'
      AND "deleted_at" < NOW() - INTERVAL '90 days';
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Property % not eligible for archival', prop_id;
        RETURN FALSE;
    END IF;
    
    -- Insert into archive schema
    INSERT INTO deleted_properties."PropertyMetadata"
    SELECT *, 
           NOW() AS "archived_at",
           'soft_delete' AS "archived_from_stage",
           NOW() + INTERVAL '7 years' AS "retention_until"
    FROM "PropertyMetadata"
    WHERE "property_id" = prop_id;
    
    -- Move dependencies to archive
    INSERT INTO deleted_properties."PropertyDependencies"
    SELECT *,
           NOW() AS "archived_at",
           'Property archived after 90-day soft delete period' AS "archived_reason"
    FROM "PropertyDependencies"
    WHERE "source_property_id" = prop_id
       OR "dependent_property_id" = prop_id;
    
    GET DIAGNOSTICS deps_moved = ROW_COUNT;
    
    -- Delete from main tables
    DELETE FROM "PropertyDependencies"
    WHERE "source_property_id" = prop_id
       OR "dependent_property_id" = prop_id;
    
    DELETE FROM "PropertyMetadata"
    WHERE "property_id" = prop_id;
    
    -- Log to audit trail
    INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "changed_by",
        "changed_date",
        "change_reason",
        "affected_records_count",
        "risk_level"
    ) VALUES (
        prop_id,
        'ARCHIVE',
        'system',
        NOW(),
        'Automatically archived after 90-day soft delete period',
        deps_moved,
        'low'
    );
    
    RAISE NOTICE 'Property % archived successfully with % dependencies', prop_id, deps_moved;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to restore property from archive (24-hour SLA)
CREATE OR REPLACE FUNCTION restore_property_from_archive(prop_id VARCHAR(36), restored_by VARCHAR(100))
RETURNS BOOLEAN AS $$
DECLARE
    property_record RECORD;
    deps_restored INTEGER;
BEGIN
    -- Get the property from archive
    SELECT * INTO property_record
    FROM deleted_properties."PropertyMetadata"
    WHERE "property_id" = prop_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Property % not found in archive', prop_id;
    END IF;
    
    -- Restore to main table
    INSERT INTO "PropertyMetadata" (
        SELECT 
            "property_id", "property_name", "display_label", "description", 
            "object_type", "property_type", "property_group", "is_system",
            "is_required", "is_protected", "data_type", "field_type",
            "max_length", "decimal_places", "default_value", "schema_version",
            "deprecated_in_version", "migration_path", "is_deprecated",
            false AS "is_deleted",  -- Clear deleted flag
            NULL AS "deleted_at",
            NULL AS "deleted_by",
            NULL AS "deletion_reason",
            NULL AS "deletion_stage",
            "created_date", "created_by", "modified_date", "modified_by",
            "modification_metadata", "depends_on", "used_in", "tenant_id",
            "is_global", "display_order", "help_text", "placeholder_text",
            "validation_rules", "unique_constraint", "enum_options",
            "options_are_mutable", "is_searchable", "is_filterable",
            "is_sortable", "mass_update_enabled", "permission_profiles",
            "is_calculated", "calculation_formula", "formula_dependencies",
            "is_rollup", "rollup_config"
        FROM deleted_properties."PropertyMetadata"
        WHERE "property_id" = prop_id
    );
    
    -- Restore dependencies
    INSERT INTO "PropertyDependencies" (
        SELECT 
            "source_property_id", "dependent_property_id", "dependency_type",
            "dependency_context", "created_date", true AS "is_active",
            "is_system_discovered", "is_critical", "break_on_source_delete",
            "discovered_at", "discovered_by", NOW() AS "last_validated"
        FROM deleted_properties."PropertyDependencies"
        WHERE "source_property_id" = prop_id
           OR "dependent_property_id" = prop_id
    );
    
    GET DIAGNOSTICS deps_restored = ROW_COUNT;
    
    -- Delete from archive
    DELETE FROM deleted_properties."PropertyDependencies"
    WHERE "source_property_id" = prop_id
       OR "dependent_property_id" = prop_id;
    
    DELETE FROM deleted_properties."PropertyMetadata"
    WHERE "property_id" = prop_id;
    
    -- Log restoration
    INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "changed_by",
        "changed_date",
        "change_reason",
        "affected_records_count",
        "risk_level"
    ) VALUES (
        prop_id,
        'RESTORE',
        restored_by,
        NOW(),
        'Restored from archive',
        deps_restored,
        'low'
    );
    
    RAISE NOTICE 'Property % restored successfully with % dependencies', prop_id, deps_restored;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to permanently delete archived properties (after 7 years)
CREATE OR REPLACE FUNCTION permanently_delete_archived_property(prop_id VARCHAR(36))
RETURNS BOOLEAN AS $$
DECLARE
    property_record RECORD;
BEGIN
    -- Check eligibility (7 years retention exceeded)
    SELECT * INTO property_record
    FROM deleted_properties."PropertyMetadata"
    WHERE "property_id" = prop_id
      AND "retention_until" < NOW();
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Property % not eligible for permanent deletion', prop_id;
        RETURN FALSE;
    END IF;
    
    -- Final audit log entry
    INSERT INTO "PropertyChangeAudit" (
        "property_id",
        "change_type",
        "changed_by",
        "changed_date",
        "change_reason",
        "risk_level"
    ) VALUES (
        prop_id,
        'DELETE',
        'system',
        NOW(),
        'Permanently deleted after 7-year retention period',
        'low'
    );
    
    -- Permanent deletion
    DELETE FROM deleted_properties."PropertyDependencies"
    WHERE "source_property_id" = prop_id
       OR "dependent_property_id" = prop_id;
    
    DELETE FROM deleted_properties."PropertyMetadata"
    WHERE "property_id" = prop_id;
    
    RAISE NOTICE 'Property % permanently deleted', prop_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- View for restoration queue (properties pending restoration approval)
CREATE OR REPLACE VIEW "RestorationQueue" AS
SELECT 
    pm."property_id",
    pm."property_name",
    pm."display_label",
    pm."object_type",
    pm."property_type",
    pm."tenant_id",
    pm."deleted_at",
    pm."deletion_reason",
    pm."archived_at",
    pm."restoration_requested_at",
    pm."restoration_requested_by",
    pm."restoration_approved",
    pm."restoration_notes",
    EXTRACT(EPOCH FROM (NOW() - pm."restoration_requested_at"))/3600 AS "hours_pending"
FROM deleted_properties."PropertyMetadata" pm
WHERE pm."restoration_requested_at" IS NOT NULL
  AND pm."restoration_approved" = FALSE
ORDER BY pm."restoration_requested_at" ASC;

-- Comments
COMMENT ON SCHEMA deleted_properties IS 'Archive schema for deleted properties (Stage 2: 90 days - 7 years retention)';
COMMENT ON TABLE deleted_properties."PropertyMetadata" IS 'Archived properties with 7-year retention for compliance';
COMMENT ON COLUMN deleted_properties."PropertyMetadata"."retention_until" IS 'Automatic permanent deletion after this date';
COMMENT ON FUNCTION move_property_to_archive IS 'Moves property from soft delete to archive (called by automated job)';
COMMENT ON FUNCTION restore_property_from_archive IS 'Restores property from archive back to active state (24-hour SLA)';
COMMENT ON FUNCTION permanently_delete_archived_property IS 'Permanently deletes archived property after retention period';

