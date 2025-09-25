const authService = require('../services/auth.service');
const env = require('../config/env');

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: env.tokens.refreshTtlDays * 24 * 60 * 60 * 1000,
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(req.tenantId, email, password);
    res.cookie('refreshToken', result.tokens.refreshToken, cookieOptions);
    res.cookie('accessToken', result.tokens.accessToken, { ...cookieOptions, maxAge: env.tokens.accessTtlMinutes * 60 * 1000 });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'Refresh token missing' });
    }
    const result = await authService.refresh(req.tenantId, token);
    res.cookie('accessToken', result.accessToken, { ...cookieOptions, maxAge: env.tokens.accessTtlMinutes * 60 * 1000 });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user?.membershipId) {
      await authService.revokeRefreshToken(req.user.membershipId);
    }
  } catch (error) {
    return next(error);
  }

  res.clearCookie('refreshToken');
  res.clearCookie('accessToken');
  return res.status(204).send();
};

module.exports = {
  login,
  refresh,
  logout,
};
