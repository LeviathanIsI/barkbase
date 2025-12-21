-- ============================================================================
-- BarkBase ID System Migration - Part 2: Add record_id Columns
-- ============================================================================
-- This migration adds record_id columns to all applicable tables.
-- Run this AFTER migration 01 (foundation).
--
-- IMPORTANT: Some tables don't have tenant_id because they inherit tenant
-- isolation through their parent FK (e.g., WorkflowStep -> Workflow).
-- For these tables, we only add record_id without tenant-composite index.
-- ============================================================================

-- ============================================================================
-- Core CRM Objects (all have tenant_id)
-- ============================================================================

-- Owner (code: 1)
ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_owner_record_id ON "Owner"(tenant_id, record_id);

-- Pet (code: 2)
ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_pet_record_id ON "Pet"(tenant_id, record_id);

-- Booking (code: 3)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_booking_record_id ON "Booking"(tenant_id, record_id);

-- Payment (code: 4)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_payment_record_id ON "Payment"(tenant_id, record_id);

-- Invoice (code: 5)
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_invoice_record_id ON "Invoice"(tenant_id, record_id);

-- InvoiceLine (code: 6)
ALTER TABLE "InvoiceLine" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_invoiceline_record_id ON "InvoiceLine"(tenant_id, record_id);

-- Task (code: 7)
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_task_record_id ON "Task"(tenant_id, record_id);

-- Note (code: 8) - Check if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Note') THEN
    EXECUTE 'ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_note_record_id ON "Note"(tenant_id, record_id)';
  END IF;
END $$;

-- Vaccination (code: 9)
ALTER TABLE "Vaccination" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_vaccination_record_id ON "Vaccination"(tenant_id, record_id);

-- Incident (code: 10)
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_incident_record_id ON "Incident"(tenant_id, record_id);

-- Veterinarian (code: 11)
ALTER TABLE "Veterinarian" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_veterinarian_record_id ON "Veterinarian"(tenant_id, record_id);

-- ============================================================================
-- Workflow Objects
-- NOTE: WorkflowStep, WorkflowExecutionLog, WorkflowRevision do NOT have tenant_id
-- They inherit tenant isolation through their parent FK
-- ============================================================================

-- Workflow (code: 20) - HAS tenant_id
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Workflow') THEN
    EXECUTE 'ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workflow_record_id ON "Workflow"(tenant_id, record_id)';
  END IF;
END $$;

-- WorkflowStep (code: 21) - NO tenant_id, references Workflow
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'WorkflowStep') THEN
    EXECUTE 'ALTER TABLE "WorkflowStep" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workflowstep_record_id ON "WorkflowStep"(workflow_id, record_id)';
  END IF;
END $$;

-- WorkflowExecution (code: 22) - HAS tenant_id
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'WorkflowExecution') THEN
    EXECUTE 'ALTER TABLE "WorkflowExecution" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workflowexecution_record_id ON "WorkflowExecution"(tenant_id, record_id)';
  END IF;
END $$;

-- WorkflowExecutionLog (code: 23) - NO tenant_id, references WorkflowExecution
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'WorkflowExecutionLog') THEN
    EXECUTE 'ALTER TABLE "WorkflowExecutionLog" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workflowexecutionlog_record_id ON "WorkflowExecutionLog"(execution_id, record_id)';
  END IF;
END $$;

-- WorkflowFolder (code: 24) - HAS tenant_id
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'WorkflowFolder') THEN
    EXECUTE 'ALTER TABLE "WorkflowFolder" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workflowfolder_record_id ON "WorkflowFolder"(tenant_id, record_id)';
  END IF;
END $$;

-- WorkflowRevision (code: 25) - NO tenant_id, references Workflow
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'WorkflowRevision') THEN
    EXECUTE 'ALTER TABLE "WorkflowRevision" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workflowrevision_record_id ON "WorkflowRevision"(workflow_id, record_id)';
  END IF;
END $$;

-- WorkflowTemplate (code: 26) - HAS tenant_id (nullable for system templates)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'WorkflowTemplate') THEN
    EXECUTE 'ALTER TABLE "WorkflowTemplate" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_workflowtemplate_record_id ON "WorkflowTemplate"(record_id)';
  END IF;
