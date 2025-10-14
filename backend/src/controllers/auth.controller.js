const authService = require('../services/auth.service');
const env = require('../config/env');
const { generateCsrfToken, CSRF_COOKIE_NAME } = require('../utils/csrf');

const getRefreshCookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined, // 30 days if rememberMe, else session cookie
});

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax',
  maxAge: env.tokens.refreshTtlDays * 24 * 60 * 60 * 1000,
};

const csrfCookieOptions = {
  httpOnly: false,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict',
  maxAge: env.tokens.refreshTtlDays * 24 * 60 * 60 * 1000,
  path: '/',
};

const setAuthCookies = (res, tokens, rememberMe = false) => {
  const csrfToken = generateCsrfToken();
  res.cookie('refreshToken', tokens.refreshToken, getRefreshCookieOptions(rememberMe));
  res.cookie('accessToken', tokens.accessToken, {
    ...cookieOptions,
    maxAge: env.tokens.accessTtlMinutes * 60 * 1000,
  });
  res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions);
};

const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    const result = await authService.login(req.tenant, email, password);
    setAuthCookies(res, result.tokens, rememberMe);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

const extractClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
};

const signup = async (req, res, next) => {
  try {
    const consentMeta = {
      ip: extractClientIp(req),
      appVersion: req.headers['x-app-version'] ?? req.headers['x-app-build'] ?? null,
    };

    const result = await authService.signup({ ...req.body, consentMeta });

    if (result.tokens) {
      // Default rememberMe to true for signup (they just created an account)
      setAuthCookies(res, result.tokens, true);
      return res.status(201).json({
        message: 'Workspace created successfully.',
        tenant: result.tenant,
        user: result.user,
        tokens: result.tokens,
      });
    }

    return res.status(201).json({
      message: 'Check your email to verify your workspace.',
      tenant: result.tenant,
      user: result.user,
      verification: result.verification,
    });
  } catch (error) {
    return next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const result = await authService.verifyEmail(req.body.token);
    // Default rememberMe to true for email verification (they just verified)
    setAuthCookies(res, result.tokens, true);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    // Try to get refresh token from cookie first, then from request body (for rememberMe scenarios)
    const token = req.cookies.refreshToken || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'Refresh token missing' });
    }
    const result = await authService.refresh(req.tenantId, token);
    const csrfToken = generateCsrfToken();
    res.cookie('accessToken', result.accessToken, { ...cookieOptions, maxAge: env.tokens.accessTtlMinutes * 60 * 1000 });
    res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions);
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
  res.clearCookie(CSRF_COOKIE_NAME);
  return res.status(204).send();
};

module.exports = {
  login,
  signup,
  verifyEmail,
  refresh,
  logout,
};
