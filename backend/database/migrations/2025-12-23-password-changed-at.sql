-- ============================================================================
-- MIGRATION: Add password_changed_at column to User table
-- Date: 2025-12-23
-- Purpose: Track when user last changed their password
-- ============================================================================

BEGIN;

-- Add password_changed_at column to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN "User".password_changed_at IS 'Timestamp when user last changed their password';

COMMIT;
