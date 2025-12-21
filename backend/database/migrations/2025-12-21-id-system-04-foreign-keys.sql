-- ============================================================================
-- BarkBase ID System Migration - Part 4: Foreign Key Migration
-- ============================================================================
-- This migration:
-- 1. Creates mapping tables to track old UUID -> new record_id mappings
-- 2. Adds new _record_id FK columns
-- 3. Backfills FK columns using mapping tables
--
-- IMPORTANT: This is a multi-step migration. After running this:
-- - Application code must be updated to use new FK columns
-- - Old FK columns should be dropped in a later migration
--
-- Run this AFTER migration 03 (backfill-record-ids).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create ID Mapping Tables for Core Objects
-- ============================================================================
-- These tables map old UUID id -> new (tenant_id, record_id) for FK migration

-- Core CRM tables (all have tenant_id)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Owner')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Owner' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_Owner_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "Owner" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_owner_old_id ON "_Migration_Owner_Id_Map"(old_id);
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Pet')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Pet' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_Pet_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "Pet" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_pet_old_id ON "_Migration_Pet_Id_Map"(old_id);
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Booking')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Booking' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_Booking_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "Booking" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_booking_old_id ON "_Migration_Booking_Id_Map"(old_id);
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Service')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Service' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_Service_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "Service" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_service_old_id ON "_Migration_Service_Id_Map"(old_id);
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Kennel')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Kennel' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_Kennel_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "Kennel" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_kennel_old_id ON "_Migration_Kennel_Id_Map"(old_id);
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Run')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Run' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_Run_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "Run" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_run_old_id ON "_Migration_Run_Id_Map"(old_id);
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'User')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_User_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "User" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_user_old_id ON "_Migration_User_Id_Map"(old_id);
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Role')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Role' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_Role_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "Role" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_role_old_id ON "_Migration_Role_Id_Map"(old_id);
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Invoice')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Invoice' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_Invoice_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "Invoice" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_invoice_old_id ON "_Migration_Invoice_Id_Map"(old_id);
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Segment')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Segment' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_Segment_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "Segment" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_segment_old_id ON "_Migration_Segment_Id_Map"(old_id);
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Veterinarian')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Veterinarian' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_Veterinarian_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "Veterinarian" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_vet_old_id ON "_Migration_Veterinarian_Id_Map"(old_id);
    END IF;
END $$;

-- Workflow table (has tenant_id)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Workflow')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Workflow' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_Workflow_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "Workflow" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_workflow_old_id ON "_Migration_Workflow_Id_Map"(old_id);
    END IF;
END $$;

-- WorkflowStep (NO tenant_id - inherits via workflow_id)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'WorkflowStep')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'WorkflowStep' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_WorkflowStep_Id_Map" AS
            SELECT ws.id as old_id, w.tenant_id, ws.record_id as new_record_id, ws.workflow_id
            FROM "WorkflowStep" ws
            JOIN "Workflow" w ON ws.workflow_id = w.id
            WHERE ws.record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_workflowstep_old_id ON "_Migration_WorkflowStep_Id_Map"(old_id);
    END IF;
END $$;

-- WorkflowExecution (has tenant_id)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'WorkflowExecution')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'WorkflowExecution' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_WorkflowExecution_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "WorkflowExecution" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_workflowexec_old_id ON "_Migration_WorkflowExecution_Id_Map"(old_id);
    END IF;
END $$;

-- WorkflowExecutionLog (NO tenant_id - inherits via execution_id)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'WorkflowExecutionLog')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'WorkflowExecutionLog' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_WorkflowExecutionLog_Id_Map" AS
            SELECT wel.id as old_id, we.tenant_id, wel.record_id as new_record_id, wel.execution_id
            FROM "WorkflowExecutionLog" wel
            JOIN "WorkflowExecution" we ON wel.execution_id = we.id
            WHERE wel.record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_workflowexeclog_old_id ON "_Migration_WorkflowExecutionLog_Id_Map"(old_id);
    END IF;
END $$;

-- Package table
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Package')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Package' AND column_name = 'record_id') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_Package_Id_Map" AS
            SELECT id as old_id, tenant_id, record_id as new_record_id FROM "Package" WHERE record_id IS NOT NULL';
        CREATE INDEX IF NOT EXISTS idx_mig_package_old_id ON "_Migration_Package_Id_Map"(old_id);
    END IF;
END $$;

-- ============================================================================
-- 2. Add new FK columns with _record_id suffix
-- ============================================================================

