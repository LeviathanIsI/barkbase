-- Seed Permission Profiles
-- Standard profiles for pet boarding/daycare operations
-- Based on common roles in BarkBase: Front Desk, Care Staff, Managers, Owners

-- Insert standard permission profiles
INSERT INTO "PermissionProfile" (
    "profile_name",
    "profile_key",
    "description",
    "profile_type",
    "hierarchy_level",
    "display_order",
    "icon",
    "color",
    "is_global",
    "created_by"
)
VALUES
(
    'Owners',
    'owners',
    'Full administrative access to all properties and data. Can configure permissions and manage system settings.',
    'system',
    4,
    1,
    'crown',
    '#7c3aed',
    TRUE,
    'system'
),
(
    'Managers',
    'managers',
    'Supervisory access with ability to view all data and manage operations. Can access financial and sensitive information.',
    'system',
    3,
    2,
    'briefcase',
    '#2563eb',
    TRUE,
    'system'
),
(
    'Front Desk',
    'front_desk',
    'Customer-facing role with access to bookings, check-in/check-out, and customer information. Limited financial access.',
    'system',
    2,
    3,
    'desk',
    '#10b981',
    TRUE,
    'system'
),
(
    'Care Staff',
    'care_staff',
    'Animal care role with access to pet information, medical notes, incidents, and daily care tasks. No financial access.',
    'system',
    1,
    4,
    'heart',
    '#f59e0b',
    TRUE,
    'system'
)
ON CONFLICT ("profile_key") DO UPDATE SET
    "profile_name" = EXCLUDED."profile_name",
    "description" = EXCLUDED."description",
    "modified_date" = NOW();

-- Set up profile hierarchy (Owners > Managers > Front Desk > Care Staff)
UPDATE "PermissionProfile"
SET "parent_profile_id" = (
    SELECT "profile_id" FROM "PermissionProfile" WHERE "profile_key" = 'owners'
)
WHERE "profile_key" = 'managers';

UPDATE "PermissionProfile"
SET "parent_profile_id" = (
    SELECT "profile_id" FROM "PermissionProfile" WHERE "profile_key" = 'managers'
)
WHERE "profile_key" = 'front_desk';

UPDATE "PermissionProfile"
SET "parent_profile_id" = (
    SELECT "profile_id" FROM "PermissionProfile" WHERE "profile_key" = 'managers'
)
WHERE "profile_key" = 'care_staff';

-- Create default property permissions for each profile
-- These will be used as templates when creating new properties

-- Helper function to set property permissions for a profile
CREATE OR REPLACE FUNCTION seed_property_permissions_for_profile(
    p_profile_key VARCHAR(50),
    p_object_type VARCHAR(50),
    p_field_pattern TEXT,
    p_access_level VARCHAR(50)
)
RETURNS INTEGER AS $$
DECLARE
    v_profile_id INTEGER;
    v_property_record RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Get profile ID
    SELECT "profile_id" INTO v_profile_id
    FROM "PermissionProfile"
    WHERE "profile_key" = p_profile_key;
    
    IF v_profile_id IS NULL THEN
        RAISE NOTICE 'Profile % not found', p_profile_key;
        RETURN 0;
    END IF;
    
    -- Insert permissions for matching properties
    FOR v_property_record IN
        SELECT "property_id"
        FROM "PropertyMetadata"
        WHERE "object_type" = p_object_type
          AND "property_name" SIMILAR TO p_field_pattern
          AND "is_deleted" = FALSE
    LOOP
        INSERT INTO "PropertyPermission" (
            "property_id",
            "profile_id",
            "access_level"
        )
        VALUES (
            v_property_record.property_id,
            v_profile_id,
            p_access_level
        )
        ON CONFLICT ("property_id", "profile_id") DO UPDATE
        SET "access_level" = EXCLUDED."access_level",
            "modified_date" = NOW();
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Seed permissions for OWNERS profile (full access to everything)
DO $$
DECLARE
    v_owner_profile_id INTEGER;
    v_property_record RECORD;
