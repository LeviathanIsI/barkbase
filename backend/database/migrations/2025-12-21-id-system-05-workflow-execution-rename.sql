-- ============================================================================
-- BarkBase ID System Migration - Part 5: WorkflowExecution Column Rename
-- ============================================================================
-- Rename existing `record_id` (UUID) to `enrolled_record_id`
-- Add new `record_id` (BIGINT) for sequential IDs
-- ============================================================================

-- Rename record_id to enrolled_record_id in WorkflowExecution
ALTER TABLE "WorkflowExecution" RENAME COLUMN record_id TO enrolled_record_id;

-- Add new record_id BIGINT column
ALTER TABLE "WorkflowExecution" ADD COLUMN record_id BIGINT;

-- Create index
CREATE INDEX idx_workflowexecution_record_id ON "WorkflowExecution"(tenant_id, record_id);
CREATE INDEX idx_workflowexecution_enrolled_record_id ON "WorkflowExecution"(tenant_id, enrolled_record_id);
