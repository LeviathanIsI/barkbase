-- Property Dependencies Table
-- Tracks all property relationships for dependency graph and impact analysis
-- Implements Salesforce MetadataComponentDependency pattern

CREATE TABLE IF NOT EXISTS "PropertyDependencies" (
    "dependency_id" SERIAL PRIMARY KEY,
    
    -- Relationship
    "source_property_id" VARCHAR(36) NOT NULL,
    "dependent_property_id" VARCHAR(36) NOT NULL,
    
    -- Dependency Classification
    "dependency_type" VARCHAR(50) NOT NULL CHECK ("dependency_type" IN (
        'formula',           -- Dependent property calculates from source
        'validation',        -- Validation rule references source
        'workflow',          -- Workflow condition/action uses source
        'lookup',            -- Dependent property is FK to source object
        'rollup',            -- Dependent property aggregates from source
        'form',              -- Form field visibility depends on source
        'report',            -- Report filter/column uses source
        'api_integration',   -- External integration depends on source
        'conditional_logic', -- Conditional logic references source
        'default_value'      -- Default value formula references source
    )),
    
    -- Context (stores additional information about the dependency)
    "dependency_context" JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    "created_date" TIMESTAMP DEFAULT NOW(),
    "is_active" BOOLEAN DEFAULT TRUE,
    "is_system_discovered" BOOLEAN DEFAULT FALSE,
    
    -- Dependency Strength (for impact analysis)
    "is_critical" BOOLEAN DEFAULT FALSE,
    "break_on_source_delete" BOOLEAN DEFAULT TRUE,
    
    -- Audit
    "discovered_at" TIMESTAMP DEFAULT NOW(),
    "discovered_by" VARCHAR(100) DEFAULT 'system',
    "last_validated" TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY ("source_property_id") REFERENCES "PropertyMetadata"("property_id") ON DELETE CASCADE,
    FOREIGN KEY ("dependent_property_id") REFERENCES "PropertyMetadata"("property_id") ON DELETE CASCADE,
    
    -- Prevent self-dependencies
    CHECK ("source_property_id" != "dependent_property_id"),
    
    -- Unique constraint per dependency type
    CONSTRAINT "unique_dependency" UNIQUE ("source_property_id", "dependent_property_id", "dependency_type")
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS "idx_property_deps_source" ON "PropertyDependencies"("source_property_id", "is_active") WHERE "is_active" = TRUE;
CREATE INDEX IF NOT EXISTS "idx_property_deps_dependent" ON "PropertyDependencies"("dependent_property_id", "is_active") WHERE "is_active" = TRUE;
CREATE INDEX IF NOT EXISTS "idx_property_deps_type" ON "PropertyDependencies"("dependency_type");
CREATE INDEX IF NOT EXISTS "idx_property_deps_critical" ON "PropertyDependencies"("source_property_id", "is_critical") WHERE "is_critical" = TRUE;

-- GIN Index for JSONB context searches
CREATE INDEX IF NOT EXISTS "idx_property_deps_context" ON "PropertyDependencies" USING GIN ("dependency_context");

-- Function to detect circular dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency()
RETURNS TRIGGER AS $$
DECLARE
    cycle_exists BOOLEAN;
BEGIN
    -- Use recursive CTE to detect cycles
    WITH RECURSIVE dependency_chain AS (
        -- Start with the new dependency
        SELECT 
            NEW."source_property_id" AS source,
            NEW."dependent_property_id" AS dependent,
            1 AS depth,
            ARRAY[NEW."source_property_id", NEW."dependent_property_id"] AS path
        
        UNION ALL
        
        -- Follow the chain
        SELECT 
            dc.source,
            pd."dependent_property_id",
            dc.depth + 1,
            dc.path || pd."dependent_property_id"
        FROM dependency_chain dc
        INNER JOIN "PropertyDependencies" pd 
            ON pd."source_property_id" = dc.dependent 
            AND pd."is_active" = TRUE
        WHERE 
            dc.depth < 50  -- Prevent infinite loops
            AND NOT (pd."dependent_property_id" = ANY(dc.path))  -- Prevent revisiting nodes
    )
    SELECT EXISTS (
        SELECT 1 
        FROM dependency_chain 
        WHERE dependent = NEW."source_property_id"
    ) INTO cycle_exists;
    
    IF cycle_exists THEN
        RAISE EXCEPTION 'Circular dependency detected: Adding this dependency would create a cycle';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_circular_dependency
    BEFORE INSERT OR UPDATE ON "PropertyDependencies"
    FOR EACH ROW
    EXECUTE FUNCTION check_circular_dependency();

-- Function to calculate dependency depth
CREATE OR REPLACE FUNCTION calculate_dependency_depth(prop_id VARCHAR(36))
RETURNS INTEGER AS $$
DECLARE
    max_depth INTEGER;
BEGIN
    WITH RECURSIVE dependency_chain AS (
        SELECT 
            "source_property_id",
            "dependent_property_id",
            1 AS depth
        FROM "PropertyDependencies"
        WHERE "source_property_id" = prop_id
            AND "is_active" = TRUE
        
        UNION ALL
        
        SELECT 
            dc."source_property_id",
            pd."dependent_property_id",
            dc.depth + 1
        FROM dependency_chain dc
        INNER JOIN "PropertyDependencies" pd 
            ON pd."source_property_id" = dc."dependent_property_id"
            AND pd."is_active" = TRUE
        WHERE dc.depth < 50
    )
    SELECT COALESCE(MAX(depth), 0) INTO max_depth
    FROM dependency_chain;
    
    RETURN max_depth;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE "PropertyDependencies" IS 'Directed acyclic graph (DAG) of property relationships for impact analysis and cascade operations';
COMMENT ON COLUMN "PropertyDependencies"."dependency_type" IS 'Type of dependency relationship between properties';
COMMENT ON COLUMN "PropertyDependencies"."dependency_context" IS 'Additional context: formula expression, workflow ID, form ID, etc.';
COMMENT ON COLUMN "PropertyDependencies"."is_critical" IS 'TRUE if dependency break would cause system failure (e.g., required FK)';
COMMENT ON COLUMN "PropertyDependencies"."is_system_discovered" IS 'TRUE if automatically discovered, FALSE if manually declared';

