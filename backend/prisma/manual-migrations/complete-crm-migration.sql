-- Complete CRM Migration Script
-- Run this to add all CRM features and fix missing user fields

-- 1. Add missing columns to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "name" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS "preferences" JSONB DEFAULT '{}';

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");
CREATE INDEX IF NOT EXISTS "User_language_idx" ON "User"("language");

-- 2. Create enums for CRM features
DO $$ BEGIN
    CREATE TYPE "CommunicationType" AS ENUM ('EMAIL', 'SMS', 'PHONE', 'NOTE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NoteVisibility" AS ENUM ('ALL', 'STAFF', 'ADMIN', 'PRIVATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CampaignType" AS ENUM ('EMAIL', 'SMS', 'MULTI_CHANNEL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create Communication table
CREATE TABLE IF NOT EXISTS "Communication" (
    "recordId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CommunicationType" NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("recordId")
);

-- 4. Create Note table
CREATE TABLE IF NOT EXISTS "Note" (
    "recordId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'ALL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("recordId")
);

-- 5. Create CustomerSegment table
CREATE TABLE IF NOT EXISTS "CustomerSegment" (
    "recordId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" JSONB NOT NULL,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSegment_pkey" PRIMARY KEY ("recordId")
);

-- 6. Create CustomerSegmentMember table
CREATE TABLE IF NOT EXISTS "CustomerSegmentMember" (
    "recordId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isManual" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CustomerSegmentMember_pkey" PRIMARY KEY ("recordId")
);

-- 7. Create CustomerTag table
CREATE TABLE IF NOT EXISTS "CustomerTag" (
    "recordId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("recordId")
);

-- 8. Create CustomerTagMember table
CREATE TABLE IF NOT EXISTS "CustomerTagMember" (
    "recordId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTagMember_pkey" PRIMARY KEY ("recordId")
);

-- 9. Create Campaign table
CREATE TABLE IF NOT EXISTS "Campaign" (
    "recordId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "segmentId" TEXT,
    "content" JSONB NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "metrics" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("recordId")
);

-- 10. Add indexes for performance
CREATE INDEX IF NOT EXISTS "Communication_tenantId_idx" ON "Communication"("tenantId");
CREATE INDEX IF NOT EXISTS "Communication_ownerId_idx" ON "Communication"("ownerId");
CREATE INDEX IF NOT EXISTS "Communication_createdAt_idx" ON "Communication"("createdAt");
CREATE INDEX IF NOT EXISTS "Communication_type_direction_idx" ON "Communication"("type", "direction");

CREATE INDEX IF NOT EXISTS "Note_tenantId_idx" ON "Note"("tenantId");
CREATE INDEX IF NOT EXISTS "Note_entityType_entityId_idx" ON "Note"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "Note_authorId_idx" ON "Note"("authorId");
CREATE INDEX IF NOT EXISTS "Note_createdAt_idx" ON "Note"("createdAt");

CREATE INDEX IF NOT EXISTS "CustomerSegment_tenantId_idx" ON "CustomerSegment"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerSegment_name_idx" ON "CustomerSegment"("name");

CREATE INDEX IF NOT EXISTS "CustomerSegmentMember_tenantId_idx" ON "CustomerSegmentMember"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerSegmentMember_segmentId_idx" ON "CustomerSegmentMember"("segmentId");
CREATE INDEX IF NOT EXISTS "CustomerSegmentMember_ownerId_idx" ON "CustomerSegmentMember"("ownerId");

CREATE INDEX IF NOT EXISTS "CustomerTag_tenantId_idx" ON "CustomerTag"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerTag_name_idx" ON "CustomerTag"("name");

CREATE INDEX IF NOT EXISTS "CustomerTagMember_tenantId_idx" ON "CustomerTagMember"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerTagMember_tagId_idx" ON "CustomerTagMember"("tagId");
CREATE INDEX IF NOT EXISTS "CustomerTagMember_ownerId_idx" ON "CustomerTagMember"("ownerId");

CREATE INDEX IF NOT EXISTS "Campaign_tenantId_idx" ON "Campaign"("tenantId");
CREATE INDEX IF NOT EXISTS "Campaign_status_idx" ON "Campaign"("status");
CREATE INDEX IF NOT EXISTS "Campaign_segmentId_idx" ON "Campaign"("segmentId");

-- 11. Add unique constraints
ALTER TABLE "CustomerSegment" ADD CONSTRAINT "CustomerSegment_tenantId_name_key" UNIQUE ("tenantId", "name");
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_tenantId_name_key" UNIQUE ("tenantId", "name");
ALTER TABLE "CustomerSegmentMember" ADD CONSTRAINT "CustomerSegmentMember_segmentId_ownerId_key" UNIQUE ("segmentId", "ownerId");
ALTER TABLE "CustomerTagMember" ADD CONSTRAINT "CustomerTagMember_tagId_ownerId_key" UNIQUE ("tagId", "ownerId");

-- 12. Add foreign key constraints
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("recordId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Note" ADD CONSTRAINT "Note_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("recordId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerSegment" ADD CONSTRAINT "CustomerSegment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerSegmentMember" ADD CONSTRAINT "CustomerSegmentMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerSegmentMember" ADD CONSTRAINT "CustomerSegmentMember_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "CustomerSegment"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerSegmentMember" ADD CONSTRAINT "CustomerSegmentMember_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerTagMember" ADD CONSTRAINT "CustomerTagMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerTagMember" ADD CONSTRAINT "CustomerTagMember_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CustomerTag"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerTagMember" ADD CONSTRAINT "CustomerTagMember_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "CustomerSegment"("recordId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("recordId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 13. Enable RLS on all new tables
ALTER TABLE "Communication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerSegment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerSegmentMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerTagMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies for new tables
-- Communication policies
CREATE POLICY "tenant_isolation" ON "Communication" FOR ALL USING ("tenantId" = current_setting('app.tenant_id')::text);

-- Note policies
CREATE POLICY "tenant_isolation" ON "Note" FOR ALL USING ("tenantId" = current_setting('app.tenant_id')::text);

-- CustomerSegment policies
CREATE POLICY "tenant_isolation" ON "CustomerSegment" FOR ALL USING ("tenantId" = current_setting('app.tenant_id')::text);

-- CustomerSegmentMember policies
CREATE POLICY "tenant_isolation" ON "CustomerSegmentMember" FOR ALL USING ("tenantId" = current_setting('app.tenant_id')::text);

-- CustomerTag policies
CREATE POLICY "tenant_isolation" ON "CustomerTag" FOR ALL USING ("tenantId" = current_setting('app.tenant_id')::text);

-- CustomerTagMember policies
CREATE POLICY "tenant_isolation" ON "CustomerTagMember" FOR ALL USING ("tenantId" = current_setting('app.tenant_id')::text);

-- Campaign policies
CREATE POLICY "tenant_isolation" ON "Campaign" FOR ALL USING ("tenantId" = current_setting('app.tenant_id')::text);

-- 15. Grant permissions to app_user
GRANT ALL ON "Communication" TO app_user;
GRANT ALL ON "Note" TO app_user;
GRANT ALL ON "CustomerSegment" TO app_user;
GRANT ALL ON "CustomerSegmentMember" TO app_user;
GRANT ALL ON "CustomerTag" TO app_user;
GRANT ALL ON "CustomerTagMember" TO app_user;
GRANT ALL ON "Campaign" TO app_user;

-- Done!
-- This migration adds:
-- - Missing user profile fields (name, phone, avatarUrl, etc.)
-- - Complete CRM system tables (Communications, Notes, Segments, Tags, Campaigns)
-- - All necessary indexes and constraints
-- - RLS policies for multi-tenant security

