/**
 * Shodan Provider for IOC Enrichment
 *
 * Integrates with Shodan API for internet-connected device intelligence
 */

import fetch from 'node-fetch';
import { BaseProvider, EnrichmentRequest, EnrichmentResponse, ProviderConfig, ProviderEnrichmentData } from './BaseProvider';
import { logger } from '../../../shared/utils/logger';

export interface ShodanConfig extends ProviderConfig {
  apiKey: string;
  apiUrl?: string;
}

export class ShodanProvider extends BaseProvider {
  private readonly API_BASE = 'https://api.shodan.io';

  constructor(config: ShodanConfig) {
    const defaultConfig: ProviderConfig = {
      ...config,
      apiUrl: config.apiUrl || 'https://api.shodan.io',
      enabled: Boolean(config.apiKey),
      rateLimit: config.rateLimit || {
        requestsPerSecond: 1, // Free tier: 1 req/second
        requestsPerDay: 100,  // Varies by plan
      },
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 2,
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 7200, // 2 hours (Shodan data changes slowly)
    };

    super('Shodan', defaultConfig);
  }

  /**
   * Enrich IOC using Shodan API
   */
  async enrichIOC(request: EnrichmentRequest): Promise<EnrichmentResponse> {
    const startTime = Date.now();

    try {
      let hostData: any;

      if (request.iocType === 'ip') {
        hostData = await this.getHostInfo(request.ioc);
      } else if (request.iocType === 'domain') {
        // Resolve domain to IP first, then get host info
        const dnsData = await this.resolveDomain(request.ioc);
        if (dnsData && dnsData.length > 0) {
          hostData = await this.getHostInfo(dnsData[0]);
          hostData.resolvedFrom = request.ioc;
        } else {
          throw new Error('Domain could not be resolved');
        }
      } else {
        throw new Error(`Shodan only supports IP and domain, got: ${request.iocType}`);
      }

      // Parse and normalize response
      const enrichmentData = this.parseShodanResponse(hostData, request.iocType);

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
      throw new Error(`Shodan API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get host information from Shodan
   */
  private async getHostInfo(ip: string): Promise<any> {
    const endpoint = `${this.API_BASE}/shodan/host/${ip}`;
    const params = new URLSearchParams({
      key: (this.config as ShodanConfig).apiKey,
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Host not found in Shodan');
      } else if (response.status === 401) {
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
   * Resolve domain to IP addresses using Shodan DNS
   */
  private async resolveDomain(domain: string): Promise<string[]> {
    const endpoint = `${this.API_BASE}/dns/resolve`;
    const params = new URLSearchParams({
      hostnames: domain,
      key: (this.config as ShodanConfig).apiKey,
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DNS resolution failed: ${response.status}`);
    }

    const data = await response.json();
    return data[domain] ? [data[domain]] : [];
  }

