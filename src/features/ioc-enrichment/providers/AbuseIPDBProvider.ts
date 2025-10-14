/**
 * AbuseIPDB Provider for IOC Enrichment
 *
 * Integrates with AbuseIPDB API for IP reputation and abuse reporting
 */

import fetch from 'node-fetch';
import { BaseProvider, EnrichmentRequest, EnrichmentResponse, ProviderConfig, ProviderEnrichmentData } from './BaseProvider';
import { logger } from '../../../shared/utils/logger';

export interface AbuseIPDBConfig extends ProviderConfig {
  apiKey: string;
  apiUrl?: string;
  maxAgeInDays?: number; // Default 90 days
}

export class AbuseIPDBProvider extends BaseProvider {
  private readonly API_BASE = 'https://api.abuseipdb.com/api/v2';
  private maxAgeInDays: number;

  constructor(config: AbuseIPDBConfig) {
    const defaultConfig: ProviderConfig = {
      ...config,
      apiUrl: config.apiUrl || 'https://api.abuseipdb.com/api/v2',
      enabled: Boolean(config.apiKey),
      rateLimit: config.rateLimit || {
        requestsPerSecond: 1, // Conservative rate
        requestsPerDay: 1000, // Free tier limit
      },
      timeout: config.timeout || 20000,
      retryAttempts: config.retryAttempts || 2,
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 3600,
    };

    super('AbuseIPDB', defaultConfig);
    this.maxAgeInDays = config.maxAgeInDays || 90;
  }

  /**
   * Enrich IP using AbuseIPDB API
   */
  async enrichIOC(request: EnrichmentRequest): Promise<EnrichmentResponse> {
    const startTime = Date.now();

    try {
      // AbuseIPDB only supports IP addresses
      if (request.iocType !== 'ip') {
        throw new Error(`AbuseIPDB only supports IP addresses, got: ${request.iocType}`);
      }

      // Validate IP format
      if (!this.isValidIP(request.ioc)) {
        throw new Error(`Invalid IP address format: ${request.ioc}`);
      }

      // Fetch abuse data
      const abuseData = await this.checkIP(request.ioc);

      // Parse and normalize response
      const enrichmentData = this.parseAbuseIPDBResponse(abuseData);

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
      throw new Error(`AbuseIPDB API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check IP reputation using AbuseIPDB API
   */
  private async checkIP(ipAddress: string): Promise<any> {
    const endpoint = `${this.API_BASE}/check`;
    const params = new URLSearchParams({
      ipAddress,
      maxAgeInDays: this.maxAgeInDays.toString(),
      verbose: 'true', // Get detailed report data
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: {
        'Key': (this.config as AbuseIPDBConfig).apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 422) {
        throw new Error('Invalid IP address');
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    return data.data; // AbuseIPDB wraps response in { data: {...} }
  }

  /**
   * Parse AbuseIPDB response into normalized format
   */
  private parseAbuseIPDBResponse(data: any): ProviderEnrichmentData {
    // AbuseIPDB confidence score (0-100)
    const abuseConfidenceScore = data.abuseConfidenceScore || 0;
    const totalReports = data.totalReports || 0;

    // Determine verdict based on confidence score
    let verdict: 'benign' | 'suspicious' | 'malicious' | 'unknown' = 'unknown';
    if (data.isWhitelisted) {
      verdict = 'benign';
    } else if (abuseConfidenceScore >= 75) {
      verdict = 'malicious';
    } else if (abuseConfidenceScore >= 25) {
      verdict = 'suspicious';
    } else if (totalReports === 0) {
      verdict = 'unknown';
    } else {
      verdict = 'benign';
    }

    // Confidence is based on number of reports and recency
    const recentReports = data.numDistinctUsers || 0;
    const confidence = Math.min(
      (recentReports / 10) * (abuseConfidenceScore / 100),
      1
    );

    // Build metadata
    const metadata: Record<string, any> = {
      abuseConfidenceScore,
      totalReports,
      numDistinctUsers: data.numDistinctUsers || 0,
      lastReportedAt: data.lastReportedAt || null,
      isWhitelisted: data.isWhitelisted || false,
      isPublic: data.isPublic !== false,
      ipVersion: data.ipVersion || 4,
      countryCode: data.countryCode || null,
      countryName: data.countryName || null,
      usageType: data.usageType || null, // Data Center, Commercial, etc.
      isp: data.isp || null,
      domain: data.domain || null,
      hostnames: data.hostnames || [],
      isTor: data.isTor || false,
    };

    // Extract abuse categories from recent reports
    const reports = data.reports || [];
    const categories = new Set<string>();
    reports.forEach((report: any) => {
      if (report.categories) {
        report.categories.forEach((cat: number) => {
          categories.add(this.getCategoryName(cat));
        });
      }
    });

    // Build tags from categories and metadata
    const tags: string[] = [...categories];
    if (data.isTor) tags.push('tor');
    if (data.isWhitelisted) tags.push('whitelisted');
    if (data.usageType) tags.push(data.usageType.toLowerCase().replace(/\s+/g, '-'));

    // Related indicators (hostnames associated with this IP)
    const relatedIndicators: Array<{
      type: string;
      value: string;
      relationship: string;
    }> = [];

    if (data.hostnames && data.hostnames.length > 0) {
      data.hostnames.forEach((hostname: string) => {
        relatedIndicators.push({
          type: 'domain',
          value: hostname,
          relationship: 'reverse_dns',
        });
      });
    }

    if (data.domain) {
      relatedIndicators.push({
        type: 'domain',
        value: data.domain,
        relationship: 'registered_domain',
      });
    }

    return {
      reputation: {
        score: abuseConfidenceScore,
        verdict,
        confidence,
      },
      metadata,
      relatedIndicators,
      tags,
      references: [
        `https://www.abuseipdb.com/check/${data.ipAddress}`,
      ],
    };
  }

