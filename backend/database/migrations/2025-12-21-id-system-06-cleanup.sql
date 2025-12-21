-- ============================================================================
-- BarkBase ID System Migration - Part 6: Cleanup
-- ============================================================================
-- This migration finalizes the ID system by:
-- 1. Dropping old UUID `id` columns (replaced by record_id)
-- 2. Dropping old UUID FK columns (replaced by *_record_id columns)
-- 3. Dropping migration mapping tables
--
-- COLUMNS BEING DROPPED:
-- ======================
--
-- PRIMARY KEY COLUMNS (old UUID `id`):
-- ------------------------------------
-- Owner.id, Pet.id, Booking.id, Payment.id, Invoice.id, InvoiceLine.id,
-- Task.id, Note.id, Vaccination.id, Incident.id, Veterinarian.id,
-- Workflow.id, WorkflowStep.id, WorkflowExecution.id, WorkflowExecutionLog.id,
-- WorkflowFolder.id, WorkflowRevision.id, WorkflowTemplate.id,
-- Segment.id, SegmentMember.id, SegmentActivity.id, SegmentSnapshot.id,
-- Service.id, Package.id, Run.id, Kennel.id, RunTemplate.id, RunAssignment.id,
-- User.id, Staff.id, Role.id, UserRole.id, UserSession.id, TimeEntry.id, TimePunch.id,
-- Conversation.id, Message.id, Notification.id, EmailTemplate.id,
-- CustomProperty.id, ObjectSettings.id, ObjectAssociation.id, ObjectPipeline.id,
-- PipelineStage.id, ObjectStatus.id, SavedView.id, AssociationLabel.id,
-- ObjectIndexSettings.id, ObjectRecordLayout.id, ObjectPreviewLayout.id,
-- Property.id, PropertyGroup.id, PropertyLogicRule.id, PropertyValue.id,
-- PropertyTemplate.id, PropertyHistory.id,
-- AuditLog.id, DeletedRecord.id, Import.id, Activity.id
--
-- FOREIGN KEY COLUMNS (old UUID references):
-- ------------------------------------------
-- Pet: vet_id, created_by, updated_by
-- PetOwner: pet_id, owner_id
-- Booking: owner_id, service_id, kennel_id, checked_in_by, checked_out_by, created_by, updated_by
-- BookingPet: booking_id, pet_id
-- Payment: invoice_id, owner_id, processed_by
-- Invoice: owner_id, booking_id, created_by
-- InvoiceLine: invoice_id
-- Task: assigned_to, booking_id, pet_id, completed_by, created_by
-- Vaccination: pet_id, created_by
-- Incident: pet_id, booking_id, reported_by, resolved_by
-- RunAssignment: run_id, booking_id, pet_id, created_by
-- UserRole: user_id, role_id, assigned_by
-- UserSession: user_id
-- Segment: created_by
-- SegmentMember: segment_id, owner_id, added_by
-- Notification: user_id
-- Note: created_by
-- AuditLog: user_id
-- DeletedRecord: deleted_by
-- Owner: created_by, updated_by
-- Workflow: created_by, folder_id
-- WorkflowExecution: workflow_id
-- WorkflowStep: workflow_id
-- WorkflowExecutionLog: execution_id, step_id
--
-- MAPPING TABLES TO DROP:
-- -----------------------
-- _Migration_Owner_Id_Map, _Migration_Pet_Id_Map, _Migration_Booking_Id_Map,
-- _Migration_Service_Id_Map, _Migration_Kennel_Id_Map, _Migration_Run_Id_Map,
-- _Migration_User_Id_Map, _Migration_Role_Id_Map, _Migration_Invoice_Id_Map,
-- _Migration_Segment_Id_Map, _Migration_Veterinarian_Id_Map,
-- _Migration_Workflow_Id_Map, _Migration_WorkflowStep_Id_Map,
-- _Migration_WorkflowExecution_Id_Map, _Migration_WorkflowExecutionLog_Id_Map,
-- _Migration_Package_Id_Map
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Drop Foreign Key Constraints referencing old UUID columns
-- ============================================================================

