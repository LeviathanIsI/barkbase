-- BarkBase Database Schema
-- PostgreSQL Schema for AWS RDS

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_crypto";

-- Tenants table - Multi-tenant architecture
CREATE TABLE IF NOT EXISTS "Tenant" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "slug" VARCHAR(255) UNIQUE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "plan" VARCHAR(50) NOT NULL DEFAULT 'FREE',
    "themeJson" JSONB DEFAULT '{}',
    "featureFlags" JSONB DEFAULT '{}',
    "customDomain" VARCHAR(255),
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_slug ON "Tenant"("slug");

-- Users table
CREATE TABLE IF NOT EXISTS "User" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "passwordHash" VARCHAR(255),
    "name" VARCHAR(255),
    "phone" VARCHAR(50),
    "cognitoSub" VARCHAR(255) UNIQUE,
    "emailVerified" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(LOWER("email"));
CREATE INDEX IF NOT EXISTS idx_user_cognito_sub ON "User"("cognitoSub");

-- Memberships table - Links users to tenants with roles
CREATE TABLE IF NOT EXISTS "Membership" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "User"("recordId") ON DELETE CASCADE,
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    "role" VARCHAR(50) NOT NULL DEFAULT 'VIEWER',
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("userId", "tenantId")
);

CREATE INDEX IF NOT EXISTS idx_membership_user ON "Membership"("userId");
CREATE INDEX IF NOT EXISTS idx_membership_tenant ON "Membership"("tenantId");

-- Owners table
CREATE TABLE IF NOT EXISTS "Owner" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "emergencyContact" VARCHAR(255),
    "emergencyPhone" VARCHAR(50),
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owner_tenant ON "Owner"("tenantId");
CREATE INDEX IF NOT EXISTS idx_owner_email ON "Owner"(LOWER("email"));

-- Pets table
CREATE TABLE IF NOT EXISTS "Pet" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "breed" VARCHAR(255),
    "species" VARCHAR(50) DEFAULT 'dog',
    "gender" VARCHAR(20),
    "weight" DECIMAL(5,2),
    "birthDate" DATE,
    "color" VARCHAR(100),
    "microchipId" VARCHAR(100),
    "status" VARCHAR(50) DEFAULT 'active',
    "medicalNotes" TEXT,
    "behaviorNotes" TEXT,
    "dietaryNotes" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_tenant ON "Pet"("tenantId");
CREATE INDEX IF NOT EXISTS idx_pet_status ON "Pet"("status");

-- Pet-Owner relationship table (many-to-many)
CREATE TABLE IF NOT EXISTS "PetOwner" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "petId" UUID NOT NULL REFERENCES "Pet"("recordId") ON DELETE CASCADE,
    "ownerId" UUID NOT NULL REFERENCES "Owner"("recordId") ON DELETE CASCADE,
    "isPrimary" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("petId", "ownerId")
);

CREATE INDEX IF NOT EXISTS idx_pet_owner_pet ON "PetOwner"("petId");
CREATE INDEX IF NOT EXISTS idx_pet_owner_owner ON "PetOwner"("ownerId");

-- Services table
CREATE TABLE IF NOT EXISTS "Service" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "priceInCents" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER, -- in minutes
    "isActive" BOOLEAN DEFAULT TRUE,
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_tenant ON "Service"("tenantId");
CREATE INDEX IF NOT EXISTS idx_service_active ON "Service"("isActive");

-- Package table - Bundled service offerings
CREATE TABLE IF NOT EXISTS "Package" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN DEFAULT TRUE,
    "displayOrder" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_package_tenant ON "Package"("tenantId");
CREATE INDEX IF NOT EXISTS idx_package_active ON "Package"("isActive");

-- PackageService table - Junction table linking packages to services
CREATE TABLE IF NOT EXISTS "PackageService" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "packageId" UUID NOT NULL REFERENCES "Package"("recordId") ON DELETE CASCADE,
    "serviceId" UUID NOT NULL REFERENCES "Service"("recordId") ON DELETE CASCADE,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("packageId", "serviceId")
);

CREATE INDEX IF NOT EXISTS idx_package_service_package ON "PackageService"("packageId");
CREATE INDEX IF NOT EXISTS idx_package_service_service ON "PackageService"("serviceId");

-- Run templates table
CREATE TABLE IF NOT EXISTS "RunTemplate" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100),
    "maxCapacity" INTEGER NOT NULL DEFAULT 1,
    "currentCapacity" INTEGER DEFAULT 0,
    "allowedServices" JSONB DEFAULT '[]',
    "notes" TEXT,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_template_tenant ON "RunTemplate"("tenantId");

