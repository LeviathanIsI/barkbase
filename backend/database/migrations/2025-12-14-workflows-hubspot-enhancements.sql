-- Workflow HubSpot-Style Enhancements Migration
-- Adds missing fields to align with HubSpot workflow patterns

-- =============================================================================
-- WORKFLOW TABLE ENHANCEMENTS
-- =============================================================================

-- Add revision tracking for version control
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

-- Add start_step_id reference for workflow entry point
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS start_step_id UUID;

-- Add goal configuration for auto-unenrollment
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS goal_config JSONB DEFAULT '{}';
-- Example: { "criteria": [...], "action": "unenroll" }

-- Add suppression segment IDs array
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS suppression_segment_ids UUID[] DEFAULT '{}';

-- Add timing configuration for execution windows
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS timing_config JSONB DEFAULT '{}';
-- Example: { "execute_days": [1,2,3,4,5], "execute_hours": {"start": 9, "end": 17}, "timezone": "America/New_York", "pause_dates": [] }

-- Add active count for currently enrolled records
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS active_count INTEGER NOT NULL DEFAULT 0;

-- Add failed count for error tracking
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS failed_count INTEGER NOT NULL DEFAULT 0;

-- =============================================================================
-- WORKFLOW STEP TABLE ENHANCEMENTS
-- =============================================================================

-- Add step name for display
ALTER TABLE "WorkflowStep" ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add explicit flow connection references (HubSpot uses these for graph traversal)
ALTER TABLE "WorkflowStep" ADD COLUMN IF NOT EXISTS next_step_id UUID REFERENCES "WorkflowStep"(id) ON DELETE SET NULL;
ALTER TABLE "WorkflowStep" ADD COLUMN IF NOT EXISTS yes_step_id UUID REFERENCES "WorkflowStep"(id) ON DELETE SET NULL;
ALTER TABLE "WorkflowStep" ADD COLUMN IF NOT EXISTS no_step_id UUID REFERENCES "WorkflowStep"(id) ON DELETE SET NULL;

-- Add step execution statistics
ALTER TABLE "WorkflowStep" ADD COLUMN IF NOT EXISTS total_reached INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WorkflowStep" ADD COLUMN IF NOT EXISTS total_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WorkflowStep" ADD COLUMN IF NOT EXISTS total_failed INTEGER NOT NULL DEFAULT 0;

-- =============================================================================
-- WORKFLOW EXECUTION TABLE ENHANCEMENTS (Enrollments)
-- =============================================================================

-- Add workflow revision to track which version the record was enrolled with
ALTER TABLE "WorkflowExecution" ADD COLUMN IF NOT EXISTS workflow_revision INTEGER NOT NULL DEFAULT 1;

-- Add enrollment count for re-enrollment tracking
ALTER TABLE "WorkflowExecution" ADD COLUMN IF NOT EXISTS enrollment_count INTEGER NOT NULL DEFAULT 1;

-- Add unenrollment tracking
ALTER TABLE "WorkflowExecution" ADD COLUMN IF NOT EXISTS unenrolled_at TIMESTAMPTZ;
ALTER TABLE "WorkflowExecution" ADD COLUMN IF NOT EXISTS unenrollment_reason VARCHAR(50);
-- Values: 'goal_met', 'suppression', 'manual', 'filter_no_longer_met', 'workflow_action'

-- Add scheduled_for for wait steps (rename from resume_at for clarity)
-- resume_at already exists, so we'll use that

-- Add metadata field for extensibility
ALTER TABLE "WorkflowExecution" ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- =============================================================================
-- WORKFLOW EXECUTION LOG ENHANCEMENTS
-- =============================================================================

-- Add event type for more granular logging
ALTER TABLE "WorkflowExecutionLog" ADD COLUMN IF NOT EXISTS event_type VARCHAR(30);
-- Values: 'enrolled', 'step_started', 'step_completed', 'step_failed', 'step_skipped', 'unenrolled', 'goal_met'

