-- CRM Tables Migration
-- Run this manually in your database

-- Create enums
CREATE TYPE "CommunicationType" AS ENUM ('EMAIL', 'SMS', 'CALL', 'NOTE', 'SYSTEM');
CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');
CREATE TYPE "NoteVisibility" AS ENUM ('ALL', 'STAFF', 'ADMIN', 'PRIVATE');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- Communication table
CREATE TABLE "Communication" (
    "recordId" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "CommunicationType" NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("recordId")
);

-- Note table
CREATE TABLE "Note" (
    "recordId" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'ALL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("recordId")
);

-- CustomerSegment table
CREATE TABLE "CustomerSegment" (
    "recordId" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" JSONB,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerSegment_pkey" PRIMARY KEY ("recordId")
);

-- CustomerSegmentMember table
CREATE TABLE "CustomerSegmentMember" (
    "recordId" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSegmentMember_pkey" PRIMARY KEY ("recordId")
);

-- CustomerTag table
CREATE TABLE "CustomerTag" (
    "recordId" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("recordId")
);

-- CustomerTagMember table
CREATE TABLE "CustomerTagMember" (
    "recordId" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTagMember_pkey" PRIMARY KEY ("recordId")
);

-- Campaign table
CREATE TABLE "Campaign" (
    "recordId" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CommunicationType" NOT NULL,
    "segmentId" TEXT,
    "content" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "metrics" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("recordId")
);

-- Create indexes
CREATE INDEX "Communication_tenantId_ownerId_createdAt_idx" ON "Communication"("tenantId", "ownerId", "createdAt");
CREATE INDEX "Communication_tenantId_type_idx" ON "Communication"("tenantId", "type");

CREATE INDEX "Note_tenantId_entityType_entityId_idx" ON "Note"("tenantId", "entityType", "entityId");
CREATE INDEX "Note_tenantId_authorId_idx" ON "Note"("tenantId", "authorId");

CREATE UNIQUE INDEX "CustomerSegment_tenantId_name_key" ON "CustomerSegment"("tenantId", "name");
CREATE INDEX "CustomerSegment_tenantId_isActive_idx" ON "CustomerSegment"("tenantId", "isActive");

CREATE UNIQUE INDEX "CustomerSegmentMember_segmentId_ownerId_key" ON "CustomerSegmentMember"("segmentId", "ownerId");
CREATE INDEX "CustomerSegmentMember_tenantId_ownerId_idx" ON "CustomerSegmentMember"("tenantId", "ownerId");

CREATE UNIQUE INDEX "CustomerTag_tenantId_name_key" ON "CustomerTag"("tenantId", "name");

CREATE UNIQUE INDEX "CustomerTagMember_tagId_ownerId_key" ON "CustomerTagMember"("tagId", "ownerId");
CREATE INDEX "CustomerTagMember_tenantId_ownerId_idx" ON "CustomerTagMember"("tenantId", "ownerId");

CREATE INDEX "Campaign_tenantId_status_idx" ON "Campaign"("tenantId", "status");
CREATE INDEX "Campaign_tenantId_scheduledAt_idx" ON "Campaign"("tenantId", "scheduledAt");

-- Add foreign keys
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("recordId") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Note" ADD CONSTRAINT "Note_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on all tables
ALTER TABLE "Communication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerSegment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerSegmentMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerTagMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "tenant_isolation" ON "Communication"
    FOR ALL USING (
        "tenantId" = COALESCE(current_setting('app.tenant_id', true), 'system')::text
    );

CREATE POLICY "tenant_isolation" ON "Note"
    FOR ALL USING (
        "tenantId" = COALESCE(current_setting('app.tenant_id', true), 'system')::text
    );

CREATE POLICY "tenant_isolation" ON "CustomerSegment"
    FOR ALL USING (
        "tenantId" = COALESCE(current_setting('app.tenant_id', true), 'system')::text
    );

CREATE POLICY "tenant_isolation" ON "CustomerSegmentMember"
    FOR ALL USING (
        "tenantId" = COALESCE(current_setting('app.tenant_id', true), 'system')::text
    );

CREATE POLICY "tenant_isolation" ON "CustomerTag"
    FOR ALL USING (
        "tenantId" = COALESCE(current_setting('app.tenant_id', true), 'system')::text
    );

CREATE POLICY "tenant_isolation" ON "CustomerTagMember"
    FOR ALL USING (
        "tenantId" = COALESCE(current_setting('app.tenant_id', true), 'system')::text
    );

CREATE POLICY "tenant_isolation" ON "Campaign"
    FOR ALL USING (
        "tenantId" = COALESCE(current_setting('app.tenant_id', true), 'system')::text
    );

