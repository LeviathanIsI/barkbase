-- BarkBase Sample Data Seed
-- Run this after creating a User, Tenant, and Membership via signup
-- Replace the UUIDs below with your actual recordIds from the database

-- STEP 1: Get your actual IDs from the database first
-- SELECT "recordId" FROM "Tenant" LIMIT 1;
-- SELECT "recordId" FROM "User" LIMIT 1;
-- SELECT "recordId" FROM "Membership" LIMIT 1;

-- REPLACE THESE WITH YOUR ACTUAL IDs:
DO $$
DECLARE
    v_tenant_id TEXT := (SELECT "recordId" FROM "Tenant" ORDER BY "createdAt" DESC LIMIT 1);
    v_user_id TEXT := (SELECT "recordId" FROM "User" ORDER BY "createdAt" DESC LIMIT 1);
    v_membership_id TEXT := (SELECT "recordId" FROM "Membership" ORDER BY "createdAt" DESC LIMIT 1);
    v_owner_id TEXT;
    v_pet_id TEXT;
    v_kennel_id TEXT;
    v_service_id TEXT;
    v_booking_id TEXT;
    v_staff_id TEXT;
BEGIN
    RAISE NOTICE 'Using Tenant ID: %', v_tenant_id;
    RAISE NOTICE 'Using User ID: %', v_user_id;

    -- Owners (Pet Owners/Customers)
    INSERT INTO "Owner" ("recordId", "tenantId", "firstName", "lastName", "email", "phone", "address", "updatedAt")
    VALUES 
        (gen_random_uuid(), v_tenant_id, 'Sarah', 'Johnson', 'sarah@example.com', '555-0101', '{"street": "123 Main St", "city": "Springfield", "state": "IL", "zip": "12345"}'::jsonb, NOW()),
        (gen_random_uuid(), v_tenant_id, 'Mike', 'Davis', 'mike@example.com', '555-0103', '{"street": "456 Oak Ave", "city": "Springfield", "state": "IL", "zip": "12345"}'::jsonb, NOW());
    
    SELECT "recordId" INTO v_owner_id FROM "Owner" WHERE "tenantId" = v_tenant_id LIMIT 1;

    -- Pets
    INSERT INTO "Pet" ("recordId", "tenantId", "name", "species", "breed", "birthdate", "weight", "status", "behaviorFlags", "updatedAt")
    VALUES 
        (gen_random_uuid(), v_tenant_id, 'Max', 'Dog', 'Golden Retriever', '2020-05-15'::date, 65.0, 'active', '{}'::jsonb, NOW()),
        (gen_random_uuid(), v_tenant_id, 'Bella', 'Dog', 'Labrador', '2019-03-22'::date, 55.0, 'active', '{}'::jsonb, NOW()),
        (gen_random_uuid(), v_tenant_id, 'Charlie', 'Dog', 'Beagle', '2021-08-10'::date, 25.0, 'active', '{}'::jsonb, NOW());
    
    SELECT "recordId" INTO v_pet_id FROM "Pet" WHERE "tenantId" = v_tenant_id LIMIT 1;

    -- Link Pets to Owners
    INSERT INTO "PetOwner" ("recordId", "tenantId", "petId", "ownerId", "isPrimary")
    SELECT gen_random_uuid(), v_tenant_id, p."recordId", 
           (SELECT "recordId" FROM "Owner" WHERE "tenantId" = v_tenant_id ORDER BY random() LIMIT 1),
           true
    FROM "Pet" p WHERE p."tenantId" = v_tenant_id;

    -- Services
    INSERT INTO "Service" ("recordId", "tenantId", "name", "category", "description", "priceCents", "updatedAt")
    VALUES 
        (gen_random_uuid(), v_tenant_id, 'Standard Boarding', 'BOARDING', 'Overnight boarding with 2 walks daily', 5000, NOW()),
        (gen_random_uuid(), v_tenant_id, 'Daycare', 'DAYCARE', 'Full day of play and socialization', 3500, NOW()),
        (gen_random_uuid(), v_tenant_id, 'Bath & Brush', 'GROOMING', 'Basic grooming package', 4500, NOW());
    
    SELECT "recordId" INTO v_service_id FROM "Service" WHERE "tenantId" = v_tenant_id LIMIT 1;

    -- Kennels
    INSERT INTO "Kennel" ("recordId", "tenantId", "name", "type", "capacity", "amenities", "updatedAt")
    VALUES 
        (gen_random_uuid(), v_tenant_id, 'Suite 1', 'SUITE', 1, '{"tv": true, "ac": true}'::jsonb, NOW()),
        (gen_random_uuid(), v_tenant_id, 'Suite 2', 'SUITE', 1, '{"tv": true, "ac": true}'::jsonb, NOW()),
        (gen_random_uuid(), v_tenant_id, 'Kennel A1', 'KENNEL', 1, '{}'::jsonb, NOW()),
        (gen_random_uuid(), v_tenant_id, 'Kennel A2', 'KENNEL', 1, '{}'::jsonb, NOW()),
        (gen_random_uuid(), v_tenant_id, 'Daycare Room', 'DAYCARE', 20, '{"outdoor": true}'::jsonb, NOW());
    
    SELECT "recordId" INTO v_kennel_id FROM "Kennel" WHERE "tenantId" = v_tenant_id LIMIT 1;

    -- Bookings
    INSERT INTO "Booking" ("recordId", "tenantId", "petId", "ownerId", "checkIn", "checkOut", "status", "notes", "totalCents", "updatedAt")
    SELECT gen_random_uuid(), v_tenant_id,
           (SELECT "recordId" FROM "Pet" WHERE "tenantId" = v_tenant_id ORDER BY random() LIMIT 1),
           (SELECT "recordId" FROM "Owner" WHERE "tenantId" = v_tenant_id ORDER BY random() LIMIT 1),
           CURRENT_DATE + 1,
           CURRENT_DATE + 4,
           'CONFIRMED',
           'First booking - excited!',
           15000,
           NOW()
    RETURNING "recordId" INTO v_booking_id;

    -- Booking Segments
    INSERT INTO "BookingSegment" ("recordId", "tenantId", "bookingId", "kennelId", "startDate", "endDate", "status")
    SELECT gen_random_uuid(), v_tenant_id, v_booking_id,
           (SELECT "recordId" FROM "Kennel" WHERE "tenantId" = v_tenant_id AND "type" = 'SUITE' LIMIT 1),
           CURRENT_DATE + 1,
           CURRENT_DATE + 4,
           'CONFIRMED';

    -- Booking Services
    INSERT INTO "BookingService" ("recordId", "tenantId", "bookingId", "serviceId", "quantity", "priceCents")
    SELECT gen_random_uuid(), v_tenant_id, v_booking_id,
           (SELECT "recordId" FROM "Service" WHERE "tenantId" = v_tenant_id AND "category" = 'BOARDING' LIMIT 1),
           3,
           15000;

    -- Staff
    INSERT INTO "Staff" ("recordId", "tenantId", "membershipId", "title", "phone", "schedule", "updatedAt")
    VALUES 
        (gen_random_uuid(), v_tenant_id, v_membership_id, 'Kennel Manager', '555-STAFF', '{}'::jsonb, NOW())
    RETURNING "recordId" INTO v_staff_id;

    -- Tasks
    INSERT INTO "Task" ("recordId", "tenantId", "type", "relatedType", "relatedId", "assignedTo", "scheduledFor", "notes", "updatedAt")
    SELECT gen_random_uuid(), v_tenant_id,
           'FEEDING',
           'Pet',
           (SELECT "recordId" FROM "Pet" WHERE "tenantId" = v_tenant_id LIMIT 1),
           v_staff_id,
           CURRENT_DATE + INTERVAL '8 hours',
           'Feed all dogs in Suite 1',
           NOW();

    -- Vaccinations
    INSERT INTO "Vaccination" ("recordId", "tenantId", "petId", "type", "administeredAt", "expiresAt", "notes", "updatedAt")
    SELECT gen_random_uuid(), v_tenant_id,
           "recordId",
           'Rabies',
           CURRENT_DATE - INTERVAL '6 months',
           CURRENT_DATE + INTERVAL '6 months',
           'Administered by Dr. Smith, ABC Vet Clinic',
           NOW()
    FROM "Pet" WHERE "tenantId" = v_tenant_id LIMIT 1;

    -- Payments
    INSERT INTO "Payment" ("recordId", "tenantId", "bookingId", "ownerId", "amountCents", "method", "status", "metadata", "updatedAt")
    SELECT gen_random_uuid(), v_tenant_id, v_booking_id, v_owner_id, 15000, 'CARD', 'CAPTURED', '{"last4": "4242"}'::jsonb, NOW();

    -- Incident Reports
    INSERT INTO "IncidentReport" ("recordId", "tenantId", "petId", "severity", "narrative", "updatedAt")
    SELECT gen_random_uuid(), v_tenant_id,
           (SELECT "recordId" FROM "Pet" WHERE "tenantId" = v_tenant_id LIMIT 1),
           'MINOR',
           'Minor scuffle during playtime, no injuries',
           NOW();

    -- Notes
    INSERT INTO "Note" ("recordId", "tenantId", "entityId", "entityType", "content", "visibility", "authorId", "updatedAt")
    SELECT gen_random_uuid(), v_tenant_id,
           (SELECT "recordId" FROM "Pet" WHERE "tenantId" = v_tenant_id LIMIT 1),
           'Pet',
           'Max loves playing fetch! Remember to bring his favorite ball.',
           'ALL',
           v_user_id,
           NOW();

    RAISE NOTICE 'Sample data created successfully!';
    RAISE NOTICE 'Created: 2 Owners, 3 Pets, 3 Services, 5 Kennels, 1 Booking, 1 Payment, 1 Staff, 1 Task, 1 Vaccination, 1 Incident, 1 Note';
END $$;

