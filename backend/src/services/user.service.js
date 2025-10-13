const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

/**
 * Get user profile by ID
 */
exports.getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatarUrl: true,
      timezone: true,
      language: true,
      preferences: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

/**
 * Update user profile
 */
exports.updateUserProfile = async (userId, data) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      phone: data.phone,
      timezone: data.timezone,
      language: data.language,
      preferences: data.preferences,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatarUrl: true,
      timezone: true,
      language: true,
      preferences: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return user;
};

/**
 * Update user password
 */
exports.updatePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
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
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true };
};

/**
 * Update user avatar
 */
exports.updateAvatar = async (userId, avatarUrl) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: {
      id: true,
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