END $$;

-- ============================================================================
-- Segment Objects
-- ============================================================================

-- Segment (code: 27)
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_segment_record_id ON "Segment"(tenant_id, record_id);

-- SegmentMember (code: 28)
ALTER TABLE "SegmentMember" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_segmentmember_record_id ON "SegmentMember"(tenant_id, record_id);

-- SegmentActivity (code: 29) - NO tenant_id, references Segment
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'SegmentActivity') THEN
    EXECUTE 'ALTER TABLE "SegmentActivity" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_segmentactivity_record_id ON "SegmentActivity"(segment_id, record_id)';
  END IF;
END $$;

-- SegmentSnapshot (code: 94) - NO tenant_id, references Segment
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'SegmentSnapshot') THEN
    EXECUTE 'ALTER TABLE "SegmentSnapshot" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_segmentsnapshot_record_id ON "SegmentSnapshot"(segment_id, record_id)';
  END IF;
END $$;

-- ============================================================================
-- Service Objects
-- ============================================================================

-- Service (code: 30)
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_service_record_id ON "Service"(tenant_id, record_id);

-- Package (code: 31)
ALTER TABLE "Package" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_package_record_id ON "Package"(tenant_id, record_id);

-- ============================================================================
-- Facility Objects
-- ============================================================================

-- Run (code: 40)
ALTER TABLE "Run" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_run_record_id ON "Run"(tenant_id, record_id);

-- Kennel (code: 41)
ALTER TABLE "Kennel" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_kennel_record_id ON "Kennel"(tenant_id, record_id);

-- RunTemplate (code: 42)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'RunTemplate') THEN
    EXECUTE 'ALTER TABLE "RunTemplate" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_runtemplate_record_id ON "RunTemplate"(tenant_id, record_id)';
  END IF;
END $$;

-- RunAssignment (code: 43)
ALTER TABLE "RunAssignment" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_runassignment_record_id ON "RunAssignment"(tenant_id, record_id);

-- ============================================================================
-- User/Staff Objects
-- ============================================================================

-- User (code: 50)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_user_record_id ON "User"(tenant_id, record_id);

-- Staff (code: 51)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Staff') THEN
    EXECUTE 'ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_staff_record_id ON "Staff"(tenant_id, record_id)';
  END IF;
END $$;

-- Role (code: 52)
ALTER TABLE "Role" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_role_record_id ON "Role"(tenant_id, record_id);

-- UserRole (code: 53)
ALTER TABLE "UserRole" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_userrole_record_id ON "UserRole"(tenant_id, record_id);

-- UserSession (code: 54)
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_usersession_record_id ON "UserSession"(tenant_id, record_id);

-- TimeEntry (code: 55)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'TimeEntry') THEN
    EXECUTE 'ALTER TABLE "TimeEntry" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_timeentry_record_id ON "TimeEntry"(tenant_id, record_id)';
  END IF;
END $$;

-- TimePunch (code: 56)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'TimePunch') THEN
    EXECUTE 'ALTER TABLE "TimePunch" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_timepunch_record_id ON "TimePunch"(tenant_id, record_id)';
  END IF;
END $$;

-- ============================================================================
-- Communication Objects
-- ============================================================================

-- Conversation (code: 60)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Conversation') THEN
    EXECUTE 'ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_conversation_record_id ON "Conversation"(tenant_id, record_id)';
  END IF;
END $$;

-- Message (code: 61)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Message') THEN
    EXECUTE 'ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_message_record_id ON "Message"(tenant_id, record_id)';
  END IF;
END $$;

-- Notification (code: 62)
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_notification_record_id ON "Notification"(tenant_id, record_id);

-- EmailTemplate (code: 63)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'EmailTemplate') THEN
    EXECUTE 'ALTER TABLE "EmailTemplate" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_emailtemplate_record_id ON "EmailTemplate"(tenant_id, record_id)';
  END IF;
END $$;

-- ============================================================================
-- Configuration Objects
-- ============================================================================

-- CustomProperty (code: 70)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'CustomProperty') THEN
    EXECUTE 'ALTER TABLE "CustomProperty" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_customproperty_record_id ON "CustomProperty"(tenant_id, record_id)';
  END IF;