-- Pet references Veterinarian
DO $$ BEGIN ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS vet_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- PetOwner references Pet and Owner
DO $$ BEGIN ALTER TABLE "PetOwner" ADD COLUMN IF NOT EXISTS pet_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PetOwner" ADD COLUMN IF NOT EXISTS owner_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Booking references Owner, Service, Kennel, and User (for created_by, checked_in_by, etc.)
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS owner_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS service_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS kennel_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS checked_in_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS checked_out_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS updated_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- BookingPet references Booking and Pet
DO $$ BEGIN ALTER TABLE "BookingPet" ADD COLUMN IF NOT EXISTS booking_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "BookingPet" ADD COLUMN IF NOT EXISTS pet_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Payment references Invoice and Owner
DO $$ BEGIN ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS invoice_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS owner_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS processed_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Invoice references Owner and Booking
DO $$ BEGIN ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS owner_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS booking_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- InvoiceLine references Invoice
DO $$ BEGIN ALTER TABLE "InvoiceLine" ADD COLUMN IF NOT EXISTS invoice_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Task references User, Booking, Pet
DO $$ BEGIN ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS assigned_to_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS booking_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS pet_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS completed_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Vaccination references Pet and User
DO $$ BEGIN ALTER TABLE "Vaccination" ADD COLUMN IF NOT EXISTS pet_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Vaccination" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Incident references Pet, Booking, User
DO $$ BEGIN ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS pet_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS booking_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS reported_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS resolved_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- RunAssignment references Run, Booking, Pet, User
DO $$ BEGIN ALTER TABLE "RunAssignment" ADD COLUMN IF NOT EXISTS run_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "RunAssignment" ADD COLUMN IF NOT EXISTS booking_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "RunAssignment" ADD COLUMN IF NOT EXISTS pet_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "RunAssignment" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- UserRole references User and Role
DO $$ BEGIN ALTER TABLE "UserRole" ADD COLUMN IF NOT EXISTS user_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "UserRole" ADD COLUMN IF NOT EXISTS role_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "UserRole" ADD COLUMN IF NOT EXISTS assigned_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- UserSession references User
DO $$ BEGIN ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS user_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Segment references User
DO $$ BEGIN ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- SegmentMember references Segment, Owner, User
DO $$ BEGIN ALTER TABLE "SegmentMember" ADD COLUMN IF NOT EXISTS segment_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SegmentMember" ADD COLUMN IF NOT EXISTS owner_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SegmentMember" ADD COLUMN IF NOT EXISTS added_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Notification references User
DO $$ BEGIN ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS user_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Note references User
DO $$ BEGIN ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- AuditLog references User
DO $$ BEGIN ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS user_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- DeletedRecord references User
DO $$ BEGIN ALTER TABLE "DeletedRecord" ADD COLUMN IF NOT EXISTS deleted_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Owner references User (created_by, updated_by)
DO $$ BEGIN ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS updated_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Pet references User (created_by, updated_by)
DO $$ BEGIN ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS updated_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Workflow references User (created_by)
DO $$ BEGIN ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS folder_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- WorkflowExecution references Workflow
DO $$ BEGIN ALTER TABLE "WorkflowExecution" ADD COLUMN IF NOT EXISTS workflow_record_id BIGINT; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================================
-- 3. Backfill FK columns using mapping tables
-- ============================================================================

-- Helper function to safely backfill FK columns
CREATE OR REPLACE FUNCTION safe_backfill_fk(
    p_target_table TEXT,
    p_target_column TEXT,
    p_mapping_table TEXT,
    p_source_column TEXT
) RETURNS VOID AS $$
DECLARE
    v_sql TEXT;
    v_count INTEGER;
BEGIN
    -- Check if target table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = p_target_table) THEN
        RAISE NOTICE 'Target table % does not exist, skipping', p_target_table;
        RETURN;
    END IF;

    -- Check if target column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = p_target_table AND column_name = p_target_column
    ) THEN
        RAISE NOTICE 'Target column %.% does not exist, skipping', p_target_table, p_target_column;
        RETURN;
    END IF;

    -- Check if mapping table exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = p_mapping_table) THEN
        RAISE NOTICE 'Mapping table % does not exist, skipping', p_mapping_table;
        RETURN;
    END IF;

    -- Check if source column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = p_target_table AND column_name = p_source_column
    ) THEN
        RAISE NOTICE 'Source column %.% does not exist, skipping', p_target_table, p_source_column;
        RETURN;
    END IF;

    -- Execute the backfill
    v_sql := format(
        'UPDATE %I t SET %I = m.new_record_id FROM %I m WHERE t.%I = m.old_id AND t.%I IS NOT NULL',
        p_target_table, p_target_column, p_mapping_table, p_source_column, p_source_column
    );

    EXECUTE v_sql;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Backfilled % rows for %.%', v_count, p_target_table, p_target_column;
END;
$$ LANGUAGE plpgsql;

