-- Fix WorkflowExecutionLog CASCADE delete issue
-- The step_id foreign key had ON DELETE CASCADE, which caused logs to be deleted
-- when workflow steps were updated (deleted and recreated).
-- This changes it to ON DELETE SET NULL to preserve historical logs.

-- =============================================================================
-- STEP 1: Make step_id nullable
-- =============================================================================

ALTER TABLE "WorkflowExecutionLog"
  ALTER COLUMN step_id DROP NOT NULL;

-- =============================================================================
-- STEP 2: Drop the existing foreign key constraint
-- =============================================================================

-- Find and drop the constraint (constraint name may vary)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'WorkflowExecutionLog'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'step_id';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "WorkflowExecutionLog" DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  END IF;
END $$;

-- =============================================================================
-- STEP 3: Add new foreign key with ON DELETE SET NULL
-- =============================================================================

ALTER TABLE "WorkflowExecutionLog"
  ADD CONSTRAINT fk_workflow_execution_log_step
  FOREIGN KEY (step_id)
  REFERENCES "WorkflowStep"(id)
  ON DELETE SET NULL;

-- =============================================================================
-- STEP 4: Add additional fields for historical tracking
-- These allow logs to retain step info even after step_id is set to NULL
-- =============================================================================

-- Add fields to store step info directly on the log
-- These were already added in a previous migration (2025-12-14-workflows-hubspot-enhancements.sql)
-- but let's ensure they exist

ALTER TABLE "WorkflowExecutionLog"
  ADD COLUMN IF NOT EXISTS action_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS error_details JSONB;

-- =============================================================================
-- DONE
-- =============================================================================

COMMENT ON COLUMN "WorkflowExecutionLog".step_id IS 'Reference to the workflow step (may be NULL if step was deleted)';
