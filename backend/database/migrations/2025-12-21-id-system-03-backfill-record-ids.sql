-- ============================================================================
-- BarkBase ID System Migration - Part 3: Backfill record_id Values
-- ============================================================================
-- This migration assigns sequential record_id values to existing records.
--
-- IMPORTANT:
-- - Tables WITH tenant_id: record_id is per-tenant sequential
-- - Tables WITHOUT tenant_id: record_id is globally sequential per table
-- - Some tables inherit tenant isolation via parent FK (no direct tenant_id)
--
-- Run this AFTER migration 02 (add-record-id-columns).
-- ============================================================================

-- ============================================================================
-- Helper: Backfill record_ids for tables WITH tenant_id
-- ============================================================================
CREATE OR REPLACE FUNCTION backfill_record_ids_with_tenant(
    p_table_name TEXT,
    p_object_type_code INTEGER
) RETURNS VOID AS $$
DECLARE
    v_sql TEXT;
    v_count INTEGER;
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = p_table_name) THEN
        RAISE NOTICE 'Table % does not exist, skipping', p_table_name;
        RETURN;
    END IF;

    -- Check if record_id column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = p_table_name AND column_name = 'record_id'
    ) THEN
        RAISE NOTICE 'Table % does not have record_id column, skipping', p_table_name;
        RETURN;
    END IF;

    -- Check if tenant_id column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = p_table_name AND column_name = 'tenant_id'
    ) THEN
        RAISE NOTICE 'Table % does not have tenant_id column, use backfill_record_ids_no_tenant instead', p_table_name;
        RETURN;
    END IF;

    -- Backfill record_id with per-tenant sequential values
    v_sql := format(
        'WITH numbered AS (
            SELECT
                id,
                tenant_id,
                ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) as rn
            FROM %I
            WHERE record_id IS NULL
        )
        UPDATE %I t
        SET record_id = n.rn
        FROM numbered n
        WHERE t.id = n.id',
        p_table_name, p_table_name
    );

    EXECUTE v_sql;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Backfilled % record_ids for table %', v_count, p_table_name;

    -- Update TenantSequence with max values
    v_sql := format(
        'INSERT INTO "TenantSequence" (tenant_id, object_type_code, last_record_id)
        SELECT tenant_id, %s, COALESCE(MAX(record_id), 0)
        FROM %I
        WHERE record_id IS NOT NULL
        GROUP BY tenant_id
        ON CONFLICT (tenant_id, object_type_code)
        DO UPDATE SET last_record_id = GREATEST("TenantSequence".last_record_id, EXCLUDED.last_record_id)',
        p_object_type_code, p_table_name
    );

    EXECUTE v_sql;
    RAISE NOTICE 'Updated TenantSequence for table % (code: %)', p_table_name, p_object_type_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper: Backfill record_ids for tables WITHOUT tenant_id (global sequence)
-- These tables inherit tenant via parent FK
-- ============================================================================
CREATE OR REPLACE FUNCTION backfill_record_ids_no_tenant(
    p_table_name TEXT,
    p_parent_fk_column TEXT,  -- e.g., 'workflow_id', 'execution_id', 'segment_id'
    p_object_type_code INTEGER
) RETURNS VOID AS $$
DECLARE
    v_sql TEXT;
    v_count INTEGER;
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = p_table_name) THEN
        RAISE NOTICE 'Table % does not exist, skipping', p_table_name;
        RETURN;
    END IF;

    -- Check if record_id column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = p_table_name AND column_name = 'record_id'
    ) THEN
        RAISE NOTICE 'Table % does not have record_id column, skipping', p_table_name;
        RETURN;
    END IF;

    -- Backfill record_id with per-parent sequential values
    v_sql := format(
        'WITH numbered AS (
            SELECT
                id,
                %I as parent_id,
                ROW_NUMBER() OVER (PARTITION BY %I ORDER BY created_at, id) as rn
            FROM %I
            WHERE record_id IS NULL
        )
        UPDATE %I t
        SET record_id = n.rn
        FROM numbered n
        WHERE t.id = n.id',
        p_parent_fk_column, p_parent_fk_column, p_table_name, p_table_name
    );

    EXECUTE v_sql;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Backfilled % record_ids for table % (grouped by %)', v_count, p_table_name, p_parent_fk_column;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Backfill Core CRM Objects (all have tenant_id)
-- ============================================================================
SELECT backfill_record_ids_with_tenant('Owner', 1);
SELECT backfill_record_ids_with_tenant('Pet', 2);
SELECT backfill_record_ids_with_tenant('Booking', 3);
SELECT backfill_record_ids_with_tenant('Payment', 4);
SELECT backfill_record_ids_with_tenant('Invoice', 5);
SELECT backfill_record_ids_with_tenant('InvoiceLine', 6);
SELECT backfill_record_ids_with_tenant('Task', 7);
SELECT backfill_record_ids_with_tenant('Note', 8);
SELECT backfill_record_ids_with_tenant('Vaccination', 9);
SELECT backfill_record_ids_with_tenant('Incident', 10);
SELECT backfill_record_ids_with_tenant('Veterinarian', 11);

-- ============================================================================
-- Backfill Workflow Objects
-- Note: WorkflowStep, WorkflowExecutionLog, WorkflowRevision do NOT have tenant_id
-- ============================================================================
SELECT backfill_record_ids_with_tenant('Workflow', 20);
SELECT backfill_record_ids_no_tenant('WorkflowStep', 'workflow_id', 21);
SELECT backfill_record_ids_with_tenant('WorkflowExecution', 22);
SELECT backfill_record_ids_no_tenant('WorkflowExecutionLog', 'execution_id', 23);
SELECT backfill_record_ids_with_tenant('WorkflowFolder', 24);
SELECT backfill_record_ids_no_tenant('WorkflowRevision', 'workflow_id', 25);
SELECT backfill_record_ids_with_tenant('WorkflowTemplate', 26);

