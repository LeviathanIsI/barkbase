-- PostgreSQL schema generated from prisma/schema.prisma

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE "TenantPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'STAFF', 'READONLY');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED');
CREATE TYPE "IncidentSeverity" AS ENUM ('MINOR', 'MODERATE', 'SEVERE', 'CRITICAL');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'REFUNDED', 'FAILED');
CREATE TYPE "ServiceCategory" AS ENUM ('BOARDING', 'DAYCARE', 'GROOMING', 'TRAINING', 'OTHER');
CREATE TYPE "KennelType" AS ENUM ('SUITE', 'KENNEL', 'CABIN', 'DAYCARE', 'MEDICAL');
CREATE TYPE "CommunicationType" AS ENUM ('EMAIL', 'SMS', 'CALL', 'NOTE', 'SYSTEM');
CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');
CREATE TYPE "NoteVisibility" AS ENUM ('ALL', 'STAFF', 'ADMIN', 'PRIVATE');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TaskType" AS ENUM ('FEEDING', 'MEDICATION', 'EXERCISE', 'CLEANING', 'HEALTH_CHECK', 'SPECIAL_CARE');
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- Tables
CREATE TABLE "Tenant" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "themeJson" JSONB,
    "featureFlags" JSONB,
    "plan" "TenantPlan" NOT NULL DEFAULT 'FREE',
    "customDomain" TEXT UNIQUE,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "User" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "timezone" TEXT DEFAULT 'America/New_York',
    "language" TEXT DEFAULT 'en',
    "preferences" JSONB DEFAULT '{}'
);

CREATE TABLE "Membership" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Membership_userId_tenantId_key" ON "Membership"("userId", "tenantId");
CREATE INDEX "Membership_tenantId_role_idx" ON "Membership"("tenantId", "role");

CREATE TABLE "Invite" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Invite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("recordId") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Invite_tenantId_email_key" ON "Invite"("tenantId", "email");
CREATE INDEX "Invite_tenantId_idx" ON "Invite"("tenantId");
CREATE INDEX "Invite_email_idx" ON "Invite"("email");

CREATE TABLE "EmailVerificationToken" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken"("userId", "expiresAt");

CREATE TABLE "AuditLog" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("recordId") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX "AuditLog_tenantId_entityType_idx" ON "AuditLog"("tenantId", "entityType");

CREATE TABLE "UsageCounter" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "bookings" INTEGER NOT NULL DEFAULT 0,
    "activePets" INTEGER NOT NULL DEFAULT 0,
    "staffSeats" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UsageCounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UsageCounter_tenantId_date_key" ON "UsageCounter"("tenantId", "date");
CREATE INDEX "UsageCounter_tenantId_date_idx" ON "UsageCounter"("tenantId", "date");

CREATE TABLE "Staff" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL UNIQUE,
    "title" TEXT,
    "phone" TEXT,
    "schedule" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Staff_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Staff_tenantId_idx" ON "Staff"("tenantId");

CREATE TABLE "Owner" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Owner_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Owner_tenantId_email_key" ON "Owner"("tenantId", "email");
CREATE INDEX "Owner_tenantId_lastName_idx" ON "Owner"("tenantId", "lastName");

CREATE TABLE "Pet" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" TEXT,
    "breed" TEXT,
    "birthdate" TIMESTAMP(3),
    "photoUrl" TEXT,
    "medicalNotes" TEXT,
    "dietaryNotes" TEXT,
    "behaviorFlags" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION,
    "allergies" TEXT,
    "lastVetVisit" TIMESTAMP(3),
    "nextAppointment" TIMESTAMP(3),
    CONSTRAINT "Pet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Pet_tenantId_name_idx" ON "Pet"("tenantId", "name");

CREATE TABLE "PetOwner" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PetOwner_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PetOwner_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PetOwner_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PetOwner_tenantId_petId_ownerId_key" ON "PetOwner"("tenantId", "petId", "ownerId");
CREATE INDEX "PetOwner_tenantId_ownerId_idx" ON "PetOwner"("tenantId", "ownerId");

