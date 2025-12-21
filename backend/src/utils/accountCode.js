/**
 * =============================================================================
 * BarkBase Account Code Generator
 * =============================================================================
 *
 * Generates unique, customer-facing account codes in the format: BK-XXXXXX
 *
 * Design decisions:
 * - 6-character alphanumeric code after prefix
 * - Character set excludes confusing characters: 0/O, 1/I/L
 * - 32^6 = 1,073,741,824 possible combinations (over 1 billion)
 * - Collision-resistant with retry logic
 *
 * =============================================================================
 */

// Character set excluding confusing characters: 0/O, 1/I/L
// 32 characters total for easy mental math on collision probability
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const PREFIX = 'BK-';
const MAX_GENERATION_ATTEMPTS = 10;

/**
 * Generate a random account code (not guaranteed unique)
 * @returns {string} Account code in format BK-XXXXXX
 */
function generateAccountCode() {
  let code = PREFIX;
  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * CHARSET.length);
    code += CHARSET[randomIndex];
  }
  return code;
}

/**
 * Generate a unique account code, checking against existing codes in database
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @returns {Promise<string>} Unique account code
 * @throws {Error} If unable to generate unique code after max attempts
 */
async function generateUniqueAccountCode(pool) {
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateAccountCode();

    // Check if code already exists
    const result = await pool.query(
      'SELECT 1 FROM "Tenant" WHERE account_code = $1 LIMIT 1',
      [code]
    );

    if (result.rows.length === 0) {
      console.log(`[AccountCode] Generated unique code on attempt ${attempt}: ${code}`);
      return code;
    }

    console.log(`[AccountCode] Collision on attempt ${attempt}: ${code}, retrying...`);
  }

  throw new Error(
    `Failed to generate unique account code after ${MAX_GENERATION_ATTEMPTS} attempts. ` +
    'This is statistically improbable and may indicate a system issue.'
  );
}

/**
 * Validate account code format
 * @param {string} code - Account code to validate
 * @returns {object} { valid: boolean, error?: string }
 */
function validateAccountCode(code) {
  if (!code) {
    return { valid: false, error: 'Account code is required' };
  }

  if (typeof code !== 'string') {
    return { valid: false, error: 'Account code must be a string' };
  }

  // Check prefix
  if (!code.startsWith(PREFIX)) {
    return { valid: false, error: `Account code must start with "${PREFIX}"` };
  }

  // Check total length (prefix + code)
  const expectedLength = PREFIX.length + CODE_LENGTH;
  if (code.length !== expectedLength) {
    return {
      valid: false,
      error: `Account code must be exactly ${expectedLength} characters (got ${code.length})`,
    };
  }

  // Check that characters after prefix are valid
  const codeBody = code.slice(PREFIX.length);
  for (const char of codeBody) {
    if (!CHARSET.includes(char)) {
      return {
        valid: false,
        error: `Account code contains invalid character: "${char}". Valid characters: ${CHARSET}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Parse account code from various input formats
 * Handles: "BK-ABC123", "bk-abc123", "ABC123", etc.
 * @param {string} input - Raw input string
 * @returns {string|null} Normalized account code or null if invalid
 */
function normalizeAccountCode(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Trim and uppercase
  let normalized = input.trim().toUpperCase();

  // If it doesn't have prefix, add it
  if (!normalized.startsWith(PREFIX)) {
    // Check if it's just the code body
    if (normalized.length === CODE_LENGTH) {
      normalized = PREFIX + normalized;
    } else {
      return null;
    }
  }

  // Validate the normalized code
  const validation = validateAccountCode(normalized);
  return validation.valid ? normalized : null;
}

/**
 * Extract account code from URL path
 * @param {string} path - URL path (e.g., "/api/v1/owners/BK-ABC123/record/0-1/123")
 * @returns {string|null} Account code or null if not found
 */
function extractAccountCodeFromPath(path) {
  if (!path || typeof path !== 'string') {
    return null;
  }

  // Look for BK-XXXXXX pattern in path
  const regex = new RegExp(`(${PREFIX}[${CHARSET}]{${CODE_LENGTH}})`, 'i');
  const match = path.match(regex);

  if (match) {
    return match[1].toUpperCase();
  }

  return null;
}

module.exports = {
  generateAccountCode,
  generateUniqueAccountCode,
  validateAccountCode,
  normalizeAccountCode,
  extractAccountCodeFromPath,
  // Export constants for testing
  CHARSET,
  CODE_LENGTH,
  PREFIX,
  MAX_GENERATION_ATTEMPTS,
};
