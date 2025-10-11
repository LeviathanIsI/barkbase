-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "capturedAt" DATETIME;
ALTER TABLE "Payment" ADD COLUMN "intentId" TEXT;

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "staffId" TEXT,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weight" REAL,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "conditionRating" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CheckIn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckIn_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckIn_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CheckOut" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "staffId" TEXT,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incidentReportId" TEXT,
    "extraCharges" TEXT NOT NULL DEFAULT '{}',
    "signatureUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CheckOut_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckOut_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckOut_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CheckOut_incidentReportId_fkey" FOREIGN KEY ("incidentReportId") REFERENCES "IncidentReport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncidentReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "bookingId" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "vetContacted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IncidentReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IncidentReport_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IncidentReport_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Kennel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "location" TEXT,
    "amenities" TEXT NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Kennel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Kennel" ("amenities", "capacity", "createdAt", "id", "isActive", "location", "name", "tenantId", "type", "updatedAt") SELECT "amenities", "capacity", "createdAt", "id", "isActive", "location", "name", "tenantId", "type", "updatedAt" FROM "Kennel";
DROP TABLE "Kennel";
ALTER TABLE "new_Kennel" RENAME TO "Kennel";
CREATE INDEX "Kennel_tenantId_type_idx" ON "Kennel"("tenantId", "type");
CREATE INDEX "Kennel_tenantId_isActive_idx" ON "Kennel"("tenantId", "isActive");
CREATE UNIQUE INDEX "Kennel_tenantId_name_key" ON "Kennel"("tenantId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CheckIn_tenantId_bookingId_idx" ON "CheckIn"("tenantId", "bookingId");

-- CreateIndex
CREATE INDEX "CheckIn_tenantId_time_idx" ON "CheckIn"("tenantId", "time");

-- CreateIndex
CREATE INDEX "CheckOut_tenantId_bookingId_idx" ON "CheckOut"("tenantId", "bookingId");

-- CreateIndex
CREATE INDEX "CheckOut_tenantId_time_idx" ON "CheckOut"("tenantId", "time");

-- CreateIndex
CREATE INDEX "IncidentReport_tenantId_petId_idx" ON "IncidentReport"("tenantId", "petId");

-- CreateIndex
CREATE INDEX "IncidentReport_tenantId_bookingId_idx" ON "IncidentReport"("tenantId", "bookingId");

-- CreateIndex
CREATE INDEX "IncidentReport_tenantId_occurredAt_idx" ON "IncidentReport"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "Payment_tenantId_intentId_idx" ON "Payment"("tenantId", "intentId");
