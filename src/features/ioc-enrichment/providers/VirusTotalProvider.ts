/**
 * VirusTotal Provider for IOC Enrichment
 *
 * Integrates with VirusTotal API v3 for comprehensive malware analysis
 */

import fetch from 'node-fetch';
import { BaseProvider, EnrichmentRequest, EnrichmentResponse, ProviderConfig, ProviderEnrichmentData } from './BaseProvider';
import { logger } from '../../../shared/utils/logger';

export interface VirusTotalConfig extends ProviderConfig {
  apiKey: string;
  apiUrl?: string;
}

export class VirusTotalProvider extends BaseProvider {
  private readonly API_BASE = 'https://www.virustotal.com/api/v3';

  constructor(config: VirusTotalConfig) {
    const defaultConfig: ProviderConfig = {
      ...config,
      apiUrl: config.apiUrl || 'https://www.virustotal.com/api/v3',
      enabled: Boolean(config.apiKey),
      rateLimit: config.rateLimit || {
        requestsPerSecond: 4, // Free tier: 4 req/second
        requestsPerDay: 500,  // Free tier: 500 req/day
      },
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 2,
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 3600,
    };

    super('VirusTotal', defaultConfig);
  }

  /**
   * Enrich IOC using VirusTotal API
   */
  async enrichIOC(request: EnrichmentRequest): Promise<EnrichmentResponse> {
    const startTime = Date.now();

    try {
      let endpoint: string;
      let reportData: any;

      switch (request.iocType) {
        case 'ip':
          endpoint = `${this.API_BASE}/ip_addresses/${request.ioc}`;
          reportData = await this.fetchReport(endpoint);
          break;

        case 'domain':
          endpoint = `${this.API_BASE}/domains/${request.ioc}`;
          reportData = await this.fetchReport(endpoint);
          break;

        case 'url':
          // URL needs to be base64 encoded (without padding)
          const urlId = Buffer.from(request.ioc).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
          endpoint = `${this.API_BASE}/urls/${urlId}`;
          reportData = await this.fetchReport(endpoint);
          break;

        case 'hash':
          endpoint = `${this.API_BASE}/files/${request.ioc}`;
          reportData = await this.fetchReport(endpoint);
          break;

        default:
          throw new Error(`Unsupported IOC type: ${request.iocType}`);
      }

      // Parse and normalize the response
      const enrichmentData = this.parseVirusTotalResponse(reportData, request.iocType);

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
      throw new Error(`VirusTotal API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch report from VirusTotal API
   */
  private async fetchReport(endpoint: string): Promise<any> {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'x-apikey': (this.config as VirusTotalConfig).apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('IOC not found in VirusTotal');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (response.status === 401) {
        throw new Error('Invalid API key');
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }

    return await response.json();
  }

  /**
   * Parse VirusTotal API response into normalized format
   */
  private parseVirusTotalResponse(data: any, iocType: string): ProviderEnrichmentData {
    const attributes = data.data?.attributes || {};
    const lastAnalysisStats = attributes.last_analysis_stats || {};

    // Calculate reputation score (0-100, higher is worse)
    const malicious = lastAnalysisStats.malicious || 0;
    const suspicious = lastAnalysisStats.suspicious || 0;
    const total = Object.values(lastAnalysisStats).reduce((sum: number, val: any) => sum + (val || 0), 0);

    const detectionRate = total > 0 ? (malicious + suspicious * 0.5) / total : 0;
    const reputationScore = Math.round(detectionRate * 100);

    // Determine verdict
    let verdict: 'benign' | 'suspicious' | 'malicious' | 'unknown' = 'unknown';
    if (malicious > 5) {
      verdict = 'malicious';
    } else if (malicious > 0 || suspicious > 3) {
      verdict = 'suspicious';
    } else if (total > 10) {
      verdict = 'benign';
    }

    // Calculate confidence based on number of scans
    const confidence = Math.min(total / 70, 1); // 70+ engines = max confidence

    // Build metadata based on IOC type
    const metadata: Record<string, any> = {
      lastAnalysisDate: attributes.last_analysis_date,
      lastAnalysisStats,
      totalVotes: attributes.total_votes || {},
      reputation: attributes.reputation || 0,
    };

    // Type-specific metadata
    if (iocType === 'ip') {
      metadata.network = attributes.network || {};
      metadata.country = attributes.country || 'Unknown';
      metadata.asn = attributes.asn || null;
      metadata.asOwner = attributes.as_owner || null;
    } else if (iocType === 'domain') {
      metadata.registrar = attributes.registrar || null;
      metadata.creationDate = attributes.creation_date || null;
      metadata.lastDNSRecords = attributes.last_dns_records || [];
      metadata.categories = attributes.categories || {};
    } else if (iocType === 'hash') {
      metadata.fileType = attributes.type_description || null;
      metadata.size = attributes.size || null;
      metadata.names = attributes.names || [];
      metadata.tags = attributes.tags || [];
      metadata.firstSubmission = attributes.first_submission_date || null;
    } else if (iocType === 'url') {
      metadata.title = attributes.title || null;
      metadata.finalUrl = attributes.last_final_url || request.ioc;
      metadata.categories = attributes.categories || {};
    }

    // Extract related indicators
    const relatedIndicators = this.extractRelatedIndicators(attributes, iocType);

    // Extract tags
    const tags = attributes.tags || [];
    if (attributes.popular_threat_classification) {
      tags.push(...Object.keys(attributes.popular_threat_classification));
    }

    return {
      reputation: {
        score: reputationScore,
        verdict,
        confidence,
      },
      metadata,
      relatedIndicators,
      tags: [...new Set(tags)], // Deduplicate
      references: [
        `https://www.virustotal.com/gui/${iocType === 'hash' ? 'file' : iocType}/${request.ioc}`,
      ],
    };
  }

