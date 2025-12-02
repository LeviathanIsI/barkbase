/**
 * Session Management Utility
 * Handles auto-logout with timezone-aware expiration at 11:59 PM
 */

/**
 * Calculate session expiry time based on interval hours
 * @param {number} intervalHours - Auto-logout interval in hours (8, 12, 24, 48, 72)
 * @returns {{sessionStartTime: number, sessionExpiryTime: number}}
 */
export function calculateSessionExpiry(intervalHours = 24) {
  const now = new Date();
  const sessionStartTime = now.getTime();
  
  // Calculate how many days from now the session should expire
  const daysUntilExpiry = Math.ceil(intervalHours / 24);
  
  // Get 11:59 PM of the target day in local timezone
  const expiryDate = new Date(now);
  expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry - 1); // -1 because we want to include today
  expiryDate.setHours(23, 59, 59, 999); // Set to 11:59:59.999 PM
  
  // If the calculated expiry is before now + interval, move to next day's 11:59 PM
  const minExpiryTime = sessionStartTime + (intervalHours * 60 * 60 * 1000);
  let sessionExpiryTime = expiryDate.getTime();
  
  if (sessionExpiryTime < minExpiryTime) {
    expiryDate.setDate(expiryDate.getDate() + 1);
    sessionExpiryTime = expiryDate.getTime();
  }
  
  return {
    sessionStartTime,
    sessionExpiryTime
  };
}

/**
 * Check if current session has expired
 * @param {number} sessionStartTime - Timestamp when session started
 * @param {number} sessionExpiryTime - Timestamp when session should expire
 * @param {number} intervalHours - Configured interval in hours
 * @returns {boolean} - True if session has expired
 */
export function isSessionExpired(sessionStartTime, sessionExpiryTime, intervalHours = 24) {
  if (!sessionStartTime || !sessionExpiryTime) {
    return false; // No session times set, don't expire
  }
  
  const now = Date.now();
  
  // Check if we've passed the expiry time (11:59 PM of expiry day)
  if (now > sessionExpiryTime) {
    return true;
  }
  
  // Check if we've exceeded the configured interval
  const maxSessionDuration = intervalHours * 60 * 60 * 1000;
  if (now - sessionStartTime > maxSessionDuration) {
    return true;
  }
  
  return false;
}

/**
 * Get human-readable time remaining until session expires
 * @param {number} sessionExpiryTime - Timestamp when session should expire
 * @returns {string} - Formatted time remaining
 */
export function getTimeUntilExpiry(sessionExpiryTime) {
  if (!sessionExpiryTime) {
    return 'Unknown';
  }
  
  const now = Date.now();
  const remaining = sessionExpiryTime - now;
  
  if (remaining <= 0) {
    return 'Expired';
  }
  
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const suffix = days > 1 ? 's' : '';
    return days + ' day' + suffix;
  }
  
  if (hours > 0) {
    return hours + 'h ' + minutes + 'm';
  }
  
  return minutes + ' minutes';
}
