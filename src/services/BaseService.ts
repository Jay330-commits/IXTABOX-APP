import 'server-only';
import { prisma } from '../lib/prisma/prisma';
import { dbLogger } from '../lib/db-logger';

/**
 * Base service class providing common database operations
 */
export abstract class BaseService {
  protected prisma = prisma;

  /**
   * Execute a database transaction
   */
  protected async executeTransaction<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: (tx: any) => Promise<T>,
    context?: string
  ): Promise<T> {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const tracker = dbLogger.createPerformanceTracker('TRANSACTION', context);

    dbLogger.logTransactionStart(transactionId);

    try {
      const result = await this.prisma.$transaction(callback);
      const duration = tracker.end({ transactionId });
      dbLogger.logTransactionCommit(transactionId, duration);
      return result;
    } catch (error) {
      tracker.logError(error);
      dbLogger.logTransactionRollback(transactionId, error);
      throw error;
    }
  }

  /**
   * Handle service errors consistently
   */
  protected handleError(error: unknown, context: string): never {
    dbLogger.logError({
      operation: context,
      error,
      context: `Service error in ${context}`,
    });
    throw new Error(`Service error in ${context}`);
  }

  /**
   * Log a database operation with performance tracking
   */
  protected async logOperation<T>(
    operation: string,
    callback: () => Promise<T>,
    context?: string,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const tracker = dbLogger.createPerformanceTracker(operation, context);
    dbLogger.logOperationStart(operation, context, metadata);

    try {
      const result = await callback();
      tracker.end(metadata);
      return result;
    } catch (error) {
      tracker.logError(error);
      throw error;
    }
  }
}
