-- ============================================================================
-- BarkBase ID System Migration - Part 2: Add record_id Columns
-- ============================================================================
-- This migration adds record_id columns to all applicable tables.
-- Run this AFTER migration 01 (foundation).
--
-- IMPORTANT: Some tables don't have tenant_id because they inherit tenant
-- isolation through their parent FK (e.g., WorkflowStep -> Workflow).
-- For these tables, we only add record_id without tenant-composite index.
--
-- NOTE: Some tables may already have record_id as UUID from Prisma.
-- This migration will drop and recreate as BIGINT where needed.
-- ============================================================================

-- ============================================================================
-- Helper function to ensure record_id column is BIGINT
-- ============================================================================
CREATE OR REPLACE FUNCTION ensure_record_id_bigint(
    p_table_name TEXT,
    p_index_columns TEXT  -- e.g., 'tenant_id' or 'workflow_id' or NULL for no composite
) RETURNS VOID AS $$
DECLARE
    v_current_type TEXT;
    v_index_name TEXT;
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = p_table_name) THEN
        RAISE NOTICE 'Table % does not exist, skipping', p_table_name;
        RETURN;
    END IF;

    -- Check if record_id column exists and get its type
    SELECT data_type INTO v_current_type
    FROM information_schema.columns
    WHERE table_name = p_table_name AND column_name = 'record_id';

    IF v_current_type IS NULL THEN
        -- Column doesn't exist, add it
        EXECUTE format('ALTER TABLE %I ADD COLUMN record_id BIGINT', p_table_name);
        RAISE NOTICE 'Added record_id BIGINT column to %', p_table_name;
    ELSIF v_current_type != 'bigint' THEN
        -- Column exists but wrong type, drop and recreate
        -- First drop any indexes that reference record_id
        FOR v_index_name IN
            SELECT indexname FROM pg_indexes
            WHERE tablename = p_table_name
            AND indexdef LIKE '%record_id%'
        LOOP
            EXECUTE format('DROP INDEX IF EXISTS %I', v_index_name);
            RAISE NOTICE 'Dropped index % on %', v_index_name, p_table_name;
        END LOOP;

        -- Drop the column
        EXECUTE format('ALTER TABLE %I DROP COLUMN record_id', p_table_name);
        RAISE NOTICE 'Dropped % record_id column from %', v_current_type, p_table_name;

        -- Add it back as BIGINT
        EXECUTE format('ALTER TABLE %I ADD COLUMN record_id BIGINT', p_table_name);
        RAISE NOTICE 'Added record_id BIGINT column to %', p_table_name;
    ELSE
        RAISE NOTICE 'Table % already has record_id as BIGINT', p_table_name;
    END IF;

    -- Create index if index_columns specified
    IF p_index_columns IS NOT NULL AND p_index_columns != '' THEN
        v_index_name := 'idx_' || lower(p_table_name) || '_record_id';
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I ON %I(%s, record_id)',
            v_index_name, p_table_name, p_index_columns
        );
        RAISE NOTICE 'Created index % on %(%s, record_id)', v_index_name, p_table_name, p_index_columns;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Core CRM Objects (all have tenant_id)
-- ============================================================================

SELECT ensure_record_id_bigint('Owner', 'tenant_id');
SELECT ensure_record_id_bigint('Pet', 'tenant_id');
SELECT ensure_record_id_bigint('Booking', 'tenant_id');
SELECT ensure_record_id_bigint('Payment', 'tenant_id');
SELECT ensure_record_id_bigint('Invoice', 'tenant_id');
SELECT ensure_record_id_bigint('InvoiceLine', 'tenant_id');
SELECT ensure_record_id_bigint('Task', 'tenant_id');
SELECT ensure_record_id_bigint('Note', 'tenant_id');
SELECT ensure_record_id_bigint('Vaccination', 'tenant_id');
SELECT ensure_record_id_bigint('Incident', 'tenant_id');
SELECT ensure_record_id_bigint('Veterinarian', 'tenant_id');

-- ============================================================================
-- Workflow Objects
-- NOTE: WorkflowStep, WorkflowExecutionLog, WorkflowRevision do NOT have tenant_id
-- ============================================================================

