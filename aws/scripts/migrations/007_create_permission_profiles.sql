-- Permission Profiles for Field-Level Security (FLS)
-- Implements Salesforce-style field-level permissions per user profile
-- Three-tier access: read-write, read-only, hidden

-- Permission Profiles Table
CREATE TABLE IF NOT EXISTS "PermissionProfile" (
    "profile_id" SERIAL PRIMARY KEY,
    "profile_name" VARCHAR(100) NOT NULL UNIQUE,
    "profile_key" VARCHAR(50) NOT NULL UNIQUE,
    "description" TEXT,
    
    -- Profile Hierarchy
    "parent_profile_id" INTEGER,
    "hierarchy_level" INTEGER DEFAULT 1,
    "inherits_from_parent" BOOLEAN DEFAULT FALSE,
    
    -- Profile Type
    "profile_type" VARCHAR(50) CHECK ("profile_type" IN ('system', 'custom')) DEFAULT 'system',
    "is_active" BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    "created_date" TIMESTAMP DEFAULT NOW(),
    "created_by" VARCHAR(100) DEFAULT 'system',
    "modified_date" TIMESTAMP DEFAULT NOW(),
    "modified_by" VARCHAR(100),
    
    -- Tenant Association
    "tenant_id" TEXT,
    "is_global" BOOLEAN DEFAULT TRUE,
    
    -- Display
    "display_order" INTEGER DEFAULT 0,
    "icon" VARCHAR(50),
    "color" VARCHAR(20),
    
    FOREIGN KEY ("parent_profile_id") REFERENCES "PermissionProfile"("profile_id") ON DELETE SET NULL,
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("recordId") ON DELETE CASCADE
);

-- User-to-Profile Assignment Table
CREATE TABLE IF NOT EXISTS "UserProfileAssignment" (
    "assignment_id" SERIAL PRIMARY KEY,
    "user_id" VARCHAR(36) NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "tenant_id" TEXT NOT NULL,
    
    -- Assignment Period
    "assigned_at" TIMESTAMP DEFAULT NOW(),
    "assigned_by" VARCHAR(100),
    "expires_at" TIMESTAMP,
    "is_active" BOOLEAN DEFAULT TRUE,
    
    -- Primary Profile Flag
    "is_primary" BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    "assignment_reason" TEXT,
    
    FOREIGN KEY ("profile_id") REFERENCES "PermissionProfile"("profile_id") ON DELETE CASCADE,
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    
    -- User can have multiple profiles per tenant, but only one primary
    CONSTRAINT "unique_primary_per_user_tenant" UNIQUE ("user_id", "tenant_id", "is_primary") 
        DEFERRABLE INITIALLY DEFERRED
);

-- Property-Level Permissions Table
CREATE TABLE IF NOT EXISTS "PropertyPermission" (
    "permission_id" SERIAL PRIMARY KEY,
    "property_id" VARCHAR(36) NOT NULL,
    "profile_id" INTEGER NOT NULL,
    
    -- Permission Level
    "access_level" VARCHAR(50) NOT NULL CHECK ("access_level" IN ('read-write', 'read-only', 'hidden')),
    
    -- Conditional Access (optional - for advanced use cases)
    "conditional_access" JSONB,
    "condition_formula" TEXT,
    
    -- Metadata
    "created_date" TIMESTAMP DEFAULT NOW(),
    "modified_date" TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY ("property_id") REFERENCES "PropertyMetadata"("property_id") ON DELETE CASCADE,
    FOREIGN KEY ("profile_id") REFERENCES "PermissionProfile"("profile_id") ON DELETE CASCADE,
    
    CONSTRAINT "unique_property_profile" UNIQUE ("property_id", "profile_id")
);

