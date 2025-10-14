/**
 * AlienVault OTX (Open Threat Exchange) Provider for IOC Enrichment
 *
 * Integrates with AlienVault OTX API for community threat intelligence
 */

import fetch from 'node-fetch';
import { BaseProvider, EnrichmentRequest, EnrichmentResponse, ProviderConfig, ProviderEnrichmentData } from './BaseProvider';
import { logger } from '../../../shared/utils/logger';

export interface AlienVaultOTXConfig extends ProviderConfig {
  apiKey: string;
  apiUrl?: string;
}

export class AlienVaultOTXProvider extends BaseProvider {
  private readonly API_BASE = 'https://otx.alienvault.com/api/v1';

  constructor(config: AlienVaultOTXConfig) {
    const defaultConfig: ProviderConfig = {
      ...config,
      apiUrl: config.apiUrl || 'https://otx.alienvault.com/api/v1',
      enabled: Boolean(config.apiKey),
      rateLimit: config.rateLimit || {
        requestsPerSecond: 10, // OTX is generous with rate limits
        requestsPerDay: 10000,
      },
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 2,
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 3600,
    };

    super('AlienVault OTX', defaultConfig);
  }

  /**
   * Enrich IOC using AlienVault OTX API
   */
  async enrichIOC(request: EnrichmentRequest): Promise<EnrichmentResponse> {
    const startTime = Date.now();

    try {
      let generalData: any;
      let reputationData: any;
      let pulsesData: any;

      // Get indicator type-specific endpoint
      const indicatorType = this.mapIOCTypeToOTX(request.iocType);

      // Fetch general information
      generalData = await this.getIndicatorGeneral(indicatorType, request.ioc);

      // Fetch reputation (malware, pulses count)
      reputationData = await this.getIndicatorReputation(indicatorType, request.ioc);

      // Fetch associated pulses (threat intelligence reports)
      pulsesData = await this.getIndicatorPulses(indicatorType, request.ioc);

      // Parse and normalize response
      const enrichmentData = this.parseOTXResponse(
        generalData,
        reputationData,
        pulsesData,
        request.iocType
      );

      return {
        success: true,
        provider: this.providerName,
        ioc: request.ioc,
        iocType: request.iocType,
        data: enrichmentData,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        cached: false,
      };

    } catch (error) {
      throw new Error(`AlienVault OTX API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map IOC type to OTX indicator type
   */
  private mapIOCTypeToOTX(iocType: string): string {
    const mapping: Record<string, string> = {
      'ip': 'IPv4',
      'domain': 'domain',
      'url': 'url',
      'hash': 'file', // OTX uses 'file' for hashes
      'email': 'email',
      'cve': 'CVE',
    };

    const mapped = mapping[iocType.toLowerCase()];
    if (!mapped) {
      throw new Error(`Unsupported IOC type: ${iocType}`);
    }

    return mapped;
  }

  /**
   * Get general indicator information
   */
  private async getIndicatorGeneral(indicatorType: string, indicator: string): Promise<any> {
    const endpoint = `${this.API_BASE}/indicators/${indicatorType}/${indicator}/general`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-OTX-API-KEY': (this.config as AlienVaultOTXConfig).apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {}; // Not found is valid (no data available)
      } else if (response.status === 403) {
        throw new Error('Invalid API key');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }

    return await response.json();
  }

  /**
   * Get indicator reputation/malware info
   */
  private async getIndicatorReputation(indicatorType: string, indicator: string): Promise<any> {
    const endpoint = `${this.API_BASE}/indicators/${indicatorType}/${indicator}/reputation`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-OTX-API-KEY': (this.config as AlienVaultOTXConfig).apiKey,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return {};
    } catch (error) {
      return {}; // Reputation might not be available
    }
  }

  /**
   * Get associated pulses (threat intelligence reports)
   */
  private async getIndicatorPulses(indicatorType: string, indicator: string): Promise<any> {
    const endpoint = `${this.API_BASE}/indicators/${indicatorType}/${indicator}/pulses`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-OTX-API-KEY': (this.config as AlienVaultOTXConfig).apiKey,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return { results: [] };
    } catch (error) {
      return { results: [] };
    }
  }

  /**
   * Parse OTX response into normalized format
   */
  private parseOTXResponse(
    general: any,
    reputation: any,
    pulses: any,
    iocType: string
  ): ProviderEnrichmentData {
    // Extract pulse information
    const pulsesResults = pulses.results || [];
    const pulseCount = pulses.count || 0;

    // Calculate reputation score based on pulses and malware classifications
    const malwareCount = reputation.count || 0;
    const threatScore = Math.min((pulseCount * 5) + (malwareCount * 20), 100);

    // Determine verdict
    let verdict: 'benign' | 'suspicious' | 'malicious' | 'unknown' = 'unknown';
    if (malwareCount > 0) {
      verdict = 'malicious';
    } else if (pulseCount > 5) {
      verdict = 'suspicious';
    } else if (pulseCount > 0) {
      verdict = 'suspicious';
    } else if (general.pulse_info?.count === 0) {
      verdict = 'benign';
    }

    // Confidence based on data availability
    const hasPulseData = pulseCount > 0;
    const hasGeneralData = Object.keys(general).length > 5;
    const confidence = (hasPulseData ? 0.7 : 0.3) + (hasGeneralData ? 0.3 : 0);

    // Build comprehensive metadata
    const metadata: Record<string, any> = {
      // Pulse information
      pulseCount,
      pulses: pulsesResults.slice(0, 10).map((pulse: any) => ({
        id: pulse.id,
        name: pulse.name,
        description: pulse.description,
        created: pulse.created,
        modified: pulse.modified,
        author: pulse.author_name,
        tags: pulse.tags || [],
        references: pulse.references || [],
        adversary: pulse.adversary || null,
        targeted_countries: pulse.targeted_countries || [],
        industries: pulse.industries || [],
        malware_families: pulse.malware_families || [],
        attack_ids: pulse.attack_ids || [],
      })),

      // Reputation/Malware data
      malwareCount,
      malware: reputation.malware || [],

      // General data (type-specific)
      sections: general.sections || [],
      typeTitle: general.type_title || null,
    };

    // Type-specific metadata
    if (iocType === 'ip') {
      metadata.country = general.country_name || general.country_code || null;
      metadata.city = general.city || null;
      metadata.asn = general.asn || null;
      metadata.continent = general.continent_code || null;
      metadata.reputation = general.reputation || 0;
    } else if (iocType === 'domain') {
      metadata.alexa = general.alexa || null;
      metadata.whois = general.whois || null;
    } else if (iocType === 'hash') {
      metadata.fileType = general.file_type || null;
      metadata.fileClass = general.file_class || null;
      metadata.size = general.size || null;
    } else if (iocType === 'url') {
      metadata.domain = general.domain || null;
      metadata.hostname = general.hostname || null;
    }

    // Extract related indicators from pulses
    const relatedIndicators: Array<{
      type: string;
      value: string;
      relationship: string;
    }> = [];

    pulsesResults.forEach((pulse: any) => {
      if (pulse.indicators && Array.isArray(pulse.indicators)) {
        pulse.indicators.slice(0, 20).forEach((indicator: any) => {
          if (indicator.indicator !== request.ioc) { // Don't include self
            relatedIndicators.push({
              type: this.mapOTXTypeToIOCType(indicator.type),
              value: indicator.indicator,
              relationship: 'associated_in_pulse',
            });
          }
        });
      }
    });

    // Build comprehensive tags
    const tags: Set<string> = new Set();

    // Add pulse tags
    pulsesResults.forEach((pulse: any) => {
      if (pulse.tags) {
        pulse.tags.forEach((tag: string) => tags.add(tag));
      }
      if (pulse.malware_families) {
        pulse.malware_families.forEach((family: any) => {
          tags.add(`malware:${family.display_name || family}`);
        });
      }
      if (pulse.attack_ids) {
        pulse.attack_ids.forEach((attack: any) => {
          tags.add(`mitre:${attack.display_name || attack.id}`);
        });
      }
    });

    // Add reputation tags
    if (reputation.activities) {
      reputation.activities.forEach((activity: string) => tags.add(activity));
    }

    return {
      reputation: {
        score: threatScore,
        verdict,
        confidence,
      },
      metadata,
      relatedIndicators: relatedIndicators.slice(0, 50), // Limit to 50
      tags: [...tags],
      references: [
        `https://otx.alienvault.com/indicator/${this.mapIOCTypeToOTX(iocType)}/${request.ioc}`,
        ...pulsesResults.slice(0, 5).map((pulse: any) =>
          `https://otx.alienvault.com/pulse/${pulse.id}`
        ),
      ],
    };
  }

