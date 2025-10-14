-- Add new fields to Kennel table
ALTER TABLE "Kennel" 
ADD COLUMN IF NOT EXISTS "building" TEXT,
ADD COLUMN IF NOT EXISTS "zone" TEXT,
ADD COLUMN IF NOT EXISTS "hourlyRate" INTEGER,
ADD COLUMN IF NOT EXISTS "dailyRate" INTEGER,
ADD COLUMN IF NOT EXISTS "weeklyRate" INTEGER,
ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Create TaskType enum
CREATE TYPE "TaskType" AS ENUM ('FEEDING', 'MEDICATION', 'EXERCISE', 'CLEANING', 'HEALTH_CHECK', 'SPECIAL_CARE');

-- Create Priority enum  
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- Create Task table
CREATE TABLE IF NOT EXISTS "Task" (
    "recordId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "relatedType" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "assignedTo" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("recordId")
);

-- Create indexes for Task table
CREATE INDEX "Task_tenantId_scheduledFor_idx" ON "Task"("tenantId", "scheduledFor");
CREATE INDEX "Task_tenantId_type_idx" ON "Task"("tenantId", "type");
CREATE INDEX "Task_tenantId_assignedTo_idx" ON "Task"("tenantId", "assignedTo");

-- Add foreign key constraints
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Staff"("recordId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "Staff"("recordId") ON DELETE SET NULL ON UPDATE CASCADE;
