-- Add access control and archive columns to Property table

ALTER TABLE "Property" 
  ADD COLUMN IF NOT EXISTS "accessLevel" TEXT DEFAULT 'everyone_edit',
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;

-- Access levels:
-- 'everyone_edit' - All users can view and edit
-- 'everyone_view' - All users can view, only admins can edit
-- 'assigned_only' - Only assigned users/teams can access
-- 'admin_only' - Only admins can access

CREATE INDEX IF NOT EXISTS "Property_isArchived_idx" ON "Property"("isArchived");
CREATE INDEX IF NOT EXISTS "Property_accessLevel_idx" ON "Property"("accessLevel");

COMMENT ON COLUMN "Property"."accessLevel" IS 'Access control: everyone_edit, everyone_view, assigned_only, admin_only';
COMMENT ON COLUMN "Property"."isArchived" IS 'Whether property is archived (hidden from active views)';