  /**
   * Parse Shodan response into normalized format
   */
  private parseShodanResponse(data: any, iocType: string): ProviderEnrichmentData {
    // Calculate risk score based on vulnerabilities and open ports
    const vulns = data.vulns || [];
    const openPorts = (data.ports || []).length;
    const criticalVulns = vulns.filter((v: string) => v.includes('CVE')).length;

    // Risk scoring (0-100, higher is worse)
    let riskScore = 0;
    riskScore += Math.min(criticalVulns * 15, 60); // Max 60 from vulns
    riskScore += Math.min(openPorts * 2, 30);      // Max 30 from ports
    if (data.tags && data.tags.includes('malware')) riskScore += 10;

    // Determine verdict based on risk
    let verdict: 'benign' | 'suspicious' | 'malicious' | 'unknown' = 'unknown';
    if (criticalVulns > 3 || (data.tags && data.tags.includes('malware'))) {
      verdict = 'malicious';
    } else if (criticalVulns > 0 || riskScore > 40) {
      verdict = 'suspicious';
    } else if (openPorts > 0) {
      verdict = 'benign'; // Has data, appears normal
    }

    // Confidence based on data completeness
    const hasVulnData = vulns.length > 0;
    const hasServiceData = (data.data || []).length > 0;
    const confidence = (hasVulnData ? 0.5 : 0) + (hasServiceData ? 0.5 : 0.3);

    // Build comprehensive metadata
    const metadata: Record<string, any> = {
      // Network information
      ipStr: data.ip_str,
      asn: data.asn || null,
      org: data.org || null,
      isp: data.isp || null,

      // Geolocation
      country: {
        code: data.country_code || null,
        name: data.country_name || null,
      },
      city: data.city || null,
      region: data.region_code || null,
      postalCode: data.postal_code || null,
      coordinates: {
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      },

      // Ports and services
      openPorts: data.ports || [],
      totalPorts: openPorts,

      // Vulnerabilities
      vulnerabilities: vulns,
      totalVulns: vulns.length,
      criticalVulns,

      // Operating system
      os: data.os || null,

      // Hostnames
      hostnames: data.hostnames || [],
      domains: data.domains || [],

      // Tags
      tags: data.tags || [],

      // Last update
      lastUpdate: data.last_update || null,
    };

    // Build services data
    const services = (data.data || []).map((service: any) => ({
      port: service.port,
      transport: service.transport || 'tcp',
      product: service.product || null,
      version: service.version || null,
      banner: service.data ? service.data.substring(0, 200) : null, // Truncate
      ssl: service.ssl ? {
        version: service.ssl.version || null,
        cipher: service.ssl.cipher?.name || null,
        cert: {
          subject: service.ssl.cert?.subject?.CN || null,
          issuer: service.ssl.cert?.issuer?.CN || null,
          expires: service.ssl.cert?.expires || null,
        },
      } : null,
    }));

    metadata.services = services;

    // Extract related indicators
    const relatedIndicators: Array<{
      type: string;
      value: string;
      relationship: string;
    }> = [];

    // Add hostnames as related domains
    if (data.hostnames) {
      data.hostnames.forEach((hostname: string) => {
        relatedIndicators.push({
          type: 'domain',
          value: hostname,
          relationship: 'hostname',
        });
      });
    }

    // Add domains
    if (data.domains) {
      data.domains.forEach((domain: string) => {
        relatedIndicators.push({
          type: 'domain',
          value: domain,
          relationship: 'associated_domain',
        });
      });
    }

    // Build comprehensive tags
    const tags: string[] = [...(data.tags || [])];
    if (data.os) tags.push(`os:${data.os.toLowerCase()}`);
    if (criticalVulns > 0) tags.push('vulnerable');
    if (data.isp) tags.push(`isp:${data.isp.toLowerCase().replace(/\s+/g, '-')}`);
    services.forEach((svc: any) => {
      if (svc.product) tags.push(`service:${svc.product.toLowerCase()}`);
    });

    return {
      reputation: {
        score: riskScore,
        verdict,
        confidence,
      },
      metadata,
      relatedIndicators,
      tags: [...new Set(tags)], // Deduplicate
      references: [
        `https://www.shodan.io/host/${data.ip_str || data.ip}`,
      ],
    };
  }

  /**
   * Check if provider supports this IOC type
   */
  supportsIOCType(iocType: string): boolean {
    return ['ip', 'domain'].includes(iocType.toLowerCase());
  }

  /**
   * Test Shodan API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with API info endpoint
      const response = await fetch(
        `${this.API_BASE}/api-info?key=${(this.config as ShodanConfig).apiKey}`,
        { method: 'GET' }
      );
      return response.ok;
    } catch (error) {
      logger.error('Shodan connection test failed:', error);
      return false;
    }
  }

  /**
   * Get API usage information
   */
  async getAPIInfo(): Promise<{
    plan: string;
    queryCredits: number;
    scanCredits: number;
    telnet: boolean;
    unlocked: boolean;
  }> {
    try {
      const response = await fetch(
        `${this.API_BASE}/api-info?key=${(this.config as ShodanConfig).apiKey}`,
        { method: 'GET', headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        throw new Error('Failed to get API info');
      }

      const data = await response.json();
      return {
        plan: data.plan || 'free',
        queryCredits: data.query_credits || 0,
        scanCredits: data.scan_credits || 0,
        telnet: data.telnet || false,
        unlocked: data.unlocked || false,
      };
    } catch (error) {
      logger.error('Failed to get Shodan API info:', error);
      throw error;
    }
  }

  /**
   * Search Shodan database
   */
  async search(query: string, options?: {
    facets?: string;
    page?: number;
  }): Promise<any> {
    try {
      const params = new URLSearchParams({
        key: (this.config as ShodanConfig).apiKey,
        query,
      });

      if (options?.facets) params.append('facets', options.facets);
      if (options?.page) params.append('page', options.page.toString());

      const response = await fetch(
        `${this.API_BASE}/shodan/host/search?${params}`,
        { method: 'GET', headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Shodan search failed:', error);
      throw error;
    }
  }
}
