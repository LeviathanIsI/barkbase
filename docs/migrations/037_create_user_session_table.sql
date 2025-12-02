/**
 * =============================================================================
 * Migration 037: Create UserSession Table
 * =============================================================================
 *
 * Purpose: Track user sessions for tenant-specific auto-logout enforcement
 *
 * Background:
 * - Cognito refresh tokens are valid for 30 days (hard ceiling)
 * - Tenants can configure shorter auto-logout intervals (4-168 hours)
 * - Backend needs to enforce these shorter intervals server-side
 * - This table tracks session start times and activity for enforcement
 *
 * Created: 2025-12-02
 * Author: Claude Code
 *
 * =============================================================================
 */

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create UserSession table
CREATE TABLE "UserSession" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES "Tenant"(id) ON DELETE CASCADE,
  cognito_sub VARCHAR(255) NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  session_start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_info JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  logged_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_session_cognito_sub ON "UserSession"(cognito_sub);
CREATE INDEX idx_user_session_user_id ON "UserSession"(user_id);
CREATE INDEX idx_user_session_tenant_id ON "UserSession"(tenant_id);
CREATE INDEX idx_user_session_session_token ON "UserSession"(session_token);
CREATE INDEX idx_user_session_active ON "UserSession"(is_active) WHERE is_active = true;
CREATE INDEX idx_user_session_start_time ON "UserSession"(session_start_time) WHERE is_active = true;

-- Composite index for common query pattern (cognito_sub + is_active)
CREATE INDEX idx_user_session_cognito_active ON "UserSession"(cognito_sub, is_active) WHERE is_active = true;

-- Add comments for documentation
COMMENT ON TABLE "UserSession" IS 'Tracks user login sessions for tenant-specific auto-logout enforcement. Works WITH Cognito tokens to provide shorter session limits than Cognito''s 30-day refresh token validity.';
COMMENT ON COLUMN "UserSession".id IS 'Unique session identifier (UUID)';
COMMENT ON COLUMN "UserSession".user_id IS 'Foreign key to User table';
COMMENT ON COLUMN "UserSession".tenant_id IS 'Foreign key to Tenant table for tenant isolation';
COMMENT ON COLUMN "UserSession".cognito_sub IS 'Cognito sub claim from JWT for quick lookup';
COMMENT ON COLUMN "UserSession".session_token IS 'Unique token for this session, can be used for session invalidation';
COMMENT ON COLUMN "UserSession".session_start_time IS 'When the session was created (used for auto-logout calculation)';
COMMENT ON COLUMN "UserSession".last_activity_time IS 'Last time the session was used (for future idle timeout feature)';
COMMENT ON COLUMN "UserSession".device_info IS 'JSON object with device information for multi-device tracking (e.g., {browser, os, device_type})';
COMMENT ON COLUMN "UserSession".ip_address IS 'IP address of the client when session was created';
COMMENT ON COLUMN "UserSession".user_agent IS 'User agent string of the client';
COMMENT ON COLUMN "UserSession".is_active IS 'Whether the session is currently active (false = logged out or expired)';
COMMENT ON COLUMN "UserSession".logged_out_at IS 'Timestamp when user explicitly logged out (null if expired or still active)';

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_user_session_updated_at
  BEFORE UPDATE ON "UserSession"
  FOR EACH ROW
  EXECUTE FUNCTION update_user_session_updated_at();

-- Create a function to clean up old inactive sessions (optional, for maintenance)
-- This can be called periodically to keep the table clean
CREATE OR REPLACE FUNCTION cleanup_old_sessions(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM "UserSession"
  WHERE is_active = false
    AND (logged_out_at < NOW() - INTERVAL '1 day' * days_old
         OR (logged_out_at IS NULL AND updated_at < NOW() - INTERVAL '1 day' * days_old));

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_sessions IS 'Deletes inactive sessions older than specified days (default 90). Call periodically for maintenance: SELECT cleanup_old_sessions(90);';

-- Migration verification
DO $$
BEGIN
  -- Verify table was created
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'UserSession') THEN
    RAISE EXCEPTION 'Migration failed: UserSession table was not created';
  END IF;

  -- Verify indexes were created
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'UserSession' AND indexname = 'idx_user_session_cognito_sub') THEN
    RAISE EXCEPTION 'Migration failed: idx_user_session_cognito_sub index was not created';
  END IF;

  RAISE NOTICE 'Migration 037 completed successfully';
END $$;