CREATE TABLE "Kennel" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "KennelType" NOT NULL,
    "size" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "amenities" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "building" TEXT,
    "zone" TEXT,
    "hourlyRate" INTEGER,
    "dailyRate" INTEGER,
    "weeklyRate" INTEGER,
    "notes" TEXT,
    CONSTRAINT "Kennel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Kennel_tenantId_name_key" ON "Kennel"("tenantId", "name");
CREATE INDEX "Kennel_tenantId_type_idx" ON "Kennel"("tenantId", "type");
CREATE INDEX "Kennel_tenantId_isActive_idx" ON "Kennel"("tenantId", "isActive");

CREATE TABLE "Booking" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "balanceDueCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "specialInstructions" TEXT,
    "source" TEXT DEFAULT 'portal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Booking_tenantId_status_checkIn_idx" ON "Booking"("tenantId", "status", "checkIn");
CREATE INDEX "Booking_tenantId_petId_idx" ON "Booking"("tenantId", "petId");

CREATE TABLE "BookingSegment" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kennelId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    CONSTRAINT "BookingSegment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingSegment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingSegment_kennelId_fkey" FOREIGN KEY ("kennelId") REFERENCES "Kennel"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BookingSegment_tenantId_startDate_idx" ON "BookingSegment"("tenantId", "startDate");
CREATE INDEX "BookingSegment_tenantId_kennelId_startDate_idx" ON "BookingSegment"("tenantId", "kennelId", "startDate");

CREATE TABLE "Service" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "category" "ServiceCategory" NOT NULL DEFAULT 'BOARDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Service_tenantId_name_key" ON "Service"("tenantId", "name");

CREATE TABLE "BookingService" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BookingService_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingService_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BookingService_tenantId_bookingId_idx" ON "BookingService"("tenantId", "bookingId");

CREATE TABLE "Vaccination" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "administeredAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    CONSTRAINT "Vaccination_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vaccination_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Vaccination_tenantId_expiresAt_idx" ON "Vaccination"("tenantId", "expiresAt");

CREATE TABLE "Payment" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT,
    "ownerId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "externalId" TEXT,
    "intentId" TEXT,
    "capturedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Payment_tenantId_externalId_key" ON "Payment"("tenantId", "externalId");
CREATE INDEX "Payment_tenantId_status_idx" ON "Payment"("tenantId", "status");
CREATE INDEX "Payment_tenantId_createdAt_idx" ON "Payment"("tenantId", "createdAt");
CREATE INDEX "Payment_tenantId_intentId_idx" ON "Payment"("tenantId", "intentId");

CREATE TABLE "CheckIn" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "staffId" TEXT,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" DOUBLE PRECISION,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "conditionRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CheckIn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckIn_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckIn_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("recordId") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "CheckIn_tenantId_bookingId_idx" ON "CheckIn"("tenantId", "bookingId");
CREATE INDEX "CheckIn_tenantId_time_idx" ON "CheckIn"("tenantId", "time");

CREATE TABLE "CheckOut" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "staffId" TEXT,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidentReportId" TEXT,
    "extraCharges" TEXT NOT NULL DEFAULT '{}',
    "signatureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CheckOut_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckOut_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckOut_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("recordId") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Note: FK to IncidentReport added after IncidentReport table is created

CREATE INDEX "CheckOut_tenantId_bookingId_idx" ON "CheckOut"("tenantId", "bookingId");
CREATE INDEX "CheckOut_tenantId_time_idx" ON "CheckOut"("tenantId", "time");

CREATE TABLE "IncidentReport" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "bookingId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" "IncidentSeverity" NOT NULL,
    "narrative" TEXT NOT NULL,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "vetContacted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IncidentReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IncidentReport_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IncidentReport_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "IncidentReport_tenantId_petId_idx" ON "IncidentReport"("tenantId", "petId");
CREATE INDEX "IncidentReport_tenantId_bookingId_idx" ON "IncidentReport"("tenantId", "bookingId");
CREATE INDEX "IncidentReport_tenantId_occurredAt_idx" ON "IncidentReport"("tenantId", "occurredAt");

