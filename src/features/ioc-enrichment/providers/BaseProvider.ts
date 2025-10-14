/**
 * Base Provider for IOC Enrichment
 *
 * Abstract class that all enrichment providers must extend
 */

import { EventEmitter } from 'events';
import { logger } from '../../../shared/utils/logger';

export interface ProviderConfig {
  apiKey?: string;
  apiUrl?: string;
  enabled: boolean;
  rateLimit: {
    requestsPerSecond: number;
    requestsPerDay: number;
  };
  timeout: number; // milliseconds
  retryAttempts: number;
  cacheEnabled: boolean;
  cacheTTL: number; // seconds
}

export interface EnrichmentRequest {
  ioc: string;
  iocType: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'cve';
  context?: Record<string, any>;
}

export interface EnrichmentResponse {
  success: boolean;
  provider: string;
  ioc: string;
  iocType: string;
  data?: ProviderEnrichmentData;
  error?: string;
  timestamp: Date;
  responseTime: number; // milliseconds
  cached: boolean;
}

export interface ProviderEnrichmentData {
  reputation: {
    score: number; // 0-100, higher is worse
    verdict: 'benign' | 'suspicious' | 'malicious' | 'unknown';
    confidence: number; // 0-1
  };
  metadata: Record<string, any>;
  relatedIndicators?: Array<{
    type: string;
    value: string;
    relationship: string;
  }>;
  tags?: string[];
  references?: string[];
}

export interface RateLimitStatus {
  remaining: number;
  resetTime: Date;
  blocked: boolean;
}

export abstract class BaseProvider extends EventEmitter {
  protected config: ProviderConfig;
  protected providerName: string;
  private requestHistory: number[] = [];
  private dailyRequestCount: number = 0;
  private dailyResetTime: Date;

  constructor(providerName: string, config: ProviderConfig) {
    super();
    this.providerName = providerName;
    this.config = config;
    this.dailyResetTime = this.getNextMidnight();
    this.setupRateLimitCleanup();
  }

  /**
   * Main enrichment method - must be implemented by each provider
   */
  abstract enrichIOC(request: EnrichmentRequest): Promise<EnrichmentResponse>;

  /**
   * Validate if provider can handle this IOC type
   */
  abstract supportsIOCType(iocType: string): boolean;

  /**
   * Test provider connectivity and authentication
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Execute enrichment with rate limiting, retries, and error handling
   */
  async enrich(request: EnrichmentRequest): Promise<EnrichmentResponse> {
    const startTime = Date.now();

    try {
      // Check if enabled
      if (!this.config.enabled) {
        return this.createErrorResponse(
          request,
          'Provider is disabled',
          startTime
        );
      }

      // Check if provider supports this IOC type
      if (!this.supportsIOCType(request.iocType)) {
        return this.createErrorResponse(
          request,
          `Provider does not support IOC type: ${request.iocType}`,
          startTime
        );
      }

      // Check rate limits
      const rateLimitStatus = this.checkRateLimit();
      if (rateLimitStatus.blocked) {
        return this.createErrorResponse(
          request,
          `Rate limit exceeded. Resets at: ${rateLimitStatus.resetTime}`,
          startTime
        );
      }

      // Execute enrichment with retry logic
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
        try {
          // Record request
          this.recordRequest();

          // Execute enrichment
          const response = await Promise.race([
            this.enrichIOC(request),
            this.timeoutPromise(this.config.timeout),
          ]);

          // Calculate response time
          const responseTime = Date.now() - startTime;
          response.responseTime = responseTime;
          response.provider = this.providerName;

          // Emit success event
          this.emit('enrichmentSuccess', { request, response });

          logger.info(`${this.providerName}: Enriched ${request.ioc} in ${responseTime}ms`);
          return response;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          logger.warn(
            `${this.providerName}: Attempt ${attempt + 1} failed for ${request.ioc}:`,
            lastError.message
          );

          // Wait before retry (exponential backoff)
          if (attempt < this.config.retryAttempts) {
            await this.delay(Math.pow(2, attempt) * 1000);
          }
        }
      }

      // All retries failed
      return this.createErrorResponse(
        request,
        lastError?.message || 'Unknown error',
        startTime
      );

    } catch (error) {
      return this.createErrorResponse(
        request,
        error instanceof Error ? error.message : 'Unknown error',
        startTime
      );
    }
  }

  /**
   * Check current rate limit status
   */
  checkRateLimit(): RateLimitStatus {
    const now = Date.now();

    // Reset daily count if needed
    if (new Date() >= this.dailyResetTime) {
      this.dailyRequestCount = 0;
      this.dailyResetTime = this.getNextMidnight();
    }

    // Clean old requests (older than 1 second)
    this.requestHistory = this.requestHistory.filter(
      timestamp => now - timestamp < 1000
    );

    // Check per-second limit
    const recentRequests = this.requestHistory.length;
    const perSecondBlocked = recentRequests >= this.config.rateLimit.requestsPerSecond;

    // Check daily limit
    const dailyBlocked = this.dailyRequestCount >= this.config.rateLimit.requestsPerDay;

    return {
      remaining: Math.min(
        this.config.rateLimit.requestsPerSecond - recentRequests,
        this.config.rateLimit.requestsPerDay - this.dailyRequestCount
      ),
      resetTime: perSecondBlocked
        ? new Date(now + 1000)
        : this.dailyResetTime,
      blocked: perSecondBlocked || dailyBlocked,
    };
  }

  /**
   * Record a request for rate limiting
   */
  private recordRequest(): void {
    this.requestHistory.push(Date.now());
    this.dailyRequestCount++;
  }

  /**
   * Create error response
   */
  protected createErrorResponse(
    request: EnrichmentRequest,
    error: string,
    startTime: number
  ): EnrichmentResponse {
    const response: EnrichmentResponse = {
      success: false,
      provider: this.providerName,
      ioc: request.ioc,
      iocType: request.iocType,
      error,
      timestamp: new Date(),
      responseTime: Date.now() - startTime,
      cached: false,
    };

    this.emit('enrichmentError', { request, response });
    return response;
  }

  /**
   * Create timeout promise
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), ms);
    });
  }

  /**
   * Delay utility
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get next midnight for daily reset
   */
  private getNextMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Setup cleanup for old rate limit data
   */
  private setupRateLimitCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      this.requestHistory = this.requestHistory.filter(
        timestamp => now - timestamp < 1000
      );
    }, 5000); // Clean every 5 seconds
  }

  /**
   * Get provider statistics
   */
  getStatistics(): {
    name: string;
    enabled: boolean;
    rateLimit: RateLimitStatus;
    dailyRequests: number;
    dailyLimit: number;
  } {
    return {
      name: this.providerName,
      enabled: this.config.enabled,
      rateLimit: this.checkRateLimit(),
      dailyRequests: this.dailyRequestCount,
      dailyLimit: this.config.rateLimit.requestsPerDay,
    };
  }
}
