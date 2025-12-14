-- Workflow Automation System
-- Allows tenants to create automated workflows triggered by events or conditions

-- =============================================================================
-- WORKFLOW TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS "Workflow" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,

  -- Basic info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Object type this workflow operates on
  object_type VARCHAR(50) NOT NULL, -- 'pet', 'booking', 'owner', 'payment', 'task', 'invoice'

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused'

  -- Entry condition (trigger configuration)
  -- Stores trigger type and conditions as JSON
  entry_condition JSONB NOT NULL DEFAULT '{}',
  -- Example: {
  --   "trigger_type": "event", -- 'event', 'filter_criteria', 'schedule', 'manual'
  --   "event_type": "booking.checked_in", -- for event triggers
  --   "schedule": "0 9 * * *", -- cron for schedule triggers
  --   "filter": { ... } -- HubSpot-style filter for criteria triggers
  -- }

  -- Workflow settings
  settings JSONB NOT NULL DEFAULT '{}',
  -- Example: {
  --   "allow_reenrollment": false,
  --   "reenrollment_delay_days": 30,
  --   "unenrollment_criteria": { ... },
  --   "suppress_during_hours": false
  -- }

  -- Folder organization
  folder_id UUID,

  -- Metrics (denormalized for quick access)
  enrolled_count INT DEFAULT 0,
  completed_count INT DEFAULT 0,
  last_run_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Timestamps
  created_by UUID REFERENCES "User"(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT workflow_status_check CHECK (status IN ('draft', 'active', 'paused')),
  CONSTRAINT workflow_object_type_check CHECK (object_type IN ('pet', 'booking', 'owner', 'payment', 'task', 'invoice', 'incident'))
);

-- =============================================================================
-- WORKFLOW STEP TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS "WorkflowStep" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES "Workflow"(id) ON DELETE CASCADE,

  -- For nested steps (inside determinators)
  parent_step_id UUID REFERENCES "WorkflowStep"(id) ON DELETE CASCADE,
  branch_path VARCHAR(10), -- 'yes', 'no', or null for root-level steps

  -- Position in sequence
  position INT NOT NULL DEFAULT 0,

  -- Step classification
  step_type VARCHAR(30) NOT NULL, -- 'action', 'wait', 'determinator', 'gate', 'terminus'

  -- Action type (for action steps)
  action_type VARCHAR(50), -- 'send_sms', 'send_email', 'create_task', 'update_field', etc.

  -- Step-specific configuration
  config JSONB NOT NULL DEFAULT '{}',
  -- Examples:
  -- For send_sms: { "template_id": "...", "recipient": "owner" }
  -- For wait: { "duration": 3, "unit": "days" } or { "until_event": "vaccination.updated" }
  -- For determinator: { "condition": { "field": "pet.vaccination_status", "operator": "equals", "value": "expired" } }
  -- For gate: { "condition": { ... } }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- WORKFLOW EXECUTION TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS "WorkflowExecution" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES "Workflow"(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,

  -- The enrolled record
  record_id UUID NOT NULL,
  record_type VARCHAR(50) NOT NULL, -- matches workflow.object_type

  -- Execution status
  status VARCHAR(20) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'

  -- Timing
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Current position in workflow
  current_step_id UUID REFERENCES "WorkflowStep"(id),

  -- For scheduled wait steps - when to resume
  resume_at TIMESTAMPTZ,

  -- Error info if failed
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT execution_status_check CHECK (status IN ('running', 'paused', 'completed', 'failed', 'cancelled'))
);

-- =============================================================================
-- WORKFLOW EXECUTION LOG TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS "WorkflowExecutionLog" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES "WorkflowExecution"(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES "WorkflowStep"(id) ON DELETE CASCADE,

  -- Execution details
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'skipped'

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Result/error details
  result JSONB DEFAULT '{}',
  -- Examples:
  -- Success: { "message_sid": "...", "recipient": "+1..." }
  -- Failed: { "error": "SMS delivery failed", "code": "INVALID_NUMBER" }
  -- Skipped: { "reason": "Condition not met" }

  -- Constraints
  CONSTRAINT log_status_check CHECK (status IN ('success', 'failed', 'skipped', 'pending'))
);