-- Bookings table
CREATE TABLE IF NOT EXISTS "Booking" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    "petId" UUID NOT NULL REFERENCES "Pet"("recordId") ON DELETE CASCADE,
    "ownerId" UUID NOT NULL REFERENCES "Owner"("recordId") ON DELETE CASCADE,
    "serviceId" UUID REFERENCES "Service"("recordId"),
    "runTemplateId" UUID REFERENCES "RunTemplate"("recordId"),
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "actualCheckIn" TIMESTAMP WITH TIME ZONE,
    "actualCheckOut" TIMESTAMP WITH TIME ZONE,
    "totalPriceInCents" INTEGER DEFAULT 0,
    "depositInCents" INTEGER DEFAULT 0,
    "balanceDueInCents" INTEGER DEFAULT 0,
    "notes" TEXT,
    "specialRequirements" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_tenant ON "Booking"("tenantId");
CREATE INDEX IF NOT EXISTS idx_booking_pet ON "Booking"("petId");
CREATE INDEX IF NOT EXISTS idx_booking_owner ON "Booking"("ownerId");
CREATE INDEX IF NOT EXISTS idx_booking_dates ON "Booking"("checkIn", "checkOut");
CREATE INDEX IF NOT EXISTS idx_booking_status ON "Booking"("status");

-- Vaccinations table
CREATE TABLE IF NOT EXISTS "Vaccination" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    "petId" UUID NOT NULL REFERENCES "Pet"("recordId") ON DELETE CASCADE,
    "type" VARCHAR(100) NOT NULL,
    "administeredAt" DATE NOT NULL,
    "expiresAt" DATE,
    "veterinarian" VARCHAR(255),
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaccination_tenant ON "Vaccination"("tenantId");
CREATE INDEX IF NOT EXISTS idx_vaccination_pet ON "Vaccination"("petId");
CREATE INDEX IF NOT EXISTS idx_vaccination_expires ON "Vaccination"("expiresAt");

-- Check-ins table
CREATE TABLE IF NOT EXISTS "CheckIn" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bookingId" UUID NOT NULL REFERENCES "Booking"("recordId") ON DELETE CASCADE,
    "checkedInAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "checkedInBy" UUID REFERENCES "User"("recordId"),
    "weight" DECIMAL(5,2),
    "conditionRating" INTEGER,
    "vaccinationsVerified" BOOLEAN DEFAULT FALSE,
    "belongings" JSONB DEFAULT '[]',
    "photoUrls" JSONB DEFAULT '[]',
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkin_booking ON "CheckIn"("bookingId");

-- Check-outs table
CREATE TABLE IF NOT EXISTS "CheckOut" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bookingId" UUID NOT NULL REFERENCES "Booking"("recordId") ON DELETE CASCADE,
    "checkedOutAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "checkedOutBy" UUID REFERENCES "User"("recordId"),
    "lateFeeCents" INTEGER DEFAULT 0,
    "additionalChargesCents" INTEGER DEFAULT 0,
    "additionalChargesDescription" TEXT,
    "paymentCaptured" BOOLEAN DEFAULT FALSE,
    "paymentIntentId" VARCHAR(255),
    "signatureUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_booking ON "CheckOut"("bookingId");

-- Invoices table
CREATE TABLE IF NOT EXISTS "Invoice" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    "bookingId" UUID REFERENCES "Booking"("recordId"),
    "ownerId" UUID NOT NULL REFERENCES "Owner"("recordId") ON DELETE CASCADE,
    "invoiceNumber" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "paidCents" INTEGER DEFAULT 0,
    "dueDate" DATE,
    "lineItems" JSONB DEFAULT '[]',
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("tenantId", "invoiceNumber")
);

CREATE INDEX IF NOT EXISTS idx_invoice_tenant ON "Invoice"("tenantId");
CREATE INDEX IF NOT EXISTS idx_invoice_booking ON "Invoice"("bookingId");
CREATE INDEX IF NOT EXISTS idx_invoice_owner ON "Invoice"("ownerId");
CREATE INDEX IF NOT EXISTS idx_invoice_status ON "Invoice"("status");

-- Payments table
CREATE TABLE IF NOT EXISTS "Payment" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    "invoiceId" UUID REFERENCES "Invoice"("recordId"),
    "ownerId" UUID NOT NULL REFERENCES "Owner"("recordId") ON DELETE CASCADE,
    "amountCents" INTEGER NOT NULL,
    "method" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" VARCHAR(255),
    "stripeChargeId" VARCHAR(255),
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_tenant ON "Payment"("tenantId");
CREATE INDEX IF NOT EXISTS idx_payment_invoice ON "Payment"("invoiceId");
CREATE INDEX IF NOT EXISTS idx_payment_owner ON "Payment"("ownerId");

-- Properties table (for custom fields)
CREATE TABLE IF NOT EXISTS "Property" (
    "recordId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "tenantId" UUID NOT NULL REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
    "key" VARCHAR(255) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL, -- 'pet', 'owner', 'booking', etc.
    "settings" JSONB DEFAULT '{}',
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("tenantId", "key", "entityType")
);

CREATE INDEX IF NOT EXISTS idx_property_tenant ON "Property"("tenantId");
CREATE INDEX IF NOT EXISTS idx_property_entity ON "Property"("entityType");

-- Create update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all tables with updatedAt
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updatedAt' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END$$;
