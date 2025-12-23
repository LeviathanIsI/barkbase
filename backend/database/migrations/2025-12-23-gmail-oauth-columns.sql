-- ============================================================================
-- MIGRATION: Add Gmail OAuth columns to User table
-- Date: 2025-12-23
-- Purpose: Store encrypted OAuth tokens for Gmail integration
-- ============================================================================

BEGIN;

-- Add Gmail OAuth columns to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gmail_connected_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS gmail_connected_at TIMESTAMPTZ;

-- Add index for quick lookup of connected emails
CREATE INDEX IF NOT EXISTS idx_user_gmail_connected
ON "User" (tenant_id, gmail_connected_email)
WHERE gmail_connected_email IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN "User".gmail_access_token IS 'Encrypted Gmail OAuth access token';
COMMENT ON COLUMN "User".gmail_refresh_token IS 'Encrypted Gmail OAuth refresh token';
COMMENT ON COLUMN "User".gmail_token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN "User".gmail_connected_email IS 'The Gmail email address that was connected';
COMMENT ON COLUMN "User".gmail_connected_at IS 'When the Gmail account was connected';

COMMIT;