-- =============================================================================
-- WORKFLOW FOLDER TABLE (for organization)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "WorkflowFolder" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES "WorkflowFolder"(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflow_tenant ON "Workflow"(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON "Workflow"(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_object_type ON "Workflow"(tenant_id, object_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_folder ON "Workflow"(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_active ON "Workflow"(tenant_id) WHERE status = 'active' AND deleted_at IS NULL;

-- WorkflowStep indexes
CREATE INDEX IF NOT EXISTS idx_workflow_step_workflow ON "WorkflowStep"(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_parent ON "WorkflowStep"(parent_step_id) WHERE parent_step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_step_position ON "WorkflowStep"(workflow_id, position);

-- WorkflowExecution indexes
CREATE INDEX IF NOT EXISTS idx_workflow_execution_workflow ON "WorkflowExecution"(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_tenant ON "WorkflowExecution"(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_record ON "WorkflowExecution"(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_status ON "WorkflowExecution"(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_running ON "WorkflowExecution"(tenant_id) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_workflow_execution_resume ON "WorkflowExecution"(resume_at) WHERE status = 'paused' AND resume_at IS NOT NULL;

-- WorkflowExecutionLog indexes
CREATE INDEX IF NOT EXISTS idx_workflow_execution_log_execution ON "WorkflowExecutionLog"(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_log_step ON "WorkflowExecutionLog"(step_id);

-- WorkflowFolder indexes
CREATE INDEX IF NOT EXISTS idx_workflow_folder_tenant ON "WorkflowFolder"(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_folder_parent ON "WorkflowFolder"(parent_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_workflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workflow_updated_at ON "Workflow";
CREATE TRIGGER trigger_workflow_updated_at
  BEFORE UPDATE ON "Workflow"
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

DROP TRIGGER IF EXISTS trigger_workflow_step_updated_at ON "WorkflowStep";
CREATE TRIGGER trigger_workflow_step_updated_at
  BEFORE UPDATE ON "WorkflowStep"
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

DROP TRIGGER IF EXISTS trigger_workflow_execution_updated_at ON "WorkflowExecution";
CREATE TRIGGER trigger_workflow_execution_updated_at
  BEFORE UPDATE ON "WorkflowExecution"
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

DROP TRIGGER IF EXISTS trigger_workflow_folder_updated_at ON "WorkflowFolder";
CREATE TRIGGER trigger_workflow_folder_updated_at
  BEFORE UPDATE ON "WorkflowFolder"
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON "Workflow" TO barkbase_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "WorkflowStep" TO barkbase_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "WorkflowExecution" TO barkbase_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "WorkflowExecutionLog" TO barkbase_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "WorkflowFolder" TO barkbase_admin;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE "Workflow" IS 'Stores workflow definitions with entry conditions and settings';
COMMENT ON TABLE "WorkflowStep" IS 'Steps within a workflow (actions, waits, determinators, gates, terminuses)';
COMMENT ON TABLE "WorkflowExecution" IS 'Tracks individual workflow executions for enrolled records';
COMMENT ON TABLE "WorkflowExecutionLog" IS 'Detailed logs of each step execution within a workflow run';
COMMENT ON TABLE "WorkflowFolder" IS 'Folders for organizing workflows';

COMMENT ON COLUMN "Workflow".entry_condition IS 'JSON config for trigger: event, filter_criteria, schedule, or manual';
COMMENT ON COLUMN "Workflow".settings IS 'Workflow settings: reenrollment rules, unenrollment criteria, etc.';
COMMENT ON COLUMN "WorkflowStep".step_type IS 'Type: action, wait, determinator (if/then), gate (block/allow), terminus (end)';
COMMENT ON COLUMN "WorkflowStep".branch_path IS 'For steps inside determinators: yes or no branch';
COMMENT ON COLUMN "WorkflowExecution".resume_at IS 'For paused wait steps, when to resume execution';
