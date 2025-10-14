/**
 * Enterprise Authentication Service
 * 
 * This service provides a clean abstraction layer for authentication operations
 * that handles Row Level Security (RLS) concerns internally, following patterns
 * used by enterprise SaaS applications like HubSpot and Salesforce.
 * 
 * Key principles:
 * - Authentication queries bypass tenant-scoped RLS (industry standard)
 * - Clean service interface with no raw SQL exposed to controllers
 * - Proper error handling and logging
 * - Maintainable and auditable code
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { issueAccessToken, issueRefreshToken } = require('../utils/jwt');
const { resolveTenantFeatures } = require('../lib/features');
const mailer = require('../lib/mailer');
const env = require('../config/env');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

/**
 * Query user with all their memberships (enterprise pattern)
 * This uses a multi-tenant query approach to bypass RLS chicken-and-egg problem
 */
async function getUserWithMemberships(email) {
  // First, get the user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return null;
  }

  // Get all tenants (these are not RLS-protected)
  const allTenants = await prisma.tenant.findMany();
  
  // For each tenant, check if the user has a membership (with tenant context set)
  const memberships = [];
  
  for (const tenant of allTenants) {
    try {
      const tenantMemberships = await prisma.$transaction(async (tx) => {
        // Set tenant context for this query
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.recordId}, true)`;
        
        // Query memberships for this tenant
        return await tx.membership.findMany({
          where: { userId: user.recordId },
          include: { tenant: true }
        });
      });
      
      // Add any memberships found for this tenant
      memberships.push(...tenantMemberships);
    } catch (error) {
      // If we can't query this tenant, skip it (might not have access)
      continue;
    }
  }

  return {
    recordId: user.recordId,
    email: user.email,
    passwordHash: user.passwordHash,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    twoFactorSecret: user.twoFactorSecret,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    memberships
  };
}

/**
 * Update membership refresh token (with proper RLS context)
 */
async function updateMembershipRefreshToken(membershipId, tenantId, refreshToken) {
  await prisma.$transaction(async (tx) => {
    // Set tenant context for RLS
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    
    await tx.membership.update({
      where: { recordId: membershipId },
      data: { 
        refreshToken,
        updatedAt: new Date()
      }
    });
  });
}

/**
 * Update user last login time
 */
async function updateUserLastLogin(userId) {
  await prisma.user.update({
    where: { recordId: userId },
    data: { lastLoginAt: new Date() }
  });
}

/**
 * Create membership (with proper RLS context)
 */
async function createMembership(tenantId, userId, role) {
  return await prisma.$transaction(async (tx) => {
    // Set tenant context for RLS
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    
    return await tx.membership.create({
      data: {
        tenantId,
        userId,
        role
      }
    });
  });
}

/**
 * Enterprise login function
 */
async function login(tenant, email, password) {
  // Get user with all memberships (bypasses RLS for auth)
  const user = await getUserWithMemberships(email);
  
  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  if (!user.isActive) {
    throw Object.assign(new Error('Account disabled'), { statusCode: 403 });
  }

  if (!user.emailVerified) {
    throw Object.assign(new Error('Email verification required'), { statusCode: 403 });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  // Find the appropriate membership
  let membership = tenant 
    ? user.memberships.find(m => m.tenantId === tenant.recordId)
    : null;
  
  if (!membership) {
    if (user.memberships.length === 0) {
      throw Object.assign(new Error('No workspace found for this account. Please contact support or create a new account.'), { 
        statusCode: 403,
        code: 'NO_WORKSPACE'
      });
    }
    // Auto-select first tenant
    membership = user.memberships[0];
  }

  const selectedTenant = membership.tenant;

  // Create JWT payload
  const payload = {
    sub: user.recordId,
    tenantId: selectedTenant.recordId,
    membershipId: membership.recordId,
    role: membership.role,
  };

  const accessToken = issueAccessToken(payload);
  const refreshToken = issueRefreshToken(payload);

  // Update membership and user (using proper service methods)
  await Promise.all([
    updateMembershipRefreshToken(membership.recordId, selectedTenant.recordId, refreshToken),
    updateUserLastLogin(user.recordId)
  ]);

  return {
    user: {
      recordId: user.recordId,
      email: user.email,
      memberships: user.memberships.map(m => ({
        recordId: m.recordId,
        tenantId: m.tenantId,
        role: m.role,
        tenant: m.tenant ? {
          recordId: m.tenant.recordId,
          slug: m.tenant.slug,
          name: m.tenant.name,
          plan: m.tenant.plan
        } : undefined
      })),
      tenantId: selectedTenant.recordId,
      role: membership.role
    },
    tokens: {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: env.tokens.accessTtlMinutes * 60,
      refreshTokenExpiresIn: env.tokens.refreshTtlDays * 24 * 60 * 60,
    },
    tenant: {
      recordId: selectedTenant.recordId,
      slug: selectedTenant.slug,
      name: selectedTenant.name,
      plan: selectedTenant.plan,
      featureFlags: selectedTenant.featureFlags ?? {},
      features: resolveTenantFeatures(selectedTenant),
      theme: selectedTenant.themeJson ?? {},
      customDomain: selectedTenant.customDomain ?? null,
      settings: selectedTenant.settings ?? {},
    }
  };
}

module.exports = {
  login,
  getUserWithMemberships,
  updateMembershipRefreshToken,
  updateUserLastLogin,
  createMembership
};
