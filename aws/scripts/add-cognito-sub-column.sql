-- Add cognitoSub column to User table for linking Cognito users to database users
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cognitoSub" TEXT UNIQUE;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS "User_cognitoSub_idx" ON "User"("cognitoSub");


