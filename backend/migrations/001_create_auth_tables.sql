-- Enterprise Authentication Tables Migration
-- Creates separate auth tables in public schema without RLS
-- Following enterprise SaaS patterns used by HubSpot, Salesforce, etc.

-- Create new auth tables with clear naming
CREATE TABLE IF NOT EXISTS public."AuthUser" (
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

-- Create auth membership table (no RLS - this is the key difference)
CREATE TABLE IF NOT EXISTS public."AuthMembership" (
    "recordId" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" TEXT DEFAULT 'STAFF' NOT NULL,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Foreign key to AuthUser
    CONSTRAINT "AuthMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."AuthUser"("recordId") ON DELETE CASCADE,
    -- Foreign key to Tenant
    CONSTRAINT "AuthMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"("recordId") ON DELETE CASCADE,
    -- Unique constraint for user-tenant combination
    CONSTRAINT "AuthMembership_userId_tenantId_key" UNIQUE ("userId", "tenantId")
);

-- Create auth email verification token table
CREATE TABLE IF NOT EXISTS public."AuthEmailVerificationToken" (
    "recordId" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "token" TEXT UNIQUE NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Foreign key to AuthUser
    CONSTRAINT "AuthEmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."AuthUser"("recordId") ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "AuthMembership_tenantId_role_idx" ON public."AuthMembership"("tenantId", "role");
CREATE INDEX IF NOT EXISTS "AuthEmailVerificationToken_userId_expiresAt_idx" ON public."AuthEmailVerificationToken"("userId", "expiresAt");

-- Disable RLS on auth tables (this is the enterprise pattern)
ALTER TABLE public."AuthUser" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuthMembership" DISABLE ROW LEVEL SECURITY;  
ALTER TABLE public."AuthEmailVerificationToken" DISABLE ROW LEVEL SECURITY;

-- Migrate existing data
INSERT INTO public."AuthUser" (
    "recordId", "email", "passwordHash", "lastLoginAt", "isActive", 
    "emailVerified", "twoFactorSecret", "createdAt", "updatedAt"
)
SELECT 
    "recordId", "email", "passwordHash", "lastLoginAt", "isActive", 
    "emailVerified", "twoFactorSecret", "createdAt", "updatedAt"
FROM public."User"
ON CONFLICT ("recordId") DO NOTHING;

INSERT INTO public."AuthMembership" (
    "recordId", "userId", "tenantId", "role", "refreshToken", "createdAt", "updatedAt"
)
SELECT 
    "recordId", "userId", "tenantId", "role", "refreshToken", "createdAt", "updatedAt"
FROM public."Membership"
ON CONFLICT ("recordId") DO NOTHING;

INSERT INTO public."AuthEmailVerificationToken" (
    "recordId", "userId", "token", "expiresAt", "createdAt"
)
SELECT 
    "recordId", "userId", "token", "expiresAt", "createdAt"
FROM public."EmailVerificationToken"
ON CONFLICT ("recordId") DO NOTHING;

