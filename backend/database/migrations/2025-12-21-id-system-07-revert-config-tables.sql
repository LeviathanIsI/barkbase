-- ============================================================================
-- BarkBase ID System Migration - Part 7: Revert Config Tables
-- ============================================================================
-- Migration 06 incorrectly applied the composite (tenant_id, record_id)
-- primary key pattern to configuration/settings tables. These tables are
-- NOT business entities and should keep their UUID primary keys.
--
-- This migration reverts the following tables back to UUID id primary key:
-- - ObjectSettings, ObjectAssociation, ObjectPipeline, PipelineStage
-- - ObjectStatus, ObjectIndexSettings, ObjectRecordLayout, ObjectPreviewLayout
-- - AssociationLabel, CustomProperty, Property, PropertyGroup
-- - PropertyLogicRule, PropertyTemplate, EmailTemplate
-- ============================================================================

BEGIN;

-- ============================================================================
-- Helper function to revert a table back to UUID primary key
-- ============================================================================
CREATE OR REPLACE FUNCTION revert_to_uuid_pk(p_table TEXT)
RETURNS VOID AS $$
DECLARE
    v_pk_name TEXT;
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = p_table) THEN
        RAISE NOTICE 'Table % does not exist, skipping', p_table;
        RETURN;
    END IF;

    -- Check if id column already exists (already has UUID pk)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = p_table AND column_name = 'id'
    ) THEN
        RAISE NOTICE 'Table % already has id column, skipping', p_table;
        RETURN;
    END IF;

    -- Drop current primary key constraint
    SELECT constraint_name INTO v_pk_name
    FROM information_schema.table_constraints
    WHERE table_name = p_table AND constraint_type = 'PRIMARY KEY';

    IF v_pk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', p_table, v_pk_name);
        RAISE NOTICE 'Dropped PK constraint % on %', v_pk_name, p_table;
    END IF;

    -- Drop record_id column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = p_table AND column_name = 'record_id'
    ) THEN
        EXECUTE format('ALTER TABLE %I DROP COLUMN record_id', p_table);
        RAISE NOTICE 'Dropped record_id column from %', p_table;
    END IF;

    -- Add back id UUID column as primary key
    EXECUTE format('ALTER TABLE %I ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid()', p_table);
    RAISE NOTICE 'Added id UUID PRIMARY KEY to %', p_table;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Revert Configuration Tables
-- ============================================================================

-- Object Configuration Tables
SELECT revert_to_uuid_pk('ObjectSettings');
SELECT revert_to_uuid_pk('ObjectAssociation');
SELECT revert_to_uuid_pk('ObjectPipeline');
SELECT revert_to_uuid_pk('PipelineStage');
SELECT revert_to_uuid_pk('ObjectStatus');
SELECT revert_to_uuid_pk('ObjectIndexSettings');
SELECT revert_to_uuid_pk('ObjectRecordLayout');
SELECT revert_to_uuid_pk('ObjectPreviewLayout');
SELECT revert_to_uuid_pk('AssociationLabel');

-- Property Definition Tables (not PropertyValue/PropertyHistory - those are per-record)
SELECT revert_to_uuid_pk('CustomProperty');
SELECT revert_to_uuid_pk('Property');
SELECT revert_to_uuid_pk('PropertyGroup');
SELECT revert_to_uuid_pk('PropertyLogicRule');
SELECT revert_to_uuid_pk('PropertyTemplate');

-- Email Template (config, not per-record)
SELECT revert_to_uuid_pk('EmailTemplate');

-- ============================================================================
-- Cleanup
-- ============================================================================
DROP FUNCTION IF EXISTS revert_to_uuid_pk(TEXT);

COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- After this migration, the following tables are back to UUID primary keys:
-- - ObjectSettings, ObjectAssociation, ObjectPipeline, PipelineStage
-- - ObjectStatus, ObjectIndexSettings, ObjectRecordLayout, ObjectPreviewLayout
-- - AssociationLabel, CustomProperty, Property, PropertyGroup
-- - PropertyLogicRule, PropertyTemplate, EmailTemplate
--
-- These tables keep (tenant_id, record_id) composite keys (business entities):
-- - Owner, Pet, Booking, Payment, Invoice, InvoiceLine
-- - Task, Note, Vaccination, Incident, Veterinarian
-- - Workflow, WorkflowStep, WorkflowExecution, WorkflowExecutionLog, etc.
-- - Segment, SegmentMember, SegmentActivity, SegmentSnapshot
-- - Service, Package, Run, Kennel, RunTemplate, RunAssignment
-- - User, Staff, Role, UserRole, UserSession, TimeEntry, TimePunch
-- - Conversation, Message, Notification
-- - PropertyValue, PropertyHistory (per-record data)
-- - AuditLog, DeletedRecord, Import, Activity
-- ============================================================================
