/**
 * Enrichment Orchestrator
 *
 * Coordinates multiple threat intelligence providers to enrich IOCs
 * with aggregated, consensus-based results
 */

import { EventEmitter } from 'events';
import { logger } from '../../../shared/utils/logger';
import { getProviderFactory, ProviderName } from '../providers/ProviderFactory';
import { BaseProvider, EnrichmentRequest, EnrichmentResponse } from '../providers/BaseProvider';
import { AggregationEngine, AggregatedIOC, AggregationConfig } from '../aggregation/AggregationEngine';
import { EnrichmentCache } from '../cache/EnrichmentCache';

export interface OrchestrationConfig {
  // Concurrency control
  maxConcurrentProviders: number;

  // Timeout for entire enrichment operation (all providers)
  totalTimeout: number;

  // Whether to continue if some providers fail
  continueOnError: boolean;

  // Minimum number of successful providers required
  minSuccessfulProviders: number;

  // Cache configuration
  cacheEnabled: boolean;
  cacheTTL: number; // seconds

  // Aggregation configuration
  aggregation: Partial<AggregationConfig>;

  // Provider selection strategy
  providerStrategy: 'all' | 'recommended' | 'custom';
  customProviders?: ProviderName[];
}

const DEFAULT_CONFIG: OrchestrationConfig = {
  maxConcurrentProviders: 4,
  totalTimeout: 60000, // 60 seconds
  continueOnError: true,
  minSuccessfulProviders: 1,
  cacheEnabled: true,
  cacheTTL: 3600, // 1 hour
  aggregation: {},
  providerStrategy: 'all',
};

export interface EnrichmentStats {
  totalProviders: number;
  successfulProviders: number;
  failedProviders: number;
  cachedResult: boolean;
  processingTime: number;
  timestamp: Date;
}

export class EnrichmentOrchestrator extends EventEmitter {
  private config: OrchestrationConfig;
  private aggregationEngine: AggregationEngine;
  private cache: EnrichmentCache;

  constructor(config?: Partial<OrchestrationConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aggregationEngine = new AggregationEngine(this.config.aggregation);
    this.cache = new EnrichmentCache({
      enabled: this.config.cacheEnabled,
      ttl: this.config.cacheTTL,
    });

    this.setupEventListeners();
  }

