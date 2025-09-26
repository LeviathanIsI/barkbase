-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "refreshToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill existing users into membership before dropping legacy columns
INSERT INTO "Membership" ("id", "userId", "tenantId", "role", "refreshToken", "createdAt", "updatedAt")
SELECT
    "id" as membership_id,
    "id" as user_id,
    "tenantId",
    CASE
        WHEN instr(lower(coalesce("roles", '')), 'owner') > 0 THEN 'OWNER'
        WHEN instr(lower(coalesce("roles", '')), 'admin') > 0 THEN 'ADMIN'
        WHEN instr(lower(coalesce("roles", '')), 'readonly') > 0 THEN 'READONLY'
        ELSE 'STAFF'
    END as role,
    "refreshToken",
    coalesce("createdAt", CURRENT_TIMESTAMP) as created_at,
    coalesce("updatedAt", CURRENT_TIMESTAMP) as updated_at
FROM "User";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "title" TEXT,
    "phone" TEXT,
    "schedule" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Staff_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Staff_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Staff" ("createdAt", "id", "phone", "schedule", "tenantId", "title", "updatedAt", "membershipId")
SELECT
    s."createdAt",
    s."id",
    s."phone",
    s."schedule",
    s."tenantId",
    s."title",
    s."updatedAt",
    coalesce(m."id", s."userId")
FROM "Staff" s
LEFT JOIN "Membership" m ON m."userId" = s."userId" AND m."tenantId" = s."tenantId";
DROP TABLE "Staff";
ALTER TABLE "new_Staff" RENAME TO "Staff";
CREATE UNIQUE INDEX "Staff_membershipId_key" ON "Staff"("membershipId");
CREATE INDEX "Staff_tenantId_idx" ON "Staff"("tenantId");
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "themeJson" JSONB,
    "featureFlags" JSONB,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "customDomain" TEXT,
    "settings" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tenant" ("id", "slug", "name", "themeJson", "featureFlags", "plan", "customDomain", "settings", "createdAt", "updatedAt")
SELECT
    "id",
    "slug",
    "name",
    "theme",
    "featureFlags",
    CASE
        WHEN "subscription" = 'ENTERPRISE' THEN 'ENTERPRISE'
        WHEN "subscription" = 'PREMIUM' THEN 'PRO'
        WHEN "subscription" = 'STANDARD' THEN 'PRO'
        ELSE 'FREE'
    END,
    "customDomain",
    "settings",
    "createdAt",
    "updatedAt"
FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "lastLoginAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorSecret" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "isActive", "lastLoginAt", "passwordHash", "twoFactorSecret", "updatedAt")
SELECT "createdAt", "email", "id", "isActive", "lastLoginAt", "passwordHash", "twoFactorSecret", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Membership_tenantId_role_idx" ON "Membership"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_tenantId_key" ON "Membership"("userId", "tenantId");
