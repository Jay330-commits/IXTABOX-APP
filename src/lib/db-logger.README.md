# Database Logger - File Logging

The database logger now supports file logging for all database operations.

## Features

✅ **Automatic file creation** - Creates log directory if it doesn't exist  
✅ **Daily log rotation** - New file each day (`db-YYYY-MM-DD.log`)  
✅ **Size-based rotation** - Rotates when file exceeds max size (default 10MB)  
✅ **Structured JSON logs** - Easy to parse and analyze  
✅ **Non-blocking** - File writes don't block your application  
✅ **Error handling** - Logging errors won't crash your app  

## Configuration

Add these environment variables to enable file logging:

```bash
# Enable file logging
DB_LOG_FILE=true

# Optional: Custom log directory (default: ./logs)
DB_LOG_DIR=./logs

# Optional: Custom log file path (overrides DB_LOG_DIR)
DB_LOG_FILE_PATH=./logs/database.log

# Optional: Log level (DEBUG, INFO, WARN, ERROR)
DB_LOG_LEVEL=INFO

# Optional: Max file size before rotation (in bytes, default: 10MB)
DB_LOG_MAX_SIZE=10485760

# Optional: Disable console logging (default: true)
DB_LOG_CONSOLE=false
```

## Log File Format

Logs are written as JSON lines (one JSON object per line):

```json
{
  "timestamp": "2025-01-28T10:30:45.123Z",
  "level": "INFO",
  "operation": "TRANSACTION_START",
  "metadata": {
    "transactionId": "tx_1234567890"
  },
  "formatted": "[2025-01-28T10:30:45.123Z] [INFO] [TRANSACTION_START] [Metadata: {...}]"
}
```

## Log File Location

- **Default**: `./logs/db-YYYY-MM-DD.log`
- **Custom**: Set `DB_LOG_FILE_PATH` or `DB_LOG_DIR`

## What Gets Logged

- ✅ All database queries (model, action, SQL, params, duration)
- ✅ Transaction start/commit/rollback
- ✅ Database errors with stack traces
- ✅ Operation performance metrics
- ✅ Custom info/warning messages

## Example Usage

```typescript
import { dbLogger } from '@/lib/db-logger';

// All database operations are automatically logged
// when using BaseService or services that extend it

// Manual logging:
dbLogger.logInfo('Custom operation', { userId: '123' });
dbLogger.logError({ 
  operation: 'CREATE_USER', 
  error: new Error('Failed') 
});
```

## Log Rotation

- **Daily**: New file created each day (`db-2025-01-28.log`, `db-2025-01-29.log`, etc.)
- **Size-based**: If file exceeds max size, it's rotated with timestamp (`db-2025-01-28-2025-01-28T10-30-45-123Z.log`)

## Notes

- Log files are automatically added to `.gitignore`
- File writes are asynchronous and won't block your application
- If file logging fails, it falls back to console logging only
- In production, consider using a logging service (Winston, Pino, CloudWatch) instead