  /**
   * Map OTX indicator type back to IOC type
   */
  private mapOTXTypeToIOCType(otxType: string): string {
    const mapping: Record<string, string> = {
      'IPv4': 'ip',
      'IPv6': 'ip',
      'domain': 'domain',
      'hostname': 'domain',
      'URL': 'url',
      'URI': 'url',
      'FileHash-MD5': 'hash',
      'FileHash-SHA1': 'hash',
      'FileHash-SHA256': 'hash',
      'email': 'email',
      'CVE': 'cve',
    };

    return mapping[otxType] || 'unknown';
  }

  /**
   * Check if provider supports this IOC type
   */
  supportsIOCType(iocType: string): boolean {
    return ['ip', 'domain', 'url', 'hash', 'email', 'cve'].includes(iocType.toLowerCase());
  }

  /**
   * Test AlienVault OTX API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/users/me`, {
        method: 'GET',
        headers: {
          'X-OTX-API-KEY': (this.config as AlienVaultOTXConfig).apiKey,
        },
      });

      return response.ok;
    } catch (error) {
      logger.error('AlienVault OTX connection test failed:', error);
      return false;
    }
  }

  /**
   * Search pulses by text
   */
  async searchPulses(query: string, options?: {
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<any> {
    try {
      const params = new URLSearchParams({
        q: query,
        page: (options?.page || 1).toString(),
        limit: (options?.limit || 20).toString(),
      });

      if (options?.sort) params.append('sort', options.sort);

      const response = await fetch(
        `${this.API_BASE}/search/pulses?${params}`,
        {
          method: 'GET',
          headers: {
            'X-OTX-API-KEY': (this.config as AlienVaultOTXConfig).apiKey,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('OTX pulse search failed:', error);
      throw error;
    }
  }

  /**
   * Get user's subscribed pulses
   */
  async getSubscribedPulses(options?: {
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const params = new URLSearchParams({
        page: (options?.page || 1).toString(),
        limit: (options?.limit || 20).toString(),
      });

      const response = await fetch(
        `${this.API_BASE}/pulses/subscribed?${params}`,
        {
          method: 'GET',
          headers: {
            'X-OTX-API-KEY': (this.config as AlienVaultOTXConfig).apiKey,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get subscribed pulses: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Failed to get subscribed pulses:', error);
      throw error;
    }
  }
}
