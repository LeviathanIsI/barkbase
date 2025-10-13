-- Disable RLS on Tenant table since it's a global registry
-- All users need to be able to query tenants by slug during login/signup

ALTER TABLE "Tenant" DISABLE ROW LEVEL SECURITY;