-- Helper function to safely drop constraints
CREATE OR REPLACE FUNCTION safe_drop_constraint(p_table TEXT, p_constraint TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', p_table, p_constraint);
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table % does not exist', p_table;
END;
$$ LANGUAGE plpgsql;

-- Drop FK constraints (common naming patterns)
-- PetOwner
SELECT safe_drop_constraint('PetOwner', 'PetOwner_pet_id_fkey');
SELECT safe_drop_constraint('PetOwner', 'PetOwner_owner_id_fkey');
SELECT safe_drop_constraint('PetOwner', 'petowner_pet_id_fkey');
SELECT safe_drop_constraint('PetOwner', 'petowner_owner_id_fkey');

-- Pet
SELECT safe_drop_constraint('Pet', 'Pet_vet_id_fkey');
SELECT safe_drop_constraint('Pet', 'pet_vet_id_fkey');

-- Booking
SELECT safe_drop_constraint('Booking', 'Booking_owner_id_fkey');
SELECT safe_drop_constraint('Booking', 'Booking_service_id_fkey');
SELECT safe_drop_constraint('Booking', 'Booking_kennel_id_fkey');
SELECT safe_drop_constraint('Booking', 'booking_owner_id_fkey');
SELECT safe_drop_constraint('Booking', 'booking_service_id_fkey');
SELECT safe_drop_constraint('Booking', 'booking_kennel_id_fkey');

-- BookingPet
SELECT safe_drop_constraint('BookingPet', 'BookingPet_booking_id_fkey');
SELECT safe_drop_constraint('BookingPet', 'BookingPet_pet_id_fkey');
SELECT safe_drop_constraint('BookingPet', 'bookingpet_booking_id_fkey');
SELECT safe_drop_constraint('BookingPet', 'bookingpet_pet_id_fkey');

-- Payment
SELECT safe_drop_constraint('Payment', 'Payment_invoice_id_fkey');
SELECT safe_drop_constraint('Payment', 'Payment_owner_id_fkey');
SELECT safe_drop_constraint('Payment', 'payment_invoice_id_fkey');
SELECT safe_drop_constraint('Payment', 'payment_owner_id_fkey');

-- Invoice
SELECT safe_drop_constraint('Invoice', 'Invoice_owner_id_fkey');
SELECT safe_drop_constraint('Invoice', 'Invoice_booking_id_fkey');
SELECT safe_drop_constraint('Invoice', 'invoice_owner_id_fkey');
SELECT safe_drop_constraint('Invoice', 'invoice_booking_id_fkey');

-- InvoiceLine
SELECT safe_drop_constraint('InvoiceLine', 'InvoiceLine_invoice_id_fkey');
SELECT safe_drop_constraint('InvoiceLine', 'invoiceline_invoice_id_fkey');

-- Task
SELECT safe_drop_constraint('Task', 'Task_booking_id_fkey');
SELECT safe_drop_constraint('Task', 'Task_pet_id_fkey');
SELECT safe_drop_constraint('Task', 'task_booking_id_fkey');
SELECT safe_drop_constraint('Task', 'task_pet_id_fkey');

-- Vaccination
SELECT safe_drop_constraint('Vaccination', 'Vaccination_pet_id_fkey');
SELECT safe_drop_constraint('Vaccination', 'vaccination_pet_id_fkey');

-- Incident
SELECT safe_drop_constraint('Incident', 'Incident_pet_id_fkey');
SELECT safe_drop_constraint('Incident', 'Incident_booking_id_fkey');
SELECT safe_drop_constraint('Incident', 'incident_pet_id_fkey');
SELECT safe_drop_constraint('Incident', 'incident_booking_id_fkey');

-- RunAssignment
SELECT safe_drop_constraint('RunAssignment', 'RunAssignment_run_id_fkey');
SELECT safe_drop_constraint('RunAssignment', 'RunAssignment_booking_id_fkey');
SELECT safe_drop_constraint('RunAssignment', 'RunAssignment_pet_id_fkey');
SELECT safe_drop_constraint('RunAssignment', 'runassignment_run_id_fkey');
SELECT safe_drop_constraint('RunAssignment', 'runassignment_booking_id_fkey');
SELECT safe_drop_constraint('RunAssignment', 'runassignment_pet_id_fkey');

-- UserRole
SELECT safe_drop_constraint('UserRole', 'UserRole_user_id_fkey');
SELECT safe_drop_constraint('UserRole', 'UserRole_role_id_fkey');
SELECT safe_drop_constraint('UserRole', 'userrole_user_id_fkey');
SELECT safe_drop_constraint('UserRole', 'userrole_role_id_fkey');

-- UserSession
SELECT safe_drop_constraint('UserSession', 'UserSession_user_id_fkey');
SELECT safe_drop_constraint('UserSession', 'usersession_user_id_fkey');

-- SegmentMember
SELECT safe_drop_constraint('SegmentMember', 'SegmentMember_segment_id_fkey');
SELECT safe_drop_constraint('SegmentMember', 'SegmentMember_owner_id_fkey');
SELECT safe_drop_constraint('SegmentMember', 'segmentmember_segment_id_fkey');
SELECT safe_drop_constraint('SegmentMember', 'segmentmember_owner_id_fkey');

-- Notification
SELECT safe_drop_constraint('Notification', 'Notification_user_id_fkey');
SELECT safe_drop_constraint('Notification', 'notification_user_id_fkey');

-- Workflow
SELECT safe_drop_constraint('Workflow', 'Workflow_folder_id_fkey');
SELECT safe_drop_constraint('Workflow', 'workflow_folder_id_fkey');

-- WorkflowExecution
SELECT safe_drop_constraint('WorkflowExecution', 'WorkflowExecution_workflow_id_fkey');
SELECT safe_drop_constraint('WorkflowExecution', 'workflowexecution_workflow_id_fkey');

-- WorkflowStep
SELECT safe_drop_constraint('WorkflowStep', 'WorkflowStep_workflow_id_fkey');
SELECT safe_drop_constraint('WorkflowStep', 'workflowstep_workflow_id_fkey');

-- WorkflowExecutionLog
SELECT safe_drop_constraint('WorkflowExecutionLog', 'WorkflowExecutionLog_execution_id_fkey');
SELECT safe_drop_constraint('WorkflowExecutionLog', 'WorkflowExecutionLog_step_id_fkey');
SELECT safe_drop_constraint('WorkflowExecutionLog', 'workflowexecutionlog_execution_id_fkey');
SELECT safe_drop_constraint('WorkflowExecutionLog', 'workflowexecutionlog_step_id_fkey');

-- WorkflowRevision
SELECT safe_drop_constraint('WorkflowRevision', 'WorkflowRevision_workflow_id_fkey');
SELECT safe_drop_constraint('WorkflowRevision', 'workflowrevision_workflow_id_fkey');

-- SegmentActivity
SELECT safe_drop_constraint('SegmentActivity', 'SegmentActivity_segment_id_fkey');
SELECT safe_drop_constraint('SegmentActivity', 'segmentactivity_segment_id_fkey');

-- SegmentSnapshot
SELECT safe_drop_constraint('SegmentSnapshot', 'SegmentSnapshot_segment_id_fkey');
SELECT safe_drop_constraint('SegmentSnapshot', 'segmentsnapshot_segment_id_fkey');

-- Conversation
SELECT safe_drop_constraint('Conversation', 'Conversation_owner_id_fkey');
SELECT safe_drop_constraint('Conversation', 'conversation_owner_id_fkey');

-- Message
SELECT safe_drop_constraint('Message', 'Message_conversation_id_fkey');
SELECT safe_drop_constraint('Message', 'message_conversation_id_fkey');

-- Activity
SELECT safe_drop_constraint('Activity', 'Activity_owner_id_fkey');
SELECT safe_drop_constraint('Activity', 'activity_owner_id_fkey');
SELECT safe_drop_constraint('Activity', 'Activity_pet_id_fkey');
SELECT safe_drop_constraint('Activity', 'activity_pet_id_fkey');
SELECT safe_drop_constraint('Activity', 'Activity_booking_id_fkey');
SELECT safe_drop_constraint('Activity', 'activity_booking_id_fkey');
SELECT safe_drop_constraint('Activity', 'Activity_user_id_fkey');
SELECT safe_drop_constraint('Activity', 'activity_user_id_fkey');

-- PropertyValue
SELECT safe_drop_constraint('PropertyValue', 'PropertyValue_property_id_fkey');
SELECT safe_drop_constraint('PropertyValue', 'propertyvalue_property_id_fkey');

-- PropertyHistory
SELECT safe_drop_constraint('PropertyHistory', 'PropertyHistory_property_id_fkey');
SELECT safe_drop_constraint('PropertyHistory', 'propertyhistory_property_id_fkey');

-- PipelineStage
SELECT safe_drop_constraint('PipelineStage', 'PipelineStage_pipeline_id_fkey');
SELECT safe_drop_constraint('PipelineStage', 'pipelinestage_pipeline_id_fkey');

-- ObjectStatus
SELECT safe_drop_constraint('ObjectStatus', 'ObjectStatus_pipeline_id_fkey');
SELECT safe_drop_constraint('ObjectStatus', 'objectstatus_pipeline_id_fkey');

-- TimeEntry
SELECT safe_drop_constraint('TimeEntry', 'TimeEntry_user_id_fkey');
SELECT safe_drop_constraint('TimeEntry', 'timeentry_user_id_fkey');

-- TimePunch
SELECT safe_drop_constraint('TimePunch', 'TimePunch_user_id_fkey');
SELECT safe_drop_constraint('TimePunch', 'timepunch_user_id_fkey');
SELECT safe_drop_constraint('TimePunch', 'TimePunch_time_entry_id_fkey');
SELECT safe_drop_constraint('TimePunch', 'timepunch_time_entry_id_fkey');

DROP FUNCTION IF EXISTS safe_drop_constraint(TEXT, TEXT);

-- ============================================================================
-- 2. Drop old UUID Foreign Key columns
-- ============================================================================

-- Helper function to safely drop columns (uses CASCADE for FK dependencies)
CREATE OR REPLACE FUNCTION safe_drop_column(p_table TEXT, p_column TEXT)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = p_table AND column_name = p_column
    ) THEN
        EXECUTE format('ALTER TABLE %I DROP COLUMN %I CASCADE', p_table, p_column);
        RAISE NOTICE 'Dropped %.% (CASCADE)', p_table, p_column;
    END IF;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table % does not exist', p_table;
