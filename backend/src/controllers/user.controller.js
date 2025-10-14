const userService = require('../services/user.service');

/**
 * Get current user profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const profile = await userService.getUserProfile(req.user.recordId);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const profile = await userService.updateUserProfile(req.user.recordId, req.body);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

/**
 * Update password
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await userService.updatePassword(req.user.recordId, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Update avatar
 */
exports.updateAvatar = async (req, res, next) => {
  try {
    // Assuming avatar upload is handled by upload middleware
    const avatarUrl = req.file?.path || req.body.avatarUrl;
    const profile = await userService.updateAvatar(req.user.recordId, avatarUrl);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};
