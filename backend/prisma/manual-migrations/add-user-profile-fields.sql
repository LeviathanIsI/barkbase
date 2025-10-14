-- Add missing columns to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "name" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS "preferences" JSONB DEFAULT '{}';

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");
CREATE INDEX IF NOT EXISTS "User_language_idx" ON "User"("language");

