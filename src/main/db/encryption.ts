import { safeStorage, app } from 'electron';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Database encryption utility using Electron's safeStorage API
 * Provides secure encryption/decryption of sensitive database fields
 */

const ENCRYPTION_PREFIX = 'enc:';
const KEY_FILE = path.join(app.getPath('userData'), 'db_key.enc');

/**
 * Get or create a stable database encryption key
 * Generates a random 32-byte key on first run and persists it encrypted
 * On subsequent runs, retrieves and decrypts the persisted key
 */
export function getOrCreateDatabaseKey(): Buffer | null {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[Encryption] Electron safeStorage not available, encryption unavailable');
    return null;
  }

  try {
    if (fs.existsSync(KEY_FILE)) {
      const storedEncrypted = fs.readFileSync(KEY_FILE, 'utf8');
      const encryptedBuf = Buffer.from(storedEncrypted, 'base64');
      const rawKeyBase64 = safeStorage.decryptString(encryptedBuf);
      return Buffer.from(rawKeyBase64, 'base64');
    } else {
      const rawKey = crypto.randomBytes(32);
      const rawKeyBase64 = rawKey.toString('base64');
      const encryptedBuf = safeStorage.encryptString(rawKeyBase64);
      fs.writeFileSync(KEY_FILE, encryptedBuf.toString('base64'), { mode: 0o600 });
      return rawKey;
    }
  } catch (error) {
    console.error('[Encryption] Failed to get or create database key:', error);
    return null;
  }
}

/**
 * Get the encryption key as a hex string for use with SQLCipher PRAGMA key
 */
export function getDatabaseEncryptionKey(): string {
  const rawKey = getOrCreateDatabaseKey();
  if (!rawKey) {
    return '';
  }
  return rawKey.toString('hex');
}

/**
 * Encrypt a sensitive string value using Electron's safeStorage
 * Returns the encrypted value prefixed with 'enc:' to indicate it's encrypted
 */
export function encryptField(value: string): string {
  if (!value) return value;

  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[Encryption] safeStorage not available, storing plaintext');
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
      console.warn('[Encryption] safeStorage not available, cannot decrypt');
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

  return `PRAGMA key = 'hex:${key}';`;
}
