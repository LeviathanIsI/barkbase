/**
 * =============================================================================
 * BarkBase Security Headers Utility
 * =============================================================================
 *
 * Provides standardized security headers for all Lambda responses.
 * Implements OWASP security best practices.
 *
 * Security Headers Applied:
 * - Strict-Transport-Security: Enforces HTTPS
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - X-Frame-Options: Prevents clickjacking
 * - Content-Security-Policy: Mitigates XSS attacks
 * - X-XSS-Protection: Legacy XSS protection
 * - Referrer-Policy: Controls referrer information
 * - Permissions-Policy: Controls browser features
 *
 * =============================================================================
 */

/**
 * Get standard security headers for all responses
 * @returns {object} Security headers object
 */
function getSecurityHeaders() {
  return {
    // Enforce HTTPS for 1 year, including subdomains
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Prevent clickjacking attacks
    'X-Frame-Options': 'DENY',

    // Content Security Policy - restrictive but allows inline scripts for React
    // In production, consider using nonces or hashes for inline scripts
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // React needs eval for dev
      "style-src 'self' 'unsafe-inline'", // Inline styles common in React
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.amazonaws.com https://*.amazoncognito.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),

    // Legacy XSS protection (modern browsers use CSP instead)
    'X-XSS-Protection': '1; mode=block',

    // Control referrer information leakage
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Disable unnecessary browser features
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
    ].join(', '),
  };
}

/**
 * Get relaxed CSP headers for authentication endpoints
 * Auth endpoints need to communicate with Cognito
 * @returns {object} Security headers with relaxed CSP
 */
function getAuthSecurityHeaders() {
  const headers = getSecurityHeaders();

  // More permissive CSP for Cognito integration
  headers['Content-Security-Policy'] = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.amazonaws.com https://*.amazoncognito.com https://cognito-idp.*.amazonaws.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://*.amazoncognito.com",
  ].join('; ');

  return headers;
}

/**
 * Merge security headers with custom headers
 * Custom headers override security headers if conflicts exist
 * @param {object} customHeaders - Custom headers to merge
 * @param {boolean} isAuthEndpoint - Whether this is an auth endpoint
 * @returns {object} Merged headers
 */
function mergeSecurityHeaders(customHeaders = {}, isAuthEndpoint = false) {
  const securityHeaders = isAuthEndpoint
    ? getAuthSecurityHeaders()
    : getSecurityHeaders();

  return {
    ...securityHeaders,
    ...customHeaders,
  };
}

module.exports = {
  getSecurityHeaders,
  getAuthSecurityHeaders,
  mergeSecurityHeaders,
};
