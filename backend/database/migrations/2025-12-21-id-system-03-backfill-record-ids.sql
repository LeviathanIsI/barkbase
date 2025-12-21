-- ============================================================================
-- BarkBase ID System Migration - Part 3: Backfill record_id Values
-- ============================================================================
-- This migration:
-- 1. Assigns sequential record_id values to existing records (per tenant)
-- 2. Updates TenantSequence with the max values used
-- 3. Sets record_id to NOT NULL on all tables
--
-- IMPORTANT: Run this migration during a maintenance window as it touches
-- every row in every migrated table.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Helper function to backfill record_ids for a table
-- ============================================================================
CREATE OR REPLACE FUNCTION backfill_record_ids(
    p_table_name TEXT,
    p_object_type_code INTEGER
) RETURNS VOID AS $$
DECLARE
    v_sql TEXT;
BEGIN
    -- Backfill record_id with per-tenant sequential values
    v_sql := format(
        'WITH numbered AS (
            SELECT
                id,
                tenant_id,
                ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) as rn
            FROM "%I"
            WHERE record_id IS NULL
        )
        UPDATE "%I" t
        SET record_id = n.rn
        FROM numbered n
        WHERE t.id = n.id',
        p_table_name, p_table_name
    );

    EXECUTE v_sql;

    -- Update TenantSequence with max values
    v_sql := format(
        'INSERT INTO "TenantSequence" (tenant_id, object_type_code, last_record_id)
        SELECT tenant_id, %L, COALESCE(MAX(record_id), 0)
        FROM "%I"
        WHERE record_id IS NOT NULL
        GROUP BY tenant_id
        ON CONFLICT (tenant_id, object_type_code)
        DO UPDATE SET last_record_id = GREATEST("TenantSequence".last_record_id, EXCLUDED.last_record_id)',
        p_object_type_code, p_table_name
    );

    EXECUTE v_sql;

    RAISE NOTICE 'Backfilled record_ids for table: %', p_table_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Backfill Core CRM Objects
-- ============================================================================
SELECT backfill_record_ids('Owner', 1);
SELECT backfill_record_ids('Pet', 2);
SELECT backfill_record_ids('Booking', 3);
SELECT backfill_record_ids('Payment', 4);
SELECT backfill_record_ids('Invoice', 5);
SELECT backfill_record_ids('InvoiceLine', 6);
SELECT backfill_record_ids('Task', 7);
SELECT backfill_record_ids('Note', 8);
SELECT backfill_record_ids('Vaccination', 9);
SELECT backfill_record_ids('Incident', 10);
SELECT backfill_record_ids('Veterinarian', 11);

-- ============================================================================
-- Backfill Workflow Objects (with existence checks)
-- ============================================================================
DO $$ BEGIN
    PERFORM backfill_record_ids('Workflow', 20);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('WorkflowStep', 21);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('WorkflowExecution', 22);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('WorkflowExecutionLog', 23);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('WorkflowFolder', 24);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('WorkflowRevision', 25);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('WorkflowTemplate', 26);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- Backfill Segment Objects
-- ============================================================================
SELECT backfill_record_ids('Segment', 27);
SELECT backfill_record_ids('SegmentMember', 28);

DO $$ BEGIN
    PERFORM backfill_record_ids('SegmentActivity', 29);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- Backfill Service Objects
-- ============================================================================
SELECT backfill_record_ids('Service', 30);
SELECT backfill_record_ids('Package', 31);

-- ============================================================================
-- Backfill Facility Objects
-- ============================================================================
SELECT backfill_record_ids('Run', 40);
SELECT backfill_record_ids('Kennel', 41);

DO $$ BEGIN
    PERFORM backfill_record_ids('RunTemplate', 42);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

SELECT backfill_record_ids('RunAssignment', 43);

-- ============================================================================
-- Backfill User/Staff Objects
-- ============================================================================
SELECT backfill_record_ids('User', 50);

DO $$ BEGIN
    PERFORM backfill_record_ids('Staff', 51);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

SELECT backfill_record_ids('Role', 52);
SELECT backfill_record_ids('UserRole', 53);
SELECT backfill_record_ids('UserSession', 54);

DO $$ BEGIN
    PERFORM backfill_record_ids('TimeEntry', 55);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('TimePunch', 56);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- Backfill Communication Objects
-- ============================================================================
DO $$ BEGIN
    PERFORM backfill_record_ids('Conversation', 60);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('Message', 61);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

SELECT backfill_record_ids('Notification', 62);

DO $$ BEGIN
    PERFORM backfill_record_ids('EmailTemplate', 63);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- Backfill Configuration Objects
-- ============================================================================
DO $$ BEGIN
    PERFORM backfill_record_ids('CustomProperty', 70);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('ObjectSettings', 71);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('ObjectAssociation', 72);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('ObjectPipeline', 73);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('PipelineStage', 74);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('ObjectStatus', 75);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('SavedView', 76);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('AssociationLabel', 77);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- Backfill Property System Objects
-- ============================================================================
DO $$ BEGIN
    PERFORM backfill_record_ids('Property', 80);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('PropertyGroup', 81);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('PropertyLogicRule', 82);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('PropertyValue', 83);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('PropertyTemplate', 84);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('PropertyHistory', 85);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- Backfill System Objects
-- ============================================================================
SELECT backfill_record_ids('AuditLog', 90);
SELECT backfill_record_ids('DeletedRecord', 91);

DO $$ BEGIN
    PERFORM backfill_record_ids('Import', 92);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    PERFORM backfill_record_ids('Activity', 93);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- Set record_id to NOT NULL on tables that have data
-- ============================================================================
-- Note: We only set NOT NULL on tables that must have data. Empty tables
-- will have it set when the first record is inserted.

-- Core tables - always exist and should have NOT NULL
ALTER TABLE "Owner" ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE "Pet" ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE "Service" ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE "Kennel" ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE "Run" ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE "Role" ALTER COLUMN record_id SET NOT NULL;
ALTER TABLE "Segment" ALTER COLUMN record_id SET NOT NULL;

-- These may have records or be empty - conditionally set NOT NULL
DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'Payment', 'Invoice', 'InvoiceLine', 'Task', 'Note', 'Vaccination',
        'Incident', 'Veterinarian', 'Package', 'RunAssignment', 'UserRole',
        'UserSession', 'Notification', 'SegmentMember', 'AuditLog', 'DeletedRecord'
    ];
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY v_tables LOOP
        EXECUTE format('ALTER TABLE "%I" ALTER COLUMN record_id SET NOT NULL', v_table);
    END LOOP;
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS backfill_record_ids(TEXT, INTEGER);

COMMIT;
