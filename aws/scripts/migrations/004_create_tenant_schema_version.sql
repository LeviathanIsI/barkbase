-- Tenant Schema Version Table
-- Tracks per-tenant schema versions for zero-downtime migrations
-- Implements Expand-Contract migration pattern with staged rollout

CREATE TABLE IF NOT EXISTS "TenantSchemaVersion" (
    "tenant_id" TEXT PRIMARY KEY,
    
    -- Version Tracking
    "current_schema_version" INTEGER NOT NULL DEFAULT 1,
    "target_schema_version" INTEGER,
    "previous_schema_version" INTEGER,
    
    -- Migration Status
    "migration_status" VARCHAR(50) CHECK ("migration_status" IN (
        'current',           -- Running on current version, no migration
        'pending',           -- Migration scheduled but not started
        'expanding',         -- Phase 1: Adding new schema alongside old
        'migrating',         -- Phase 2: Dual-write and validation
        'contracting',       -- Phase 3: Removing old schema
        'completed',         -- Migration successfully completed
        'failed',            -- Migration failed
        'rolling_back',      -- Rolling back to previous version
        'rolled_back'        -- Successfully rolled back
    )) DEFAULT 'current',
    
    -- Migration Timestamps
    "migration_scheduled_at" TIMESTAMP,
    "migration_started_at" TIMESTAMP,
    "migration_completed_at" TIMESTAMP,
    "migration_duration_seconds" INTEGER,
    
    -- Rollout Group (for staged deployment)
    "rollout_group" VARCHAR(50) CHECK ("rollout_group" IN (
        'internal',          -- Group 1: Internal testing (1-2 tenants)
        'beta',              -- Group 2: Beta program (10%)
        'standard',          -- Group 3: Standard rollout (70%)
        'enterprise'         -- Group 4: Enterprise customers (20%)
    )),
    "rollout_priority" INTEGER DEFAULT 3,  -- Higher = deploy later
    
    -- Error Tracking
    "migration_error" TEXT,
    "error_count" INTEGER DEFAULT 0,
    "last_error_at" TIMESTAMP,
    
    -- Compatibility
    "supports_schema_versions" JSONB DEFAULT '[1]'::jsonb,  -- Array of compatible versions
    "requires_app_version" VARCHAR(50),  -- Minimum app version required
    
    -- Feature Flags (control which schema version is active)
    "feature_flags" JSONB DEFAULT '{}'::jsonb,
    "use_new_schema" BOOLEAN DEFAULT FALSE,
    
    -- Rollback Window
    "rollback_window_until" TIMESTAMP,  -- 30-minute revert window
    "rollback_enabled" BOOLEAN DEFAULT TRUE,
    "rollback_reason" TEXT,
    
    -- Health Monitoring
    "health_check_passed" BOOLEAN DEFAULT TRUE,
    "last_health_check" TIMESTAMP,
    "error_rate" DECIMAL(5,2) DEFAULT 0.00,  -- Percentage
    
    -- Metadata
    "updated_at" TIMESTAMP DEFAULT NOW(),
    "updated_by" VARCHAR(100),
    
    -- Notes
    "migration_notes" TEXT,
    
    -- Foreign Keys
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("recordId") ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_tenant_version_status" ON "TenantSchemaVersion"("migration_status");
CREATE INDEX IF NOT EXISTS "idx_tenant_version_group" ON "TenantSchemaVersion"("rollout_group", "rollout_priority");
CREATE INDEX IF NOT EXISTS "idx_tenant_version_current" ON "TenantSchemaVersion"("current_schema_version");
CREATE INDEX IF NOT EXISTS "idx_tenant_version_rollback" ON "TenantSchemaVersion"("rollback_window_until") WHERE "rollback_enabled" = TRUE AND "rollback_window_until" > NOW();
CREATE INDEX IF NOT EXISTS "idx_tenant_version_health" ON "TenantSchemaVersion"("health_check_passed", "error_rate") WHERE "health_check_passed" = FALSE OR "error_rate" > 5.0;

-- GIN Index for feature flags
CREATE INDEX IF NOT EXISTS "idx_tenant_version_flags" ON "TenantSchemaVersion" USING GIN ("feature_flags");

-- Schema Version Registry (tracks all available schema versions)
CREATE TABLE IF NOT EXISTS "SchemaVersionRegistry" (
    "version_number" INTEGER PRIMARY KEY,
    "version_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    
    -- Release Information
    "released_at" TIMESTAMP DEFAULT NOW(),
    "deprecated_at" TIMESTAMP,
    "end_of_life_at" TIMESTAMP,
    
    -- Compatibility Matrix
    "compatible_with_versions" JSONB DEFAULT '[]'::jsonb,
    "breaking_changes" JSONB DEFAULT '[]'::jsonb,
    
    -- Migration Scripts
    "expand_script" TEXT,
    "migrate_script" TEXT,
    "contract_script" TEXT,
    "rollback_script" TEXT,
    
    -- Requirements
    "requires_app_version" VARCHAR(50),
    "requires_database_features" JSONB DEFAULT '[]'::jsonb,
    
    -- Properties Added/Modified/Removed
    "properties_added" JSONB DEFAULT '[]'::jsonb,
    "properties_modified" JSONB DEFAULT '[]'::jsonb,
    "properties_removed" JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    "is_stable" BOOLEAN DEFAULT FALSE,
    "is_active" BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT "valid_lifecycle" CHECK (
        ("deprecated_at" IS NULL OR "deprecated_at" > "released_at") AND
        ("end_of_life_at" IS NULL OR "end_of_life_at" > COALESCE("deprecated_at", "released_at"))
    )
);

-- Indexes for Schema Version Registry
CREATE INDEX IF NOT EXISTS "idx_schema_registry_active" ON "SchemaVersionRegistry"("version_number") WHERE "is_active" = TRUE;
CREATE INDEX IF NOT EXISTS "idx_schema_registry_stable" ON "SchemaVersionRegistry"("version_number") WHERE "is_stable" = TRUE;

-- Function to update schema version timestamp
CREATE OR REPLACE FUNCTION update_tenant_schema_version_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updated_at" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenant_schema_version_updated
    BEFORE UPDATE ON "TenantSchemaVersion"
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_schema_version_timestamp();

-- Function to automatically set rollback window
CREATE OR REPLACE FUNCTION set_rollback_window()
RETURNS TRIGGER AS $$
BEGIN
    -- Set 30-minute rollback window when migration starts
    IF NEW."migration_status" = 'migrating' AND OLD."migration_status" != 'migrating' THEN
        NEW."rollback_window_until" = NOW() + INTERVAL '30 minutes';
        NEW."rollback_enabled" = TRUE;
    END IF;
    
    -- Clear rollback window when migration completes
    IF NEW."migration_status" = 'completed' THEN
        NEW."rollback_window_until" = NULL;
        NEW."rollback_enabled" = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_rollback_window
    BEFORE UPDATE ON "TenantSchemaVersion"
    FOR EACH ROW
    EXECUTE FUNCTION set_rollback_window();

-- View for migration monitoring dashboard
CREATE OR REPLACE VIEW "MigrationStatusDashboard" AS
SELECT 
    t."recordId" AS "tenant_id",
    t."name" AS "tenant_name",
    tsv."current_schema_version",
    tsv."target_schema_version",
    tsv."migration_status",
    tsv."rollout_group",
    tsv."migration_started_at",
    EXTRACT(EPOCH FROM (NOW() - tsv."migration_started_at"))/60 AS "duration_minutes",
    tsv."health_check_passed",
    tsv."error_rate",
    tsv."error_count",
    CASE 
        WHEN tsv."rollback_window_until" > NOW() THEN 
            EXTRACT(EPOCH FROM (tsv."rollback_window_until" - NOW()))/60
        ELSE 0
    END AS "rollback_window_minutes_remaining",
    tsv."use_new_schema"
FROM "Tenant" t
INNER JOIN "TenantSchemaVersion" tsv ON t."recordId" = tsv."tenant_id"
WHERE tsv."migration_status" NOT IN ('current', 'completed')
ORDER BY tsv."rollout_priority", tsv."migration_started_at";

-- Comments
COMMENT ON TABLE "TenantSchemaVersion" IS 'Per-tenant schema version tracking for zero-downtime Expand-Contract migrations';
COMMENT ON COLUMN "TenantSchemaVersion"."migration_status" IS 'Current state in Expand-Contract pattern: expanding → migrating → contracting → completed';
COMMENT ON COLUMN "TenantSchemaVersion"."rollout_group" IS 'Staged rollout group: internal (1-2) → beta (10%) → standard (70%) → enterprise (20%)';
COMMENT ON COLUMN "TenantSchemaVersion"."rollback_window_until" IS '30-minute window for instant rollback after migration starts';
COMMENT ON COLUMN "TenantSchemaVersion"."use_new_schema" IS 'Feature flag: TRUE = use new schema, FALSE = use old schema (dual-write continues)';
COMMENT ON TABLE "SchemaVersionRegistry" IS 'Registry of all available schema versions with migration scripts and compatibility matrix';

