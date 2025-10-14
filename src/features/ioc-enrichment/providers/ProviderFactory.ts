/**
 * Provider Factory and Registry
 *
 * Centralized management for all IOC enrichment providers
 */

import { EventEmitter } from 'events';
import { logger } from '../../../shared/utils/logger';
import { BaseProvider, ProviderConfig } from './BaseProvider';
import { VirusTotalProvider, VirusTotalConfig } from './VirusTotalProvider';
import { AbuseIPDBProvider, AbuseIPDBConfig } from './AbuseIPDBProvider';
import { ShodanProvider, ShodanConfig } from './ShodanProvider';
import { AlienVaultOTXProvider, AlienVaultOTXConfig } from './AlienVaultOTXProvider';

export type ProviderName = 'VirusTotal' | 'AbuseIPDB' | 'Shodan' | 'AlienVault OTX';

export interface ProviderRegistryConfig {
  providers: {
    virusTotal?: VirusTotalConfig;
    abuseIPDB?: AbuseIPDBConfig;
    shodan?: ShodanConfig;
    alienVaultOTX?: AlienVaultOTXConfig;
  };
}

export interface ProviderInfo {
  name: ProviderName;
  enabled: boolean;
  supportsIOCTypes: string[];
  rateLimit: {
    requestsPerSecond: number;
    requestsPerDay: number;
    remaining: number;
  };
  statistics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
  };
}

/**
 * Provider Factory - Creates and manages provider instances
 */
export class ProviderFactory extends EventEmitter {
  private static instance: ProviderFactory;
  private providers: Map<ProviderName, BaseProvider> = new Map();
  private statistics: Map<ProviderName, {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalResponseTime: number;
  }> = new Map();