-- Pet FKs
SELECT safe_backfill_fk('Pet', 'vet_record_id', '_Migration_Veterinarian_Id_Map', 'vet_id');
SELECT safe_backfill_fk('Pet', 'created_by_record_id', '_Migration_User_Id_Map', 'created_by');
SELECT safe_backfill_fk('Pet', 'updated_by_record_id', '_Migration_User_Id_Map', 'updated_by');

-- PetOwner FKs
SELECT safe_backfill_fk('PetOwner', 'pet_record_id', '_Migration_Pet_Id_Map', 'pet_id');
SELECT safe_backfill_fk('PetOwner', 'owner_record_id', '_Migration_Owner_Id_Map', 'owner_id');

-- Booking FKs
SELECT safe_backfill_fk('Booking', 'owner_record_id', '_Migration_Owner_Id_Map', 'owner_id');
SELECT safe_backfill_fk('Booking', 'service_record_id', '_Migration_Service_Id_Map', 'service_id');
SELECT safe_backfill_fk('Booking', 'kennel_record_id', '_Migration_Kennel_Id_Map', 'kennel_id');
SELECT safe_backfill_fk('Booking', 'checked_in_by_record_id', '_Migration_User_Id_Map', 'checked_in_by');
SELECT safe_backfill_fk('Booking', 'checked_out_by_record_id', '_Migration_User_Id_Map', 'checked_out_by');
SELECT safe_backfill_fk('Booking', 'created_by_record_id', '_Migration_User_Id_Map', 'created_by');
SELECT safe_backfill_fk('Booking', 'updated_by_record_id', '_Migration_User_Id_Map', 'updated_by');

-- BookingPet FKs
SELECT safe_backfill_fk('BookingPet', 'booking_record_id', '_Migration_Booking_Id_Map', 'booking_id');
SELECT safe_backfill_fk('BookingPet', 'pet_record_id', '_Migration_Pet_Id_Map', 'pet_id');

-- Payment FKs
SELECT safe_backfill_fk('Payment', 'invoice_record_id', '_Migration_Invoice_Id_Map', 'invoice_id');
SELECT safe_backfill_fk('Payment', 'owner_record_id', '_Migration_Owner_Id_Map', 'owner_id');
SELECT safe_backfill_fk('Payment', 'processed_by_record_id', '_Migration_User_Id_Map', 'processed_by');

-- Invoice FKs
SELECT safe_backfill_fk('Invoice', 'owner_record_id', '_Migration_Owner_Id_Map', 'owner_id');
SELECT safe_backfill_fk('Invoice', 'booking_record_id', '_Migration_Booking_Id_Map', 'booking_id');
SELECT safe_backfill_fk('Invoice', 'created_by_record_id', '_Migration_User_Id_Map', 'created_by');

-- InvoiceLine FKs
SELECT safe_backfill_fk('InvoiceLine', 'invoice_record_id', '_Migration_Invoice_Id_Map', 'invoice_id');

-- Task FKs
SELECT safe_backfill_fk('Task', 'assigned_to_record_id', '_Migration_User_Id_Map', 'assigned_to');
SELECT safe_backfill_fk('Task', 'booking_record_id', '_Migration_Booking_Id_Map', 'booking_id');
SELECT safe_backfill_fk('Task', 'pet_record_id', '_Migration_Pet_Id_Map', 'pet_id');
SELECT safe_backfill_fk('Task', 'completed_by_record_id', '_Migration_User_Id_Map', 'completed_by');
SELECT safe_backfill_fk('Task', 'created_by_record_id', '_Migration_User_Id_Map', 'created_by');

-- Vaccination FKs
SELECT safe_backfill_fk('Vaccination', 'pet_record_id', '_Migration_Pet_Id_Map', 'pet_id');
SELECT safe_backfill_fk('Vaccination', 'created_by_record_id', '_Migration_User_Id_Map', 'created_by');

-- Incident FKs
SELECT safe_backfill_fk('Incident', 'pet_record_id', '_Migration_Pet_Id_Map', 'pet_id');
SELECT safe_backfill_fk('Incident', 'booking_record_id', '_Migration_Booking_Id_Map', 'booking_id');
SELECT safe_backfill_fk('Incident', 'reported_by_record_id', '_Migration_User_Id_Map', 'reported_by');
SELECT safe_backfill_fk('Incident', 'resolved_by_record_id', '_Migration_User_Id_Map', 'resolved_by');

-- RunAssignment FKs
SELECT safe_backfill_fk('RunAssignment', 'run_record_id', '_Migration_Run_Id_Map', 'run_id');
SELECT safe_backfill_fk('RunAssignment', 'booking_record_id', '_Migration_Booking_Id_Map', 'booking_id');
SELECT safe_backfill_fk('RunAssignment', 'pet_record_id', '_Migration_Pet_Id_Map', 'pet_id');
SELECT safe_backfill_fk('RunAssignment', 'created_by_record_id', '_Migration_User_Id_Map', 'created_by');

