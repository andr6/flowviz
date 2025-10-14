/**
 * Aggregation Engine
 *
 * Combines results from multiple threat intelligence providers into
 * a single, high-confidence enriched IOC with consensus-based verdicts
 */

import { EventEmitter } from 'events';
import { logger } from '../../../shared/utils/logger';
import { EnrichmentResponse, ProviderEnrichmentData } from '../providers/BaseProvider';

export interface AggregatedIOC {
  ioc: string;
  iocType: string;

  // Consensus results
  consensus: {
    reputation: {
      score: number;          // 0-100, weighted average
      verdict: 'benign' | 'suspicious' | 'malicious' | 'unknown';
      confidence: number;     // 0-1, based on agreement
      distribution: {         // Verdict distribution
        benign: number;
        suspicious: number;
        malicious: number;
        unknown: number;
      };
    };
    agreement: number;        // 0-1, how much providers agree
    providerCount: number;    // Number of providers that responded
  };

  // Individual provider results
  providerResults: EnrichmentResponse[];

  // Merged data
  metadata: {
    geolocation?: {
      country: string;
      city?: string;
      coordinates?: [number, number];
      confidence: number;
    };
    network?: {
      asn?: string;
      organization?: string;
      isp?: string;
    };
    threats: Array<{
      type: string;           // malware, campaign, vulnerability
      name: string;
      confidence: number;
      sources: string[];      // Which providers reported this
    }>;
    firstSeen?: Date;
    lastSeen?: Date;
  };

  // Merged and deduplicated related indicators
  relatedIndicators: Array<{
    type: string;
    value: string;
    relationship: string;
    confidence: number;
    sources: string[];        // Which providers found this relationship
  }>;

  // Merged and deduplicated tags
  tags: Array<{
    tag: string;
    count: number;            // How many providers mentioned this
    sources: string[];
  }>;

  // Aggregation metadata
  aggregation: {
    timestamp: Date;
    processingTime: number;   // milliseconds
    providersUsed: string[];
    providersSucceeded: string[];
    providersFailed: string[];
    conflictsResolved: number;
  };
}

export interface AggregationConfig {
  // Weighting for different providers (0-1)
  providerWeights: Record<string, number>;

  // Minimum confidence threshold to include a verdict
  minConfidenceThreshold: number;

  // Conflict resolution strategy
  conflictResolution: 'majority' | 'weighted' | 'highest-confidence';

  // Whether to include failed provider results
  includeFailed: boolean;
}

const DEFAULT_CONFIG: AggregationConfig = {
  providerWeights: {
    'VirusTotal': 1.0,        // High trust for multi-engine scanning
    'AbuseIPDB': 0.9,         // Specialized IP reputation
    'Shodan': 0.85,           // Technical data, less focused on malice
    'AlienVault OTX': 0.95,   // Community-driven, high quality
  },
  minConfidenceThreshold: 0.3,
  conflictResolution: 'weighted',
  includeFailed: false,
};

export class AggregationEngine extends EventEmitter {
  private config: AggregationConfig;

