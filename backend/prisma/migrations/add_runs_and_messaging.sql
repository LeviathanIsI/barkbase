-- Migration: Add runs, run_assignments, and messages tables
-- Generated: October 15, 2025
-- Compatible with existing BarkBase schema (PascalCase table names)

-- Create runs table
CREATE TABLE IF NOT EXISTS "runs" (
    "recordId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "scheduleTime" TEXT NOT NULL,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "runs_pkey" PRIMARY KEY ("recordId"),
    CONSTRAINT "runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "runs_tenantId_isActive_idx" ON "runs"("tenantId", "isActive");

-- Create run_assignments table
CREATE TABLE IF NOT EXISTS "run_assignments" (
    "recordId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "run_assignments_pkey" PRIMARY KEY ("recordId"),
    CONSTRAINT "run_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "run_assignments_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs" ("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "run_assignments_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "run_assignments_runId_petId_date_key" UNIQUE ("runId", "petId", "date")
);

CREATE INDEX "run_assignments_tenantId_date_idx" ON "run_assignments"("tenantId", "date");

-- Create messages table
CREATE TABLE IF NOT EXISTS "messages" (
    "recordId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP WITHOUT TIME ZONE,
    "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "messages_pkey" PRIMARY KEY ("recordId"),
    CONSTRAINT "messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("recordId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("recordId") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "messages_tenantId_conversationId_idx" ON "messages"("tenantId", "conversationId");
CREATE INDEX "messages_tenantId_senderId_idx" ON "messages"("tenantId", "senderId");
CREATE INDEX "messages_tenantId_recipientId_idx" ON "messages"("tenantId", "recipientId");

-- Add reminderSentAt to Vaccination table
ALTER TABLE "Vaccination" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP WITHOUT TIME ZONE;

-- Verify tables were created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'runs') THEN
        RAISE NOTICE '✅ Migration successful: runs, run_assignments, and messages tables created';
    ELSE
        RAISE NOTICE '⚠️  Warning: runs table may not have been created';
    END IF;
END $$;

