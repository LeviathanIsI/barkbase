-- Rename primary key columns from "id" to "recordId" across core tables
-- Safe to re-run: each block checks column existence first

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Tenant' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."Tenant" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."User" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Membership' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."Membership" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Invite' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."Invite" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'EmailVerificationToken' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."EmailVerificationToken" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'AuditLog' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."AuditLog" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'UsageCounter' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."UsageCounter" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Staff' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."Staff" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Owner' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."Owner" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Pet' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."Pet" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'PetOwner' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."PetOwner" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Kennel' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."Kennel" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Booking' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."Booking" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'BookingSegment' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."BookingSegment" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Service' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."Service" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'BookingService' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."BookingService" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Vaccination' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."Vaccination" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Payment' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."Payment" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'CheckIn' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."CheckIn" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'CheckOut' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."CheckOut" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;

DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'IncidentReport' AND column_name = 'id'
) THEN
  ALTER TABLE "public"."IncidentReport" RENAME COLUMN "id" TO "recordId";
END IF;
END $$;