  constructor(config?: Partial<AggregationConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Aggregate results from multiple providers
   */
  async aggregate(
    ioc: string,
    iocType: string,
    results: EnrichmentResponse[]
  ): Promise<AggregatedIOC> {
    const startTime = Date.now();

    logger.info(`Aggregating ${results.length} provider results for ${iocType}: ${ioc}`);

    try {
      // Filter results
      const validResults = this.filterResults(results);

      if (validResults.length === 0) {
        throw new Error('No valid provider results to aggregate');
      }

      // Calculate consensus reputation
      const consensus = this.calculateConsensus(validResults);

      // Merge metadata from all providers
      const metadata = this.mergeMetadata(validResults);

      // Merge and deduplicate related indicators
      const relatedIndicators = this.mergeRelatedIndicators(validResults);

      // Merge and count tags
      const tags = this.mergeTags(validResults);

      // Build aggregation metadata
      const aggregation = {
        timestamp: new Date(),
        processingTime: Date.now() - startTime,
        providersUsed: results.map(r => r.provider),
        providersSucceeded: validResults.map(r => r.provider),
        providersFailed: results
          .filter(r => !r.success || !this.isValidResult(r))
          .map(r => r.provider),
        conflictsResolved: this.countConflicts(validResults),
      };

      const aggregated: AggregatedIOC = {
        ioc,
        iocType,
        consensus,
        providerResults: this.config.includeFailed ? results : validResults,
        metadata,
        relatedIndicators,
        tags,
        aggregation,
      };

      this.emit('aggregationComplete', aggregated);
      logger.info(
        `Aggregation complete: ${consensus.reputation.verdict} ` +
        `(confidence: ${consensus.reputation.confidence.toFixed(2)}, ` +
        `agreement: ${consensus.agreement.toFixed(2)})`
      );

      return aggregated;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Aggregation failed:', errorMsg);
      throw new Error(`Aggregation failed: ${errorMsg}`);
    }
  }

  /**
   * Filter results to only include valid, successful responses
   */
  private filterResults(results: EnrichmentResponse[]): EnrichmentResponse[] {
    return results.filter(result => {
      if (!result.success) return false;
      if (!result.data) return false;
      if (!this.isValidResult(result)) return false;
      return true;
    });
  }

  /**
   * Validate that a result has minimum required data
   */
  private isValidResult(result: EnrichmentResponse): boolean {
    return !!(
      result.data?.reputation &&
      typeof result.data.reputation.score === 'number' &&
      result.data.reputation.verdict
    );
  }

  /**
   * Calculate consensus reputation from multiple providers
   */
  private calculateConsensus(results: EnrichmentResponse[]): AggregatedIOC['consensus'] {
    const verdicts: Record<string, number> = {
      benign: 0,
      suspicious: 0,
      malicious: 0,
      unknown: 0,
    };

    let totalWeight = 0;
    let weightedScore = 0;
    let totalConfidence = 0;

    // Aggregate weighted scores and verdicts
    results.forEach(result => {
      const data = result.data!;
      const weight = this.config.providerWeights[result.provider] || 0.5;

      // Only include if meets confidence threshold
      if (data.reputation.confidence < this.config.minConfidenceThreshold) {
        logger.debug(`Excluding ${result.provider} - confidence too low`);
        return;
      }

      totalWeight += weight;
      weightedScore += data.reputation.score * weight;
      totalConfidence += data.reputation.confidence;
      verdicts[data.reputation.verdict] += weight;
    });

    // Calculate weighted average score
    const avgScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    // Determine consensus verdict based on strategy
    let consensusVerdict: 'benign' | 'suspicious' | 'malicious' | 'unknown';

    if (this.config.conflictResolution === 'weighted') {
      // Use weighted majority
      consensusVerdict = this.getWeightedMajorityVerdict(verdicts);
    } else if (this.config.conflictResolution === 'majority') {
      // Simple majority (ignore weights)
      consensusVerdict = this.getMajorityVerdict(results);
    } else {
      // Highest confidence provider wins
      consensusVerdict = this.getHighestConfidenceVerdict(results);
    }

    // Calculate agreement (how much providers agree)
    const maxVerdictWeight = Math.max(...Object.values(verdicts));
    const agreement = totalWeight > 0 ? maxVerdictWeight / totalWeight : 0;

    // Calculate consensus confidence
    const avgConfidence = results.length > 0 ? totalConfidence / results.length : 0;
    const consensusConfidence = avgConfidence * agreement; // Penalize low agreement

    // Normalize verdict distribution
    const distribution = {
      benign: totalWeight > 0 ? verdicts.benign / totalWeight : 0,
      suspicious: totalWeight > 0 ? verdicts.suspicious / totalWeight : 0,
      malicious: totalWeight > 0 ? verdicts.malicious / totalWeight : 0,
      unknown: totalWeight > 0 ? verdicts.unknown / totalWeight : 0,
    };

    return {
      reputation: {
        score: Math.round(avgScore),
        verdict: consensusVerdict,
        confidence: consensusConfidence,
        distribution,
      },
      agreement,
      providerCount: results.length,
    };
  }

  /**
   * Get verdict with highest weighted vote
   */
  private getWeightedMajorityVerdict(
    verdicts: Record<string, number>
  ): 'benign' | 'suspicious' | 'malicious' | 'unknown' {
    const sorted = Object.entries(verdicts).sort((a, b) => b[1] - a[1]);
    return sorted[0][0] as any;
  }

  /**
   * Get verdict by simple majority (most providers)
   */
  private getMajorityVerdict(
    results: EnrichmentResponse[]
  ): 'benign' | 'suspicious' | 'malicious' | 'unknown' {
    const counts: Record<string, number> = {
      benign: 0,
      suspicious: 0,
      malicious: 0,
      unknown: 0,
    };

    results.forEach(result => {
      if (result.data?.reputation) {
        counts[result.data.reputation.verdict]++;
      }
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0][0] as any;
  }

  /**
   * Get verdict from provider with highest confidence
   */
  private getHighestConfidenceVerdict(
    results: EnrichmentResponse[]
  ): 'benign' | 'suspicious' | 'malicious' | 'unknown' {
    let maxConfidence = 0;
    let verdict: any = 'unknown';

    results.forEach(result => {
      if (result.data?.reputation) {
        const conf = result.data.reputation.confidence;
        if (conf > maxConfidence) {
          maxConfidence = conf;
          verdict = result.data.reputation.verdict;
        }
      }
    });

    return verdict;
  }

  /**
   * Merge metadata from multiple providers
   */
  private mergeMetadata(results: EnrichmentResponse[]): AggregatedIOC['metadata'] {
    const metadata: AggregatedIOC['metadata'] = {
      threats: [],
    };

    // Merge geolocation data (use most common)
    const geoData: Array<{ country: string; city?: string; coords?: [number, number]; source: string }> = [];

    results.forEach(result => {
      const meta = result.data?.metadata;
      if (!meta) return;

      // Extract geolocation
      if (meta.country || meta.countryCode || meta.countryName) {
        geoData.push({
          country: meta.country || meta.countryCode || meta.countryName,
          city: meta.city,
          coords: meta.coordinates ? [meta.coordinates.latitude, meta.coordinates.longitude] : undefined,
          source: result.provider,
        });
      }

      // Extract network info
      if (meta.asn || meta.org || meta.isp) {
        if (!metadata.network) {
          metadata.network = {};
        }
        metadata.network.asn = metadata.network.asn || meta.asn;
        metadata.network.organization = metadata.network.organization || meta.org || meta.organization;
        metadata.network.isp = metadata.network.isp || meta.isp;
      }

      // Extract threats (malware, campaigns, vulns)
      if (meta.malware || meta.malwareFamilies) {
        const malwareList = meta.malware || meta.malwareFamilies || [];
        malwareList.forEach((m: any) => {
          const name = typeof m === 'string' ? m : (m.name || m.display_name);
          if (name) {
            metadata.threats.push({
              type: 'malware',
              name,
              confidence: result.data!.reputation.confidence,
              sources: [result.provider],
            });
          }
        });
      }

      if (meta.vulnerabilities || meta.vulns) {
        const vulnList = meta.vulnerabilities || meta.vulns || [];
        vulnList.forEach((v: any) => {
          const name = typeof v === 'string' ? v : v.cve;
          if (name) {
            metadata.threats.push({
              type: 'vulnerability',
              name,
              confidence: 0.9, // Vulns are usually high confidence
              sources: [result.provider],
            });
          }
        });
      }

      // Extract timestamps
      if (meta.firstSeen || meta.firstSubmission) {
        const timestamp = new Date(meta.firstSeen || meta.firstSubmission);
        if (!metadata.firstSeen || timestamp < metadata.firstSeen) {
          metadata.firstSeen = timestamp;
        }
      }

      if (meta.lastSeen || meta.lastUpdate || meta.lastReportedAt) {
        const timestamp = new Date(meta.lastSeen || meta.lastUpdate || meta.lastReportedAt);
        if (!metadata.lastSeen || timestamp > metadata.lastSeen) {
          metadata.lastSeen = timestamp;
        }
      }
    });

    // Determine most common geolocation
    if (geoData.length > 0) {
      const countryCount: Record<string, number> = {};
      geoData.forEach(g => {
        countryCount[g.country] = (countryCount[g.country] || 0) + 1;
      });

      const mostCommon = Object.entries(countryCount).sort((a, b) => b[1] - a[1])[0];
      const geoMatch = geoData.find(g => g.country === mostCommon[0]);

      if (geoMatch) {
        metadata.geolocation = {
          country: geoMatch.country,
          city: geoMatch.city,
          coordinates: geoMatch.coords,
          confidence: mostCommon[1] / geoData.length, // Agreement ratio
        };
      }
    }

    // Deduplicate threats
    metadata.threats = this.deduplicateThreats(metadata.threats);

    return metadata;
  }

  /**
   * Deduplicate and merge threat entries
   */
  private deduplicateThreats(threats: AggregatedIOC['metadata']['threats']): typeof threats {
    const threatMap = new Map<string, typeof threats[0]>();

    threats.forEach(threat => {
      const key = `${threat.type}:${threat.name.toLowerCase()}`;
      const existing = threatMap.get(key);

      if (existing) {
        // Merge sources
        existing.sources = [...new Set([...existing.sources, ...threat.sources])];
        // Average confidence
        existing.confidence = (existing.confidence + threat.confidence) / 2;
      } else {
        threatMap.set(key, threat);
      }
    });

    return Array.from(threatMap.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Merge and deduplicate related indicators
   */
  private mergeRelatedIndicators(
    results: EnrichmentResponse[]
  ): AggregatedIOC['relatedIndicators'] {
    const indicatorMap = new Map<string, AggregatedIOC['relatedIndicators'][0]>();

    results.forEach(result => {
      const indicators = result.data?.relatedIndicators || [];
      const confidence = result.data?.reputation.confidence || 0.5;

      indicators.forEach(indicator => {
        const key = `${indicator.type}:${indicator.value}:${indicator.relationship}`;
        const existing = indicatorMap.get(key);

        if (existing) {
          // Merge sources
          existing.sources = [...new Set([...existing.sources, result.provider])];
          // Increase confidence with more sources
          existing.confidence = Math.min(
            existing.confidence + 0.1,
            1.0
          );
        } else {
          indicatorMap.set(key, {
            type: indicator.type,
            value: indicator.value,
            relationship: indicator.relationship,
            confidence,
            sources: [result.provider],
          });
        }
      });
    });

    return Array.from(indicatorMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 100); // Limit to top 100
  }

  /**
   * Merge and count tags from all providers
   */
  private mergeTags(results: EnrichmentResponse[]): AggregatedIOC['tags'] {
    const tagMap = new Map<string, { count: number; sources: Set<string> }>();

    results.forEach(result => {
      const tags = result.data?.tags || [];

      tags.forEach(tag => {
        const normalized = tag.toLowerCase().trim();
        const existing = tagMap.get(normalized);

        if (existing) {
          existing.count++;
          existing.sources.add(result.provider);
        } else {
          tagMap.set(normalized, {
            count: 1,
            sources: new Set([result.provider]),
          });
        }
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        sources: Array.from(data.sources),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50); // Top 50 tags
  }

  /**
   * Count conflicts between providers
   */
  private countConflicts(results: EnrichmentResponse[]): number {
    if (results.length < 2) return 0;

    const verdicts = results
      .filter(r => r.data?.reputation)
      .map(r => r.data!.reputation.verdict);

    const uniqueVerdicts = new Set(verdicts);

    // If all agree, no conflicts
    if (uniqueVerdicts.size <= 1) return 0;

    // Count how many disagree with the majority
    const counts: Record<string, number> = {};
    verdicts.forEach(v => {
      counts[v] = (counts[v] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(counts));
    return verdicts.length - maxCount;
  }

  /**
   * Update provider weights based on accuracy
   */
  updateProviderWeight(provider: string, weight: number): void {
    if (weight < 0 || weight > 1) {
      throw new Error('Weight must be between 0 and 1');
    }

    this.config.providerWeights[provider] = weight;
    logger.info(`Updated ${provider} weight to ${weight}`);
  }

  /**
   * Get current configuration
   */
  getConfig(): AggregationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AggregationConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Aggregation config updated');
  }
}