-- Cached Effective Permissions (for performance)
CREATE TABLE IF NOT EXISTS "EffectivePermissionCache" (
    "cache_id" BIGSERIAL PRIMARY KEY,
    "user_id" VARCHAR(36) NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "property_id" VARCHAR(36) NOT NULL,
    
    -- Effective Access (result of profile inheritance + property permissions)
    "effective_access" VARCHAR(50) NOT NULL,
    
    -- Cache Metadata
    "calculated_at" TIMESTAMP DEFAULT NOW(),
    "expires_at" TIMESTAMP DEFAULT (NOW() + INTERVAL '1 hour'),
    "is_valid" BOOLEAN DEFAULT TRUE,
    
    -- Source Profile IDs (for debugging)
    "source_profiles" JSONB,
    
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    FOREIGN KEY ("property_id") REFERENCES "PropertyMetadata"("property_id") ON DELETE CASCADE,
    
    CONSTRAINT "unique_user_tenant_property" UNIQUE ("user_id", "tenant_id", "property_id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_permission_profile_tenant" ON "PermissionProfile"("tenant_id") WHERE "tenant_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_permission_profile_key" ON "PermissionProfile"("profile_key", "tenant_id");
CREATE INDEX IF NOT EXISTS "idx_permission_profile_hierarchy" ON "PermissionProfile"("parent_profile_id", "hierarchy_level");

CREATE INDEX IF NOT EXISTS "idx_user_profile_assignment_user" ON "UserProfileAssignment"("user_id", "tenant_id", "is_active") WHERE "is_active" = TRUE;
CREATE INDEX IF NOT EXISTS "idx_user_profile_assignment_profile" ON "UserProfileAssignment"("profile_id", "is_active") WHERE "is_active" = TRUE;
CREATE INDEX IF NOT EXISTS "idx_user_profile_assignment_primary" ON "UserProfileAssignment"("user_id", "tenant_id", "is_primary") WHERE "is_primary" = TRUE;

CREATE INDEX IF NOT EXISTS "idx_property_permission_property" ON "PropertyPermission"("property_id");
CREATE INDEX IF NOT EXISTS "idx_property_permission_profile" ON "PropertyPermission"("profile_id");
CREATE INDEX IF NOT EXISTS "idx_property_permission_access" ON "PropertyPermission"("access_level");

CREATE INDEX IF NOT EXISTS "idx_effective_permission_cache_user" ON "EffectivePermissionCache"("user_id", "tenant_id", "is_valid") WHERE "is_valid" = TRUE;
CREATE INDEX IF NOT EXISTS "idx_effective_permission_cache_expires" ON "EffectivePermissionCache"("expires_at") WHERE "is_valid" = TRUE;

-- Function to invalidate permission cache
CREATE OR REPLACE FUNCTION invalidate_permission_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Invalidate cache for affected property
    IF TG_TABLE_NAME = 'PropertyPermission' THEN
        UPDATE "EffectivePermissionCache"
        SET "is_valid" = false
        WHERE "property_id" = COALESCE(NEW."property_id", OLD."property_id");
    END IF;
    
    -- Invalidate cache for affected user/profile
    IF TG_TABLE_NAME = 'UserProfileAssignment' THEN
        UPDATE "EffectivePermissionCache"
        SET "is_valid" = false
        WHERE "user_id" = COALESCE(NEW."user_id", OLD."user_id")
          AND "tenant_id" = COALESCE(NEW."tenant_id", OLD."tenant_id");
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to invalidate cache
CREATE TRIGGER trigger_invalidate_cache_on_property_permission
    AFTER INSERT OR UPDATE OR DELETE ON "PropertyPermission"
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_permission_cache();

CREATE TRIGGER trigger_invalidate_cache_on_user_profile_assignment
    AFTER INSERT OR UPDATE OR DELETE ON "UserProfileAssignment"
    FOR EACH ROW
    EXECUTE FUNCTION invalidate_permission_cache();

-- Function to calculate effective permissions
CREATE OR REPLACE FUNCTION calculate_effective_permission(
    p_user_id VARCHAR(36),
    p_tenant_id TEXT,
    p_property_id VARCHAR(36)
)
RETURNS VARCHAR(50) AS $$
DECLARE
    effective_access VARCHAR(50);
    user_profiles INTEGER[];
BEGIN
    -- Get all active profiles for user
    SELECT array_agg("profile_id" ORDER BY "is_primary" DESC)
    INTO user_profiles
    FROM "UserProfileAssignment"
    WHERE "user_id" = p_user_id
      AND "tenant_id" = p_tenant_id
      AND "is_active" = TRUE
      AND (expires_at IS NULL OR "expires_at" > NOW());
    
    IF user_profiles IS NULL OR array_length(user_profiles, 1) = 0 THEN
        -- No profiles assigned, default to read-only
        RETURN 'read-only';
    END IF;
    
    -- Get most permissive access level across all profiles
    -- Hierarchy: read-write > read-only > hidden
    SELECT 
        CASE 
            WHEN bool_or("access_level" = 'read-write') THEN 'read-write'
            WHEN bool_or("access_level" = 'read-only') THEN 'read-only'
            ELSE 'hidden'
        END
    INTO effective_access
    FROM "PropertyPermission"
    WHERE "property_id" = p_property_id
      AND "profile_id" = ANY(user_profiles);
    
    -- If no explicit permission, check property's default permission_profiles
    IF effective_access IS NULL THEN
        SELECT 
            CASE
                WHEN bool_or(value::text = 'read-write') THEN 'read-write'
                WHEN bool_or(value::text = 'read-only') THEN 'read-only'
                ELSE 'hidden'
            END
        INTO effective_access
        FROM "PropertyMetadata" pm
        CROSS JOIN LATERAL jsonb_each(pm."permission_profiles") AS perm
        INNER JOIN "PermissionProfile" pp ON pp."profile_key" = perm.key
        WHERE pm."property_id" = p_property_id
          AND pp."profile_id" = ANY(user_profiles);
    END IF;
    
    -- Final fallback: read-only
    RETURN COALESCE(effective_access, 'read-only');
END;
$$ LANGUAGE plpgsql;

-- Function to get all accessible properties for a user
CREATE OR REPLACE FUNCTION get_accessible_properties(
    p_user_id VARCHAR(36),
    p_tenant_id TEXT,
    p_object_type VARCHAR(50) DEFAULT NULL,
    p_min_access VARCHAR(50) DEFAULT 'read-only'
)
RETURNS TABLE (
    property_id VARCHAR(36),
    property_name VARCHAR(255),
    effective_access VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm."property_id",
        pm."property_name",
        calculate_effective_permission(p_user_id, p_tenant_id, pm."property_id") AS effective_access
    FROM "PropertyMetadata" pm
    WHERE (pm."tenant_id" = p_tenant_id OR pm."is_global" = TRUE)
      AND pm."is_deleted" = FALSE
      AND (p_object_type IS NULL OR pm."object_type" = p_object_type)
    HAVING calculate_effective_permission(p_user_id, p_tenant_id, pm."property_id") != 'hidden'
      AND (
        (p_min_access = 'read-only' AND calculate_effective_permission(p_user_id, p_tenant_id, pm."property_id") IN ('read-only', 'read-write'))
        OR (p_min_access = 'read-write' AND calculate_effective_permission(p_user_id, p_tenant_id, pm."property_id") = 'read-write')
      );
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE "PermissionProfile" IS 'User profiles with field-level security permissions (Salesforce-style FLS)';
COMMENT ON TABLE "UserProfileAssignment" IS 'Assigns users to permission profiles with support for multiple profiles and inheritance';
COMMENT ON TABLE "PropertyPermission" IS 'Explicit field-level permissions per property and profile';
COMMENT ON TABLE "EffectivePermissionCache" IS 'Performance cache for calculated effective permissions (1-hour TTL)';
COMMENT ON FUNCTION calculate_effective_permission IS 'Calculates effective permission for user on specific property considering profile inheritance';
COMMENT ON FUNCTION get_accessible_properties IS 'Returns all properties accessible to a user with their effective permissions';

