/**
 * Window Type Augmentations
 *
 * Extends the global Window interface with custom properties used in the application.
 * Replaces unsafe `(window as any)` casts throughout the codebase.
 */

/**
 * Context information for error monitoring
 */
interface ErrorContext {
  /** Component name where error occurred */
  componentName?: string;

  /** Error stack trace */
  errorInfo?: string;

  /** User ID if authenticated */
  userId?: string;

  /** Session ID for tracking */
  sessionId?: string;

  /** Additional custom context */
  [key: string]: unknown;
}

/**
 * User information for error monitoring
 */
interface ErrorMonitoringUser {
  /** Unique user identifier */
  id: string;

  /** User email (optional) */
  email?: string;

  /** Username (optional) */
  username?: string;

  /** Additional user properties */
  [key: string]: unknown;
}

/**
 * Error monitoring service interface (Sentry, Rollbar, etc.)
 */
interface ErrorMonitoring {
  /**
   * Capture an exception and send to monitoring service
   * @param error - The error to capture
   * @param context - Optional context about the error
   */
  captureException(error: Error, context?: ErrorContext): void;

  /**
   * Capture a message (not an error) and send to monitoring service
   * @param message - The message to capture
   * @param level - Severity level
   */
  captureMessage(
    message: string,
    level: 'debug' | 'info' | 'warning' | 'error' | 'fatal'
  ): void;

  /**
   * Set user information for error context
   * @param user - User information
   */
  setUser(user: ErrorMonitoringUser): void;

  /**
   * Clear user information
   */
  clearUser(): void;

  /**
   * Set additional context for all future errors
   * @param context - Context to add
   */
  setContext(context: Record<string, unknown>): void;

  /**
   * Add breadcrumb for debugging
   * @param breadcrumb - Breadcrumb information
   */
  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: 'debug' | 'info' | 'warning' | 'error';
    data?: Record<string, unknown>;
  }): void;
}

/**
 * Performance monitoring interface
 */
interface PerformanceMonitoring {
  /**
   * Start a performance transaction
   * @param name - Transaction name
   * @returns Transaction ID
   */
  startTransaction(name: string): string;

  /**
   * End a performance transaction
   * @param transactionId - Transaction ID from startTransaction
   */
  endTransaction(transactionId: string): void;

  /**
   * Mark a custom timing
   * @param name - Timing name
   * @param duration - Duration in milliseconds
   */
  markTiming(name: string, duration: number): void;
}

/**
 * Analytics interface
 */
interface Analytics {
  /**
   * Track a custom event
   * @param eventName - Name of the event
   * @param properties - Event properties
   */
  track(eventName: string, properties?: Record<string, unknown>): void;

  /**
   * Identify a user
   * @param userId - User ID
   * @param traits - User traits
   */
  identify(userId: string, traits?: Record<string, unknown>): void;

  /**
   * Track a page view
   * @param pageName - Name of the page
   */
  page(pageName: string): void;
}

/**
 * Augment the global Window interface
 */
declare global {
  interface Window {
    /** Error monitoring service (Sentry, Rollbar, etc.) */
    errorMonitoring?: ErrorMonitoring;

    /** Performance monitoring service */
    performanceMonitoring?: PerformanceMonitoring;

    /** Analytics service (Segment, Mixpanel, etc.) */
    analytics?: Analytics;

    /** Build information injected at compile time */
    __BUILD_INFO__?: {
      version: string;
      commit: string;
      buildTime: string;
      environment: 'development' | 'staging' | 'production';
    };

    /** Feature flags */
    __FEATURE_FLAGS__?: Record<string, boolean>;
  }
}

// Export to make this a module (required for TypeScript declaration merging)
export {};
