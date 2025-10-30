-- Add Properties System Support
-- This adds a Property table to store system and custom property definitions
-- and adds customFields JSONB columns to main tables for custom data

-- Create Property table to store property definitions
CREATE TABLE IF NOT EXISTS "Property" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,  -- NULL for system properties (created by BarkBase)
    "objectType" TEXT NOT NULL,  -- pets, owners, bookings, kennels, services, etc.
    "name" TEXT NOT NULL,  -- API/DB field name (e.g., "firstName", "custom_loyalty_tier")
    "label" TEXT NOT NULL,  -- Display name in UI (e.g., "First Name", "Loyalty Tier")
    "description" TEXT,  -- Help text explaining the property
    "type" TEXT NOT NULL,  -- string, number, date, datetime, enum, boolean, currency, etc.
    "isSystem" BOOLEAN NOT NULL DEFAULT false,  -- true = BarkBase system property (read-only)
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isSearchable" BOOLEAN NOT NULL DEFAULT true,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "isUnique" BOOLEAN NOT NULL DEFAULT false,
    "group" TEXT,  -- Grouping category (e.g., "Basic Information", "Contact Details")
    "order" INTEGER NOT NULL DEFAULT 0,  -- Display order within group
    "options" JSONB,  -- For enum fields: {"values": ["option1", "option2"], "labels": {...}}
    "validation" JSONB,  -- Validation rules: {"min": 0, "max": 100, "pattern": "..."}
    "defaultValue" JSONB,  -- Default value for new records
    "metadata" JSONB DEFAULT '{}',  -- Additional configuration
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,  -- 'system' or userId who created the property
    CONSTRAINT "Property_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "Property_tenantId_objectType_idx" ON "Property"("tenantId", "objectType");
CREATE INDEX IF NOT EXISTS "Property_objectType_idx" ON "Property"("objectType");
CREATE INDEX IF NOT EXISTS "Property_isSystem_idx" ON "Property"("isSystem");
CREATE UNIQUE INDEX IF NOT EXISTS "Property_tenantId_objectType_name_key" ON "Property"("tenantId", "objectType", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "Property_system_objectType_name_key" ON "Property"("objectType", "name") WHERE "tenantId" IS NULL AND "isSystem" = true;

-- Add trigger to update updatedAt
CREATE TRIGGER set_property_timestamp
BEFORE UPDATE ON "Property"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Add customFields JSONB column to main tables for storing custom property values
-- These columns will store user-defined custom field data

ALTER TABLE "Pet" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Owner" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Kennel" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Vaccination" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "CheckOut" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "IncidentReport" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Communication" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Run" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "RunTemplate" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "customFields" JSONB DEFAULT '{}';

-- Create GIN indexes on customFields for efficient JSONB queries
CREATE INDEX IF NOT EXISTS "Pet_customFields_idx" ON "Pet" USING GIN ("customFields");
CREATE INDEX IF NOT EXISTS "Owner_customFields_idx" ON "Owner" USING GIN ("customFields");
CREATE INDEX IF NOT EXISTS "Booking_customFields_idx" ON "Booking" USING GIN ("customFields");
CREATE INDEX IF NOT EXISTS "Kennel_customFields_idx" ON "Kennel" USING GIN ("customFields");
CREATE INDEX IF NOT EXISTS "Service_customFields_idx" ON "Service" USING GIN ("customFields");

-- Comments for documentation
COMMENT ON TABLE "Property" IS 'Stores definitions for both system properties (created by BarkBase) and custom properties (created by users)';
COMMENT ON COLUMN "Property"."isSystem" IS 'true = BarkBase system property mapped to DB column (read-only), false = custom property stored in customFields JSONB';
COMMENT ON COLUMN "Property"."tenantId" IS 'NULL for system properties (available to all tenants), set for custom properties (tenant-specific)';