END;
$$ LANGUAGE plpgsql;

-- Pet FK columns
SELECT safe_drop_column('Pet', 'vet_id');
SELECT safe_drop_column('Pet', 'created_by');
SELECT safe_drop_column('Pet', 'updated_by');

-- PetOwner FK columns
SELECT safe_drop_column('PetOwner', 'pet_id');
SELECT safe_drop_column('PetOwner', 'owner_id');

-- Booking FK columns
SELECT safe_drop_column('Booking', 'owner_id');
SELECT safe_drop_column('Booking', 'service_id');
SELECT safe_drop_column('Booking', 'kennel_id');
SELECT safe_drop_column('Booking', 'checked_in_by');
SELECT safe_drop_column('Booking', 'checked_out_by');
SELECT safe_drop_column('Booking', 'created_by');
SELECT safe_drop_column('Booking', 'updated_by');

-- BookingPet FK columns
SELECT safe_drop_column('BookingPet', 'booking_id');
SELECT safe_drop_column('BookingPet', 'pet_id');

-- Payment FK columns
SELECT safe_drop_column('Payment', 'invoice_id');
SELECT safe_drop_column('Payment', 'owner_id');
SELECT safe_drop_column('Payment', 'processed_by');

-- Invoice FK columns
SELECT safe_drop_column('Invoice', 'owner_id');
SELECT safe_drop_column('Invoice', 'booking_id');
SELECT safe_drop_column('Invoice', 'created_by');