  /**
   * Extract related indicators from VirusTotal response
   */
  private extractRelatedIndicators(attributes: any, iocType: string): Array<{
    type: string;
    value: string;
    relationship: string;
  }> {
    const indicators: Array<{ type: string; value: string; relationship: string }> = [];

    if (iocType === 'ip' || iocType === 'domain') {
      // Extract resolved IPs
      if (attributes.last_dns_records) {
        attributes.last_dns_records.forEach((record: any) => {
          if (record.value && record.type === 'A') {
            indicators.push({
              type: 'ip',
              value: record.value,
              relationship: 'resolves_to',
            });
          }
        });
      }
    }

    if (iocType === 'hash') {
      // Extract contacted IPs and domains
      if (attributes.contacted_ips) {
        attributes.contacted_ips.slice(0, 10).forEach((ip: string) => {
          indicators.push({
            type: 'ip',
            value: ip,
            relationship: 'contacted',
          });
        });
      }
      if (attributes.contacted_domains) {
        attributes.contacted_domains.slice(0, 10).forEach((domain: string) => {
          indicators.push({
            type: 'domain',
            value: domain,
            relationship: 'contacted',
          });
        });
      }
    }

    return indicators;
  }

  /**
   * Check if provider supports this IOC type
   */
  supportsIOCType(iocType: string): boolean {
    return ['ip', 'domain', 'url', 'hash'].includes(iocType.toLowerCase());
  }

  /**
   * Test VirusTotal API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/users/${(this.config as VirusTotalConfig).apiKey}`, {
        method: 'GET',
        headers: {
          'x-apikey': (this.config as VirusTotalConfig).apiKey,
        },
      });

      return response.ok;
    } catch (error) {
      logger.error('VirusTotal connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available quota
   */
  async getQuota(): Promise<{
    daily: { allowed: number; used: number };
    monthly: { allowed: number; used: number };
  }> {
    try {
      const response = await fetch(`${this.API_BASE}/users/${(this.config as VirusTotalConfig).apiKey}/overall_quotas`, {
        method: 'GET',
        headers: {
          'x-apikey': (this.config as VirusTotalConfig).apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quota');
      }

      const data = await response.json();
      const apiCalls = data.data?.attributes?.api_calls || {};

      return {
        daily: {
          allowed: apiCalls.daily?.allowed || 500,
          used: apiCalls.daily?.used || 0,
        },
        monthly: {
          allowed: apiCalls.monthly?.allowed || 15500,
          used: apiCalls.monthly?.used || 0,
        },
      };
    } catch (error) {
      logger.error('Failed to get VirusTotal quota:', error);
      throw error;
    }
  }
}
