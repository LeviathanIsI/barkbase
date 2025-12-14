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

-- =============================================================================
-- WORKFLOW REVISIONS TABLE (version history)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "WorkflowRevision" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES "Workflow"(id) ON DELETE CASCADE,
  revision_number INT NOT NULL,

  -- Snapshot of workflow at this revision
  workflow_snapshot JSONB NOT NULL, -- Full workflow + steps JSON

  -- Who and when
  created_by UUID REFERENCES "User"(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  change_summary TEXT,

  UNIQUE(workflow_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_workflow_revision_workflow ON "WorkflowRevision"(workflow_id);

-- =============================================================================
-- WORKFLOW TEMPLATES TABLE (pre-built workflows for quick setup)
-- =============================================================================
CREATE TABLE IF NOT EXISTS "WorkflowTemplate" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'vaccination', 'booking', 'communication', 'payment', 'onboarding'
  object_type VARCHAR(50) NOT NULL,

  -- Template definition
  template_config JSONB NOT NULL, -- Full workflow definition as JSON

  -- Metadata
  is_system BOOLEAN NOT NULL DEFAULT false, -- Built-in vs user-created
  tenant_id UUID REFERENCES "Tenant"(id) ON DELETE CASCADE, -- NULL for system templates
  usage_count INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_template_category ON "WorkflowTemplate"(category);
CREATE INDEX IF NOT EXISTS idx_workflow_template_object_type ON "WorkflowTemplate"(object_type);
CREATE INDEX IF NOT EXISTS idx_workflow_template_tenant ON "WorkflowTemplate"(tenant_id) WHERE tenant_id IS NOT NULL;

-- Grant permissions on new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON "WorkflowRevision" TO barkbase_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON "WorkflowTemplate" TO barkbase_admin;

COMMENT ON TABLE "WorkflowRevision" IS 'Version history for workflows - stores snapshots of workflow + steps';
COMMENT ON TABLE "WorkflowTemplate" IS 'Pre-built workflow templates for quick setup';

-- =============================================================================
-- SEED SYSTEM TEMPLATES
-- =============================================================================

-- Vaccination Expiry Reminder Template
INSERT INTO "WorkflowTemplate" (id, name, description, category, object_type, is_system, template_config)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Vaccination Expiry Reminder',
  'Automatically remind pet owners when their pet''s vaccination is about to expire. Sends an initial reminder, waits 3 days, then follows up if still expired.',
  'vaccination',
  'pet',
  true,
  '{
    "entry_condition": {
      "trigger_type": "event",
      "event_type": "pet.vaccination_expiring"
    },
    "settings": {
      "allow_reenrollment": true,
      "reenrollment_delay_days": 30
    },
    "steps": [
      {
        "step_type": "action",
        "action_type": "send_sms",
        "config": {
          "recipient": "owner",
          "message": "Hi {{owner.first_name}}, {{pet.name}}''s vaccination expires in 7 days. Please update before your next visit. - {{tenant.name}}"
        }
      },
      {
        "step_type": "wait",
        "config": {
          "duration": 3,
          "unit": "days"
        }
      },
      {
        "step_type": "determinator",
        "config": {
          "condition": {
            "field": "vaccination_status",
            "operator": "equals",
            "value": "expired"
          }
        },
        "yes_branch": [
          {
            "step_type": "action",
            "action_type": "send_sms",
            "config": {
              "recipient": "owner",
              "message": "Hi {{owner.first_name}}, {{pet.name}}''s vaccination is now expired. Please update immediately to avoid any interruption in services. - {{tenant.name}}"
            }
          },
          {
            "step_type": "terminus"
          }
        ],
        "no_branch": [
          {
            "step_type": "terminus"
          }
        ]
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Check-in Confirmation Template
INSERT INTO "WorkflowTemplate" (id, name, description, category, object_type, is_system, template_config)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Check-in Confirmation',
  'Send owners a confirmation when their pet is checked in. Includes option to request photos during stay.',
  'booking',
  'booking',
  true,
  '{
    "entry_condition": {
      "trigger_type": "event",
      "event_type": "booking.checked_in"
    },
    "settings": {
      "allow_reenrollment": false
    },
    "steps": [
      {
        "step_type": "wait",
        "config": {
          "duration": 15,
          "unit": "minutes"
        }
      },
      {
        "step_type": "action",
        "action_type": "send_sms",
        "config": {
          "recipient": "owner",
          "message": "Hi {{owner.first_name}}, {{pet.name}} has been checked in safely! We''ll take great care of them. Would you like photo updates during their stay? Reply YES for photos. - {{tenant.name}}"
        }
      },
      {
        "step_type": "terminus"
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Checkout Report Card Template
INSERT INTO "WorkflowTemplate" (id, name, description, category, object_type, is_system, template_config)
VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'Checkout Report Card',
  'Send a summary report card email to owners after their pet checks out.',
  'booking',
  'booking',
  true,
  '{
    "entry_condition": {
      "trigger_type": "event",
      "event_type": "booking.checked_out"
    },
    "settings": {
      "allow_reenrollment": false
    },
    "steps": [
      {
        "step_type": "wait",
        "config": {
          "duration": 1,
          "unit": "hours"
        }
      },
      {
        "step_type": "action",
        "action_type": "send_email",
        "config": {
          "recipient": "owner",
          "template_id": "report_card",
          "subject": "{{pet.name}}''s Stay Report Card"
        }
      },
      {
        "step_type": "terminus"
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Post-Stay Survey Template
INSERT INTO "WorkflowTemplate" (id, name, description, category, object_type, is_system, template_config)
VALUES (
  'd4e5f6a7-b8c9-0123-def0-234567890123',
  'Post-Stay Survey',
  'Request feedback from owners 24 hours after their pet checks out.',
  'booking',
  'booking',
  true,
  '{
    "entry_condition": {
      "trigger_type": "event",
      "event_type": "booking.checked_out"
    },
    "settings": {
      "allow_reenrollment": false
    },
    "steps": [
      {
        "step_type": "wait",
        "config": {
          "duration": 24,
          "unit": "hours"
        }
      },
      {
        "step_type": "action",
        "action_type": "send_sms",
        "config": {
          "recipient": "owner",
          "message": "Hi {{owner.first_name}}, thank you for trusting us with {{pet.name}}! We''d love to hear about your experience. Please take a moment to share your feedback: {{survey_link}} - {{tenant.name}}"
        }
      },
      {
        "step_type": "terminus"
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- New Customer Welcome Template
INSERT INTO "WorkflowTemplate" (id, name, description, category, object_type, is_system, template_config)
VALUES (
  'e5f6a7b8-c9d0-1234-ef01-345678901234',
  'New Customer Welcome',
  'Welcome new customers with a series of onboarding emails to help them get started.',
  'onboarding',
  'owner',
  true,
  '{
    "entry_condition": {
      "trigger_type": "event",
      "event_type": "owner.created"
    },
    "settings": {
      "allow_reenrollment": false
    },
    "steps": [
      {
        "step_type": "action",
        "action_type": "send_email",
        "config": {
          "recipient": "owner",
          "template_id": "welcome",
          "subject": "Welcome to {{tenant.name}}!"
        }
      },
      {
        "step_type": "wait",
        "config": {
          "duration": 2,
          "unit": "days"
        }
      },
      {
        "step_type": "action",
        "action_type": "send_email",
        "config": {
          "recipient": "owner",
          "template_id": "complete_profile",
          "subject": "Complete your profile at {{tenant.name}}"
        }
      },
      {
        "step_type": "terminus"
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Payment Reminder Template
INSERT INTO "WorkflowTemplate" (id, name, description, category, object_type, is_system, template_config)
VALUES (
  'f6a7b8c9-d0e1-2345-f012-456789012345',
  'Payment Reminder',
  'Follow up on overdue invoices with automated reminders and task creation for staff.',
  'payment',
  'invoice',
  true,
  '{
    "entry_condition": {
      "trigger_type": "event",
      "event_type": "invoice.overdue"
    },
    "settings": {
      "allow_reenrollment": false
    },
    "steps": [
      {
        "step_type": "action",
        "action_type": "send_sms",
        "config": {
          "recipient": "owner",
          "message": "Hi {{owner.first_name}}, this is a friendly reminder that you have an outstanding balance of {{invoice.amount}}. Please contact us or visit our portal to complete payment. - {{tenant.name}}"
        }
      },
      {
        "step_type": "wait",
        "config": {
          "duration": 3,
          "unit": "days"
        }
      },
      {
        "step_type": "determinator",
        "config": {
          "condition": {
            "field": "status",
            "operator": "equals",
            "value": "unpaid"
          }
        },
        "yes_branch": [
          {
            "step_type": "action",
            "action_type": "send_sms",
            "config": {
              "recipient": "owner",
              "message": "Hi {{owner.first_name}}, your payment of {{invoice.amount}} is still outstanding. Please contact us to arrange payment. - {{tenant.name}}"
            }
          },
          {
            "step_type": "action",
            "action_type": "create_task",
            "config": {
              "title": "Follow up on overdue payment - {{owner.full_name}}",
              "description": "Invoice {{invoice.number}} is overdue. Amount: {{invoice.amount}}",
              "priority": "high",
              "due_in_hours": 24
            }
          },
          {
            "step_type": "terminus"
          }
        ],
        "no_branch": [
          {
            "step_type": "terminus"
          }
        ]
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Birthday Greeting Template
INSERT INTO "WorkflowTemplate" (id, name, description, category, object_type, is_system, template_config)
VALUES (
  'a7b8c9d0-e1f2-3456-0123-567890123456',
  'Birthday Greeting',
  'Send a special birthday message to pet owners with an optional discount code.',
  'communication',
  'pet',
  true,
  '{
    "entry_condition": {
      "trigger_type": "event",
      "event_type": "pet.birthday"
    },
    "settings": {
      "allow_reenrollment": true
    },
    "steps": [
      {
        "step_type": "action",
        "action_type": "send_sms",
        "config": {
          "recipient": "owner",
          "message": "Happy Birthday {{pet.name}}! 🎂 We hope your furry friend has an amazing day. As a birthday treat, enjoy 10% off your next visit with code BDAY10! - {{tenant.name}}"
        }
      },
      {
        "step_type": "terminus"
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- Booking Confirmation Template
INSERT INTO "WorkflowTemplate" (id, name, description, category, object_type, is_system, template_config)
VALUES (
  'b8c9d0e1-f2a3-4567-1234-678901234567',
  'Booking Confirmation',
  'Immediately confirm new bookings with all relevant details.',
  'booking',
  'booking',
  true,
  '{
    "entry_condition": {
      "trigger_type": "event",
      "event_type": "booking.created"
    },
    "settings": {
      "allow_reenrollment": false
    },
    "steps": [
      {
        "step_type": "action",
        "action_type": "send_email",
        "config": {
          "recipient": "owner",
          "template_id": "booking_confirmation",
          "subject": "Booking Confirmed for {{pet.name}}"
        }
      },
      {
        "step_type": "terminus"
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;
