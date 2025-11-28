/**
 * Shared utilities index for BarkBase Lambda handlers
 */

// Types
export * from './types';

// Security utilities
export {
  getAllowedOrigin,
  getSecureHeaders,
  auditLog,
  securityEvent,
  getRequestMetadata,
  checkRateLimit,
  errorResponse,
  successResponse,
  handleOptions,
} from './security';

// Database utilities
export {
  getPool,
  query,
  getClient,
  withTransaction,
  closePool,
} from './db';

// Auth utilities
export {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractBearerToken,
  extractUser,
  requireAuth,
  isValidEmail,
  validatePassword,
  generateSessionId,
  sanitizeUser,
} from './auth';

