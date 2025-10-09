/**
 * Reliability Service
 * Critical error handling and resilience patterns for production stability
 */
import { Request, Response, NextFunction } from 'express';

import { logger } from '../../shared/utils/logger.js';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class ReliabilityService {
  private static circuitBreakers = new Map<string, CircuitBreakerState>();
  private static requestMetrics = new Map<string, RequestMetrics>();

  /**
   * CRITICAL FIX: Circuit breaker pattern for external services
   */
  public static createCircuitBreaker(
    name: string,
    config: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 300000 // 5 minutes
    }
  ) {
    return async <T>(operation: () => Promise<T>): Promise<T> => {
      const state = this.getCircuitBreakerState(name, config);
      
      // If circuit is open, reject immediately
      if (state.state === 'OPEN') {
        if (Date.now() - state.lastFailure > config.resetTimeout) {
          state.state = 'HALF_OPEN';
          logger.info(`Circuit breaker ${name} moved to HALF_OPEN`);
        } else {
          throw new Error(`Circuit breaker ${name} is OPEN - service unavailable`);
        }
      }

      try {
        const result = await operation();
        
        // Success - reset failure count
        if (state.state === 'HALF_OPEN') {
          state.state = 'CLOSED';
          state.failureCount = 0;
          logger.info(`Circuit breaker ${name} reset to CLOSED`);
        }
        
        state.successCount++;
        return result;
        
      } catch (error) {
        state.failureCount++;
        state.lastFailure = Date.now();
        
        // Trip circuit if failure threshold exceeded
        if (state.failureCount >= config.failureThreshold) {
          state.state = 'OPEN';
          logger.error(`Circuit breaker ${name} tripped to OPEN`, {
            failureCount: state.failureCount,
            error: error.message
          });
        }
        
        throw error;
      }
    };
  }

  /**
   * CRITICAL FIX: Exponential backoff retry mechanism
   */
  public static async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    }
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt > config.maxRetries) {
          logger.error(`Operation failed after ${config.maxRetries} retries`, {
            error: error.message,
            attempts: attempt - 1
          });
          throw error;
        }

        // Calculate delay with jitter
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        const jitter = delay * 0.1 * Math.random();
        const totalDelay = delay + jitter;

        logger.warn(`Operation failed, retrying in ${Math.round(totalDelay)}ms`, {
          attempt,
          maxRetries: config.maxRetries,
          error: error.message
        });

        await this.delay(totalDelay);
      }
    }
    
    throw lastError!;
  }

  /**
   * CRITICAL FIX: Timeout wrapper for operations
   */
  public static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 30000,
    timeoutMessage: string = 'Operation timed out'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${timeoutMessage} (${timeoutMs}ms)`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * CRITICAL FIX: Bulkhead pattern for resource isolation
   */
  public static createBulkhead(
    name: string,
    maxConcurrent: number = 10
  ) {
    let activeTasks = 0;
    const waitingQueue: Array<{
      resolve: (value: any) => void;
      reject: (reason: any) => void;
      operation: () => Promise<any>;
    }> = [];

    return async <T>(operation: () => Promise<T>): Promise<T> => {
      return new Promise((resolve, reject) => {
        const task = { resolve, reject, operation };

        if (activeTasks < maxConcurrent) {
          this.executeBulkheadTask(task, () => {
            activeTasks--;
            this.processNextBulkheadTask();
          });
          activeTasks++;
        } else {
          waitingQueue.push(task);
          
          if (waitingQueue.length > maxConcurrent * 2) {
            reject(new Error(`Bulkhead ${name} queue full - rejecting request`));
            return;
          }
        }

        const processNextTask = () => {
          if (waitingQueue.length > 0 && activeTasks < maxConcurrent) {
            const nextTask = waitingQueue.shift()!;
            this.executeBulkheadTask(nextTask, () => {
              activeTasks--;
              processNextTask();
            });
            activeTasks++;
          }
        };

        this.processNextBulkheadTask = processNextTask;
      });
    };
  }

  /**
   * CRITICAL FIX: Global error handler middleware
   */
  public static createErrorHandler() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      // Log error with context
      logger.error('Unhandled application error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });

      // Don't expose internal errors in production
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (res.headersSent) {
        // If response already started, let Express handle it
        return next(error);
      }

      // Categorize error types
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation failed',
          message: isProduction ? 'Invalid input data' : error.message
        });
      }

      if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      if (error.name === 'TimeoutError') {
        return res.status(408).json({
          error: 'Request timeout',
          message: 'Operation took too long to complete'
        });
      }

      if (error.message?.includes('Circuit breaker')) {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          message: 'External service is experiencing issues'
        });
      }

      // Generic server error
      res.status(500).json({
        error: 'Internal server error',
        message: isProduction ? 'An unexpected error occurred' : error.message,
        ...(isProduction ? {} : { stack: error.stack })
      });
    };
  }

  /**
   * CRITICAL FIX: Graceful shutdown handler
   */
  public static createGracefulShutdown(
    server: any,
    cleanup: () => Promise<void> = async () => {}
  ) {
    let isShuttingDown = false;

    const shutdown = async (signal: string) => {
      if (isShuttingDown) {
        logger.warn(`Received ${signal} during shutdown, forcing exit`);
        process.exit(1);
      }

      isShuttingDown = true;
      logger.info(`Received ${signal}, starting graceful shutdown`);

      // Stop accepting new connections
      server.close(async (err: any) => {
        if (err) {
          logger.error('Error during server close', err);
        }

        try {
          // Run cleanup tasks
          await cleanup();
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (cleanupError) {
          logger.error('Error during cleanup', cleanupError);
          process.exit(1);
        }
      });

      // Force exit if graceful shutdown takes too long
      setTimeout(() => {
        logger.error('Graceful shutdown timed out, forcing exit');
        process.exit(1);
      }, 30000); // 30 seconds
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { 
        error: error.message, 
        stack: error.stack 
      });
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', { 
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined
      });
      shutdown('unhandledRejection');
    });
  }

  /**
   * CRITICAL FIX: Request correlation ID middleware
   */
  public static createCorrelationId() {
    return (req: Request, res: Response, next: NextFunction) => {
      const correlationId = req.headers['x-correlation-id'] as string || 
                           this.generateCorrelationId();
      
      req.correlationId = correlationId;
      res.setHeader('X-Correlation-ID', correlationId);
      
      // Create child logger with correlation ID context
      const contextLogger = logger.child({ correlationId });
      req.logger = contextLogger;

      next();
    };
  }

  // Helper methods
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getCircuitBreakerState(
    name: string,
    config: CircuitBreakerConfig
  ): CircuitBreakerState {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastFailure: 0
      });
    }
    return this.circuitBreakers.get(name)!;
  }

  private static processNextBulkheadTask: () => void = () => {};

  private static executeBulkheadTask(
    task: {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
      operation: () => Promise<any>;
    },
    onComplete: () => void
  ) {
    task.operation()
      .then(result => {
        task.resolve(result);
        onComplete();
      })
      .catch(error => {
        task.reject(error);
        onComplete();
      });
  }
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailure: number;
}

interface RequestMetrics {
  totalRequests: number;
  failedRequests: number;
  averageResponseTime: number;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      logger?: any;
    }
  }
}

export const reliabilityService = ReliabilityService;