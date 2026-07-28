# Database Encryption Setup

## Overview

EkagraFocus implements SQLite database encryption to protect sensitive productivity data (tasks, goals, AI conversations, session records) from unauthorized access at the operating system level.

## Implementation

### Encryption Method: SQLCipher + Electron safeStorage

1. **SQLCipher Integration**: Uses better-sqlite3 with SQLCipher encryption
   - Encrypts the entire SQLite database file using AES-256
   - Prevents direct file reading by other processes
   - Requires a strong encryption key

2. **Key Derivation**: Uses Electron's safeStorage API
   - Derives encryption key from OS-level secure storage
   - On macOS: Uses Keychain
   - On Windows: Uses DPAPI (Data Protection API)
   - On Linux: Uses `pass` or `secret-service` if available
   - Key is never stored in plaintext on disk

## Files Modified

- `src/main/db/database.ts`: Updated to initialize SQLCipher encryption
- `src/main/db/encryption.ts`: New file with encryption utilities

## Building with SQLCipher Support

### For Development

Better-sqlite3 needs to be compiled with SQLCipher support:

```bash
# Install with SQLCipher support
npm install better-sqlite3 --build-from-source --enable-sqlite-encryption

# Or use a prebuilt binary
npm install better-sqlite3-sqlcipher
```

### For Production Builds

Update `forge.config.js` to include SQLCipher binaries in the packaged application:

```javascript
afterCopy: (forgeConfig, buildPath, electronVersion, platform) => {
  // Copy SQLCipher binaries to build directory
  // Ensure better-sqlite3 is built with SQLCipher support
}
```

## Security Considerations

### Current Implementation

1. ✅ Encryption key derived from OS-level secure storage (Keychain/DPAPI)
2. ✅ Database file is encrypted at rest
3. ✅ Sensitive data (tasks, goals, chat history) are protected
4. ✅ Key is never exposed in plaintext

### Limitations

1. ⚠️ Encryption key is tied to the current OS user
2. ⚠️ If OS account is compromised, database can be decrypted
3. ⚠️ Better-sqlite3 standard npm build may not include SQLCipher by default

### Recommendations for Enhancement

1. **Field-level Encryption**: Apply additional encryption to sensitive text fields
   - Use `encryptField()` for chat content, notes with personal information
   - Use `decryptField()` when reading sensitive data

2. **Backup Encryption**: Encrypt exported backups with user-provided passphrase

3. **Key Rotation**: Implement periodic key rotation for enhanced security

## Usage in Application Code

### Encrypting Sensitive Fields

```typescript
import { encryptField, decryptField } from './db/encryption';

// When storing sensitive data
const encryptedContent = encryptField(userInput);
database.prepare('INSERT INTO notes (content) VALUES (?)').run(encryptedContent);

// When reading sensitive data
const row = database.prepare('SELECT content FROM notes WHERE id = ?').get(noteId);
const decryptedContent = decryptField(row.content);
```

### Checking if Encryption is Available

```typescript
import { safeStorage } from 'electron';

if (safeStorage.isEncryptionAvailable()) {
  console.log('Database encryption is enabled');
} else {
  console.warn('Database encryption is not available on this system');
}
```

## Testing

Test encryption functionality:

```bash
# Verify database file is encrypted (should not be readable as plaintext)
sqlite3 ~/.config/EkagraFocus/focus-agent.db ".dump"  # Should show encryption error

# Verify app starts correctly with encrypted database
npm start
```

## References

- [SQLCipher Documentation](https://www.zetetic.net/sqlcipher/)
- [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3)
- [Electron safeStorage API](https://www.electronjs.org/docs/api/safe-storage)