-- UserRole FKs
SELECT safe_backfill_fk('UserRole', 'user_record_id', '_Migration_User_Id_Map', 'user_id');
SELECT safe_backfill_fk('UserRole', 'role_record_id', '_Migration_Role_Id_Map', 'role_id');
SELECT safe_backfill_fk('UserRole', 'assigned_by_record_id', '_Migration_User_Id_Map', 'assigned_by');

-- UserSession FKs
SELECT safe_backfill_fk('UserSession', 'user_record_id', '_Migration_User_Id_Map', 'user_id');

-- Segment FKs
SELECT safe_backfill_fk('Segment', 'created_by_record_id', '_Migration_User_Id_Map', 'created_by');

-- SegmentMember FKs
SELECT safe_backfill_fk('SegmentMember', 'segment_record_id', '_Migration_Segment_Id_Map', 'segment_id');
SELECT safe_backfill_fk('SegmentMember', 'owner_record_id', '_Migration_Owner_Id_Map', 'owner_id');
SELECT safe_backfill_fk('SegmentMember', 'added_by_record_id', '_Migration_User_Id_Map', 'added_by');

-- Notification FKs
SELECT safe_backfill_fk('Notification', 'user_record_id', '_Migration_User_Id_Map', 'user_id');

-- Note FKs
SELECT safe_backfill_fk('Note', 'created_by_record_id', '_Migration_User_Id_Map', 'created_by');

-- AuditLog FKs
SELECT safe_backfill_fk('AuditLog', 'user_record_id', '_Migration_User_Id_Map', 'user_id');

-- DeletedRecord FKs
SELECT safe_backfill_fk('DeletedRecord', 'deleted_by_record_id', '_Migration_User_Id_Map', 'deleted_by');

-- Owner FKs
SELECT safe_backfill_fk('Owner', 'created_by_record_id', '_Migration_User_Id_Map', 'created_by');
SELECT safe_backfill_fk('Owner', 'updated_by_record_id', '_Migration_User_Id_Map', 'updated_by');

-- Workflow FKs
SELECT safe_backfill_fk('Workflow', 'created_by_record_id', '_Migration_User_Id_Map', 'created_by');

-- WorkflowExecution FKs
SELECT safe_backfill_fk('WorkflowExecution', 'workflow_record_id', '_Migration_Workflow_Id_Map', 'workflow_id');

-- Clean up helper function
DROP FUNCTION IF EXISTS safe_backfill_fk(TEXT, TEXT, TEXT, TEXT);

-- ============================================================================
-- 4. Create indexes on new FK columns (only if column exists)
-- ============================================================================

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_pet_vet_record_id ON "Pet"(tenant_id, vet_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_petowner_pet_record_id ON "PetOwner"(tenant_id, pet_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_petowner_owner_record_id ON "PetOwner"(tenant_id, owner_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_booking_owner_record_id ON "Booking"(tenant_id, owner_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_booking_service_record_id ON "Booking"(tenant_id, service_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_booking_kennel_record_id ON "Booking"(tenant_id, kennel_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_bookingpet_booking_record_id ON "BookingPet"(tenant_id, booking_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_bookingpet_pet_record_id ON "BookingPet"(tenant_id, pet_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_payment_owner_record_id ON "Payment"(tenant_id, owner_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_payment_invoice_record_id ON "Payment"(tenant_id, invoice_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_invoice_owner_record_id ON "Invoice"(tenant_id, owner_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_invoice_booking_record_id ON "Invoice"(tenant_id, booking_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_invoiceline_invoice_record_id ON "InvoiceLine"(tenant_id, invoice_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_task_pet_record_id ON "Task"(tenant_id, pet_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_task_booking_record_id ON "Task"(tenant_id, booking_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_vaccination_pet_record_id ON "Vaccination"(tenant_id, pet_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_incident_pet_record_id ON "Incident"(tenant_id, pet_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_runassignment_run_record_id ON "RunAssignment"(tenant_id, run_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_userrole_user_record_id ON "UserRole"(tenant_id, user_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_userrole_role_record_id ON "UserRole"(tenant_id, role_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_usersession_user_record_id ON "UserSession"(tenant_id, user_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_segmentmember_segment_record_id ON "SegmentMember"(tenant_id, segment_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_segmentmember_owner_record_id ON "SegmentMember"(tenant_id, owner_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_notification_user_record_id ON "Notification"(tenant_id, user_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_workflow_created_by_record_id ON "Workflow"(tenant_id, created_by_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_workflowexec_workflow_record_id ON "WorkflowExecution"(tenant_id, workflow_record_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;

COMMIT;