  /**
   * Enrich an IOC with data from multiple threat intelligence providers
   */
  async enrich(ioc: string, iocType: string): Promise<{
    result: AggregatedIOC;
    stats: EnrichmentStats;
  }> {
    const startTime = Date.now();

    logger.info(`Starting enrichment for ${iocType}: ${ioc}`);
    this.emit('enrichmentStarted', { ioc, iocType });

    try {
      // Check cache first
      if (this.config.cacheEnabled) {
        const cached = await this.cache.get(ioc, iocType);
        if (cached) {
          logger.info(`Cache hit for ${iocType}: ${ioc}`);
          this.emit('cacheHit', { ioc, iocType });

          return {
            result: cached,
            stats: {
              totalProviders: cached.providerResults.length,
              successfulProviders: cached.providerResults.length,
              failedProviders: 0,
              cachedResult: true,
              processingTime: Date.now() - startTime,
              timestamp: new Date(),
            },
          };
        }

        logger.debug(`Cache miss for ${iocType}: ${ioc}`);
        this.emit('cacheMiss', { ioc, iocType });
      }

      // Get providers based on strategy
      const providers = this.selectProviders(iocType);

      if (providers.length === 0) {
        throw new Error(`No providers available for IOC type: ${iocType}`);
      }

      logger.info(`Selected ${providers.length} providers for enrichment`);

      // Execute enrichment with concurrency control
      const results = await this.executeEnrichment(ioc, iocType, providers);

      // Filter successful results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      logger.info(
        `Enrichment complete: ${successful.length} succeeded, ${failed.length} failed`
      );

      // Check minimum success threshold
      if (successful.length < this.config.minSuccessfulProviders) {
        throw new Error(
          `Insufficient successful providers: ${successful.length} < ${this.config.minSuccessfulProviders}`
        );
      }

      // Aggregate results
      const aggregated = await this.aggregationEngine.aggregate(
        ioc,
        iocType,
        results
      );

      // Cache the result
      if (this.config.cacheEnabled) {
        await this.cache.set(ioc, iocType, aggregated);
      }

      const stats: EnrichmentStats = {
        totalProviders: providers.length,
        successfulProviders: successful.length,
        failedProviders: failed.length,
        cachedResult: false,
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
      };

      this.emit('enrichmentComplete', { ioc, iocType, result: aggregated, stats });
      logger.info(
        `Enrichment finished in ${stats.processingTime}ms: ` +
        `${aggregated.consensus.reputation.verdict} ` +
        `(confidence: ${aggregated.consensus.reputation.confidence.toFixed(2)})`
      );

      return { result: aggregated, stats };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Enrichment failed for ${iocType}: ${ioc}`, errorMsg);
      this.emit('enrichmentError', { ioc, iocType, error: errorMsg });
      throw error;
    }
  }

  /**
   * Enrich multiple IOCs in batch
   */
  async enrichBatch(
    iocs: Array<{ ioc: string; iocType: string }>
  ): Promise<Array<{
    ioc: string;
    iocType: string;
    result?: AggregatedIOC;
    stats?: EnrichmentStats;
    error?: string;
  }>> {
    logger.info(`Starting batch enrichment for ${iocs.length} IOCs`);

    const results = await Promise.allSettled(
      iocs.map(({ ioc, iocType }) => this.enrich(ioc, iocType))
    );

    return results.map((result, index) => {
      const { ioc, iocType } = iocs[index];

      if (result.status === 'fulfilled') {
        return {
          ioc,
          iocType,
          result: result.value.result,
          stats: result.value.stats,
        };
      } else {
        return {
          ioc,
          iocType,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });
  }

  /**
   * Select providers based on strategy
   */
  private selectProviders(iocType: string): BaseProvider[] {
    const factory = getProviderFactory();

    switch (this.config.providerStrategy) {
      case 'all':
        return factory.getProvidersForIOCType(iocType);

      case 'recommended':
        const recommendations = factory.getRecommendedProviders(iocType);
        return recommendations
          .map(rec => factory.getProvider(rec.provider))
          .filter((p): p is BaseProvider => p !== undefined);

      case 'custom':
        if (!this.config.customProviders) {
          throw new Error('Custom providers list not specified');
        }
        return this.config.customProviders
          .map(name => factory.getProvider(name))
          .filter((p): p is BaseProvider => p !== undefined)
          .filter(p => p.supportsIOCType(iocType));

      default:
        return factory.getProvidersForIOCType(iocType);
    }
  }

  /**
   * Execute enrichment with concurrency control
   */
  private async executeEnrichment(
    ioc: string,
    iocType: string,
    providers: BaseProvider[]
  ): Promise<EnrichmentResponse[]> {
    const request: EnrichmentRequest = { ioc, iocType };
    const results: EnrichmentResponse[] = [];

    // Create batches for concurrency control
    const batches: BaseProvider[][] = [];
    for (let i = 0; i < providers.length; i += this.config.maxConcurrentProviders) {
      batches.push(providers.slice(i, i + this.config.maxConcurrentProviders));
    }

    // Execute batches sequentially, providers within batch in parallel
    for (const batch of batches) {
      const batchPromises = batch.map(provider =>
        this.enrichWithProvider(provider, request)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Create error response
          const provider = batch[index];
          results.push({
            success: false,
            provider: this.getProviderName(provider),
            ioc: request.ioc,
            iocType: request.iocType,
            error: result.reason?.message || 'Unknown error',
            timestamp: new Date(),
            responseTime: 0,
            cached: false,
          });
        }
      });
    }

    return results;
  }

  /**
   * Enrich with a single provider with timeout
   */
  private async enrichWithProvider(
    provider: BaseProvider,
    request: EnrichmentRequest
  ): Promise<EnrichmentResponse> {
    const timeout = new Promise<EnrichmentResponse>((_, reject) => {
      setTimeout(() => reject(new Error('Provider timeout')), this.config.totalTimeout);
    });

    return Promise.race([
      provider.enrich(request),
      timeout,
    ]);
  }

  /**
   * Get provider name from instance
   */
  private getProviderName(provider: BaseProvider): string {
    const factory = getProviderFactory();
    const allProviders = factory.getAllProviders();
    const index = allProviders.indexOf(provider);

    if (index !== -1) {
      const names: ProviderName[] = ['VirusTotal', 'AbuseIPDB', 'Shodan', 'AlienVault OTX'];
      return names[index] || 'Unknown';
    }

    return 'Unknown';
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.aggregationEngine.on('aggregationComplete', (data) => {
      this.emit('aggregationComplete', data);
    });

    const factory = getProviderFactory();

    factory.on('providerSuccess', (data) => {
      logger.debug(`Provider ${data.provider} succeeded for ${data.request.ioc}`);
    });

    factory.on('providerError', (data) => {
      logger.warn(`Provider ${data.provider} failed: ${data.response.error}`);

      if (!this.config.continueOnError) {
        this.emit('providerError', data);
      }
    });
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
    logger.info('Enrichment cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    return this.cache.getStats();
  }

  /**
   * Update orchestration configuration
   */
  updateConfig(config: Partial<OrchestrationConfig>): void {
    this.config = { ...this.config, ...config };

    // Update dependent configs
    if (config.aggregation) {
      this.aggregationEngine.updateConfig(config.aggregation);
    }

    if (config.cacheEnabled !== undefined || config.cacheTTL !== undefined) {
      this.cache.updateConfig({
        enabled: config.cacheEnabled ?? this.config.cacheEnabled,
        ttl: config.cacheTTL ?? this.config.cacheTTL,
      });
    }

    logger.info('Orchestration config updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): OrchestrationConfig {
    return { ...this.config };
  }

  /**
   * Test connectivity to all providers
   */
  async testProviders(): Promise<Record<ProviderName, boolean>> {
    const factory = getProviderFactory();
    return await factory.testAllConnections();
  }

  /**
   * Get statistics from all providers
   */
  getProviderStats(): Record<ProviderName, any> {
    const factory = getProviderFactory();
    return factory.getStatistics();
  }
}

/**
 * Singleton instance for convenience
 */
let orchestratorInstance: EnrichmentOrchestrator | null = null;

/**
 * Get or create orchestrator instance
 */
export function getEnrichmentOrchestrator(
  config?: Partial<OrchestrationConfig>
): EnrichmentOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new EnrichmentOrchestrator(config);
  }
  return orchestratorInstance;
}

/**
 * Reset orchestrator instance (useful for testing)
 */
export function resetEnrichmentOrchestrator(): void {
  orchestratorInstance = null;
}
