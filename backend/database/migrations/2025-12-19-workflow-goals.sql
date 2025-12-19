-- Workflow Goal Completion System
-- Adds goal tracking to workflows for early completion when conditions are met

-- =============================================================================
-- WORKFLOW TABLE ADDITIONS
-- =============================================================================

-- Add goal_config column to store goal conditions
ALTER TABLE "Workflow"
ADD COLUMN IF NOT EXISTS goal_config JSONB;
-- Example goal_config:
-- {
--   "conditions": [
--     { "field": "record.status", "operator": "equals", "value": "completed" },
--     { "field": "record.paid", "operator": "is_true" }
--   ],
--   "conditionLogic": "and"
-- }

-- Add goal_reached_count for tracking goal completions
ALTER TABLE "Workflow"
ADD COLUMN IF NOT EXISTS goal_reached_count INT DEFAULT 0;

COMMENT ON COLUMN "Workflow".goal_config IS 'Goal conditions that trigger early workflow completion when met';
COMMENT ON COLUMN "Workflow".goal_reached_count IS 'Number of executions that completed by reaching the goal';

-- =============================================================================
-- WORKFLOW EXECUTION TABLE ADDITIONS
-- =============================================================================

-- Add completion_reason to track why execution completed
ALTER TABLE "WorkflowExecution"
ADD COLUMN IF NOT EXISTS completion_reason VARCHAR(50);
-- Values: 'completed', 'goal_reached', 'gate_blocked', 'cancelled', 'terminated'

-- Add goal_result to store goal evaluation details
ALTER TABLE "WorkflowExecution"
ADD COLUMN IF NOT EXISTS goal_result JSONB;
-- Example goal_result:
-- {
--   "met": true,
--   "conditionLogic": "and",
--   "conditionResults": [
--     { "field": "record.status", "operator": "equals", "expectedValue": "completed", "actualValue": "completed", "met": true }
--   ],
--   "reason": "All goal conditions satisfied"
-- }

COMMENT ON COLUMN "WorkflowExecution".completion_reason IS 'Why execution completed: completed, goal_reached, gate_blocked, cancelled, terminated';
COMMENT ON COLUMN "WorkflowExecution".goal_result IS 'Detailed goal evaluation result when completion_reason is goal_reached';

-- =============================================================================
-- WORKFLOW EXECUTION LOG TABLE UPDATES
-- =============================================================================

-- Drop and recreate constraint to allow 'goal_reached' status
ALTER TABLE "WorkflowExecutionLog"
DROP CONSTRAINT IF EXISTS log_status_check;

ALTER TABLE "WorkflowExecutionLog"
ADD CONSTRAINT log_status_check CHECK (status IN ('success', 'failed', 'skipped', 'pending', 'goal_reached'));

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for finding executions by completion reason
CREATE INDEX IF NOT EXISTS idx_execution_completion_reason
ON "WorkflowExecution"(workflow_id, completion_reason)
WHERE completed_at IS NOT NULL;

-- Index for workflows with goals defined
CREATE INDEX IF NOT EXISTS idx_workflow_with_goals
ON "Workflow"(tenant_id)
WHERE goal_config IS NOT NULL AND deleted_at IS NULL;