-- InvoiceLine FK columns
SELECT safe_drop_column('InvoiceLine', 'invoice_id');

-- Task FK columns
SELECT safe_drop_column('Task', 'assigned_to');
SELECT safe_drop_column('Task', 'booking_id');
SELECT safe_drop_column('Task', 'pet_id');
SELECT safe_drop_column('Task', 'completed_by');
SELECT safe_drop_column('Task', 'created_by');

-- Vaccination FK columns
SELECT safe_drop_column('Vaccination', 'pet_id');
SELECT safe_drop_column('Vaccination', 'created_by');

-- Incident FK columns
SELECT safe_drop_column('Incident', 'pet_id');
SELECT safe_drop_column('Incident', 'booking_id');
SELECT safe_drop_column('Incident', 'reported_by');
SELECT safe_drop_column('Incident', 'resolved_by');

-- RunAssignment FK columns
SELECT safe_drop_column('RunAssignment', 'run_id');
SELECT safe_drop_column('RunAssignment', 'booking_id');
SELECT safe_drop_column('RunAssignment', 'pet_id');
SELECT safe_drop_column('RunAssignment', 'created_by');

-- UserRole FK columns
SELECT safe_drop_column('UserRole', 'user_id');
SELECT safe_drop_column('UserRole', 'role_id');
SELECT safe_drop_column('UserRole', 'assigned_by');

-- UserSession FK columns
SELECT safe_drop_column('UserSession', 'user_id');

-- Segment FK columns
SELECT safe_drop_column('Segment', 'created_by');

-- SegmentMember FK columns
SELECT safe_drop_column('SegmentMember', 'segment_id');
SELECT safe_drop_column('SegmentMember', 'owner_id');
SELECT safe_drop_column('SegmentMember', 'added_by');

