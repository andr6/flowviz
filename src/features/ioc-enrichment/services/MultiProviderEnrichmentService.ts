import { EventEmitter } from 'events';

import { logger } from '../../../shared/utils/logger';
import {
  IOC,
  EnrichmentProvider,
  EnrichmentResult,
  EnrichmentJob,
  EnrichmentConfig,
  ProviderConfig,
  IOCType,
} from '../types/EnrichmentTypes';

export interface MultiProviderEnrichmentOptions {
  providers?: EnrichmentProvider[];
  forceRefresh?: boolean;
  timeout?: number;
  includeRelationships?: boolean;
  includeTimeline?: boolean;
  maxConcurrency?: number;
}

export class MultiProviderEnrichmentService extends EventEmitter {
  private static instance: MultiProviderEnrichmentService;
  private config: EnrichmentConfig;
  private cache: Map<string, EnrichmentResult> = new Map();
  private rateLimiters: Map<EnrichmentProvider, { requests: number; resetTime: number }> = new Map();
  private jobs: Map<string, EnrichmentJob> = new Map();
  
  private constructor(config: EnrichmentConfig) {
    super();
    this.config = config;
    this.setupCacheCleanup();
    this.initializeRateLimiters();
  }

  static getInstance(config?: EnrichmentConfig): MultiProviderEnrichmentService {
    if (!MultiProviderEnrichmentService.instance) {
      if (!config) {
        throw new Error('Config required for first initialization');
      }
      MultiProviderEnrichmentService.instance = new MultiProviderEnrichmentService(config);
    }
    return MultiProviderEnrichmentService.instance;
  }

  /**
   * Enrich multiple IOCs across all configured providers
   */
  async enrichIOCsBulk(
    iocs: IOC[],
    options: MultiProviderEnrichmentOptions = {}
  ): Promise<string> {
    const jobId = this.generateJobId();
    const providers = options.providers || this.getEnabledProviders();
    
    const job: EnrichmentJob = {
      id: jobId,
      iocs: iocs.map(ioc => ioc.id),
      providers,
      priority: 'normal',
      createdAt: new Date(),
      status: 'queued',
      progress: {
        total: iocs.length * providers.length,
        completed: 0,
        failed: 0,
        skipped: 0,
      },
      results: [],
      errors: [],
      tags: ['multi-provider', 'bulk-enrichment'],
    };

    this.jobs.set(jobId, job);
    this.emit('jobCreated', job);

    // Process asynchronously
    this.processBulkEnrichment(job, iocs, providers, options);

    return jobId;
  }

  /**
   * Enrich a single IOC with all available providers
   */
  async enrichIOC(
    ioc: IOC,
    options: MultiProviderEnrichmentOptions = {}
  ): Promise<EnrichmentResult[]> {
    logger.info(`Enriching IOC ${ioc.id} (${ioc.type}: ${ioc.value})`);
    
    const providers = options.providers || this.getSupportedProviders(ioc.type);
    const maxConcurrency = options.maxConcurrency || 3;
    const results: EnrichmentResult[] = [];

    // Process providers in batches to respect rate limits
    const providerBatches = this.createBatches(providers, maxConcurrency);

    for (const batch of providerBatches) {
      const batchPromises = batch.map(provider => 
        this.enrichWithProvider(ioc, provider, options)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        const provider = batch[index];
        if (result.status === 'fulfilled' && result.value.success) {
          results.push(result.value);
          this.emit('providerSuccess', { ioc, provider, result: result.value });
        } else {
          const error = result.status === 'rejected' ? result.reason : result.value.error;
          logger.warn(`Provider ${provider} failed for IOC ${ioc.id}:`, error);
          this.emit('providerError', { ioc, provider, error });
        }
      });

      // Add delay between batches to respect rate limits
      if (providerBatches.indexOf(batch) < providerBatches.length - 1) {
        await this.delay(1000); // 1 second delay between batches
      }
    }

