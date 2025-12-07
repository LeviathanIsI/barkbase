/**
 * Authentication Helper Utilities for E2E Tests
 */

import fs from 'fs';
import path from 'path';

const authFile = path.join(process.cwd(), 'e2e/.auth/user.json');

/**
 * Check if authenticated state is available
 * @returns {boolean} True if auth state exists and has valid cookies
 */
export function isAuthAvailable() {
  try {
    if (!fs.existsSync(authFile)) {
      return false;
    }

    const authState = JSON.parse(fs.readFileSync(authFile, 'utf-8'));

    // Check if we have actual cookies (not just an empty state)
    return authState.cookies && authState.cookies.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check if E2E test credentials are configured
 * @returns {boolean} True if credentials are set
 */
export function hasTestCredentials() {
  return !!(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);
}

export default {
  isAuthAvailable,
  hasTestCredentials,
};
