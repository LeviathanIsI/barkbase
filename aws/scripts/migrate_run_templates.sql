-- Migration to add RunTemplate system
-- This will delete existing runs and add the templateId column

-- Step 1: Delete all existing runs (per user request to start fresh)
DELETE FROM "Run";

-- Step 2: Create RunTemplate table if it doesn't exist
CREATE TABLE IF NOT EXISTS "RunTemplate" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timePeriodMinutes" INTEGER NOT NULL DEFAULT 30,
    "capacityType" TEXT NOT NULL DEFAULT 'total',
    "maxCapacity" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RunTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 3: Create indexes for RunTemplate if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS "RunTemplate_tenantId_name_key" ON "RunTemplate"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "RunTemplate_tenantId_isActive_idx" ON "RunTemplate"("tenantId", "isActive");

-- Step 4: Add templateId column to Run table if it doesn't exist
ALTER TABLE "Run" ADD COLUMN IF NOT EXISTS "templateId" TEXT REFERENCES "RunTemplate"("recordId") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Create index for templateId if it doesn't exist
CREATE INDEX IF NOT EXISTS "Run_templateId_idx" ON "Run"("templateId");

-- Step 6: Create trigger for RunTemplate if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_timestamp' AND tgrelid = '"RunTemplate"'::regclass) THEN
        CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON "RunTemplate"
        FOR EACH ROW
        EXECUTE PROCEDURE trigger_set_timestamp();
    END IF;
END
$$;

