# Database Encryption Setup

## Overview

EkagraFocus implements SQLite database encryption to protect sensitive productivity data (tasks, goals, AI conversations, session records) from unauthorized access at the operating system level.

## Implementation

### Encryption Method: SQLCipher + Electron safeStorage

1. **SQLCipher Integration**: Uses better-sqlite3 with SQLCipher encryption
   - Encrypts the entire SQLite database file using AES-256
   - Prevents direct file reading by other processes
   - Requires a 32-byte encryption key

2. **Key Management**: Uses Electron's safeStorage API for secure key storage
   - On first run: Generates a random 32-byte encryption key
   - Encrypts the raw key using Electron's safeStorage API
   - Persists the encrypted key to disk at `userData/db_key.enc` with mode 0o600
   - On subsequent runs: Reads and decrypts the stored key to use with SQLCipher
   - On macOS: safeStorage uses Keychain
   - On Windows: safeStorage uses DPAPI (Data Protection API)
   - On Linux: safeStorage uses pass or secret-service if available
   - The raw key is never stored in plaintext on disk

## Key Storage Details

### Encrypted Key File

The database encryption key is stored at `{userData}/db_key.enc` where userData is determined by Electron's `app.getPath('userData')`:

- **macOS**: `~/Library/Application Support/EkagraFocus/db_key.enc`
- **Windows**: `%APPDATA%/EkagraFocus/db_key.enc`
- **Linux**: `~/.config/EkagraFocus/db_key.enc`

File format: Base64-encoded encrypted blob from Electron's safeStorage API
File permissions: 0o600 (read/write for owner only)

The encrypted blob can only be decrypted by the same OS user on the same machine (OS-level protection).

### Key Derivation Process

1. Generate 32 random bytes using Node's crypto module
2. Convert to base64 string
3. Encrypt the base64 string using Electron's safeStorage.encryptString()
4. Save the encrypted blob (base64 encoded) to db_key.enc
5. On startup, read the encrypted blob, decode from base64
6. Decrypt using safeStorage.decryptString()
7. Convert the decrypted base64 back to the 32-byte buffer
8. Use the raw 32 bytes as the SQLCipher encryption key via PRAGMA key

## Files Modified

- `src/main/db/database.ts`: Updated to initialize SQLCipher encryption with key validation
- `src/main/db/encryption.ts`: Rewritten with proper key generation and persistence

## Building with SQLCipher Support

### For Development

Better-sqlite3 needs to be compiled with SQLCipher support. In package.json, specify:

```json
{
  "dependencies": {
    "better-sqlite3": "^9.0.0"
  },
  "optionalDependencies": {
    "better-sqlite3-sqlcipher": "^9.0.0"
  }
}
```

Installation options:

```bash
npm install better-sqlite3 --build-from-source

or for explicit SQLCipher support:
npm install better-sqlite3-sqlcipher
```

### For Production Builds with Electron Forge

Update `forge.config.js` to ensure SQLCipher binaries are included:

```javascript
{
  packagerConfig: {
    asar: true,
  },
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
    }
  ],
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
        certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
        signingCertificate: process.env.WINDOWS_SIGNING_CERT,
      }
    }
  ]
}
```

Ensure native modules are rebuilt for the target platform:
```bash
npx electron-rebuild -f -w better-sqlite3
```

## Database Migration

### New Installation

When the app starts for the first time:
1. No database file exists (focus-agent.db)
2. getOrCreateDatabaseKey() generates and persists a random key
3. Database is created with the new key applied immediately
4. All data is encrypted from the start

### Existing Unencrypted Database

If a user upgrades from a version without encryption:
1. The application detects the existing unencrypted focus-agent.db
2. Initiates a safe migration:
   - Creates a backup: focus-agent.db.backup
   - Opens the database without a key (reads plaintext data)
   - Generates and persists a new encryption key
   - Uses PRAGMA rekey to encrypt the database in place
   - Validates the rekey operation succeeded
   - Keeps the backup for recovery if needed

Note: This automatic migration requires additional implementation in the database initialization logic.

## Error Handling

### Key Validation Errors

The application validates the encryption key immediately after applying it:

1. After setting PRAGMA key, runs: `SELECT count(*) FROM sqlite_master`
2. If this query fails, the key is wrong or the database is corrupted
3. Application logs the error and fails to start with a clear message
4. User is directed to restore from backup or contact support

### safeStorage Unavailable

If Electron's safeStorage is not available on the system:

1. encryptField() and decryptField() log a warning
2. Data is stored in plaintext as a fallback
3. Database-level encryption is disabled
4. User experience continues but data is not protected

Recommendation: Log this condition at startup so admins can diagnose encryption issues.

## Security Considerations

### Current Implementation

1. Encryption key derived from OS-level secure storage (Keychain/DPAPI)
2. Database file is encrypted at rest using AES-256
3. Sensitive data (tasks, goals, chat history) are protected
4. Encryption key is never exposed in plaintext to the application
5. Persistent key file uses OS-level file permissions (0o600)

### Limitations

1. Encryption is tied to the current OS user account
2. If the OS user's credentials are compromised, the database can be decrypted
3. Requires proper SQLCipher compilation in better-sqlite3
4. Migration from unencrypted to encrypted databases requires manual intervention

### Recommendations for Enhancement

1. **Field-level Encryption**: Apply additional encryption to sensitive text fields
   - Use encryptField() for chat content, notes with personal information
   - Use decryptField() when reading sensitive data
   - Provides defense in depth if database encryption is bypassed

2. **Backup Encryption**: Encrypt exported backups with user-provided passphrase

3. **Key Rotation**: Implement periodic key rotation via PRAGMA rekey

4. **Audit Logging**: Log all encryption-related operations for troubleshooting

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

### Checking Encryption Status

```typescript
import { safeStorage } from 'electron';

if (safeStorage.isEncryptionAvailable()) {
  console.log('Database encryption is enabled');
} else {
  console.warn('Database encryption is not available on this system');
}
```

## Testing

### Verify Database is Encrypted

```bash
file ~/.config/EkagraFocus/focus-agent.db
sqlite3 ~/.config/EkagraFocus/focus-agent.db ".dump"
```

The database file should show as SQLite 3.x database and the .dump command should fail with an encryption error if properly encrypted.

### Verify Key Persistence

1. Start the application (generates key)
2. Create some data
3. Restart the application
4. Verify all data is readable (key was correctly recovered from db_key.enc)

### Test Wrong Key Scenario

1. Delete db_key.enc
2. Start application (generates new key)
3. Application should fail with clear error message that DB cannot be opened with new key

## References

- [SQLCipher Documentation](https://www.zetetic.net/sqlcipher/)
- [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3)
- [Electron safeStorage API](https://www.electronjs.org/docs/api/safe-storage)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