-- Now add the FK from CheckOut to IncidentReport
ALTER TABLE "CheckOut" ADD CONSTRAINT "CheckOut_incidentReportId_fkey" FOREIGN KEY ("incidentReportId") REFERENCES "IncidentReport"("recordId") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Communication" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CommunicationType" NOT NULL,
    "direction" "CommunicationDirection" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Communication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Communication_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Communication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Communication_tenantId_ownerId_createdAt_idx" ON "Communication"("tenantId", "ownerId", "createdAt");
CREATE INDEX "Communication_tenantId_type_idx" ON "Communication"("tenantId", "type");

CREATE TABLE "CustomerSegment" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" JSONB NOT NULL,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerSegment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CustomerSegment_tenantId_name_key" ON "CustomerSegment"("tenantId", "name");
CREATE INDEX "CustomerSegment_tenantId_isActive_idx" ON "CustomerSegment"("tenantId", "isActive");

CREATE TABLE "CustomerSegmentMember" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CustomerSegmentMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerSegmentMember_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "CustomerSegment"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerSegmentMember_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CustomerSegmentMember_segmentId_ownerId_key" ON "CustomerSegmentMember"("segmentId", "ownerId");
CREATE INDEX "CustomerSegmentMember_tenantId_ownerId_idx" ON "CustomerSegmentMember"("tenantId", "ownerId");

CREATE TABLE "CustomerTag" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CustomerTag_tenantId_name_key" ON "CustomerTag"("tenantId", "name");

CREATE TABLE "CustomerTagMember" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerTagMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerTagMember_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CustomerTag"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerTagMember_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CustomerTagMember_tagId_ownerId_key" ON "CustomerTagMember"("tagId", "ownerId");
CREATE INDEX "CustomerTagMember_tenantId_ownerId_idx" ON "CustomerTagMember"("tenantId", "ownerId");

CREATE TABLE "Campaign" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CommunicationType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "segmentId" TEXT,
    "content" JSONB NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "metrics" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Campaign_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "CustomerSegment"("recordId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Campaign_tenantId_status_idx" ON "Campaign"("tenantId", "status");
CREATE INDEX "Campaign_tenantId_scheduledAt_idx" ON "Campaign"("tenantId", "scheduledAt");

CREATE TABLE "Note" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'ALL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Note_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Note_tenantId_entityType_entityId_idx" ON "Note"("tenantId", "entityType", "entityId");
CREATE INDEX "Note_tenantId_authorId_idx" ON "Note"("tenantId", "authorId");

CREATE TABLE "Task" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "relatedType" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "assignedTo" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Staff"("recordId") ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT "Task_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "Staff"("recordId") ON DELETE NO ACTION ON UPDATE CASCADE
);
CREATE INDEX "Task_tenantId_scheduledFor_idx" ON "Task"("tenantId", "scheduledFor");
CREATE INDEX "Task_tenantId_type_idx" ON "Task"("tenantId", "type");
CREATE INDEX "Task_tenantId_assignedTo_idx" ON "Task"("tenantId", "assignedTo");

CREATE TABLE "runs" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "scheduleTime" TEXT NOT NULL,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "runs_tenantId_isActive_idx" ON "runs"("tenantId", "isActive");

CREATE TABLE "run_assignments" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "run_assignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "run_assignments_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "run_assignments_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("recordId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "run_assignments_runId_petId_date_key" ON "run_assignments"("runId", "petId", "date");
CREATE INDEX "run_assignments_tenantId_date_idx" ON "run_assignments"("tenantId", "date");

CREATE TABLE "messages" (
    "recordId" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("recordId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("recordId") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "messages_tenantId_conversationId_idx" ON "messages"("tenantId", "conversationId");
CREATE INDEX "messages_tenantId_senderId_idx" ON "messages"("tenantId", "senderId");
CREATE INDEX "messages_tenantId_recipientId_idx" ON "messages"("tenantId", "recipientId");

-- Add function to automatically update `updatedAt` columns
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all tables with `updatedAt`
-- (This is a simplified approach; a more robust solution would generate this dynamically)
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Tenant"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "User"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Membership"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Invite"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "UsageCounter"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Staff"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Owner"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Pet"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Kennel"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Booking"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Service"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Vaccination"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Payment"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "CheckIn"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "CheckOut"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "IncidentReport"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Communication"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "CustomerSegment"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Campaign"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Note"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "Task"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON "runs"
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- End of schema
