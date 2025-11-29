import 'server-only';
import { writeFile, appendFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Database Logger
 * 
 * Provides structured logging for database operations including:
 * - Query logging
 * - Error tracking
 * - Performance monitoring
 * - Transaction logging
 * - File logging with automatic rotation
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface DbLogEntry {
  timestamp: string;
  level: LogLevel;
  operation: string;
  model?: string;
  action?: string;
  duration?: number;
  query?: string;
  params?: unknown;
  error?: string;
  userId?: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

export interface QueryLog {
  model: string;
  action: string;
  query: string;
  params?: unknown;
  duration: number;
}

export interface ErrorLog {
  operation: string;
  error: Error | unknown;
  query?: string;
  params?: unknown;
  context?: string;
}

class DbLogger {
  private logLevel: LogLevel;
  private enableConsole: boolean;
  private enableFile: boolean;
  private logFilePath?: string;
  private logDir?: string;
  private maxFileSize: number; // Max file size in bytes (default 10MB)
  private currentDate: string; // Current date for daily log rotation

  constructor() {
    // Set log level from environment or default to INFO
    this.logLevel = (process.env.DB_LOG_LEVEL as LogLevel) || LogLevel.INFO;
    this.enableConsole = process.env.DB_LOG_CONSOLE !== 'false';
    this.enableFile = process.env.DB_LOG_FILE === 'true';
    this.logFilePath = process.env.DB_LOG_FILE_PATH;
    this.maxFileSize = parseInt(process.env.DB_LOG_MAX_SIZE || '10485760', 10); // 10MB default
    this.currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Set default log directory if not specified
    if (this.enableFile && !this.logFilePath) {
      this.logDir = process.env.DB_LOG_DIR || join(process.cwd(), 'logs');
      this.ensureLogDirectory();
    } else if (this.logFilePath) {
      // Extract directory from file path
      const pathParts = this.logFilePath.split(/[/\\]/);
      pathParts.pop(); // Remove filename
      this.logDir = pathParts.join('/');
      if (this.logDir) {
        this.ensureLogDirectory();
      }
    }
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    if (!this.logDir) return;
    
    try {
      if (!existsSync(this.logDir)) {
        await mkdir(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
      this.enableFile = false; // Disable file logging if directory creation fails
    }
  }

  /**
   * Get current log file path with date rotation
   */
  private getLogFilePath(): string {
    if (this.logFilePath) {
      return this.logFilePath;
    }
    
    if (!this.logDir) {
      return '';
    }

    const today = new Date().toISOString().split('T')[0];
    const filename = `db-${today}.log`;
    return join(this.logDir, filename);
  }

  /**
   * Log a database query operation
   */
  logQuery(log: QueryLog): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry: DbLogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.DEBUG,
        operation: 'QUERY',
        model: log.model,
        action: log.action,
        duration: log.duration,
        query: log.query,
        params: log.params,
      };
      this.writeLog(entry);
    }
  }

  /**
   * Log a database error
   */
  logError(log: ErrorLog): void {
    const entry: DbLogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      operation: log.operation,
      query: log.query,
      params: log.params,
      context: log.context,
      error: this.formatError(log.error),
    };
    // Fire and forget - don't await to avoid blocking
    this.writeLog(entry).catch(() => {
      // Silently fail - logging shouldn't break the app
    });
  }

  /**
   * Log a database operation start
   */
  logOperationStart(operation: string, context?: string, metadata?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry: DbLogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.DEBUG,
        operation: `${operation}_START`,
        context,
        metadata,
      };
      this.writeLog(entry).catch(() => {});
    }
  }

  /**
   * Log a database operation completion
   */
  logOperationEnd(
    operation: string,
    duration: number,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry: DbLogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.DEBUG,
        operation: `${operation}_END`,
        duration,
        context,
        metadata,
      };
      this.writeLog(entry).catch(() => {});
    }
  }

  /**
   * Log a transaction start
   */
  logTransactionStart(transactionId?: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry: DbLogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        operation: 'TRANSACTION_START',
        metadata: { transactionId },
      };
      this.writeLog(entry).catch(() => {});
    }
  }

  /**
   * Log a transaction commit
   */
  logTransactionCommit(transactionId?: string, duration?: number): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry: DbLogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        operation: 'TRANSACTION_COMMIT',
        duration,
        metadata: { transactionId },
      };
      this.writeLog(entry).catch(() => {});
    }
  }

  /**
   * Log a transaction rollback
   */
  logTransactionRollback(transactionId?: string, error?: unknown): void {
    const entry: DbLogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      operation: 'TRANSACTION_ROLLBACK',
      error: this.formatError(error),
      metadata: { transactionId },
    };
    this.writeLog(entry).catch(() => {});
  }

  /**
   * Log a general info message
   */
  logInfo(message: string, metadata?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry: DbLogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        operation: message,
        metadata,
      };
      this.writeLog(entry).catch(() => {});
    }
  }

  /**
   * Log a warning
   */
  logWarning(message: string, metadata?: Record<string, unknown>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry: DbLogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.WARN,
        operation: message,
        metadata,
      };
      this.writeLog(entry).catch(() => {});
    }
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  /**
   * Write log entry to console and/or file
   */
  private async writeLog(entry: DbLogEntry): Promise<void> {
    const formattedLog = this.formatLog(entry);

    if (this.enableConsole) {
      this.writeToConsole(entry, formattedLog);
    }

    if (this.enableFile) {
      await this.writeToFile(entry, formattedLog);
    }
  }

  /**
   * Write log entry to file with automatic rotation
   */
  private async writeToFile(entry: DbLogEntry, formattedLog: string): Promise<void> {
    try {
      const filePath = this.getLogFilePath();
      if (!filePath) return;

      // Check if we need to rotate (new day or file too large)
      const today = new Date().toISOString().split('T')[0];
      if (today !== this.currentDate) {
        this.currentDate = today;
      }

      // Format log entry as JSON for structured logging
      const logLine = JSON.stringify({
        ...entry,
        formatted: formattedLog,
      }) + '\n';

      // Append to file (creates file if it doesn't exist)
      await appendFile(filePath, logLine, 'utf8');

      // Check file size and rotate if needed (async, don't block)
      this.checkAndRotateFile(filePath).catch((err) => {
        console.error('Error during log rotation check:', err);
      });
    } catch (error) {
      // Don't throw - logging errors shouldn't break the app
      // But log to console as fallback
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Check file size and rotate if necessary
   */
  private async checkAndRotateFile(filePath: string): Promise<void> {
    try {
      if (!existsSync(filePath)) return;

      const { stat } = await import('fs/promises');
      const stats = await stat(filePath);

      if (stats.size > this.maxFileSize) {
        // Rotate: rename current file with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = filePath.replace('.log', `-${timestamp}.log`);
        const { rename } = await import('fs/promises');
        await rename(filePath, rotatedPath);
        
        // Create new empty log file
        await writeFile(filePath, '', 'utf8');
      }
    } catch (error) {
      // Silently fail - rotation is not critical
      console.error('Log rotation error:', error);
    }
  }

  /**
   * Format log entry for output
   */
  private formatLog(entry: DbLogEntry): string {
    const parts: string[] = [
      `[${entry.timestamp}]`,
      `[${entry.level}]`,
      `[${entry.operation}]`,
    ];

    if (entry.model) parts.push(`[Model: ${entry.model}]`);
    if (entry.action) parts.push(`[Action: ${entry.action}]`);
    if (entry.duration !== undefined) parts.push(`[Duration: ${entry.duration}ms]`);
    if (entry.context) parts.push(`[Context: ${entry.context}]`);
    if (entry.error) parts.push(`[Error: ${entry.error}]`);

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      parts.push(`[Metadata: ${JSON.stringify(entry.metadata)}]`);
    }

    if (entry.query) {
      parts.push(`\nQuery: ${entry.query}`);
    }

    if (entry.params) {
      parts.push(`\nParams: ${JSON.stringify(entry.params, null, 2)}`);
    }

    return parts.join(' ');
  }

  /**
   * Write to console with appropriate color/styling
   */
  private writeToConsole(entry: DbLogEntry, formattedLog: string): void {
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error('🔴 [DB]', formattedLog);
        break;
      case LogLevel.WARN:
        console.warn('🟡 [DB]', formattedLog);
        break;
      case LogLevel.INFO:
        console.log('🔵 [DB]', formattedLog);
        break;
      case LogLevel.DEBUG:
        console.debug('⚪ [DB]', formattedLog);
        break;
    }
  }

  /**
   * Format error for logging
   */
  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
    }
    return String(error);
  }

  /**
   * Create a performance tracker
   */
  createPerformanceTracker(operation: string, context?: string) {
    const startTime = Date.now();
    return {
      end: (metadata?: Record<string, unknown>) => {
        const duration = Date.now() - startTime;
        this.logOperationEnd(operation, duration, context, metadata);
        return duration;
      },
      logError: (error: unknown) => {
        this.logError({
          operation,
          error,
          context,
        });
      },
    };
  }
}

// Export singleton instance
export const dbLogger = new DbLogger();

// Export helper functions for convenience
export const logQuery = (log: QueryLog) => dbLogger.logQuery(log);
export const logError = (log: ErrorLog) => dbLogger.logError(log);
export const logInfo = (message: string, metadata?: Record<string, unknown>) =>
  dbLogger.logInfo(message, metadata);
export const logWarning = (message: string, metadata?: Record<string, unknown>) =>
  dbLogger.logWarning(message, metadata);