-- SegmentActivity FK columns
SELECT safe_drop_column('SegmentActivity', 'segment_id');

-- SegmentSnapshot FK columns
SELECT safe_drop_column('SegmentSnapshot', 'segment_id');

-- Notification FK columns
SELECT safe_drop_column('Notification', 'user_id');

-- Note FK columns
SELECT safe_drop_column('Note', 'created_by');

-- AuditLog FK columns
SELECT safe_drop_column('AuditLog', 'user_id');

-- DeletedRecord FK columns
SELECT safe_drop_column('DeletedRecord', 'deleted_by');

-- Owner FK columns
SELECT safe_drop_column('Owner', 'created_by');
SELECT safe_drop_column('Owner', 'updated_by');

-- Workflow FK columns
SELECT safe_drop_column('Workflow', 'created_by');
SELECT safe_drop_column('Workflow', 'folder_id');

-- WorkflowExecution FK columns
SELECT safe_drop_column('WorkflowExecution', 'workflow_id');

-- WorkflowStep FK columns
SELECT safe_drop_column('WorkflowStep', 'workflow_id');

-- WorkflowExecutionLog FK columns
SELECT safe_drop_column('WorkflowExecutionLog', 'execution_id');
SELECT safe_drop_column('WorkflowExecutionLog', 'step_id');

-- WorkflowRevision FK columns
SELECT safe_drop_column('WorkflowRevision', 'workflow_id');

-- Conversation FK columns
SELECT safe_drop_column('Conversation', 'owner_id');

-- Message FK columns
SELECT safe_drop_column('Message', 'conversation_id');

-- Activity FK columns
SELECT safe_drop_column('Activity', 'owner_id');
SELECT safe_drop_column('Activity', 'pet_id');
SELECT safe_drop_column('Activity', 'booking_id');
SELECT safe_drop_column('Activity', 'user_id');

-- PropertyValue FK columns
SELECT safe_drop_column('PropertyValue', 'property_id');

-- PropertyHistory FK columns
SELECT safe_drop_column('PropertyHistory', 'property_id');
SELECT safe_drop_column('PropertyHistory', 'changed_by');

-- PipelineStage FK columns
SELECT safe_drop_column('PipelineStage', 'pipeline_id');

-- ObjectStatus FK columns
SELECT safe_drop_column('ObjectStatus', 'pipeline_id');

-- TimeEntry FK columns
SELECT safe_drop_column('TimeEntry', 'user_id');

-- TimePunch FK columns
SELECT safe_drop_column('TimePunch', 'user_id');
SELECT safe_drop_column('TimePunch', 'time_entry_id');

-- ============================================================================
-- 3. Drop old UUID primary key columns
-- ============================================================================

-- First, drop the primary key constraints, then drop the id columns
-- Note: We keep tenant_id as it's still used for tenant isolation

-- Helper to drop PK and id column - uses CASCADE to handle dependent FK constraints
CREATE OR REPLACE FUNCTION drop_uuid_id_column(p_table TEXT)
RETURNS VOID AS $$
DECLARE
    v_pk_name TEXT;
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = p_table) THEN
        RAISE NOTICE 'Table % does not exist', p_table;
        RETURN;
    END IF;

    -- Check if id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = p_table AND column_name = 'id'
    ) THEN
        RAISE NOTICE 'Table % has no id column', p_table;
        RETURN;
    END IF;

    -- Find and drop primary key constraint WITH CASCADE to drop dependent FKs
    SELECT constraint_name INTO v_pk_name
    FROM information_schema.table_constraints
    WHERE table_name = p_table AND constraint_type = 'PRIMARY KEY';

    IF v_pk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I CASCADE', p_table, v_pk_name);
        RAISE NOTICE 'Dropped PK constraint % on % (CASCADE)', v_pk_name, p_table;
    END IF;

    -- Drop the id column CASCADE to handle any remaining dependencies
    EXECUTE format('ALTER TABLE %I DROP COLUMN id CASCADE', p_table);
    RAISE NOTICE 'Dropped id column from %', p_table;

    -- Create new primary key on (tenant_id, record_id) if both exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = p_table AND column_name = 'tenant_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = p_table AND column_name = 'record_id'
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD PRIMARY KEY (tenant_id, record_id)', p_table);
        RAISE NOTICE 'Created new PK (tenant_id, record_id) on %', p_table;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = p_table AND column_name = 'record_id'
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD PRIMARY KEY (record_id)', p_table);
        RAISE NOTICE 'Created new PK (record_id) on %', p_table;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Core CRM Objects
