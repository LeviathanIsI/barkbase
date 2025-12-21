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
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create ID Mapping Tables for Core Objects
-- ============================================================================

-- These tables map old UUID id -> new (tenant_id, record_id) for FK migration
CREATE TABLE IF NOT EXISTS "_Migration_Owner_Id_Map" AS
SELECT id as old_id, tenant_id, record_id as new_record_id
FROM "Owner";
CREATE INDEX IF NOT EXISTS idx_mig_owner_old_id ON "_Migration_Owner_Id_Map"(old_id);

CREATE TABLE IF NOT EXISTS "_Migration_Pet_Id_Map" AS
SELECT id as old_id, tenant_id, record_id as new_record_id
FROM "Pet";
CREATE INDEX IF NOT EXISTS idx_mig_pet_old_id ON "_Migration_Pet_Id_Map"(old_id);

CREATE TABLE IF NOT EXISTS "_Migration_Booking_Id_Map" AS
SELECT id as old_id, tenant_id, record_id as new_record_id
FROM "Booking";
CREATE INDEX IF NOT EXISTS idx_mig_booking_old_id ON "_Migration_Booking_Id_Map"(old_id);

CREATE TABLE IF NOT EXISTS "_Migration_Service_Id_Map" AS
SELECT id as old_id, tenant_id, record_id as new_record_id
FROM "Service";
CREATE INDEX IF NOT EXISTS idx_mig_service_old_id ON "_Migration_Service_Id_Map"(old_id);

CREATE TABLE IF NOT EXISTS "_Migration_Kennel_Id_Map" AS
SELECT id as old_id, tenant_id, record_id as new_record_id
FROM "Kennel";
CREATE INDEX IF NOT EXISTS idx_mig_kennel_old_id ON "_Migration_Kennel_Id_Map"(old_id);

CREATE TABLE IF NOT EXISTS "_Migration_Run_Id_Map" AS
SELECT id as old_id, tenant_id, record_id as new_record_id
FROM "Run";
CREATE INDEX IF NOT EXISTS idx_mig_run_old_id ON "_Migration_Run_Id_Map"(old_id);

CREATE TABLE IF NOT EXISTS "_Migration_User_Id_Map" AS
SELECT id as old_id, tenant_id, record_id as new_record_id
FROM "User";
CREATE INDEX IF NOT EXISTS idx_mig_user_old_id ON "_Migration_User_Id_Map"(old_id);

CREATE TABLE IF NOT EXISTS "_Migration_Role_Id_Map" AS
SELECT id as old_id, tenant_id, record_id as new_record_id
FROM "Role";
CREATE INDEX IF NOT EXISTS idx_mig_role_old_id ON "_Migration_Role_Id_Map"(old_id);

CREATE TABLE IF NOT EXISTS "_Migration_Invoice_Id_Map" AS
SELECT id as old_id, tenant_id, record_id as new_record_id
FROM "Invoice";
CREATE INDEX IF NOT EXISTS idx_mig_invoice_old_id ON "_Migration_Invoice_Id_Map"(old_id);

CREATE TABLE IF NOT EXISTS "_Migration_Segment_Id_Map" AS
SELECT id as old_id, tenant_id, record_id as new_record_id
FROM "Segment";
CREATE INDEX IF NOT EXISTS idx_mig_segment_old_id ON "_Migration_Segment_Id_Map"(old_id);

CREATE TABLE IF NOT EXISTS "_Migration_Veterinarian_Id_Map" AS
SELECT id as old_id, tenant_id, record_id as new_record_id
FROM "Veterinarian";
CREATE INDEX IF NOT EXISTS idx_mig_vet_old_id ON "_Migration_Veterinarian_Id_Map"(old_id);