BEGIN
    SELECT "profile_id" INTO v_owner_profile_id
    FROM "PermissionProfile"
    WHERE "profile_key" = 'owners';
    
    FOR v_property_record IN
        SELECT "property_id"
        FROM "PropertyMetadata"
        WHERE "is_deleted" = FALSE
    LOOP
        INSERT INTO "PropertyPermission" (
            "property_id",
            "profile_id",
            "access_level"
        )
        VALUES (
            v_property_record.property_id,
            v_owner_profile_id,
            'read-write'
        )
        ON CONFLICT ("property_id", "profile_id") DO UPDATE
        SET "access_level" = 'read-write',
            "modified_date" = NOW();
    END LOOP;
    
    RAISE NOTICE 'Seeded full access for Owners profile';
END $$;

-- Seed permissions for MANAGERS profile
-- Read-write on most fields, read-only on system fields
DO $$
DECLARE
    v_manager_profile_id INTEGER;
    v_property_record RECORD;
    v_access VARCHAR(50);
BEGIN
    SELECT "profile_id" INTO v_manager_profile_id
    FROM "PermissionProfile"
    WHERE "profile_key" = 'managers';
    
    FOR v_property_record IN
        SELECT "property_id", "property_name", "property_type"
        FROM "PropertyMetadata"
        WHERE "is_deleted" = FALSE
    LOOP
        -- System fields are read-only for managers
        IF v_property_record.property_type = 'system' OR 
           v_property_record.property_name IN ('recordId', 'tenantId', 'createdAt', 'updatedAt', 'createdBy') THEN
            v_access := 'read-only';
        ELSE
            v_access := 'read-write';
        END IF;
        
        INSERT INTO "PropertyPermission" (
            "property_id",
            "profile_id",
            "access_level"
        )
        VALUES (
            v_property_record.property_id,
            v_manager_profile_id,
            v_access
        )
        ON CONFLICT ("property_id", "profile_id") DO UPDATE
        SET "access_level" = EXCLUDED."access_level",
            "modified_date" = NOW();
    END LOOP;
    
    RAISE NOTICE 'Seeded permissions for Managers profile';
END $$;

-- Seed permissions for FRONT DESK profile
-- Read-write on customer-facing fields, hidden on financial/sensitive fields
DO $$
DECLARE
    v_frontdesk_profile_id INTEGER;
    v_property_record RECORD;
    v_access VARCHAR(50);
BEGIN
    SELECT "profile_id" INTO v_frontdesk_profile_id
    FROM "PermissionProfile"
    WHERE "profile_key" = 'front_desk';
    
    FOR v_property_record IN
        SELECT "property_id", "property_name", "property_type", "object_type"
        FROM "PropertyMetadata"
        WHERE "is_deleted" = FALSE
    LOOP
        -- System fields are read-only
        IF v_property_record.property_type = 'system' OR 
           v_property_record.property_name IN ('recordId', 'tenantId', 'createdAt', 'updatedAt') THEN
            v_access := 'read-only';
        
        -- Financial fields are read-only (can view but not edit)
        ELSIF v_property_record.property_name SIMILAR TO '%(Cents|Rate|Price|Cost|Fee|Balance|Total|Amount)%' THEN
            v_access := 'read-only';
        
        -- Medical/incident fields are read-only (care staff domain)
        ELSIF v_property_record.property_name IN ('medicalNotes', 'allergies', 'medications', 'vetNotes', 'behaviorFlags') 
           OR v_property_record.object_type IN ('vaccinations', 'incidents') THEN
            v_access := 'read-only';
        
        -- Everything else is read-write
        ELSE
            v_access := 'read-write';
        END IF;
        
        INSERT INTO "PropertyPermission" (
            "property_id",
            "profile_id",
            "access_level"
        )
        VALUES (
            v_property_record.property_id,
            v_frontdesk_profile_id,
            v_access
        )
        ON CONFLICT ("property_id", "profile_id") DO UPDATE
        SET "access_level" = EXCLUDED."access_level",
            "modified_date" = NOW();
    END LOOP;
    
    RAISE NOTICE 'Seeded permissions for Front Desk profile';