  private constructor() {
    super();
    this.initializeStatistics();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory();
    }
    return ProviderFactory.instance;
  }

  /**
   * Initialize all providers from configuration
   */
  initializeProviders(config: ProviderRegistryConfig): void {
    logger.info('Initializing IOC enrichment providers...');

    // Initialize VirusTotal
    if (config.providers.virusTotal?.apiKey) {
      try {
        const vtProvider = new VirusTotalProvider(config.providers.virusTotal);
        this.registerProvider('VirusTotal', vtProvider);
        logger.info('✓ VirusTotal provider initialized');
      } catch (error) {
        logger.error('✗ Failed to initialize VirusTotal provider:', error);
      }
    }

    // Initialize AbuseIPDB
    if (config.providers.abuseIPDB?.apiKey) {
      try {
        const aipdbProvider = new AbuseIPDBProvider(config.providers.abuseIPDB);
        this.registerProvider('AbuseIPDB', aipdbProvider);
        logger.info('✓ AbuseIPDB provider initialized');
      } catch (error) {
        logger.error('✗ Failed to initialize AbuseIPDB provider:', error);
      }
    }

    // Initialize Shodan
    if (config.providers.shodan?.apiKey) {
      try {
        const shodanProvider = new ShodanProvider(config.providers.shodan);
        this.registerProvider('Shodan', shodanProvider);
        logger.info('✓ Shodan provider initialized');
      } catch (error) {
        logger.error('✗ Failed to initialize Shodan provider:', error);
      }
    }

    // Initialize AlienVault OTX
    if (config.providers.alienVaultOTX?.apiKey) {
      try {
        const otxProvider = new AlienVaultOTXProvider(config.providers.alienVaultOTX);
        this.registerProvider('AlienVault OTX', otxProvider);
        logger.info('✓ AlienVault OTX provider initialized');
      } catch (error) {
        logger.error('✗ Failed to initialize AlienVault OTX provider:', error);
      }
    }

    logger.info(`Initialized ${this.providers.size} IOC enrichment providers`);
    this.emit('providersInitialized', {
      total: this.providers.size,
      providers: Array.from(this.providers.keys()),
    });
  }

  /**
   * Register a provider
   */
  private registerProvider(name: ProviderName, provider: BaseProvider): void {
    // Setup event listeners
    provider.on('enrichmentSuccess', (data) => {
      this.recordSuccess(name, data.response.responseTime);
      this.emit('providerSuccess', { provider: name, ...data });
    });

    provider.on('enrichmentError', (data) => {
      this.recordFailure(name);
      this.emit('providerError', { provider: name, ...data });
    });

    this.providers.set(name, provider);
  }

  /**
   * Get provider by name
   */
  getProvider(name: ProviderName): BaseProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all providers
   */
  getAllProviders(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers that support a specific IOC type
   */
  getProvidersForIOCType(iocType: string): BaseProvider[] {
    return this.getAllProviders().filter(provider =>
      provider.supportsIOCType(iocType)
    );
  }

  /**
   * Get provider information
   */
  getProviderInfo(name: ProviderName): ProviderInfo | null {
    const provider = this.providers.get(name);
    if (!provider) return null;

    const stats = this.statistics.get(name)!;
    const providerStats = provider.getStatistics();

    // Determine supported IOC types
    const allIOCTypes = ['ip', 'domain', 'url', 'hash', 'email', 'cve'];
    const supportedTypes = allIOCTypes.filter(type =>
      provider.supportsIOCType(type)
    );

    return {
      name,
      enabled: providerStats.enabled,
      supportsIOCTypes: supportedTypes,
      rateLimit: {
        requestsPerSecond: providerStats.rateLimit.remaining,
        requestsPerDay: providerStats.dailyLimit,
        remaining: providerStats.rateLimit.remaining,
      },
      statistics: {
        totalRequests: stats.totalRequests,
        successfulRequests: stats.successfulRequests,
        failedRequests: stats.failedRequests,
        avgResponseTime: stats.totalRequests > 0
          ? stats.totalResponseTime / stats.totalRequests
          : 0,
      },
    };
  }

  /**
   * Get all provider information
   */
  getAllProviderInfo(): ProviderInfo[] {
    return Array.from(this.providers.keys())
      .map(name => this.getProviderInfo(name))
      .filter((info): info is ProviderInfo => info !== null);
  }

  /**
   * Test all provider connections
   */
  async testAllConnections(): Promise<Record<ProviderName, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers.entries()) {
      try {
        const connected = await provider.testConnection();
        results[name] = connected;
        logger.info(`${name} connection test: ${connected ? 'OK' : 'FAILED'}`);
      } catch (error) {
        results[name] = false;
        logger.error(`${name} connection test failed:`, error);
      }
    }

    return results as Record<ProviderName, boolean>;
  }

  /**
   * Get statistics for all providers
   */
  getStatistics(): Record<ProviderName, any> {
    const stats: Record<string, any> = {};

    for (const [name, data] of this.statistics.entries()) {
      stats[name] = {
        ...data,
        avgResponseTime: data.totalRequests > 0
          ? data.totalResponseTime / data.totalRequests
          : 0,
        successRate: data.totalRequests > 0
          ? data.successfulRequests / data.totalRequests
          : 0,
      };
    }

    return stats as Record<ProviderName, any>;
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.initializeStatistics();
    logger.info('Provider statistics reset');
  }

  /**
   * Initialize statistics tracking
   */
  private initializeStatistics(): void {
    const providerNames: ProviderName[] = [
      'VirusTotal',
      'AbuseIPDB',
      'Shodan',
      'AlienVault OTX',
    ];

    providerNames.forEach(name => {
      this.statistics.set(name, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalResponseTime: 0,
      });
    });
  }

  /**
   * Record successful enrichment
   */
  private recordSuccess(name: ProviderName, responseTime: number): void {
    const stats = this.statistics.get(name);
    if (stats) {
      stats.totalRequests++;
      stats.successfulRequests++;
      stats.totalResponseTime += responseTime;
    }
  }

  /**
   * Record failed enrichment
   */
  private recordFailure(name: ProviderName): void {
    const stats = this.statistics.get(name);
    if (stats) {
      stats.totalRequests++;
      stats.failedRequests++;
    }
  }

  /**
   * Get enrichment recommendations for an IOC type
   */
  getRecommendedProviders(iocType: string): {
    provider: ProviderName;
    reason: string;
  }[] {
    const recommendations: { provider: ProviderName; reason: string }[] = [];
    const supportedProviders = this.getProvidersForIOCType(iocType);

    supportedProviders.forEach(provider => {
      const name = Array.from(this.providers.entries())
        .find(([_, p]) => p === provider)?.[0];

      if (!name) return;

      const info = this.getProviderInfo(name);
      if (!info || !info.enabled) return;

      let reason = `Supports ${iocType}`;

      // Add specific recommendations
      if (name === 'VirusTotal' && ['hash', 'url'].includes(iocType)) {
        reason = 'Best for malware and URL analysis';
      } else if (name === 'AbuseIPDB' && iocType === 'ip') {
        reason = 'Specialized in IP abuse tracking';
      } else if (name === 'Shodan' && iocType === 'ip') {
        reason = 'Detailed network and vulnerability data';
      } else if (name === 'AlienVault OTX') {
        reason = 'Comprehensive threat intelligence from community';
      }

      recommendations.push({ provider: name, reason });
    });

    return recommendations;
  }
}