    this.emit('iocEnriched', { ioc, results });
    return results;
  }

  /**
   * Get enrichment results for an IOC
   */
  getIOCEnrichment(iocId: string): EnrichmentResult[] {
    return Array.from(this.cache.values()).filter(result => result.iocId === iocId);
  }

  /**
   * Get job status
   */
  getJob(jobId: string): EnrichmentJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Cancel a running job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {return false;}

    if (job.status === 'running' || job.status === 'queued') {
      job.status = 'cancelled';
      job.completedAt = new Date();
      this.emit('jobCancelled', job);
      return true;
    }
    
    return false;
  }

  /**
   * Private method to process bulk enrichment
   */
  private async processBulkEnrichment(
    job: EnrichmentJob,
    iocs: IOC[],
    providers: EnrichmentProvider[],
    options: MultiProviderEnrichmentOptions
  ): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date();
    this.emit('jobStarted', job);

    const maxConcurrency = options.maxConcurrency || 2;
    let processed = 0;

    try {
      // Process IOCs in batches
      const iocBatches = this.createBatches(iocs, maxConcurrency);

      for (const batch of iocBatches) {
        const batchPromises = batch.map(async ioc => {
          try {
            const results = await this.enrichIOC(ioc, { ...options, providers });
            job.results.push(...results);
            job.progress.completed += results.length;
            processed++;

            this.emit('jobProgress', {
              jobId: job.id,
              progress: job.progress,
              percentage: (processed / iocs.length) * 100,
            });

          } catch (error) {
            job.errors.push({
              iocId: ioc.id,
              provider: 'multi-provider',
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date(),
              retryable: this.isRetryableError(error),
              retryCount: 0,
            });
            job.progress.failed++;
          }
        });

        await Promise.allSettled(batchPromises);
        
        // Add delay between IOC batches
        if (iocBatches.indexOf(batch) < iocBatches.length - 1) {
          await this.delay(2000); // 2 second delay between IOC batches
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();
      this.emit('jobCompleted', job);

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.errors.push({
        iocId: 'bulk-job',
        provider: 'multi-provider',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        retryable: false,
        retryCount: 0,
      });
      this.emit('jobFailed', { job, error });
    }
  }

  /**
   * Enrich IOC with a specific provider
   */
  private async enrichWithProvider(
    ioc: IOC,
    provider: EnrichmentProvider,
    options: MultiProviderEnrichmentOptions
  ): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const cacheKey = `${ioc.id}:${provider}`;

    try {
      // Check cache first
      if (!options.forceRefresh && this.cache.has(cacheKey)) {
        const cachedResult = this.cache.get(cacheKey)!;
        if (this.isCacheValid(cachedResult)) {
          logger.debug(`Cache hit for ${ioc.id} from ${provider}`);
          return { ...cachedResult, cached: true };
        }
      }

      // Check rate limits
      if (!this.checkRateLimit(provider)) {
        throw new Error(`Rate limit exceeded for ${provider}`);
      }

      // Get provider configuration
      const providerConfig = this.config.providers[provider];
      if (!providerConfig || !providerConfig.enabled) {
        throw new Error(`Provider ${provider} is not enabled`);
      }

      // Update rate limiter
      this.updateRateLimit(provider);

      // Call provider API
      const enrichmentData = await this.callProviderAPI(ioc, provider, providerConfig, options);

      const result: EnrichmentResult = {
        iocId: ioc.id,
        provider,
        timestamp: new Date(),
        success: true,
        data: enrichmentData,
        cached: false,
        cacheTtl: this.config.caching.ttl,
      };

      // Cache the result
      this.cache.set(cacheKey, result);

      return result;

    } catch (error) {
      const result: EnrichmentResult = {
        iocId: ioc.id,
        provider,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          threatLevel: 'unknown',
          confidence: 'low',
          score: 0,
          reputation: { malicious: 0, suspicious: 0, harmless: 0, undetected: 0 },
          attributes: {},
          relationships: [],
          timeline: [],
          detections: [],
        },
        cached: false,
      };

      return result;
    }
  }

  /**
   * Call provider-specific API with proper error handling and retries
   */
  private async callProviderAPI(
    ioc: IOC,
    provider: EnrichmentProvider,
    config: ProviderConfig,
    options: MultiProviderEnrichmentOptions
  ): Promise<any> {
    const maxRetries = config.retries || 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Calling ${provider} API for ${ioc.value} (attempt ${attempt})`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);

        try {
          const result = await this.makeProviderRequest(ioc, provider, config, {
            ...options,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          return result;

        } finally {
          clearTimeout(timeoutId);
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries && this.isRetryableError(error)) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff
          logger.debug(`Retrying ${provider} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await this.delay(delay);
        } else {
          break;
        }
      }
    }

    throw lastError!;
  }

  /**
   * Make actual HTTP request to provider
   */
  private async makeProviderRequest(
    ioc: IOC,
    provider: EnrichmentProvider,
    config: ProviderConfig,
    options: any
  ): Promise<any> {
    switch (provider) {
      case 'virustotal':
        return this.callVirusTotalAPI(ioc, config, options);
      case 'shodan':
        return this.callShodanAPI(ioc, config, options);
      case 'abuseipdb':
        return this.callAbuseIPDBAPI(ioc, config, options);
      case 'urlvoid':
        return this.callURLVoidAPI(ioc, config, options);
      case 'greynoise':
        return this.callGreyNoiseAPI(ioc, config, options);
      case 'censys':
        return this.callCensysAPI(ioc, config, options);
      case 'passivetotal':
        return this.callPassiveTotalAPI(ioc, config, options);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Provider-specific API implementations (mock implementations for now)
   */
  private async callVirusTotalAPI(ioc: IOC, config: ProviderConfig, options: any): Promise<any> {
    // This would be replaced with actual VirusTotal API calls
    await this.delay(500); // Simulate API latency
    
    return {
      threatLevel: 'suspicious',
      confidence: 'medium',
      score: Math.floor(Math.random() * 50) + 40, // 40-90
      reputation: {
        malicious: Math.floor(Math.random() * 20),
        suspicious: Math.floor(Math.random() * 10),
        harmless: Math.floor(Math.random() * 40) + 30,
        undetected: Math.floor(Math.random() * 20),
      },
      attributes: {
        engines: 70,
        detections: Math.floor(Math.random() * 15),
        scanDate: new Date().toISOString(),
      },
      relationships: [],
      timeline: [],
      detections: [],
    };
  }

  private async callShodanAPI(ioc: IOC, config: ProviderConfig, options: any): Promise<any> {
    if (ioc.type !== 'ip_address') {
      throw new Error('Shodan only supports IP addresses');
    }

    await this.delay(300);
    
    return {
      threatLevel: 'benign',
      confidence: 'high',
      score: Math.floor(Math.random() * 30) + 10, // 10-40
      reputation: {
        malicious: 0,
        suspicious: Math.floor(Math.random() * 5),
        harmless: Math.floor(Math.random() * 20) + 70,
        undetected: Math.floor(Math.random() * 10),
      },
      attributes: {
        country: 'US',
        org: 'Example Corp',
        ports: [80, 443, 22],
        vulns: [],
      },
      geolocation: {
        country: 'United States',
        countryCode: 'US',
        region: 'California',
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        asn: 'AS15169',
        org: 'Google LLC',
        isp: 'Google LLC',
      },
      relationships: [],
      timeline: [],
      detections: [],
    };
  }

  private async callAbuseIPDBAPI(ioc: IOC, config: ProviderConfig, options: any): Promise<any> {
    if (ioc.type !== 'ip_address') {
      throw new Error('AbuseIPDB only supports IP addresses');
    }

    await this.delay(400);
    
    const abuseScore = Math.floor(Math.random() * 100);
    
    return {
      threatLevel: abuseScore > 75 ? 'malicious' : abuseScore > 25 ? 'suspicious' : 'benign',
      confidence: abuseScore > 50 ? 'high' : 'medium',
      score: abuseScore,
      reputation: {
        malicious: abuseScore,
        suspicious: Math.max(0, 100 - abuseScore),
        harmless: 0,
        undetected: 0,
      },
      attributes: {
        abuseConfidence: abuseScore,
        countryCode: 'US',
        usageType: 'hosting',
        isp: 'Example ISP',
        totalReports: Math.floor(Math.random() * 50),
      },
      relationships: [],
      timeline: [],
      detections: [],
    };
  }

  private async callURLVoidAPI(ioc: IOC, config: ProviderConfig, options: any): Promise<any> {
    if (!['domain', 'url'].includes(ioc.type)) {
      throw new Error('URLVoid only supports domains and URLs');
    }

    await this.delay(600);
    
    const detectionCount = Math.floor(Math.random() * 15);
    
    return {
      threatLevel: detectionCount > 10 ? 'malicious' : detectionCount > 3 ? 'suspicious' : 'benign',
      confidence: 'medium',
      score: Math.min(100, detectionCount * 6),
      reputation: {
        malicious: detectionCount,
        suspicious: Math.floor(Math.random() * 5),
        harmless: 30 - detectionCount,
        undetected: Math.floor(Math.random() * 10),
      },
      attributes: {
        engines: 30,
        detections: detectionCount,
        scanDate: new Date().toISOString(),
      },
      relationships: [],
      timeline: [],
      detections: [],
    };
  }

  private async callGreyNoiseAPI(ioc: IOC, config: ProviderConfig, options: any): Promise<any> {
    if (ioc.type !== 'ip_address') {
      throw new Error('GreyNoise only supports IP addresses');
    }

    await this.delay(250);
    
    const isNoise = Math.random() > 0.3;
    
    return {
      threatLevel: isNoise ? 'benign' : 'unknown',
      confidence: isNoise ? 'high' : 'low',
      score: isNoise ? 10 : 0,
      reputation: {
        malicious: 0,
        suspicious: 0,
        harmless: isNoise ? 100 : 0,
        undetected: isNoise ? 0 : 100,
      },
      attributes: {
        classification: isNoise ? 'benign' : 'unknown',
        noise: isNoise,
        riot: Math.random() > 0.8,
        firstSeen: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        lastSeen: new Date().toISOString(),
      },
      relationships: [],
      timeline: [],
      detections: [],
    };
  }

  private async callCensysAPI(ioc: IOC, config: ProviderConfig, options: any): Promise<any> {
    if (ioc.type !== 'ip_address') {
      throw new Error('Censys only supports IP addresses');
    }

    await this.delay(450);
    
    return {
      threatLevel: 'benign',
      confidence: 'medium',
      score: Math.floor(Math.random() * 25) + 5, // 5-30
      reputation: {
        malicious: 0,
        suspicious: Math.floor(Math.random() * 5),
        harmless: Math.floor(Math.random() * 20) + 70,
        undetected: Math.floor(Math.random() * 15),
      },
      attributes: {
        protocols: ['http', 'https'],
        services: ['nginx'],
        location: {
          country: 'US',
          city: 'New York',
          coordinates: [40.7128, -74.0060],
        },
      },
      relationships: [],
      timeline: [],
      detections: [],
    };
  }

  private async callPassiveTotalAPI(ioc: IOC, config: ProviderConfig, options: any): Promise<any> {
    if (!['domain', 'ip_address'].includes(ioc.type)) {
      throw new Error('PassiveTotal supports domains and IP addresses');
    }

    await this.delay(550);
    
    return {
      threatLevel: 'unknown',
      confidence: 'medium',
      score: Math.floor(Math.random() * 40) + 10, // 10-50
      reputation: {
        malicious: Math.floor(Math.random() * 10),
        suspicious: Math.floor(Math.random() * 15),
        harmless: Math.floor(Math.random() * 30) + 50,
        undetected: Math.floor(Math.random() * 20),
      },
      attributes: {
        firstSeen: new Date(Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000).toISOString(),
        lastSeen: new Date().toISOString(),
        sinkholed: Math.random() > 0.9,
      },
      relationships: [],
      timeline: [],
      detections: [],
    };
  }

  /**
   * Utility methods
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getSupportedProviders(iocType: IOCType): EnrichmentProvider[] {
    const providers: EnrichmentProvider[] = [];
    
    Object.entries(this.config.providers).forEach(([providerName, config]) => {
      if (config?.enabled && config.supportedTypes.includes(iocType)) {
        providers.push(providerName as EnrichmentProvider);
      }
    });
    
    return providers.sort((a, b) => {
      const priorityA = this.config.providers[a]?.priority || 5;
      const priorityB = this.config.providers[b]?.priority || 5;
      return priorityB - priorityA;
    });
  }

  private getEnabledProviders(): EnrichmentProvider[] {
    return Object.entries(this.config.providers)
      .filter(([_, config]) => config?.enabled)
      .map(([name, _]) => name as EnrichmentProvider)
      .sort((a, b) => {
        const priorityA = this.config.providers[a]?.priority || 5;
        const priorityB = this.config.providers[b]?.priority || 5;
        return priorityB - priorityA;
      });
  }

  private generateJobId(): string {
    return `mp-enrichment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkRateLimit(provider: EnrichmentProvider): boolean {
    const limits = this.config.rateLimiting[provider];
    if (!limits) {return true;}
    
    const limiter = this.rateLimiters.get(provider);
    if (!limiter) {return true;}
    
    const now = Date.now();
    if (now > limiter.resetTime) {
      this.rateLimiters.set(provider, { requests: 0, resetTime: now + 60000 });
      return true;
    }
    
    return limiter.requests < limits.requestsPerMinute;
  }

  private updateRateLimit(provider: EnrichmentProvider): void {
    const limiter = this.rateLimiters.get(provider) || { 
      requests: 0, 
      resetTime: Date.now() + 60000 
    };
    limiter.requests++;
    this.rateLimiters.set(provider, limiter);
  }

  private isCacheValid(result: EnrichmentResult): boolean {
    if (!result.cacheTtl) {return false;}
    const age = Date.now() - result.timestamp.getTime();
    return age < (result.cacheTtl * 1000);
  }

  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'timeout',
      'rate limit',
      'network error',
      'econnreset',
      '429',
      '503',
      '502',
      '504',
    ];
    
    const errorMessage = error?.message?.toLowerCase() || '';
    return retryableErrors.some(retryable => errorMessage.includes(retryable));
  }

  private setupCacheCleanup(): void {
    const cleanupInterval = this.config.caching.cleanupInterval * 1000;
    
    setInterval(() => {
      let cleanedCount = 0;
      for (const [key, result] of this.cache.entries()) {
        if (!this.isCacheValid(result)) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }
      
      // Also enforce max cache size
      if (this.cache.size > this.config.caching.maxSize) {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
        
        const entriesToRemove = this.cache.size - this.config.caching.maxSize;
        for (let i = 0; i < entriesToRemove; i++) {
          this.cache.delete(entries[i][0]);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.debug(`Cache cleanup: removed ${cleanedCount} entries`);
      }
    }, cleanupInterval);
  }

  private initializeRateLimiters(): void {
    Object.keys(this.config.providers).forEach(provider => {
      this.rateLimiters.set(provider as EnrichmentProvider, {
        requests: 0,
        resetTime: Date.now() + 60000,
      });
    });
  }

  /**
   * Public API methods
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      activeJobs: Array.from(this.jobs.values()).filter(job => 
        job.status === 'running' || job.status === 'queued'
      ).length,
      completedJobs: Array.from(this.jobs.values()).filter(job => 
        job.status === 'completed'
      ).length,
      rateLimits: Object.fromEntries(this.rateLimiters.entries()),
    };
  }

  updateConfig(newConfig: Partial<EnrichmentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Multi-provider enrichment configuration updated');
    this.emit('configUpdated', this.config);
  }

  getConfig(): EnrichmentConfig {
    return { ...this.config };
  }

  shutdown(): void {
    this.removeAllListeners();
    this.cache.clear();
    this.jobs.clear();
    this.rateLimiters.clear();
    logger.info('Multi-provider enrichment service shut down');
  }
}

// Default configuration for multi-provider enrichment
const defaultMultiProviderConfig: EnrichmentConfig = {
  providers: {
    virustotal: {
      enabled: !!process.env.VIRUSTOTAL_API_KEY,
      apiKey: process.env.VIRUSTOTAL_API_KEY || '',
      baseUrl: 'https://www.virustotal.com/vtapi/v2',
      timeout: 30000,
      retries: 3,
      priority: 9,
      supportedTypes: ['ip_address', 'domain', 'url', 'file_hash'],
    },
    shodan: {
      enabled: !!process.env.SHODAN_API_KEY,
      apiKey: process.env.SHODAN_API_KEY || '',
      baseUrl: 'https://api.shodan.io',
      timeout: 30000,
      retries: 3,
      priority: 8,
      supportedTypes: ['ip_address'],
    },
    abuseipdb: {
      enabled: !!process.env.ABUSEIPDB_API_KEY,
      apiKey: process.env.ABUSEIPDB_API_KEY || '',
      baseUrl: 'https://api.abuseipdb.com/api/v2',
      timeout: 30000,
      retries: 3,
      priority: 7,
      supportedTypes: ['ip_address'],
    },
    urlvoid: {
      enabled: !!process.env.URLVOID_API_KEY,
      apiKey: process.env.URLVOID_API_KEY || '',
      baseUrl: 'https://api.urlvoid.com/v1',
      timeout: 30000,
      retries: 3,
      priority: 6,
      supportedTypes: ['domain', 'url'],
    },
    greynoise: {
      enabled: !!process.env.GREYNOISE_API_KEY,
      apiKey: process.env.GREYNOISE_API_KEY || '',
      baseUrl: 'https://api.greynoise.io/v3',
      timeout: 30000,
      retries: 3,
      priority: 5,
      supportedTypes: ['ip_address'],
    },
    censys: {
      enabled: !!(process.env.CENSYS_API_ID && process.env.CENSYS_API_SECRET),
      apiKey: `${process.env.CENSYS_API_ID}:${process.env.CENSYS_API_SECRET}`,
      baseUrl: 'https://search.censys.io/api/v2',
      timeout: 30000,
      retries: 3,
      priority: 4,
      supportedTypes: ['ip_address'],
    },
    passivetotal: {
      enabled: !!process.env.PASSIVETOTAL_API_KEY,
      apiKey: process.env.PASSIVETOTAL_API_KEY || '',
      baseUrl: 'https://api.riskiq.net/pt/v2',
      timeout: 30000,
      retries: 3,
      priority: 3,
      supportedTypes: ['ip_address', 'domain'],
    },
  },
  caching: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 10000,
    cleanupInterval: 1800, // 30 minutes
  },
  rateLimiting: {
    virustotal: {
      requestsPerMinute: 4,
      requestsPerDay: 1000,
      backoffMultiplier: 2,
    },
    shodan: {
      requestsPerMinute: 10,
      requestsPerDay: 1000,
      backoffMultiplier: 2,
    },
    abuseipdb: {
      requestsPerMinute: 1000,
      requestsPerDay: 3000,
      backoffMultiplier: 2,
    },
    urlvoid: {
      requestsPerMinute: 10,
      requestsPerDay: 1000,
      backoffMultiplier: 2,
    },
    greynoise: {
      requestsPerMinute: 50,
      requestsPerDay: 10000,
      backoffMultiplier: 2,
    },
    censys: {
      requestsPerMinute: 50,
      requestsPerDay: 1000,
      backoffMultiplier: 2,
    },
    passivetotal: {
      requestsPerMinute: 60,
      requestsPerDay: 2000,
      backoffMultiplier: 2,
    },
  },
  scoring: {
    weights: {
      reputation: 0.4,
      detections: 0.3,
      relationships: 0.1,
      timeline: 0.1,
      sandbox: 0.1,
    },
    thresholds: {
      suspicious: 40,
      malicious: 70,
      critical: 90,
    },
  },
};

// Export singleton instance
export const multiProviderEnrichmentService = MultiProviderEnrichmentService.getInstance(
  defaultMultiProviderConfig
);