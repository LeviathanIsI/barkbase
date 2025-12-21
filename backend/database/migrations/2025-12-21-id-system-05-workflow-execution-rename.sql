-- ============================================================================
-- BarkBase ID System Migration - Part 5: WorkflowExecution Column Rename
-- ============================================================================
-- Rename existing `record_id` (UUID) to `enrolled_record_id`
-- Add new `record_id` (BIGINT) for sequential IDs
-- ============================================================================

-- Drop existing indexes first
DROP INDEX IF EXISTS idx_workflowexecution_record_id;
DROP INDEX IF EXISTS "WorkflowExecution_record_id_idx";

-- Rename record_id to enrolled_record_id (only if record_id exists and is UUID)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'WorkflowExecution'
        AND column_name = 'record_id'
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE "WorkflowExecution" RENAME COLUMN record_id TO enrolled_record_id;
        RAISE NOTICE 'Renamed record_id to enrolled_record_id';
    ELSE
        RAISE NOTICE 'record_id UUID column not found or already renamed';
    END IF;
END $$;

-- Add new record_id BIGINT column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'WorkflowExecution'
        AND column_name = 'record_id'
    ) THEN
        ALTER TABLE "WorkflowExecution" ADD COLUMN record_id BIGINT;
        RAISE NOTICE 'Added record_id BIGINT column';
    ELSE
        RAISE NOTICE 'record_id column already exists';
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflowexecution_record_id ON "WorkflowExecution"(tenant_id, record_id);
CREATE INDEX IF NOT EXISTS idx_workflowexecution_enrolled_record_id ON "WorkflowExecution"(tenant_id, enrolled_record_id);
