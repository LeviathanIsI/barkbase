-- Update foreign key references to use recordId column names

-- Membership.userId -> User.recordId
DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema='public' AND tc.table_name='Membership' AND kcu.column_name='userId'
) THEN
  ALTER TABLE "public"."Membership" DROP CONSTRAINT IF EXISTS "Membership_userId_fkey";
END IF;
END $$;
ALTER TABLE "public"."Membership"
  ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("recordId") ON DELETE CASCADE;

-- Membership.tenantId -> Tenant.recordId
DO $$ BEGIN
IF EXISTS (
  SELECT 1 FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema='public' AND tc.table_name='Membership' AND kcu.column_name='tenantId'
) THEN
  ALTER TABLE "public"."Membership" DROP CONSTRAINT IF EXISTS "Membership_tenantId_fkey";
END IF;
END $$;
ALTER TABLE "public"."Membership"
  ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("recordId") ON DELETE CASCADE;

-- PetOwner.petId -> Pet.recordId ; PetOwner.ownerId -> Owner.recordId ; PetOwner.tenantId -> Tenant.recordId
ALTER TABLE "public"."PetOwner" DROP CONSTRAINT IF EXISTS "PetOwner_petId_fkey";
ALTER TABLE "public"."PetOwner" DROP CONSTRAINT IF EXISTS "PetOwner_ownerId_fkey";
ALTER TABLE "public"."PetOwner" DROP CONSTRAINT IF EXISTS "PetOwner_tenantId_fkey";
ALTER TABLE "public"."PetOwner" ADD CONSTRAINT "PetOwner_petId_fkey" FOREIGN KEY ("petId") REFERENCES "public"."Pet"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."PetOwner" ADD CONSTRAINT "PetOwner_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."Owner"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."PetOwner" ADD CONSTRAINT "PetOwner_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("recordId") ON DELETE CASCADE;

-- Booking.fks
ALTER TABLE "public"."Booking" DROP CONSTRAINT IF EXISTS "Booking_tenantId_fkey";
ALTER TABLE "public"."Booking" DROP CONSTRAINT IF EXISTS "Booking_petId_fkey";
ALTER TABLE "public"."Booking" DROP CONSTRAINT IF EXISTS "Booking_ownerId_fkey";
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_petId_fkey" FOREIGN KEY ("petId") REFERENCES "public"."Pet"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."Owner"("recordId") ON DELETE CASCADE;

-- BookingSegment.fks
ALTER TABLE "public"."BookingSegment" DROP CONSTRAINT IF EXISTS "BookingSegment_tenantId_fkey";
ALTER TABLE "public"."BookingSegment" DROP CONSTRAINT IF EXISTS "BookingSegment_bookingId_fkey";
ALTER TABLE "public"."BookingSegment" DROP CONSTRAINT IF EXISTS "BookingSegment_kennelId_fkey";
ALTER TABLE "public"."BookingSegment" ADD CONSTRAINT "BookingSegment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."BookingSegment" ADD CONSTRAINT "BookingSegment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."BookingSegment" ADD CONSTRAINT "BookingSegment_kennelId_fkey" FOREIGN KEY ("kennelId") REFERENCES "public"."Kennel"("recordId") ON DELETE CASCADE;

-- Service.fks
ALTER TABLE "public"."Service" DROP CONSTRAINT IF EXISTS "Service_tenantId_fkey";
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("recordId") ON DELETE CASCADE;

-- BookingService.fks
ALTER TABLE "public"."BookingService" DROP CONSTRAINT IF EXISTS "BookingService_tenantId_fkey";
ALTER TABLE "public"."BookingService" DROP CONSTRAINT IF EXISTS "BookingService_bookingId_fkey";
ALTER TABLE "public"."BookingService" DROP CONSTRAINT IF EXISTS "BookingService_serviceId_fkey";
ALTER TABLE "public"."BookingService" ADD CONSTRAINT "BookingService_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."BookingService" ADD CONSTRAINT "BookingService_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."BookingService" ADD CONSTRAINT "BookingService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("recordId") ON DELETE CASCADE;

-- Vaccination.fks
ALTER TABLE "public"."Vaccination" DROP CONSTRAINT IF EXISTS "Vaccination_tenantId_fkey";
ALTER TABLE "public"."Vaccination" DROP CONSTRAINT IF EXISTS "Vaccination_petId_fkey";
ALTER TABLE "public"."Vaccination" ADD CONSTRAINT "Vaccination_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."Vaccination" ADD CONSTRAINT "Vaccination_petId_fkey" FOREIGN KEY ("petId") REFERENCES "public"."Pet"("recordId") ON DELETE CASCADE;

-- Payment.fks
ALTER TABLE "public"."Payment" DROP CONSTRAINT IF EXISTS "Payment_tenantId_fkey";
ALTER TABLE "public"."Payment" DROP CONSTRAINT IF EXISTS "Payment_bookingId_fkey";
ALTER TABLE "public"."Payment" DROP CONSTRAINT IF EXISTS "Payment_ownerId_fkey";
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."Owner"("recordId") ON DELETE CASCADE;

-- CheckIn.fks
ALTER TABLE "public"."CheckIn" DROP CONSTRAINT IF EXISTS "CheckIn_tenantId_fkey";
ALTER TABLE "public"."CheckIn" DROP CONSTRAINT IF EXISTS "CheckIn_bookingId_fkey";
ALTER TABLE "public"."CheckIn" DROP CONSTRAINT IF EXISTS "CheckIn_staffId_fkey";
ALTER TABLE "public"."CheckIn" ADD CONSTRAINT "CheckIn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."CheckIn" ADD CONSTRAINT "CheckIn_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."CheckIn" ADD CONSTRAINT "CheckIn_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("recordId") ON DELETE SET NULL;

-- CheckOut.fks
ALTER TABLE "public"."CheckOut" DROP CONSTRAINT IF EXISTS "CheckOut_tenantId_fkey";
ALTER TABLE "public"."CheckOut" DROP CONSTRAINT IF EXISTS "CheckOut_bookingId_fkey";
ALTER TABLE "public"."CheckOut" DROP CONSTRAINT IF EXISTS "CheckOut_staffId_fkey";
ALTER TABLE "public"."CheckOut" ADD CONSTRAINT "CheckOut_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."CheckOut" ADD CONSTRAINT "CheckOut_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."CheckOut" ADD CONSTRAINT "CheckOut_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."Staff"("recordId") ON DELETE SET NULL;

-- IncidentReport.fks
ALTER TABLE "public"."IncidentReport" DROP CONSTRAINT IF EXISTS "IncidentReport_tenantId_fkey";
ALTER TABLE "public"."IncidentReport" DROP CONSTRAINT IF EXISTS "IncidentReport_petId_fkey";
ALTER TABLE "public"."IncidentReport" DROP CONSTRAINT IF EXISTS "IncidentReport_bookingId_fkey";
ALTER TABLE "public"."IncidentReport" ADD CONSTRAINT "IncidentReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."IncidentReport" ADD CONSTRAINT "IncidentReport_petId_fkey" FOREIGN KEY ("petId") REFERENCES "public"."Pet"("recordId") ON DELETE CASCADE;
ALTER TABLE "public"."IncidentReport" ADD CONSTRAINT "IncidentReport_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("recordId") ON DELETE SET NULL;


