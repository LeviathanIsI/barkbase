const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');

/**
 * Get user profile by ID
 */
exports.getUserProfile = async (userId) => {
  // Get user basic data using raw SQL to bypass RLS (user data shouldn't be tenant-scoped)
  const userResults = await prisma.$queryRaw`
    SELECT "recordId", "email", "emailVerified", "lastLoginAt", "createdAt", "isActive"
    FROM public."User" 
    WHERE "recordId" = ${userId}
  `;

  if (userResults.length === 0) {
    throw new Error('User not found');
  }

  const user = userResults[0];

  if (!user) {
    throw new Error('User not found');
  }

  // Get user's tenant to access profile data stored in tenant settings
  const membership = await prisma.$transaction(async (tx) => {
    // We need to find which tenant this user belongs to
    const allTenants = await tx.tenant.findMany();
    
    for (const tenant of allTenants) {
      try {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.recordId}, true)`;
        const userMembership = await tx.membership.findFirst({
          where: { userId: userId },
          include: { tenant: true }
        });
        if (userMembership) {
          return userMembership;
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  });

  // Get profile data from tenant settings (temporary storage)
  const profileData = membership?.tenant?.settings?.userProfiles?.[userId] || {};

  return {
    recordId: user.recordId,
    email: user.email,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    isActive: user.isActive,
    // Profile data from tenant settings
    name: profileData.name || '',
    phone: profileData.phone || '',
    avatarUrl: profileData.avatarUrl || null,
    timezone: profileData.timezone || '',
    language: profileData.language || 'en',
    preferences: profileData.preferences || {},
  };
};

/**
 * Update user profile
 */
exports.updateUserProfile = async (userId, data) => {
  // Get user basic data
  const user = await prisma.user.findUnique({
    where: { recordId: userId },
    select: {
      recordId: true,
      email: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Find user's tenant and update profile data in tenant settings
  const membership = await prisma.$transaction(async (tx) => {
    const allTenants = await tx.tenant.findMany();
    
    for (const tenant of allTenants) {
      try {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.recordId}, true)`;
        const userMembership = await tx.membership.findFirst({
          where: { userId: userId },
          include: { tenant: true }
        });
        if (userMembership) {
          // Update tenant settings with user profile data
          const currentSettings = userMembership.tenant.settings || {};
          const userProfiles = currentSettings.userProfiles || {};
          
          userProfiles[userId] = {
            name: data.name,
            phone: data.phone,
            timezone: data.timezone,
            language: data.language,
            preferences: data.preferences,
            updatedAt: new Date().toISOString(),
          };

          await tx.tenant.update({
            where: { recordId: tenant.recordId },
            data: {
              settings: {
                ...currentSettings,
                userProfiles
              }
            }
          });

          return userMembership;
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  });

  // Return updated profile
  return {
    recordId: user.recordId,
    email: user.email,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    isActive: user.isActive,
    name: data.name || '',
    phone: data.phone || '',
    avatarUrl: data.avatarUrl || null,
    timezone: data.timezone || '',
    language: data.language || 'en',
    preferences: data.preferences || {},
  };
};

/**
 * Update user password
 */
exports.updatePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { recordId: userId },
    select: { recordId: true, passwordHash: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { recordId: userId },
    data: { passwordHash },
  });

  return { success: true };
};

/**
 * Update user avatar
 */
exports.updateAvatar = async (userId, avatarUrl) => {
  const user = await prisma.user.update({
    where: { recordId: userId },
    data: { avatarUrl },
    select: { recordId: true,
      email: true,
      name: true,
      phone: true,
      avatarUrl: true,
      timezone: true,
      language: true,
      preferences: true,
    },
  });

  return user;
};
