-- Update system properties with accessLevel and ensure createdBy is set
-- This script adds accessLevel to all existing system properties

-- Set default accessLevel for all system properties (everyone can edit)
UPDATE "Property"
SET "accessLevel" = 'everyone_edit'
WHERE "isSystem" = true AND "accessLevel" IS NULL;

-- Update specific properties that should be view-only or admin-only

-- System fields should be view-only (not editable)
UPDATE "Property"
SET "accessLevel" = 'everyone_view'
WHERE "isSystem" = true 
  AND "name" IN ('recordId', 'tenantId', 'createdAt', 'updatedAt', 'createdBy')
  AND "accessLevel" = 'everyone_edit';

-- Ensure all system properties have createdBy set to 'BarkBase' (user-friendly name)
UPDATE "Property"
SET "createdBy" = 'BarkBase'
WHERE "isSystem" = true AND ("createdBy" = 'system' OR "createdBy" IS NULL);

-- Financial fields could be restricted to admins (optional - uncomment if desired)
-- UPDATE "Property"
-- SET "accessLevel" = 'admin_only'
-- WHERE "isSystem" = true 
--   AND "name" IN ('depositCents', 'totalCents', 'paidCents', 'balanceCents', 'amount', 'amountCents')
--   AND "accessLevel" = 'everyone_edit';