END $$;

-- Seed permissions for CARE STAFF profile
-- Read-write on pet care fields, hidden on financial fields
DO $$
DECLARE
    v_carestaff_profile_id INTEGER;
    v_property_record RECORD;
    v_access VARCHAR(50);
BEGIN
    SELECT "profile_id" INTO v_carestaff_profile_id
    FROM "PermissionProfile"
    WHERE "profile_key" = 'care_staff';
    
    FOR v_property_record IN
        SELECT "property_id", "property_name", "property_type", "object_type"
        FROM "PropertyMetadata"
        WHERE "is_deleted" = FALSE
    LOOP
        -- System fields are read-only
        IF v_property_record.property_type = 'system' OR 
           v_property_record.property_name IN ('recordId', 'tenantId', 'createdAt', 'updatedAt') THEN
            v_access := 'read-only';
        
        -- Financial fields are hidden
        ELSIF v_property_record.property_name SIMILAR TO '%(Cents|Rate|Price|Cost|Fee|Balance|Total|Amount)%' 
           OR v_property_record.object_type IN ('payments', 'invoices', 'packages', 'memberships') THEN
            v_access := 'hidden';
        
        -- Pet care, medical, and incident fields are read-write
        ELSIF v_property_record.object_type IN ('pets', 'vaccinations', 'incidents', 'notes') 
           OR v_property_record.property_name IN ('medicalNotes', 'allergies', 'medications', 'dietaryNotes', 'behaviorFlags', 'specialInstructions') THEN
            v_access := 'read-write';
        
        -- Booking information is read-only (can view but not change)
        ELSIF v_property_record.object_type = 'bookings' THEN
            v_access := 'read-only';
        
        -- Everything else is read-only by default
        ELSE
            v_access := 'read-only';
        END IF;
        
        INSERT INTO "PropertyPermission" (
            "property_id",
            "profile_id",
            "access_level"
        )
        VALUES (
            v_property_record.property_id,
            v_carestaff_profile_id,
            v_access
        )
        ON CONFLICT ("property_id", "profile_id") DO UPDATE
        SET "access_level" = EXCLUDED."access_level",
            "modified_date" = NOW();
    END LOOP;
    
    RAISE NOTICE 'Seeded permissions for Care Staff profile';
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS seed_property_permissions_for_profile;

-- Summary report
DO $$
DECLARE
    v_profile RECORD;
    v_perm_count RECORD;
BEGIN
    RAISE NOTICE '=== Permission Profile Seeding Complete ===';
    
    FOR v_profile IN
        SELECT * FROM "PermissionProfile" WHERE "is_global" = TRUE ORDER BY "hierarchy_level" DESC
    LOOP
        SELECT 
            COUNT(*) FILTER (WHERE "access_level" = 'read-write') AS rw_count,
            COUNT(*) FILTER (WHERE "access_level" = 'read-only') AS ro_count,
            COUNT(*) FILTER (WHERE "access_level" = 'hidden') AS hidden_count,
            COUNT(*) AS total_count
        INTO v_perm_count
        FROM "PropertyPermission"
        WHERE "profile_id" = v_profile.profile_id;
        
        RAISE NOTICE 'Profile: % (Level %) - RW: %, RO: %, Hidden: %, Total: %',
            v_profile.profile_name,
            v_profile.hierarchy_level,
            v_perm_count.rw_count,
            v_perm_count.ro_count,
            v_perm_count.hidden_count,
            v_perm_count.total_count;
    END LOOP;
    
    RAISE NOTICE '==========================================';
END $$;