/**
 * Convenience function to get provider factory instance
 */
export function getProviderFactory(): ProviderFactory {
  return ProviderFactory.getInstance();
}

/**
 * Convenience function to initialize providers from environment variables
 */
export function initializeProvidersFromEnv(): void {
  const config: ProviderRegistryConfig = {
    providers: {},
  };

  // VirusTotal
  if (process.env.VIRUSTOTAL_API_KEY) {
    config.providers.virusTotal = {
      apiKey: process.env.VIRUSTOTAL_API_KEY,
      enabled: true,
      rateLimit: {
        requestsPerSecond: parseInt(process.env.VIRUSTOTAL_RATE_LIMIT_PER_SEC || '4'),
        requestsPerDay: parseInt(process.env.VIRUSTOTAL_RATE_LIMIT_PER_DAY || '500'),
      },
      timeout: parseInt(process.env.VIRUSTOTAL_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.VIRUSTOTAL_RETRY || '2'),
      cacheEnabled: process.env.VIRUSTOTAL_CACHE_ENABLED !== 'false',
      cacheTTL: parseInt(process.env.VIRUSTOTAL_CACHE_TTL || '3600'),
    };
  }

  // AbuseIPDB
  if (process.env.ABUSEIPDB_API_KEY) {
    config.providers.abuseIPDB = {
      apiKey: process.env.ABUSEIPDB_API_KEY,
      enabled: true,
      rateLimit: {
        requestsPerSecond: parseInt(process.env.ABUSEIPDB_RATE_LIMIT_PER_SEC || '1'),
        requestsPerDay: parseInt(process.env.ABUSEIPDB_RATE_LIMIT_PER_DAY || '1000'),
      },
      timeout: parseInt(process.env.ABUSEIPDB_TIMEOUT || '20000'),
      retryAttempts: parseInt(process.env.ABUSEIPDB_RETRY || '2'),
      cacheEnabled: process.env.ABUSEIPDB_CACHE_ENABLED !== 'false',
      cacheTTL: parseInt(process.env.ABUSEIPDB_CACHE_TTL || '3600'),
      maxAgeInDays: parseInt(process.env.ABUSEIPDB_MAX_AGE_DAYS || '90'),
    };
  }

  // Shodan
  if (process.env.SHODAN_API_KEY) {
    config.providers.shodan = {
      apiKey: process.env.SHODAN_API_KEY,
      enabled: true,
      rateLimit: {
        requestsPerSecond: parseInt(process.env.SHODAN_RATE_LIMIT_PER_SEC || '1'),
        requestsPerDay: parseInt(process.env.SHODAN_RATE_LIMIT_PER_DAY || '100'),
      },
      timeout: parseInt(process.env.SHODAN_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.SHODAN_RETRY || '2'),
      cacheEnabled: process.env.SHODAN_CACHE_ENABLED !== 'false',
      cacheTTL: parseInt(process.env.SHODAN_CACHE_TTL || '7200'),
    };
  }

  // AlienVault OTX
  if (process.env.ALIENVAULT_OTX_API_KEY) {
    config.providers.alienVaultOTX = {
      apiKey: process.env.ALIENVAULT_OTX_API_KEY,
      enabled: true,
      rateLimit: {
        requestsPerSecond: parseInt(process.env.ALIENVAULT_RATE_LIMIT_PER_SEC || '10'),
        requestsPerDay: parseInt(process.env.ALIENVAULT_RATE_LIMIT_PER_DAY || '10000'),
      },
      timeout: parseInt(process.env.ALIENVAULT_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.ALIENVAULT_RETRY || '2'),
      cacheEnabled: process.env.ALIENVAULT_CACHE_ENABLED !== 'false',
      cacheTTL: parseInt(process.env.ALIENVAULT_CACHE_TTL || '3600'),
    };
  }

  const factory = getProviderFactory();
  factory.initializeProviders(config);
}
