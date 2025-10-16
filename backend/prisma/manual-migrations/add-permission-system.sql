-- Permission Management System Migration
-- This adds role-based access control with granular permissions

-- Create CustomRole table
CREATE TABLE IF NOT EXISTS "CustomRole" (
  "recordId" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN DEFAULT false,
  "isActive" BOOLEAN DEFAULT true,
  "permissions" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
  FOREIGN KEY ("createdBy") REFERENCES "User"("recordId") ON DELETE SET NULL,
  UNIQUE("tenantId", "name")
);

CREATE INDEX IF NOT EXISTS "CustomRole_tenantId_isActive_idx" ON "CustomRole"("tenantId", "isActive");

-- Create PermissionSet table
CREATE TABLE IF NOT EXISTS "PermissionSet" (
  "recordId" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "permissions" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("recordId") ON DELETE CASCADE,
  UNIQUE("tenantId", "name")
);

CREATE INDEX IF NOT EXISTS "PermissionSet_tenantId_idx" ON "PermissionSet"("tenantId");

-- Create UserRole table (many-to-many)
CREATE TABLE IF NOT EXISTS "UserRole" (
  "recordId" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "assignedBy" TEXT,
  FOREIGN KEY ("userId") REFERENCES "User"("recordId") ON DELETE CASCADE,
  FOREIGN KEY ("roleId") REFERENCES "CustomRole"("recordId") ON DELETE CASCADE,
  FOREIGN KEY ("assignedBy") REFERENCES "User"("recordId") ON DELETE SET NULL,
  UNIQUE("userId", "roleId")
);

CREATE INDEX IF NOT EXISTS "UserRole_userId_idx" ON "UserRole"("userId");
CREATE INDEX IF NOT EXISTS "UserRole_roleId_idx" ON "UserRole"("roleId");

-- Create UserPermission table for individual permission overrides
CREATE TABLE IF NOT EXISTS "UserPermission" (
  "recordId" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "permission" TEXT NOT NULL,
  "granted" BOOLEAN NOT NULL,
  "expiresAt" TIMESTAMP,
  "grantedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "grantedBy" TEXT,
  FOREIGN KEY ("userId") REFERENCES "User"("recordId") ON DELETE CASCADE,
  FOREIGN KEY ("grantedBy") REFERENCES "User"("recordId") ON DELETE SET NULL,
  UNIQUE("userId", "permission")
);

CREATE INDEX IF NOT EXISTS "UserPermission_userId_idx" ON "UserPermission"("userId");
CREATE INDEX IF NOT EXISTS "UserPermission_expiresAt_idx" ON "UserPermission"("expiresAt");

-- Add triggers for updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_custom_role_updated_at BEFORE UPDATE ON "CustomRole"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permission_set_updated_at BEFORE UPDATE ON "PermissionSet"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE "CustomRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PermissionSet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPermission" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- CustomRole policies
CREATE POLICY "tenant_isolation" ON "CustomRole"
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::text);

-- PermissionSet policies
CREATE POLICY "tenant_isolation" ON "PermissionSet"
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::text);

-- UserRole policies (need to join with Role to check tenant)
CREATE POLICY "tenant_isolation" ON "UserRole"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "CustomRole" r
      WHERE r."recordId" = "UserRole"."roleId"
      AND r."tenantId" = current_setting('app.tenant_id', true)::text
    )
  );

-- UserPermission policies (need to check user's tenant membership)
CREATE POLICY "tenant_isolation" ON "UserPermission"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "Membership" m
      WHERE m."userId" = "UserPermission"."userId"
      AND m."tenantId" = current_setting('app.tenant_id', true)::text
    )
  );

-- Grant permissions to app_user
GRANT ALL ON "CustomRole" TO app_user;
GRANT ALL ON "PermissionSet" TO app_user;
GRANT ALL ON "UserRole" TO app_user;
GRANT ALL ON "UserPermission" TO app_user;
