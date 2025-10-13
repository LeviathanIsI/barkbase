-- Disable RLS on global tables (not tenant-scoped)
-- These tables are shared across all tenants

ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailVerificationToken" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Invite" DISABLE ROW LEVEL SECURITY;