END $$;

-- ObjectSettings (code: 71)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ObjectSettings') THEN
    EXECUTE 'ALTER TABLE "ObjectSettings" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_objectsettings_record_id ON "ObjectSettings"(tenant_id, record_id)';
  END IF;
END $$;

-- ObjectAssociation (code: 72)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ObjectAssociation') THEN
    EXECUTE 'ALTER TABLE "ObjectAssociation" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_objectassociation_record_id ON "ObjectAssociation"(tenant_id, record_id)';
  END IF;
END $$;

-- ObjectPipeline (code: 73)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ObjectPipeline') THEN
    EXECUTE 'ALTER TABLE "ObjectPipeline" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_objectpipeline_record_id ON "ObjectPipeline"(tenant_id, record_id)';
  END IF;
END $$;

-- PipelineStage (code: 74)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'PipelineStage') THEN
    EXECUTE 'ALTER TABLE "PipelineStage" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_pipelinestage_record_id ON "PipelineStage"(tenant_id, record_id)';
  END IF;
END $$;

-- ObjectStatus (code: 75)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ObjectStatus') THEN
    EXECUTE 'ALTER TABLE "ObjectStatus" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_objectstatus_record_id ON "ObjectStatus"(tenant_id, record_id)';
  END IF;
END $$;

-- SavedView (code: 76)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'SavedView') THEN
    EXECUTE 'ALTER TABLE "SavedView" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_savedview_record_id ON "SavedView"(tenant_id, record_id)';
  END IF;
END $$;

-- AssociationLabel (code: 77)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'AssociationLabel') THEN
    EXECUTE 'ALTER TABLE "AssociationLabel" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_associationlabel_record_id ON "AssociationLabel"(tenant_id, record_id)';
  END IF;
END $$;

-- ============================================================================
-- Property System Objects
-- ============================================================================

-- Property (code: 80)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Property') THEN
    EXECUTE 'ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_property_record_id ON "Property"(tenant_id, record_id)';
  END IF;
END $$;

-- PropertyGroup (code: 81)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'PropertyGroup') THEN
    EXECUTE 'ALTER TABLE "PropertyGroup" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_propertygroup_record_id ON "PropertyGroup"(tenant_id, record_id)';
  END IF;
END $$;

-- PropertyLogicRule (code: 82)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'PropertyLogicRule') THEN
    EXECUTE 'ALTER TABLE "PropertyLogicRule" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_propertylogicrule_record_id ON "PropertyLogicRule"(tenant_id, record_id)';
  END IF;
END $$;

-- PropertyValue (code: 83)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'PropertyValue') THEN
    EXECUTE 'ALTER TABLE "PropertyValue" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_propertyvalue_record_id ON "PropertyValue"(tenant_id, record_id)';
  END IF;
END $$;

-- PropertyTemplate (code: 84)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'PropertyTemplate') THEN
    EXECUTE 'ALTER TABLE "PropertyTemplate" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_propertytemplate_record_id ON "PropertyTemplate"(tenant_id, record_id)';
  END IF;
END $$;

-- PropertyHistory (code: 85)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'PropertyHistory') THEN
    EXECUTE 'ALTER TABLE "PropertyHistory" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_propertyhistory_record_id ON "PropertyHistory"(tenant_id, record_id)';
  END IF;
END $$;

-- ============================================================================
-- System Objects
-- ============================================================================

-- AuditLog (code: 90)
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_auditlog_record_id ON "AuditLog"(tenant_id, record_id);

-- DeletedRecord (code: 91)
ALTER TABLE "DeletedRecord" ADD COLUMN IF NOT EXISTS record_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_deletedrecord_record_id ON "DeletedRecord"(tenant_id, record_id);

-- Import (code: 92)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Import') THEN
    EXECUTE 'ALTER TABLE "Import" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_import_record_id ON "Import"(tenant_id, record_id)';
  END IF;
END $$;

-- Activity (code: 93)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Activity') THEN
    EXECUTE 'ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS record_id BIGINT';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_activity_record_id ON "Activity"(tenant_id, record_id)';
  END IF;
END $$;
