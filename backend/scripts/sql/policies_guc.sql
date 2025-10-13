-- Policies that rely on a per-transaction custom GUC: app.tenant_id
-- The backend will SET LOCAL app.tenant_id = '<tenantId>' inside a Prisma transaction.

-- Helper to drop policies if they exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Owner' AND policyname='tenant read') THEN
    DROP POLICY "tenant read" ON "Owner";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Owner' AND policyname='tenant write') THEN
    DROP POLICY "tenant write" ON "Owner";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='Owner' AND policyname='tenant update') THEN
    DROP POLICY "tenant update" ON "Owner";
  END IF;
END $$;

CREATE POLICY "tenant read" ON "Owner"
  FOR SELECT
  USING ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY "tenant write" ON "Owner"
  FOR INSERT
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

CREATE POLICY "tenant update" ON "Owner"
  FOR UPDATE
  USING ("tenantId" = current_setting('app.tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true));

-- Repeat for other tenant-scoped tables
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT unnest(ARRAY['Pet','PetOwner','Booking','BookingSegment','Service','BookingService','Payment','Vaccination','Staff','Membership','AuditLog','UsageCounter','CheckIn','CheckOut','IncidentReport']) AS t LOOP
    EXECUTE format('DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname=''public'' AND tablename=''%I'' AND policyname=''tenant read'') THEN DROP POLICY "tenant read" ON %I; END IF; END $$;', r.t, r.t);
    EXECUTE format('DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname=''public'' AND tablename=''%I'' AND policyname=''tenant write'') THEN DROP POLICY "tenant write" ON %I; END IF; END $$;', r.t, r.t);
    EXECUTE format('DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname=''public'' AND tablename=''%I'' AND policyname=''tenant update'') THEN DROP POLICY "tenant update" ON %I; END IF; END $$;', r.t, r.t);

    EXECUTE format('CREATE POLICY "tenant read" ON %I FOR SELECT USING ("tenantId" = current_setting(''app.tenant_id'', true));', r.t);
    EXECUTE format('CREATE POLICY "tenant write" ON %I FOR INSERT WITH CHECK ("tenantId" = current_setting(''app.tenant_id'', true));', r.t);
    EXECUTE format('CREATE POLICY "tenant update" ON %I FOR UPDATE USING ("tenantId" = current_setting(''app.tenant_id'', true)) WITH CHECK ("tenantId" = current_setting(''app.tenant_id'', true));', r.t);
  END LOOP;
END $$;


