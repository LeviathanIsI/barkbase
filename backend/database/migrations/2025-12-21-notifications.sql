-- Notification System
-- In-app notifications for staff and owners from workflows and system events

-- =============================================================================
-- NOTIFICATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS "Notification" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,

  -- Notification content
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'system',
  -- Types: 'workflow', 'system', 'reminder', 'alert', 'info'

  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  -- Priority: 'low', 'normal', 'high', 'urgent'

  -- Entity reference (what the notification is about)
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Recipient
  recipient_type VARCHAR(20) NOT NULL,
  -- 'staff' or 'owner'
  recipient_id UUID,
  -- NULL for broadcast to all of recipient_type

  -- Read status
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB,
  -- Can include: workflowId, executionId, actionUrl, etc.

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  CONSTRAINT notification_type_check CHECK (type IN ('workflow', 'system', 'reminder', 'alert', 'info')),
  CONSTRAINT notification_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT notification_recipient_type_check CHECK (recipient_type IN ('staff', 'owner'))
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary query: unread notifications for a recipient
CREATE INDEX IF NOT EXISTS idx_notification_unread
ON "Notification"(tenant_id, recipient_type, recipient_id, read, created_at DESC)
WHERE read = false;

-- All notifications for a recipient (with pagination)
CREATE INDEX IF NOT EXISTS idx_notification_recipient
ON "Notification"(tenant_id, recipient_type, recipient_id, created_at DESC);

-- Notifications by entity (find all notifications about a record)
CREATE INDEX IF NOT EXISTS idx_notification_entity
ON "Notification"(tenant_id, entity_type, entity_id)
WHERE entity_id IS NOT NULL;

-- Expired notifications cleanup
CREATE INDEX IF NOT EXISTS idx_notification_expired
ON "Notification"(expires_at)
WHERE expires_at IS NOT NULL;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE "Notification" IS 'In-app notifications for staff and owners';
COMMENT ON COLUMN "Notification".type IS 'Source type: workflow, system, reminder, alert, info';
COMMENT ON COLUMN "Notification".priority IS 'Display priority: low, normal, high, urgent';
COMMENT ON COLUMN "Notification".entity_type IS 'Type of related entity (pet, booking, owner, etc.)';
COMMENT ON COLUMN "Notification".entity_id IS 'ID of related entity';
COMMENT ON COLUMN "Notification".recipient_type IS 'Recipient type: staff or owner';
COMMENT ON COLUMN "Notification".recipient_id IS 'User/Owner ID, or NULL for broadcast';
COMMENT ON COLUMN "Notification".metadata IS 'Additional data: workflowId, actionUrl, etc.';