-- Add step info denormalized for query performance
ALTER TABLE "WorkflowExecutionLog" ADD COLUMN IF NOT EXISTS step_type VARCHAR(20);
ALTER TABLE "WorkflowExecutionLog" ADD COLUMN IF NOT EXISTS action_type VARCHAR(50);

-- Add timing metrics
ALTER TABLE "WorkflowExecutionLog" ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

-- Add input/output data for debugging
ALTER TABLE "WorkflowExecutionLog" ADD COLUMN IF NOT EXISTS input_data JSONB DEFAULT '{}';
ALTER TABLE "WorkflowExecutionLog" ADD COLUMN IF NOT EXISTS output_data JSONB DEFAULT '{}';
ALTER TABLE "WorkflowExecutionLog" ADD COLUMN IF NOT EXISTS error_details JSONB DEFAULT '{}';

-- Add workflow revision tracking
ALTER TABLE "WorkflowExecutionLog" ADD COLUMN IF NOT EXISTS workflow_revision INTEGER;

-- =============================================================================
-- NEW INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for finding steps by flow connections
CREATE INDEX IF NOT EXISTS idx_workflow_step_next ON "WorkflowStep"(next_step_id) WHERE next_step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_step_yes ON "WorkflowStep"(yes_step_id) WHERE yes_step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_step_no ON "WorkflowStep"(no_step_id) WHERE no_step_id IS NOT NULL;

-- Index for workflow revision queries
CREATE INDEX IF NOT EXISTS idx_workflow_revision ON "Workflow"(id, revision);

-- Index for execution by revision
CREATE INDEX IF NOT EXISTS idx_workflow_execution_revision ON "WorkflowExecution"(workflow_id, workflow_revision);

-- Index for unenrolled records
CREATE INDEX IF NOT EXISTS idx_workflow_execution_unenrolled ON "WorkflowExecution"(workflow_id, unenrolled_at)
  WHERE unenrolled_at IS NOT NULL;

-- Index for execution logs by event type
CREATE INDEX IF NOT EXISTS idx_workflow_log_event_type ON "WorkflowExecutionLog"(execution_id, event_type);

-- =============================================================================
-- UPDATE FOREIGN KEY FOR start_step_id
-- =============================================================================

-- Add foreign key constraint for start_step_id after column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_workflow_start_step'
  ) THEN
    ALTER TABLE "Workflow"
    ADD CONSTRAINT fk_workflow_start_step
    FOREIGN KEY (start_step_id) REFERENCES "WorkflowStep"(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN "Workflow".revision IS 'Version number, incremented on each save';
COMMENT ON COLUMN "Workflow".start_step_id IS 'Reference to first step in workflow';
COMMENT ON COLUMN "Workflow".goal_config IS 'Auto-unenrollment criteria when goal is met';
COMMENT ON COLUMN "Workflow".suppression_segment_ids IS 'Segment IDs that prevent enrollment';
COMMENT ON COLUMN "Workflow".timing_config IS 'Execution window: days, hours, timezone, pause dates';

COMMENT ON COLUMN "WorkflowStep".name IS 'Display name for the step';
COMMENT ON COLUMN "WorkflowStep".next_step_id IS 'Next step in linear flow';
COMMENT ON COLUMN "WorkflowStep".yes_step_id IS 'Next step when determinator condition is true';
COMMENT ON COLUMN "WorkflowStep".no_step_id IS 'Next step when determinator condition is false';

COMMENT ON COLUMN "WorkflowExecution".workflow_revision IS 'Workflow version when record was enrolled';
COMMENT ON COLUMN "WorkflowExecution".enrollment_count IS 'Number of times this record has been enrolled';
COMMENT ON COLUMN "WorkflowExecution".unenrollment_reason IS 'Why the record was unenrolled';

COMMENT ON COLUMN "WorkflowExecutionLog".event_type IS 'Type of event: enrolled, step_started, step_completed, etc.';
COMMENT ON COLUMN "WorkflowExecutionLog".duration_ms IS 'Time taken to execute step in milliseconds';