-- ============================================================================
-- Backfill Segment Objects
-- Note: SegmentActivity, SegmentSnapshot do NOT have tenant_id
-- ============================================================================
SELECT backfill_record_ids_with_tenant('Segment', 27);
SELECT backfill_record_ids_with_tenant('SegmentMember', 28);
SELECT backfill_record_ids_no_tenant('SegmentActivity', 'segment_id', 29);
SELECT backfill_record_ids_no_tenant('SegmentSnapshot', 'segment_id', 94);

-- ============================================================================
-- Backfill Service Objects
-- ============================================================================
SELECT backfill_record_ids_with_tenant('Service', 30);
SELECT backfill_record_ids_with_tenant('Package', 31);

-- ============================================================================
-- Backfill Facility Objects
-- ============================================================================
SELECT backfill_record_ids_with_tenant('Run', 40);
SELECT backfill_record_ids_with_tenant('Kennel', 41);
SELECT backfill_record_ids_with_tenant('RunTemplate', 42);
SELECT backfill_record_ids_with_tenant('RunAssignment', 43);

-- ============================================================================
-- Backfill User/Staff Objects
-- ============================================================================
SELECT backfill_record_ids_with_tenant('User', 50);
SELECT backfill_record_ids_with_tenant('Staff', 51);
SELECT backfill_record_ids_with_tenant('Role', 52);
SELECT backfill_record_ids_with_tenant('UserRole', 53);
SELECT backfill_record_ids_with_tenant('UserSession', 54);
SELECT backfill_record_ids_with_tenant('TimeEntry', 55);
SELECT backfill_record_ids_with_tenant('TimePunch', 56);

-- ============================================================================
-- Backfill Communication Objects
-- ============================================================================
SELECT backfill_record_ids_with_tenant('Conversation', 60);
SELECT backfill_record_ids_with_tenant('Message', 61);
SELECT backfill_record_ids_with_tenant('Notification', 62);
SELECT backfill_record_ids_with_tenant('EmailTemplate', 63);

-- ============================================================================
-- Backfill Configuration Objects
-- ============================================================================
SELECT backfill_record_ids_with_tenant('CustomProperty', 70);
SELECT backfill_record_ids_with_tenant('ObjectSettings', 71);
SELECT backfill_record_ids_with_tenant('ObjectAssociation', 72);
SELECT backfill_record_ids_with_tenant('ObjectPipeline', 73);
SELECT backfill_record_ids_with_tenant('PipelineStage', 74);
SELECT backfill_record_ids_with_tenant('ObjectStatus', 75);
SELECT backfill_record_ids_with_tenant('SavedView', 76);
SELECT backfill_record_ids_with_tenant('AssociationLabel', 77);
SELECT backfill_record_ids_with_tenant('ObjectIndexSettings', 78);
SELECT backfill_record_ids_with_tenant('ObjectRecordLayout', 79);
SELECT backfill_record_ids_with_tenant('ObjectPreviewLayout', 95);

-- ============================================================================
-- Backfill Property System Objects
-- ============================================================================
SELECT backfill_record_ids_with_tenant('Property', 80);
SELECT backfill_record_ids_with_tenant('PropertyGroup', 81);
SELECT backfill_record_ids_with_tenant('PropertyLogicRule', 82);
SELECT backfill_record_ids_with_tenant('PropertyValue', 83);
SELECT backfill_record_ids_with_tenant('PropertyTemplate', 84);
SELECT backfill_record_ids_with_tenant('PropertyHistory', 85);

-- ============================================================================
-- Backfill System Objects
-- ============================================================================
SELECT backfill_record_ids_with_tenant('AuditLog', 90);
SELECT backfill_record_ids_with_tenant('DeletedRecord', 91);
SELECT backfill_record_ids_with_tenant('Import', 92);
SELECT backfill_record_ids_with_tenant('Activity', 93);

-- ============================================================================
-- Set record_id to NOT NULL where appropriate
-- Only set NOT NULL on tables that definitely have the column and data
-- ============================================================================

-- Core CRM tables
DO $$ BEGIN ALTER TABLE "Owner" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Pet" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Payment" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Invoice" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "InvoiceLine" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Task" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Vaccination" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Incident" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Veterinarian" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;

-- Service/Facility tables
DO $$ BEGIN ALTER TABLE "Service" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Package" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Run" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Kennel" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "RunAssignment" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;

-- User tables
DO $$ BEGIN ALTER TABLE "User" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Role" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "UserSession" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;

-- Segment tables
DO $$ BEGIN ALTER TABLE "Segment" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;

-- System tables
DO $$ BEGIN ALTER TABLE "AuditLog" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "DeletedRecord" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Notification" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;

-- Workflow tables
DO $$ BEGIN ALTER TABLE "Workflow" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WorkflowStep" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WorkflowExecution" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WorkflowExecutionLog" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "WorkflowFolder" ALTER COLUMN record_id SET NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;

-- ============================================================================
-- Clean up helper functions
-- ============================================================================
DROP FUNCTION IF EXISTS backfill_record_ids_with_tenant(TEXT, INTEGER);
DROP FUNCTION IF EXISTS backfill_record_ids_no_tenant(TEXT, TEXT, INTEGER);
