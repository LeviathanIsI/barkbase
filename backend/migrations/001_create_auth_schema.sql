-- Enterprise Authentication Schema Migration
-- This creates a separate 'auth' schema for authentication-related tables
-- Following enterprise SaaS patterns used by HubSpot, Salesforce, etc.

-- Create the auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- Grant permissions to app_user
GRANT USAGE ON SCHEMA auth TO app_user;
GRANT CREATE ON SCHEMA auth TO app_user;

-- Move User table to auth schema
CREATE TABLE auth."User" (
    "recordId" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP,
    "isActive" BOOLEAN DEFAULT true NOT NULL,
    "emailVerified" BOOLEAN DEFAULT false NOT NULL,
    "twoFactorSecret" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Move Membership table to auth schema (no RLS needed here)
CREATE TABLE auth."Membership" (
    "recordId" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" TEXT DEFAULT 'STAFF' NOT NULL,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Foreign key to auth.User
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES auth."User"("recordId") ON DELETE CASCADE,
    -- Foreign key to public.Tenant (cross-schema reference)
    CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"("recordId") ON DELETE CASCADE,
    -- Unique constraint for user-tenant combination
    CONSTRAINT "Membership_userId_tenantId_key" UNIQUE ("userId", "tenantId")
);

-- Move EmailVerificationToken table to auth schema
CREATE TABLE auth."EmailVerificationToken" (
    "recordId" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "token" TEXT UNIQUE NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Foreign key to auth.User
    CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES auth."User"("recordId") ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX "Membership_tenantId_role_idx" ON auth."Membership"("tenantId", "role");
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON auth."EmailVerificationToken"("userId", "expiresAt");

-- Migrate existing data from public schema to auth schema
INSERT INTO auth."User" (
    "recordId", "email", "passwordHash", "lastLoginAt", "isActive", 
    "emailVerified", "twoFactorSecret", "createdAt", "updatedAt"
)
SELECT 
    "recordId", "email", "passwordHash", "lastLoginAt", "isActive", 
    "emailVerified", "twoFactorSecret", "createdAt", "updatedAt"
FROM public."User"
ON CONFLICT ("recordId") DO NOTHING;

INSERT INTO auth."Membership" (
    "recordId", "userId", "tenantId", "role", "refreshToken", "createdAt", "updatedAt"
)
SELECT 
    "recordId", "userId", "tenantId", "role", "refreshToken", "createdAt", "updatedAt"
FROM public."Membership"
ON CONFLICT ("recordId") DO NOTHING;

INSERT INTO auth."EmailVerificationToken" (
    "recordId", "userId", "token", "expiresAt", "createdAt"
)
SELECT 
    "recordId", "userId", "token", "expiresAt", "createdAt"
FROM public."EmailVerificationToken"
ON CONFLICT ("recordId") DO NOTHING;

-- Grant permissions on auth tables
GRANT SELECT, INSERT, UPDATE, DELETE ON auth."User" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth."Membership" TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth."EmailVerificationToken" TO app_user;

-- Update foreign key references in public schema tables
-- AuditLog references User
ALTER TABLE public."AuditLog" 
DROP CONSTRAINT IF EXISTS "AuditLog_actorId_fkey",
ADD CONSTRAINT "AuditLog_actorId_fkey" 
FOREIGN KEY ("actorId") REFERENCES auth."User"("recordId") ON DELETE SET NULL;

-- Staff references Membership
ALTER TABLE public."Staff" 
DROP CONSTRAINT IF EXISTS "Staff_membershipId_fkey",
ADD CONSTRAINT "Staff_membershipId_fkey" 
FOREIGN KEY ("membershipId") REFERENCES auth."Membership"("recordId") ON DELETE CASCADE;

-- Remove old tables from public schema (after confirming migration success)
-- DROP TABLE IF EXISTS public."EmailVerificationToken";
-- DROP TABLE IF EXISTS public."Membership";  
-- DROP TABLE IF EXISTS public."User";

-- Note: We'll drop these tables after confirming the migration works
-- For now, we'll keep them as backup during the transition