SELECT ensure_record_id_bigint('Workflow', 'tenant_id');
SELECT ensure_record_id_bigint('WorkflowStep', 'workflow_id');  -- NO tenant_id
SELECT ensure_record_id_bigint('WorkflowExecution', 'tenant_id');
SELECT ensure_record_id_bigint('WorkflowExecutionLog', 'execution_id');  -- NO tenant_id
SELECT ensure_record_id_bigint('WorkflowFolder', 'tenant_id');
SELECT ensure_record_id_bigint('WorkflowRevision', 'workflow_id');  -- NO tenant_id
SELECT ensure_record_id_bigint('WorkflowTemplate', NULL);  -- tenant_id nullable for system templates

-- ============================================================================
-- Segment Objects
-- NOTE: SegmentActivity, SegmentSnapshot do NOT have tenant_id
-- ============================================================================

SELECT ensure_record_id_bigint('Segment', 'tenant_id');
SELECT ensure_record_id_bigint('SegmentMember', 'tenant_id');
SELECT ensure_record_id_bigint('SegmentActivity', 'segment_id');  -- NO tenant_id
SELECT ensure_record_id_bigint('SegmentSnapshot', 'segment_id');  -- NO tenant_id

-- ============================================================================
-- Service Objects
-- ============================================================================

SELECT ensure_record_id_bigint('Service', 'tenant_id');
SELECT ensure_record_id_bigint('Package', 'tenant_id');

-- ============================================================================
-- Facility Objects
-- ============================================================================

SELECT ensure_record_id_bigint('Run', 'tenant_id');
SELECT ensure_record_id_bigint('Kennel', 'tenant_id');
SELECT ensure_record_id_bigint('RunTemplate', 'tenant_id');
SELECT ensure_record_id_bigint('RunAssignment', 'tenant_id');

-- ============================================================================
-- User/Staff Objects
-- ============================================================================

SELECT ensure_record_id_bigint('User', 'tenant_id');
SELECT ensure_record_id_bigint('Staff', 'tenant_id');
SELECT ensure_record_id_bigint('Role', 'tenant_id');
SELECT ensure_record_id_bigint('UserRole', 'tenant_id');
SELECT ensure_record_id_bigint('UserSession', 'tenant_id');
SELECT ensure_record_id_bigint('TimeEntry', 'tenant_id');
SELECT ensure_record_id_bigint('TimePunch', 'tenant_id');

-- ============================================================================
-- Communication Objects
-- ============================================================================

SELECT ensure_record_id_bigint('Conversation', 'tenant_id');
SELECT ensure_record_id_bigint('Message', 'tenant_id');
SELECT ensure_record_id_bigint('Notification', 'tenant_id');
SELECT ensure_record_id_bigint('EmailTemplate', 'tenant_id');

-- ============================================================================
-- Configuration Objects
-- ============================================================================

SELECT ensure_record_id_bigint('CustomProperty', 'tenant_id');
SELECT ensure_record_id_bigint('ObjectSettings', 'tenant_id');
SELECT ensure_record_id_bigint('ObjectAssociation', 'tenant_id');
SELECT ensure_record_id_bigint('ObjectPipeline', 'tenant_id');
SELECT ensure_record_id_bigint('PipelineStage', 'tenant_id');
SELECT ensure_record_id_bigint('ObjectStatus', 'tenant_id');
SELECT ensure_record_id_bigint('SavedView', 'tenant_id');
SELECT ensure_record_id_bigint('AssociationLabel', 'tenant_id');
SELECT ensure_record_id_bigint('ObjectIndexSettings', 'tenant_id');
SELECT ensure_record_id_bigint('ObjectRecordLayout', 'tenant_id');
SELECT ensure_record_id_bigint('ObjectPreviewLayout', 'tenant_id');

-- ============================================================================
-- Property System Objects
-- ============================================================================

SELECT ensure_record_id_bigint('Property', 'tenant_id');
SELECT ensure_record_id_bigint('PropertyGroup', 'tenant_id');
SELECT ensure_record_id_bigint('PropertyLogicRule', 'tenant_id');
SELECT ensure_record_id_bigint('PropertyValue', 'tenant_id');
SELECT ensure_record_id_bigint('PropertyTemplate', 'tenant_id');
SELECT ensure_record_id_bigint('PropertyHistory', 'tenant_id');

-- ============================================================================
-- System Objects
-- ============================================================================

SELECT ensure_record_id_bigint('AuditLog', 'tenant_id');
SELECT ensure_record_id_bigint('DeletedRecord', 'tenant_id');
SELECT ensure_record_id_bigint('Import', 'tenant_id');
SELECT ensure_record_id_bigint('Activity', 'tenant_id');

-- ============================================================================
-- Clean up helper function
-- ============================================================================
DROP FUNCTION IF EXISTS ensure_record_id_bigint(TEXT, TEXT);
