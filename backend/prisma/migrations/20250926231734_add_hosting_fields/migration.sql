/*
  Warnings:

  - You are about to alter the column `localDataConsent` on the `Membership` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- CreateTable
CREATE TABLE "TenantBYOConfig" (
    "tenantId" TEXT NOT NULL PRIMARY KEY,
    "cloudVendor" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "region" TEXT,
    "encAccessKey" BLOB,
    "encSecretKey" BLOB,
    "dbUrlCipher" BLOB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TenantBYOConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "refreshToken" TEXT,
    "localDataConsent" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Membership" ("createdAt", "id", "localDataConsent", "refreshToken", "role", "tenantId", "updatedAt", "userId") SELECT "createdAt", "id", "localDataConsent", "refreshToken", "role", "tenantId", "updatedAt", "userId" FROM "Membership";
DROP TABLE "Membership";
ALTER TABLE "new_Membership" RENAME TO "Membership";
CREATE INDEX "Membership_tenantId_role_idx" ON "Membership"("tenantId", "role");
CREATE UNIQUE INDEX "Membership_userId_tenantId_key" ON "Membership"("userId", "tenantId");
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "themeJson" JSONB,
    "featureFlags" JSONB,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL',
    "dbProvider" TEXT NOT NULL DEFAULT 'LOCAL',
    "migrationState" TEXT NOT NULL DEFAULT 'IDLE',
    "migrationInfo" JSONB,
    "customDomain" TEXT,
    "settings" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tenant" ("createdAt", "customDomain", "featureFlags", "id", "name", "plan", "settings", "slug", "themeJson", "updatedAt") SELECT "createdAt", "customDomain", "featureFlags", "id", "name", "plan", "settings", "slug", "themeJson", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
