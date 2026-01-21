import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag
const KEY_LENGTH = 32; // 32 bytes for AES-256

/**
 * Encryption key loaded from environment variable and validated at module initialization.
 * The key must be a 32-byte (64 hex character) string.
 */
let encryptionKey: Buffer;

/**
 * Initialize and validate the encryption key from environment variable.
 * This runs once when the module is loaded.
 */
function initializeEncryptionKey(): void {
  const keyHex = process.env.BANK_TOKEN_ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error('BANK_TOKEN_ENCRYPTION_KEY environment variable is not set');
  }

  // Remove any whitespace
  const cleanKeyHex = keyHex.trim();

  // Validate hex format and length
  if (!/^[0-9a-fA-F]{64}$/.test(cleanKeyHex)) {
    throw new Error('BANK_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }

  // Convert hex string to buffer
  encryptionKey = Buffer.from(cleanKeyHex, 'hex');

  if (encryptionKey.length !== KEY_LENGTH) {
    throw new Error('BANK_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }
}

// Initialize key at module load time (fail fast)
initializeEncryptionKey();

/**
 * Encrypts a token using AES-256-GCM encryption.
 *
 * The encrypted token is returned as a base64-encoded string with the following format:
 * [IV (12 bytes)][Encrypted Data][Auth Tag (16 bytes)]
 *
 * @param token - The plaintext token to encrypt
 * @returns Base64-encoded encrypted token with IV and auth tag
 * @throws Error if encryption fails
 */
export function encryptToken(token: string): string {
  try {
    // Generate a unique random IV for this token
    const iv = randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, encryptionKey, iv);

    // Encrypt the token
    let encrypted = cipher.update(token, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([iv, encrypted, authTag]);

    // Return as base64 string
    return combined.toString('base64');
  } catch (error) {
    // Don't include sensitive data in error message
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypts a token that was encrypted with encryptToken.
 *
 * @param encryptedToken - Base64-encoded encrypted token (format: IV + encrypted data + auth tag)
 * @returns The decrypted plaintext token
 * @throws Error if decryption fails (invalid format, wrong key, tampered data, etc.)
 */
export function decryptToken(encryptedToken: string): string {
  try {
    // Decode from base64
    const combined = Buffer.from(encryptedToken, 'base64');

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

    // Validate minimum length
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted token format');
    }

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the token
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    // Don't include sensitive data in error message
    throw new Error('Failed to decrypt token');
  }
}
