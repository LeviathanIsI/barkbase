/*
  Warnings:

  - You are about to drop the `TenantBYOConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TenantBYOConfig";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "CustomProperty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "fieldConfig" JSONB,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomProperty_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "themeJson" JSONB,
    "featureFlags" JSONB,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "storageProvider" TEXT NOT NULL DEFAULT 'SUPABASE',
    "dbProvider" TEXT NOT NULL DEFAULT 'SUPABASE',
    "migrationState" TEXT NOT NULL DEFAULT 'IDLE',
    "migrationInfo" JSONB,
    "customDomain" TEXT,
    "settings" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tenant" ("createdAt", "customDomain", "dbProvider", "featureFlags", "id", "migrationInfo", "migrationState", "name", "plan", "settings", "slug", "storageProvider", "themeJson", "updatedAt") SELECT "createdAt", "customDomain", "dbProvider", "featureFlags", "id", "migrationInfo", "migrationState", "name", "plan", "settings", "slug", "storageProvider", "themeJson", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CustomProperty_tenantId_objectType_idx" ON "CustomProperty"("tenantId", "objectType");

-- CreateIndex
CREATE INDEX "CustomProperty_tenantId_objectType_archived_idx" ON "CustomProperty"("tenantId", "objectType", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "CustomProperty_tenantId_objectType_name_key" ON "CustomProperty"("tenantId", "objectType", "name");