SELECT drop_uuid_id_column('Owner');
SELECT drop_uuid_id_column('Pet');
SELECT drop_uuid_id_column('Booking');
SELECT drop_uuid_id_column('Payment');
SELECT drop_uuid_id_column('Invoice');
SELECT drop_uuid_id_column('InvoiceLine');
SELECT drop_uuid_id_column('Task');
SELECT drop_uuid_id_column('Note');
SELECT drop_uuid_id_column('Vaccination');
SELECT drop_uuid_id_column('Incident');
SELECT drop_uuid_id_column('Veterinarian');

-- Workflow Objects
SELECT drop_uuid_id_column('Workflow');
SELECT drop_uuid_id_column('WorkflowStep');
SELECT drop_uuid_id_column('WorkflowExecution');
SELECT drop_uuid_id_column('WorkflowExecutionLog');
SELECT drop_uuid_id_column('WorkflowFolder');
SELECT drop_uuid_id_column('WorkflowRevision');
SELECT drop_uuid_id_column('WorkflowTemplate');

-- Segment Objects
SELECT drop_uuid_id_column('Segment');
SELECT drop_uuid_id_column('SegmentMember');
SELECT drop_uuid_id_column('SegmentActivity');
SELECT drop_uuid_id_column('SegmentSnapshot');

-- Service Objects
SELECT drop_uuid_id_column('Service');
SELECT drop_uuid_id_column('Package');

-- Facility Objects
SELECT drop_uuid_id_column('Run');
SELECT drop_uuid_id_column('Kennel');
SELECT drop_uuid_id_column('RunTemplate');
SELECT drop_uuid_id_column('RunAssignment');

-- User/Staff Objects
SELECT drop_uuid_id_column('User');
SELECT drop_uuid_id_column('Staff');
SELECT drop_uuid_id_column('Role');
SELECT drop_uuid_id_column('UserRole');
SELECT drop_uuid_id_column('UserSession');
SELECT drop_uuid_id_column('TimeEntry');
SELECT drop_uuid_id_column('TimePunch');

-- Communication Objects
SELECT drop_uuid_id_column('Conversation');
SELECT drop_uuid_id_column('Message');
SELECT drop_uuid_id_column('Notification');
SELECT drop_uuid_id_column('EmailTemplate');

-- Configuration Objects
SELECT drop_uuid_id_column('CustomProperty');
SELECT drop_uuid_id_column('ObjectSettings');
SELECT drop_uuid_id_column('ObjectAssociation');
SELECT drop_uuid_id_column('ObjectPipeline');
SELECT drop_uuid_id_column('PipelineStage');
SELECT drop_uuid_id_column('ObjectStatus');
SELECT drop_uuid_id_column('SavedView');
SELECT drop_uuid_id_column('AssociationLabel');
SELECT drop_uuid_id_column('ObjectIndexSettings');
SELECT drop_uuid_id_column('ObjectRecordLayout');
SELECT drop_uuid_id_column('ObjectPreviewLayout');

-- Property System Objects
SELECT drop_uuid_id_column('Property');
SELECT drop_uuid_id_column('PropertyGroup');
SELECT drop_uuid_id_column('PropertyLogicRule');
SELECT drop_uuid_id_column('PropertyValue');
SELECT drop_uuid_id_column('PropertyTemplate');
SELECT drop_uuid_id_column('PropertyHistory');

-- System Objects
SELECT drop_uuid_id_column('AuditLog');
SELECT drop_uuid_id_column('DeletedRecord');
SELECT drop_uuid_id_column('Import');
SELECT drop_uuid_id_column('Activity');

DROP FUNCTION IF EXISTS drop_uuid_id_column(TEXT);
DROP FUNCTION IF EXISTS safe_drop_column(TEXT, TEXT);

-- ============================================================================
-- 4. Drop Migration Mapping Tables
-- ============================================================================

