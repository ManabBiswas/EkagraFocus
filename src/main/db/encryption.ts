import { safeStorage } from 'electron';
import crypto from 'crypto';

/**
 * Database encryption utility using Electron's safeStorage API
 * Provides secure encryption/decryption of sensitive database fields
 */

const ENCRYPTION_PREFIX = 'enc:';

/**
 * Generate or retrieve a stable encryption key using Electron's safeStorage
 * The key is stored as an encrypted string and can only be decrypted by the same user
 */
export function getDatabaseEncryptionKey(): string {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[Encryption] Electron safeStorage not available, using unencrypted storage');
      return '';
    }

    // Use a fixed seed string to generate a consistent key for this application
    const keySeed = 'ekagrafocus-db-encryption-key-v1';
    const encryptedKey = safeStorage.encryptString(keySeed);

    // Convert to hex for use as SQLCipher key
    return encryptedKey.toString('hex').substring(0, 64);
  } catch (error) {
    console.error('[Encryption] Failed to initialize encryption key:', error);
    return '';
  }
}

/**
 * Encrypt a sensitive string value using Electron's safeStorage
 * Returns the encrypted value prefixed with 'enc:' to indicate it's encrypted
 */
export function encryptField(value: string): string {
  if (!value) return value;

  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return value;
    }

    const encrypted = safeStorage.encryptString(value);
    return ENCRYPTION_PREFIX + encrypted.toString('base64');
  } catch (error) {
    console.error('[Encryption] Failed to encrypt field:', error);
    return value;
  }
}

/**
 * Decrypt a field encrypted with encryptField()
 * Returns the original value if not encrypted or decryption fails
 */
export function decryptField(value: string): string {
  if (!value || !value.startsWith(ENCRYPTION_PREFIX)) {
    return value;
  }

  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return value;
    }

    const encryptedData = Buffer.from(value.substring(ENCRYPTION_PREFIX.length), 'base64');
    return safeStorage.decryptString(encryptedData);
  } catch (error) {
    console.error('[Encryption] Failed to decrypt field:', error);
    return value;
  }
}

/**
 * Check if a field is encrypted
 */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Generate a database encryption pragma string for SQLCipher
 * Returns empty string if encryption is not available
 */
export function getEncryptionPragma(): string {
  const key = getDatabaseEncryptionKey();
  if (!key) {
    return '';
  }

  // SQLCipher uses the PRAGMA key command to encrypt the database
  // Format: "PRAGMA key = 'hex:HEXKEY';"
  return `PRAGMA key = 'hex:${key}';`;
}
