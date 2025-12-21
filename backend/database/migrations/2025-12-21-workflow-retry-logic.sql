-- Workflow Retry Logic System
-- Implements HubSpot-aligned retry behavior with exponential backoff
-- 3-day retry window, 1 min initial delay doubling to 8 hour max

-- =============================================================================
-- WORKFLOW EXECUTION TABLE ADDITIONS
-- =============================================================================

-- Add retry_context column to track retry state across attempts
ALTER TABLE "WorkflowExecution"
ADD COLUMN IF NOT EXISTS retry_context JSONB;
-- Example retry_context:
-- {
--   "firstAttemptTime": "2025-12-21T10:00:00.000Z",
--   "attemptNumber": 3,
--   "lastError": "Service temporarily unavailable"
-- }

COMMENT ON COLUMN "WorkflowExecution".retry_context IS 'Tracks retry state: firstAttemptTime, attemptNumber, lastError';

-- Update status constraint to allow 'retrying' status
ALTER TABLE "WorkflowExecution"
DROP CONSTRAINT IF EXISTS execution_status_check;

ALTER TABLE "WorkflowExecution"
ADD CONSTRAINT execution_status_check CHECK (
  status IN ('pending', 'running', 'paused', 'retrying', 'completed', 'failed', 'cancelled')
);

-- =============================================================================
-- WORKFLOW EXECUTION LOG TABLE UPDATES
-- =============================================================================

-- Update log status constraint to allow 'retry_scheduled' event type tracking
ALTER TABLE "WorkflowExecutionLog"
DROP CONSTRAINT IF EXISTS log_status_check;

ALTER TABLE "WorkflowExecutionLog"
ADD CONSTRAINT log_status_check CHECK (
  status IN ('success', 'failed', 'skipped', 'pending', 'goal_reached', 'retry_scheduled')
);

-- Update event_type constraint to include retry events
ALTER TABLE "WorkflowExecutionLog"
DROP CONSTRAINT IF EXISTS log_event_type_check;

-- Add event_type constraint if column exists (some schemas may not have this constraint)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'WorkflowExecutionLog' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE "WorkflowExecutionLog"
    ADD CONSTRAINT log_event_type_check CHECK (
      event_type IN (
        'step_started', 'step_completed', 'step_failed', 'step_skipped',
        'goal_met', 'completed', 'failed', 'cancelled', 'paused', 'resumed',
        'retry_scheduled', 'retry_started', 'retry_succeeded', 'retry_exhausted'
      )
    );
  END IF;
END $$;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for finding executions in retrying state
CREATE INDEX IF NOT EXISTS idx_execution_retrying
ON "WorkflowExecution"(workflow_id, status)
WHERE status = 'retrying';

-- Index for retry monitoring (find executions with retry context)
CREATE INDEX IF NOT EXISTS idx_execution_retry_context
ON "WorkflowExecution"(tenant_id)
WHERE retry_context IS NOT NULL AND status = 'retrying';
