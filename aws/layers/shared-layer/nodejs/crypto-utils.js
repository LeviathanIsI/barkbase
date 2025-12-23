/**
 * =============================================================================
 * BarkBase Crypto Utils - Token Encryption/Decryption
 * =============================================================================
 *
 * AES-256-GCM encryption for storing OAuth tokens securely.
 * Uses a 32-byte encryption key from environment variables.
 *
 * =============================================================================
 */

const crypto = require('crypto');

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment.
 * In production, this should come from AWS Secrets Manager.
 *
 * @returns {Buffer} 32-byte encryption key
 */
function getEncryptionKey() {
  const key = process.env.TOKEN_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

  if (!key) {
    // Generate a deterministic fallback for development
    // In production, this MUST be set in environment
    console.warn('[CRYPTO] No TOKEN_ENCRYPTION_KEY set - using development fallback');
    return crypto.scryptSync('barkbase-dev-encryption-key', 'barkbase-salt', 32);
  }

  // If key is already hex-encoded (64 chars = 32 bytes)
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }

  // If key is base64 encoded
  if (key.length === 44 && /^[A-Za-z0-9+/=]+$/.test(key)) {
    return Buffer.from(key, 'base64');
  }

  // Derive 32-byte key from arbitrary string using scrypt
  return crypto.scryptSync(key, 'barkbase-oauth-salt', 32);
}

/**
 * Encrypt a string value using AES-256-GCM.
 *
 * @param {string} plaintext - The value to encrypt
 * @returns {string} Base64-encoded encrypted value (iv:authTag:ciphertext)
 */
function encryptToken(plaintext) {
  if (!plaintext) return null;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all base64 encoded)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('[CRYPTO] Encryption error:', error.message);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt an encrypted token value.
 *
 * @param {string} encryptedValue - Base64-encoded encrypted value (iv:authTag:ciphertext)
 * @returns {string} Decrypted plaintext
 */
function decryptToken(encryptedValue) {
  if (!encryptedValue) return null;

  try {
    const parts = encryptedValue.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }

    const [ivBase64, authTagBase64, ciphertext] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('[CRYPTO] Decryption error:', error.message);
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Generate a random encryption key (for initial setup).
 *
 * @returns {string} 32-byte key as hex string
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Test that encryption/decryption works correctly.
 *
 * @returns {boolean} True if encryption is working
 */
function testEncryption() {
  try {
    const testValue = 'test-token-' + Date.now();
    const encrypted = encryptToken(testValue);
    const decrypted = decryptToken(encrypted);
    return testValue === decrypted;
  } catch (error) {
    console.error('[CRYPTO] Encryption test failed:', error.message);
    return false;
  }
}

module.exports = {
  encryptToken,
  decryptToken,
  generateEncryptionKey,
  testEncryption,
  ALGORITHM,
};
