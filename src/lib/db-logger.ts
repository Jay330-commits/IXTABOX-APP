import 'server-only';

/**
 * Database Logger
 * 
 * Provides structured logging for database operations including:
 * - Query logging
 * - Error tracking
 * - Performance monitoring
 * - Transaction logging
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

  constructor() {
    // Set log level from environment or default to INFO
    this.logLevel = (process.env.DB_LOG_LEVEL as LogLevel) || LogLevel.INFO;
    this.enableConsole = process.env.DB_LOG_CONSOLE !== 'false';
    this.enableFile = process.env.DB_LOG_FILE === 'true';
    this.logFilePath = process.env.DB_LOG_FILE_PATH;
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
    this.writeLog(entry);
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
      this.writeLog(entry);
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
      this.writeLog(entry);
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
      this.writeLog(entry);
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
      this.writeLog(entry);
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
    this.writeLog(entry);
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
      this.writeLog(entry);
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
      this.writeLog(entry);
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
  private writeLog(entry: DbLogEntry): void {
    const formattedLog = this.formatLog(entry);

    if (this.enableConsole) {
      this.writeToConsole(entry, formattedLog);
    }

    if (this.enableFile && this.logFilePath) {
      // File logging would require fs module and should be handled carefully
      // For now, we'll just prepare the structure
      // In production, consider using a logging service like Winston, Pino, or CloudWatch
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