  /**
   * Get human-readable category name from AbuseIPDB category ID
   */
  private getCategoryName(categoryId: number): string {
    const categories: Record<number, string> = {
      3: 'fraud',
      4: 'ddos',
      5: 'hacking',
      6: 'spam',
      9: 'vulnerability-scan',
      10: 'brute-force',
      11: 'bad-web-bot',
      14: 'port-scan',
      15: 'malicious-web',
      18: 'web-attack',
      19: 'botnet',
      20: 'web-spam',
      21: 'email-spam',
      22: 'ssh-attack',
      23: 'iot-targeted',
    };

    return categories[categoryId] || `category-${categoryId}`;
  }

  /**
   * Validate IP address format
   */
  private isValidIP(ip: string): boolean {
    // IPv4 regex
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 regex (simplified)
    const ipv6Regex = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/i;

    if (ipv4Regex.test(ip)) {
      // Validate each octet is 0-255
      const octets = ip.split('.');
      return octets.every(octet => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
      });
    }

    return ipv6Regex.test(ip);
  }

  /**
   * Check if provider supports this IOC type
   */
  supportsIOCType(iocType: string): boolean {
    return iocType.toLowerCase() === 'ip';
  }

  /**
   * Test AbuseIPDB API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with a known malicious IP (example.com = 93.184.216.34)
      const testIP = '8.8.8.8'; // Google DNS - should be clean
      await this.checkIP(testIP);
      return true;
    } catch (error) {
      logger.error('AbuseIPDB connection test failed:', error);
      return false;
    }
  }

  /**
   * Report abusive IP to AbuseIPDB
   */
  async reportIP(params: {
    ip: string;
    categories: number[];
    comment: string;
  }): Promise<boolean> {
    try {
      const endpoint = `${this.API_BASE}/report`;

      const body = {
        ip: params.ip,
        categories: params.categories.join(','),
        comment: params.comment,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Key': (this.config as AbuseIPDBConfig).apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to report IP: ${response.status}`);
      }

      logger.info(`Reported ${params.ip} to AbuseIPDB`);
      return true;

    } catch (error) {
      logger.error('Failed to report IP to AbuseIPDB:', error);
      return false;
    }
  }

  /**
   * Get blacklist for your network
   */
  async getBlacklist(params?: {
    limit?: number;
    confidenceMinimum?: number;
  }): Promise<string[]> {
    try {
      const endpoint = `${this.API_BASE}/blacklist`;
      const queryParams = new URLSearchParams({
        confidenceMinimum: (params?.confidenceMinimum || 90).toString(),
        limit: (params?.limit || 10000).toString(),
      });

      const response = await fetch(`${endpoint}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Key': (this.config as AbuseIPDBConfig).apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get blacklist: ${response.status}`);
      }

      const data = await response.json();
      return data.data.map((entry: any) => entry.ipAddress);

    } catch (error) {
      logger.error('Failed to get AbuseIPDB blacklist:', error);
      throw error;
    }
  }
}