-- Workflow mapping (with existence check)
DO $$ BEGIN
    EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_Workflow_Id_Map" AS
    SELECT id as old_id, tenant_id, record_id as new_record_id
    FROM "Workflow"';
    CREATE INDEX IF NOT EXISTS idx_mig_workflow_old_id ON "_Migration_Workflow_Id_Map"(old_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
    EXECUTE 'CREATE TABLE IF NOT EXISTS "_Migration_WorkflowStep_Id_Map" AS
    SELECT id as old_id, tenant_id, record_id as new_record_id
    FROM "WorkflowStep"';
    CREATE INDEX IF NOT EXISTS idx_mig_workflowstep_old_id ON "_Migration_WorkflowStep_Id_Map"(old_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================================
-- 2. Add new FK columns with _record_id suffix
-- ============================================================================

-- Pet references Owner and Veterinarian
ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS vet_record_id BIGINT;

-- PetOwner references Pet and Owner
ALTER TABLE "PetOwner" ADD COLUMN IF NOT EXISTS pet_record_id BIGINT;
ALTER TABLE "PetOwner" ADD COLUMN IF NOT EXISTS owner_record_id BIGINT;

-- Booking references Owner, Service, Kennel
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS owner_record_id BIGINT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS service_record_id BIGINT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS kennel_record_id BIGINT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS checked_in_by_record_id BIGINT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS checked_out_by_record_id BIGINT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS updated_by_record_id BIGINT;

-- BookingPet references Booking and Pet
ALTER TABLE "BookingPet" ADD COLUMN IF NOT EXISTS booking_record_id BIGINT;
ALTER TABLE "BookingPet" ADD COLUMN IF NOT EXISTS pet_record_id BIGINT;

-- Payment references Invoice and Owner
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS invoice_record_id BIGINT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS owner_record_id BIGINT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS processed_by_record_id BIGINT;

-- Invoice references Owner and Booking
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS owner_record_id BIGINT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS booking_record_id BIGINT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT;

-- InvoiceLine references Invoice
ALTER TABLE "InvoiceLine" ADD COLUMN IF NOT EXISTS invoice_record_id BIGINT;

-- Task references User, Booking, Pet
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS assigned_to_record_id BIGINT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS booking_record_id BIGINT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS pet_record_id BIGINT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS completed_by_record_id BIGINT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT;

-- Vaccination references Pet and User
ALTER TABLE "Vaccination" ADD COLUMN IF NOT EXISTS pet_record_id BIGINT;
ALTER TABLE "Vaccination" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT;

-- Incident references Pet, Booking, User
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS pet_record_id BIGINT;
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS booking_record_id BIGINT;
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS reported_by_record_id BIGINT;
ALTER TABLE "Incident" ADD COLUMN IF NOT EXISTS resolved_by_record_id BIGINT;

-- RunAssignment references Run, Booking, Pet, User
ALTER TABLE "RunAssignment" ADD COLUMN IF NOT EXISTS run_record_id BIGINT;
ALTER TABLE "RunAssignment" ADD COLUMN IF NOT EXISTS booking_record_id BIGINT;
ALTER TABLE "RunAssignment" ADD COLUMN IF NOT EXISTS pet_record_id BIGINT;
ALTER TABLE "RunAssignment" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT;

-- UserRole references User and Role
ALTER TABLE "UserRole" ADD COLUMN IF NOT EXISTS user_record_id BIGINT;
ALTER TABLE "UserRole" ADD COLUMN IF NOT EXISTS role_record_id BIGINT;
ALTER TABLE "UserRole" ADD COLUMN IF NOT EXISTS assigned_by_record_id BIGINT;

-- UserSession references User
ALTER TABLE "UserSession" ADD COLUMN IF NOT EXISTS user_record_id BIGINT;

-- Segment references User
ALTER TABLE "Segment" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT;

-- SegmentMember references Segment, Owner, User
ALTER TABLE "SegmentMember" ADD COLUMN IF NOT EXISTS segment_record_id BIGINT;
ALTER TABLE "SegmentMember" ADD COLUMN IF NOT EXISTS owner_record_id BIGINT;
ALTER TABLE "SegmentMember" ADD COLUMN IF NOT EXISTS added_by_record_id BIGINT;

-- Notification references User
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS user_record_id BIGINT;

-- Note references User
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT;

-- AuditLog references User
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS user_record_id BIGINT;

-- DeletedRecord references User
ALTER TABLE "DeletedRecord" ADD COLUMN IF NOT EXISTS deleted_by_record_id BIGINT;

-- Owner references User (created_by, updated_by)
ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT;
ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS updated_by_record_id BIGINT;

-- Pet references User (created_by, updated_by)
ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS created_by_record_id BIGINT;
ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS updated_by_record_id BIGINT;

-- ============================================================================
-- 3. Backfill FK columns using mapping tables
-- ============================================================================

-- Pet.vet_record_id
UPDATE "Pet" p
SET vet_record_id = m.new_record_id
FROM "_Migration_Veterinarian_Id_Map" m
WHERE p.vet_id = m.old_id AND p.vet_id IS NOT NULL;

-- PetOwner
UPDATE "PetOwner" po
SET pet_record_id = m.new_record_id
FROM "_Migration_Pet_Id_Map" m
WHERE po.pet_id = m.old_id;

UPDATE "PetOwner" po
SET owner_record_id = m.new_record_id
FROM "_Migration_Owner_Id_Map" m
WHERE po.owner_id = m.old_id;

-- Booking FKs
UPDATE "Booking" b
SET owner_record_id = m.new_record_id
FROM "_Migration_Owner_Id_Map" m
WHERE b.owner_id = m.old_id;

UPDATE "Booking" b
SET service_record_id = m.new_record_id
FROM "_Migration_Service_Id_Map" m
WHERE b.service_id = m.old_id;

UPDATE "Booking" b
SET kennel_record_id = m.new_record_id
FROM "_Migration_Kennel_Id_Map" m
WHERE b.kennel_id = m.old_id AND b.kennel_id IS NOT NULL;

UPDATE "Booking" b
SET checked_in_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE b.checked_in_by = m.old_id AND b.checked_in_by IS NOT NULL;

UPDATE "Booking" b
SET checked_out_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE b.checked_out_by = m.old_id AND b.checked_out_by IS NOT NULL;

UPDATE "Booking" b
SET created_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE b.created_by = m.old_id AND b.created_by IS NOT NULL;

UPDATE "Booking" b
SET updated_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE b.updated_by = m.old_id AND b.updated_by IS NOT NULL;

-- BookingPet
UPDATE "BookingPet" bp
SET booking_record_id = m.new_record_id
FROM "_Migration_Booking_Id_Map" m
WHERE bp.booking_id = m.old_id;

UPDATE "BookingPet" bp
SET pet_record_id = m.new_record_id
FROM "_Migration_Pet_Id_Map" m
WHERE bp.pet_id = m.old_id;

-- Payment
UPDATE "Payment" p
SET invoice_record_id = m.new_record_id
FROM "_Migration_Invoice_Id_Map" m
WHERE p.invoice_id = m.old_id AND p.invoice_id IS NOT NULL;

UPDATE "Payment" p
SET owner_record_id = m.new_record_id
FROM "_Migration_Owner_Id_Map" m
WHERE p.owner_id = m.old_id;

UPDATE "Payment" p
SET processed_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE p.processed_by = m.old_id AND p.processed_by IS NOT NULL;

-- Invoice
UPDATE "Invoice" i
SET owner_record_id = m.new_record_id
FROM "_Migration_Owner_Id_Map" m
WHERE i.owner_id = m.old_id;

UPDATE "Invoice" i
SET booking_record_id = m.new_record_id
FROM "_Migration_Booking_Id_Map" m
WHERE i.booking_id = m.old_id AND i.booking_id IS NOT NULL;

UPDATE "Invoice" i
SET created_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE i.created_by = m.old_id AND i.created_by IS NOT NULL;

-- InvoiceLine
UPDATE "InvoiceLine" il
SET invoice_record_id = m.new_record_id
FROM "_Migration_Invoice_Id_Map" m
WHERE il.invoice_id = m.old_id;

-- Task
UPDATE "Task" t
SET assigned_to_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE t.assigned_to = m.old_id AND t.assigned_to IS NOT NULL;

UPDATE "Task" t
SET booking_record_id = m.new_record_id
FROM "_Migration_Booking_Id_Map" m
WHERE t.booking_id = m.old_id AND t.booking_id IS NOT NULL;

UPDATE "Task" t
SET pet_record_id = m.new_record_id
FROM "_Migration_Pet_Id_Map" m
WHERE t.pet_id = m.old_id AND t.pet_id IS NOT NULL;

UPDATE "Task" t
SET completed_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE t.completed_by = m.old_id AND t.completed_by IS NOT NULL;

UPDATE "Task" t
SET created_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE t.created_by = m.old_id AND t.created_by IS NOT NULL;

-- Vaccination
UPDATE "Vaccination" v
SET pet_record_id = m.new_record_id
FROM "_Migration_Pet_Id_Map" m
WHERE v.pet_id = m.old_id;

UPDATE "Vaccination" v
SET created_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE v.created_by = m.old_id AND v.created_by IS NOT NULL;

-- Incident
UPDATE "Incident" i
SET pet_record_id = m.new_record_id
FROM "_Migration_Pet_Id_Map" m
WHERE i.pet_id = m.old_id AND i.pet_id IS NOT NULL;

UPDATE "Incident" i
SET booking_record_id = m.new_record_id
FROM "_Migration_Booking_Id_Map" m
WHERE i.booking_id = m.old_id AND i.booking_id IS NOT NULL;

UPDATE "Incident" i
SET reported_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE i.reported_by = m.old_id;

UPDATE "Incident" i
SET resolved_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE i.resolved_by = m.old_id AND i.resolved_by IS NOT NULL;

-- RunAssignment
UPDATE "RunAssignment" ra
SET run_record_id = m.new_record_id
FROM "_Migration_Run_Id_Map" m
WHERE ra.run_id = m.old_id;

UPDATE "RunAssignment" ra
SET booking_record_id = m.new_record_id
FROM "_Migration_Booking_Id_Map" m
WHERE ra.booking_id = m.old_id;

UPDATE "RunAssignment" ra
SET pet_record_id = m.new_record_id
FROM "_Migration_Pet_Id_Map" m
WHERE ra.pet_id = m.old_id;

UPDATE "RunAssignment" ra
SET created_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE ra.created_by = m.old_id AND ra.created_by IS NOT NULL;

-- UserRole
UPDATE "UserRole" ur
SET user_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE ur.user_id = m.old_id;

UPDATE "UserRole" ur
SET role_record_id = m.new_record_id
FROM "_Migration_Role_Id_Map" m
WHERE ur.role_id = m.old_id;

UPDATE "UserRole" ur
SET assigned_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE ur.assigned_by = m.old_id AND ur.assigned_by IS NOT NULL;

-- UserSession
UPDATE "UserSession" us
SET user_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE us.user_id = m.old_id;

-- Segment
UPDATE "Segment" s
SET created_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE s.created_by = m.old_id AND s.created_by IS NOT NULL;

-- SegmentMember
UPDATE "SegmentMember" sm
SET segment_record_id = m.new_record_id
FROM "_Migration_Segment_Id_Map" m
WHERE sm.segment_id = m.old_id;

UPDATE "SegmentMember" sm
SET owner_record_id = m.new_record_id
FROM "_Migration_Owner_Id_Map" m
WHERE sm.owner_id = m.old_id;

UPDATE "SegmentMember" sm
SET added_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE sm.added_by = m.old_id AND sm.added_by IS NOT NULL;

-- Notification
UPDATE "Notification" n
SET user_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE n.user_id = m.old_id AND n.user_id IS NOT NULL;

-- Note
UPDATE "Note" n
SET created_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE n.created_by = m.old_id;

-- AuditLog
UPDATE "AuditLog" a
SET user_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE a.user_id = m.old_id AND a.user_id IS NOT NULL;

-- DeletedRecord
UPDATE "DeletedRecord" d
SET deleted_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE d.deleted_by = m.old_id AND d.deleted_by IS NOT NULL;

-- Owner
UPDATE "Owner" o
SET created_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE o.created_by = m.old_id AND o.created_by IS NOT NULL;

UPDATE "Owner" o
SET updated_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE o.updated_by = m.old_id AND o.updated_by IS NOT NULL;

-- Pet
UPDATE "Pet" p
SET created_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE p.created_by = m.old_id AND p.created_by IS NOT NULL;

UPDATE "Pet" p
SET updated_by_record_id = m.new_record_id
FROM "_Migration_User_Id_Map" m
WHERE p.updated_by = m.old_id AND p.updated_by IS NOT NULL;

-- ============================================================================
-- 4. Create indexes on new FK columns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pet_vet_record_id ON "Pet"(tenant_id, vet_record_id);
CREATE INDEX IF NOT EXISTS idx_petowner_pet_record_id ON "PetOwner"(tenant_id, pet_record_id);
CREATE INDEX IF NOT EXISTS idx_petowner_owner_record_id ON "PetOwner"(tenant_id, owner_record_id);
CREATE INDEX IF NOT EXISTS idx_booking_owner_record_id ON "Booking"(tenant_id, owner_record_id);
CREATE INDEX IF NOT EXISTS idx_booking_service_record_id ON "Booking"(tenant_id, service_record_id);
CREATE INDEX IF NOT EXISTS idx_booking_kennel_record_id ON "Booking"(tenant_id, kennel_record_id);
CREATE INDEX IF NOT EXISTS idx_bookingpet_booking_record_id ON "BookingPet"(tenant_id, booking_record_id);
CREATE INDEX IF NOT EXISTS idx_bookingpet_pet_record_id ON "BookingPet"(tenant_id, pet_record_id);
CREATE INDEX IF NOT EXISTS idx_payment_owner_record_id ON "Payment"(tenant_id, owner_record_id);
CREATE INDEX IF NOT EXISTS idx_payment_invoice_record_id ON "Payment"(tenant_id, invoice_record_id);
CREATE INDEX IF NOT EXISTS idx_invoice_owner_record_id ON "Invoice"(tenant_id, owner_record_id);
CREATE INDEX IF NOT EXISTS idx_invoice_booking_record_id ON "Invoice"(tenant_id, booking_record_id);
CREATE INDEX IF NOT EXISTS idx_invoiceline_invoice_record_id ON "InvoiceLine"(tenant_id, invoice_record_id);
CREATE INDEX IF NOT EXISTS idx_task_pet_record_id ON "Task"(tenant_id, pet_record_id);
CREATE INDEX IF NOT EXISTS idx_task_booking_record_id ON "Task"(tenant_id, booking_record_id);
CREATE INDEX IF NOT EXISTS idx_vaccination_pet_record_id ON "Vaccination"(tenant_id, pet_record_id);
CREATE INDEX IF NOT EXISTS idx_incident_pet_record_id ON "Incident"(tenant_id, pet_record_id);
CREATE INDEX IF NOT EXISTS idx_runassignment_run_record_id ON "RunAssignment"(tenant_id, run_record_id);
CREATE INDEX IF NOT EXISTS idx_userrole_user_record_id ON "UserRole"(tenant_id, user_record_id);
CREATE INDEX IF NOT EXISTS idx_userrole_role_record_id ON "UserRole"(tenant_id, role_record_id);
CREATE INDEX IF NOT EXISTS idx_usersession_user_record_id ON "UserSession"(tenant_id, user_record_id);
CREATE INDEX IF NOT EXISTS idx_segmentmember_segment_record_id ON "SegmentMember"(tenant_id, segment_record_id);
CREATE INDEX IF NOT EXISTS idx_segmentmember_owner_record_id ON "SegmentMember"(tenant_id, owner_record_id);
CREATE INDEX IF NOT EXISTS idx_notification_user_record_id ON "Notification"(tenant_id, user_record_id);

COMMIT;
