-- Fix RLS Policies for Supabase
-- Run this script in Supabase SQL Editor

-- Create app schema if not exists
CREATE SCHEMA IF NOT EXISTS app;

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS app.set_tenant_id(text);
DROP FUNCTION IF EXISTS app.get_tenant_id();

-- Create set_tenant_id function
CREATE OR REPLACE FUNCTION app.set_tenant_id(tenant_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id, true);
END;
$$;

-- Create get_tenant_id function
CREATE OR REPLACE FUNCTION app.get_tenant_id()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true);
END;
$$;

-- Enable RLS on all tables
ALTER TABLE IF EXISTS public."Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Invite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."EmailVerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."UsageCounter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Owner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Pet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."PetOwner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Kennel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."BookingSegment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."BookingService" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Vaccination" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CheckIn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CheckOut" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."IncidentReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Communication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CustomerSegment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CustomerSegmentMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CustomerTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."CustomerTagMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."run_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."messages" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS global_table_access ON public.%I', r.tablename);
    END LOOP;
END $$;

-- Create RLS policies for tenant-scoped tables
CREATE POLICY tenant_isolation ON public."Owner"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."Pet"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."PetOwner"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."Kennel"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."Booking"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."BookingSegment"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."Service"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."BookingService"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."Vaccination"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."Payment"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."CheckIn"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."CheckOut"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."IncidentReport"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."Staff"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."AuditLog"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."UsageCounter"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."Communication"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."CustomerSegment"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."CustomerSegmentMember"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."CustomerTag"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."CustomerTagMember"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."Campaign"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."Note"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."Task"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."runs"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."run_assignments"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

CREATE POLICY tenant_isolation ON public."messages"
  FOR ALL
  USING ("tenantId" = app.get_tenant_id());

-- Create policies for global tables (no tenant isolation)
CREATE POLICY global_table_access ON public."Tenant"
  FOR ALL
  USING (true);

CREATE POLICY global_table_access ON public."User"
  FOR ALL
  USING (true);

CREATE POLICY global_table_access ON public."Membership"
  FOR ALL
  USING (true);

CREATE POLICY global_table_access ON public."Invite"
  FOR ALL
  USING (true);

CREATE POLICY global_table_access ON public."EmailVerificationToken"
  FOR ALL
  USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA app TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.set_tenant_id(text) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.get_tenant_id() TO postgres, anon, authenticated, service_role;