DROP TABLE IF EXISTS "_Migration_Owner_Id_Map";
DROP TABLE IF EXISTS "_Migration_Pet_Id_Map";
DROP TABLE IF EXISTS "_Migration_Booking_Id_Map";
DROP TABLE IF EXISTS "_Migration_Service_Id_Map";
DROP TABLE IF EXISTS "_Migration_Kennel_Id_Map";
DROP TABLE IF EXISTS "_Migration_Run_Id_Map";
DROP TABLE IF EXISTS "_Migration_User_Id_Map";
DROP TABLE IF EXISTS "_Migration_Role_Id_Map";
DROP TABLE IF EXISTS "_Migration_Invoice_Id_Map";
DROP TABLE IF EXISTS "_Migration_Segment_Id_Map";
DROP TABLE IF EXISTS "_Migration_Veterinarian_Id_Map";
DROP TABLE IF EXISTS "_Migration_Workflow_Id_Map";
DROP TABLE IF EXISTS "_Migration_WorkflowStep_Id_Map";
DROP TABLE IF EXISTS "_Migration_WorkflowExecution_Id_Map";
DROP TABLE IF EXISTS "_Migration_WorkflowExecutionLog_Id_Map";
DROP TABLE IF EXISTS "_Migration_Package_Id_Map";

-- ============================================================================
-- 5. Rename *_record_id columns to simpler names (optional cleanup)
-- ============================================================================

-- This section renames the new FK columns from *_record_id to the simpler names
-- e.g., owner_record_id -> owner_id (now that old owner_id is dropped)

CREATE OR REPLACE FUNCTION safe_rename_column(p_table TEXT, p_old TEXT, p_new TEXT)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = p_table AND column_name = p_old
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = p_table AND column_name = p_new
    ) THEN
        EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', p_table, p_old, p_new);
        RAISE NOTICE 'Renamed %.% to %', p_table, p_old, p_new;
    END IF;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'Table % does not exist', p_table;
END;
$$ LANGUAGE plpgsql;

-- Pet
SELECT safe_rename_column('Pet', 'vet_record_id', 'vet_id');
SELECT safe_rename_column('Pet', 'created_by_record_id', 'created_by');
SELECT safe_rename_column('Pet', 'updated_by_record_id', 'updated_by');

-- PetOwner
SELECT safe_rename_column('PetOwner', 'pet_record_id', 'pet_id');
SELECT safe_rename_column('PetOwner', 'owner_record_id', 'owner_id');

-- Booking
SELECT safe_rename_column('Booking', 'owner_record_id', 'owner_id');
SELECT safe_rename_column('Booking', 'service_record_id', 'service_id');
SELECT safe_rename_column('Booking', 'kennel_record_id', 'kennel_id');
SELECT safe_rename_column('Booking', 'checked_in_by_record_id', 'checked_in_by');
SELECT safe_rename_column('Booking', 'checked_out_by_record_id', 'checked_out_by');
SELECT safe_rename_column('Booking', 'created_by_record_id', 'created_by');
SELECT safe_rename_column('Booking', 'updated_by_record_id', 'updated_by');

-- BookingPet
SELECT safe_rename_column('BookingPet', 'booking_record_id', 'booking_id');
SELECT safe_rename_column('BookingPet', 'pet_record_id', 'pet_id');

-- Payment
SELECT safe_rename_column('Payment', 'invoice_record_id', 'invoice_id');
SELECT safe_rename_column('Payment', 'owner_record_id', 'owner_id');
SELECT safe_rename_column('Payment', 'processed_by_record_id', 'processed_by');

-- Invoice
SELECT safe_rename_column('Invoice', 'owner_record_id', 'owner_id');
SELECT safe_rename_column('Invoice', 'booking_record_id', 'booking_id');
SELECT safe_rename_column('Invoice', 'created_by_record_id', 'created_by');

-- InvoiceLine
SELECT safe_rename_column('InvoiceLine', 'invoice_record_id', 'invoice_id');

-- Task
SELECT safe_rename_column('Task', 'assigned_to_record_id', 'assigned_to');
SELECT safe_rename_column('Task', 'booking_record_id', 'booking_id');
SELECT safe_rename_column('Task', 'pet_record_id', 'pet_id');
SELECT safe_rename_column('Task', 'completed_by_record_id', 'completed_by');
SELECT safe_rename_column('Task', 'created_by_record_id', 'created_by');

-- Vaccination
SELECT safe_rename_column('Vaccination', 'pet_record_id', 'pet_id');
SELECT safe_rename_column('Vaccination', 'created_by_record_id', 'created_by');

-- Incident
SELECT safe_rename_column('Incident', 'pet_record_id', 'pet_id');
SELECT safe_rename_column('Incident', 'booking_record_id', 'booking_id');
SELECT safe_rename_column('Incident', 'reported_by_record_id', 'reported_by');
SELECT safe_rename_column('Incident', 'resolved_by_record_id', 'resolved_by');

-- RunAssignment
SELECT safe_rename_column('RunAssignment', 'run_record_id', 'run_id');
SELECT safe_rename_column('RunAssignment', 'booking_record_id', 'booking_id');
SELECT safe_rename_column('RunAssignment', 'pet_record_id', 'pet_id');
SELECT safe_rename_column('RunAssignment', 'created_by_record_id', 'created_by');

-- UserRole
SELECT safe_rename_column('UserRole', 'user_record_id', 'user_id');
SELECT safe_rename_column('UserRole', 'role_record_id', 'role_id');
SELECT safe_rename_column('UserRole', 'assigned_by_record_id', 'assigned_by');

-- UserSession
SELECT safe_rename_column('UserSession', 'user_record_id', 'user_id');

-- Segment
SELECT safe_rename_column('Segment', 'created_by_record_id', 'created_by');

-- SegmentMember
SELECT safe_rename_column('SegmentMember', 'segment_record_id', 'segment_id');
SELECT safe_rename_column('SegmentMember', 'owner_record_id', 'owner_id');
SELECT safe_rename_column('SegmentMember', 'added_by_record_id', 'added_by');

-- Notification
SELECT safe_rename_column('Notification', 'user_record_id', 'user_id');

-- Note
SELECT safe_rename_column('Note', 'created_by_record_id', 'created_by');

-- AuditLog
SELECT safe_rename_column('AuditLog', 'user_record_id', 'user_id');

-- DeletedRecord
SELECT safe_rename_column('DeletedRecord', 'deleted_by_record_id', 'deleted_by');

-- Owner
SELECT safe_rename_column('Owner', 'created_by_record_id', 'created_by');
SELECT safe_rename_column('Owner', 'updated_by_record_id', 'updated_by');

-- Workflow
SELECT safe_rename_column('Workflow', 'created_by_record_id', 'created_by');
SELECT safe_rename_column('Workflow', 'folder_record_id', 'folder_id');

-- WorkflowExecution
SELECT safe_rename_column('WorkflowExecution', 'workflow_record_id', 'workflow_id');

-- WorkflowStep
SELECT safe_rename_column('WorkflowStep', 'workflow_record_id', 'workflow_id');

-- WorkflowExecutionLog
SELECT safe_rename_column('WorkflowExecutionLog', 'execution_record_id', 'execution_id');
SELECT safe_rename_column('WorkflowExecutionLog', 'step_record_id', 'step_id');

-- WorkflowRevision
SELECT safe_rename_column('WorkflowRevision', 'workflow_record_id', 'workflow_id');

-- Conversation
SELECT safe_rename_column('Conversation', 'owner_record_id', 'owner_id');

-- Message
SELECT safe_rename_column('Message', 'conversation_record_id', 'conversation_id');

-- Activity
SELECT safe_rename_column('Activity', 'owner_record_id', 'owner_id');
SELECT safe_rename_column('Activity', 'pet_record_id', 'pet_id');
SELECT safe_rename_column('Activity', 'booking_record_id', 'booking_id');
SELECT safe_rename_column('Activity', 'user_record_id', 'user_id');

-- PropertyValue
SELECT safe_rename_column('PropertyValue', 'property_record_id', 'property_id');

-- PropertyHistory
SELECT safe_rename_column('PropertyHistory', 'property_record_id', 'property_id');
SELECT safe_rename_column('PropertyHistory', 'changed_by_record_id', 'changed_by');

-- PipelineStage
SELECT safe_rename_column('PipelineStage', 'pipeline_record_id', 'pipeline_id');

-- ObjectStatus
SELECT safe_rename_column('ObjectStatus', 'pipeline_record_id', 'pipeline_id');

-- TimeEntry
SELECT safe_rename_column('TimeEntry', 'user_record_id', 'user_id');

-- TimePunch
SELECT safe_rename_column('TimePunch', 'user_record_id', 'user_id');
SELECT safe_rename_column('TimePunch', 'time_entry_record_id', 'time_entry_id');

-- SegmentActivity
SELECT safe_rename_column('SegmentActivity', 'segment_record_id', 'segment_id');

-- SegmentSnapshot
SELECT safe_rename_column('SegmentSnapshot', 'segment_record_id', 'segment_id');

DROP FUNCTION IF EXISTS safe_rename_column(TEXT, TEXT, TEXT);

COMMIT;

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
-- After this migration:
-- - All tables use (tenant_id, record_id) as primary key
-- - All FK columns are now BIGINT references to record_id
-- - FK columns have their original names (owner_id, pet_id, etc.) but point to BIGINT record_ids
-- - No more UUID columns in the schema
-- - Migration mapping tables are removed
-- ============================================================================
