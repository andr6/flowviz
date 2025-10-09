/**
 * IOC Correlation Service
 * Analyzes relationships between Indicators of Compromise across flows
 */

export interface IOCOverlap {
  overlap_score: number; // 0.0 to 1.0
  shared_iocs: any[];
  ioc_count_flow1: number;
  ioc_count_flow2: number;
  overlap_count: number;
  overlap_ratio: number;
  infrastructure_overlap: InfrastructureOverlap;
  hash_overlap: HashOverlap;
  network_overlap: NetworkOverlap;
}

export interface InfrastructureOverlap {
  shared_ips: string[];
  shared_domains: string[];
  shared_urls: string[];
  c2_overlap_score: number;
}

export interface HashOverlap {
  shared_file_hashes: string[];
  hash_families: string[];
  malware_overlap_score: number;
}

export interface NetworkOverlap {
  shared_ports: number[];
  shared_protocols: string[];
  network_pattern_score: number;
}

export class IOCCorrelationService {
  // IOC type weights for scoring
  private readonly IOC_TYPE_WEIGHTS = {
    ip: 0.8,
    ipv4: 0.8,
    ipv6: 0.8,
    domain: 0.9,
    url: 0.85,
    email: 0.7,
    'file-hash': 1.0,
    md5: 1.0,
    sha1: 1.0,
    sha256: 1.0,
    'mutex': 0.9,
    'registry-key': 0.85,
    'file-path': 0.7,
    'user-agent': 0.6,
    certificate: 0.95,
  };

  /**
   * Analyze IOC overlap between two flows
   */
  analyzeIOCOverlap(iocs1: any[], iocs2: any[]): IOCOverlap {
    if (iocs1.length === 0 && iocs2.length === 0) {
      return this.createEmptyOverlap();
    }

    // Normalize IOCs
    const normalizedIOCs1 = this.normalizeIOCs(iocs1);
    const normalizedIOCs2 = this.normalizeIOCs(iocs2);

    // Find shared IOCs
    const sharedIOCs = this.findSharedIOCs(normalizedIOCs1, normalizedIOCs2);

    // Calculate overlap metrics
    const overlapCount = sharedIOCs.length;
    const overlapRatio = this.calculateOverlapRatio(
      normalizedIOCs1.length,
      normalizedIOCs2.length,
      overlapCount
    );

    // Calculate weighted overlap score
    const overlapScore = this.calculateWeightedOverlapScore(
      sharedIOCs,
      normalizedIOCs1.length,
      normalizedIOCs2.length
    );

    // Analyze infrastructure overlap
    const infrastructureOverlap = this.analyzeInfrastructureOverlap(iocs1, iocs2);

    // Analyze hash overlap (malware families)
    const hashOverlap = this.analyzeHashOverlap(iocs1, iocs2);

    // Analyze network patterns
    const networkOverlap = this.analyzeNetworkOverlap(iocs1, iocs2);

    return {
      overlap_score: overlapScore,
      shared_iocs: sharedIOCs,
      ioc_count_flow1: normalizedIOCs1.length,
      ioc_count_flow2: normalizedIOCs2.length,
      overlap_count: overlapCount,
      overlap_ratio: overlapRatio,
      infrastructure_overlap: infrastructureOverlap,
      hash_overlap: hashOverlap,
      network_overlap: networkOverlap,
    };
  }

  /**
   * Normalize IOCs for consistent comparison
   */
  private normalizeIOCs(iocs: any[]): Array<{ type: string; value: string; original: any }> {
    return iocs
      .map((ioc) => {
        const type = this.normalizeIOCType(ioc.type || ioc.ioc_type);
        let value = (ioc.value || ioc.indicator || '').toString().toLowerCase().trim();

        // Normalize specific types
        if (type === 'domain' || type === 'url') {
          value = this.normalizeDomain(value);
        } else if (type.includes('ip')) {
          value = this.normalizeIP(value);
        } else if (type.includes('hash') || type.includes('md5') || type.includes('sha')) {
          value = value.toLowerCase();
        }

        return {
          type,
          value,
          original: ioc,
        };
      })
      .filter((ioc) => ioc.value); // Filter out empty values
  }

  /**
   * Normalize IOC type
   */
  private normalizeIOCType(type: string): string {
    const normalizedType = type.toLowerCase().trim().replace(/[-_\s]/g, '-');

    // Map common variations
    const typeMapping: Record<string, string> = {
      'ip-address': 'ip',
      'ip-addr': 'ip',
      'ipv4-addr': 'ipv4',
      'ipv6-addr': 'ipv6',
      'domain-name': 'domain',
      hostname: 'domain',
      'email-address': 'email',
      'email-addr': 'email',
      hash: 'file-hash',
      'file-md5': 'md5',
      'file-sha1': 'sha1',
      'file-sha256': 'sha256',
      mutex: 'mutex',
      'registry-key': 'registry-key',
      'file-path': 'file-path',
      path: 'file-path',
      'user-agent': 'user-agent',
      useragent: 'user-agent',
      cert: 'certificate',
      'ssl-cert': 'certificate',
    };

    return typeMapping[normalizedType] || normalizedType;
  }

  /**
   * Normalize domain/URL
   */
  private normalizeDomain(value: string): string {
    // Remove protocol
    value = value.replace(/^https?:\/\//, '');
    // Remove port
    value = value.replace(/:\d+/, '');
    // Remove path
    value = value.split('/')[0];
    // Remove www
    value = value.replace(/^www\./, '');
    return value.toLowerCase();
  }

  /**
   * Normalize IP address
   */
  private normalizeIP(value: string): string {
    // Remove brackets for IPv6
    return value.replace(/[\[\]]/g, '').toLowerCase();
  }

  /**
   * Find shared IOCs between two sets
   */
  private findSharedIOCs(
    iocs1: Array<{ type: string; value: string; original: any }>,
    iocs2: Array<{ type: string; value: string; original: any }>
  ): any[] {
    const iocs2Map = new Map(iocs2.map((ioc) => [`${ioc.type}:${ioc.value}`, ioc.original]));

    const shared: any[] = [];
    const seen = new Set<string>();

    iocs1.forEach((ioc) => {
      const key = `${ioc.type}:${ioc.value}`;
      if (iocs2Map.has(key) && !seen.has(key)) {
        shared.push(ioc.original);
        seen.add(key);
      }
    });

    return shared;
  }

  /**
   * Calculate overlap ratio using Jaccard coefficient
   */
  private calculateOverlapRatio(
    count1: number,
    count2: number,
    overlapCount: number
  ): number {
    const union = count1 + count2 - overlapCount;
    return union > 0 ? overlapCount / union : 0.0;
  }

  /**
   * Calculate weighted overlap score based on IOC types
   */
  private calculateWeightedOverlapScore(
    sharedIOCs: any[],
    totalCount1: number,
    totalCount2: number
  ): number {
    if (sharedIOCs.length === 0) return 0.0;

    // Calculate weighted score for shared IOCs
    let weightedScore = 0;
    sharedIOCs.forEach((ioc) => {
      const type = this.normalizeIOCType(ioc.type || ioc.ioc_type);
      const weight = this.IOC_TYPE_WEIGHTS[type as keyof typeof this.IOC_TYPE_WEIGHTS] || 0.5;
      weightedScore += weight;
    });

    // Normalize by average total count
    const avgTotal = (totalCount1 + totalCount2) / 2;
    const normalizedScore = avgTotal > 0 ? weightedScore / avgTotal : 0;

    return Math.min(normalizedScore, 1.0);
  }

  /**
   * Analyze infrastructure overlap (C2 servers, domains)
   */
  private analyzeInfrastructureOverlap(iocs1: any[], iocs2: any[]): InfrastructureOverlap {
    const ips1 = this.extractByType(iocs1, ['ip', 'ipv4', 'ipv6']);
    const ips2 = this.extractByType(iocs2, ['ip', 'ipv4', 'ipv6']);

    const domains1 = this.extractByType(iocs1, ['domain', 'hostname']);
    const domains2 = this.extractByType(iocs2, ['domain', 'hostname']);

    const urls1 = this.extractByType(iocs1, ['url']);
    const urls2 = this.extractByType(iocs2, ['url']);

    const sharedIPs = this.findSharedValues(ips1, ips2);
    const sharedDomains = this.findSharedValues(domains1, domains2);
    const sharedURLs = this.findSharedValues(urls1, urls2);

    // Calculate C2 overlap score
    const totalInfra = new Set([...ips1, ...ips2, ...domains1, ...domains2]).size;
    const sharedInfra = sharedIPs.length + sharedDomains.length + sharedURLs.length;
    const c2OverlapScore = totalInfra > 0 ? sharedInfra / totalInfra : 0;

    return {
      shared_ips: sharedIPs,
      shared_domains: sharedDomains,
      shared_urls: sharedURLs,
      c2_overlap_score: c2OverlapScore,
    };
  }

  /**
   * Analyze hash overlap (potential malware families)
   */
  private analyzeHashOverlap(iocs1: any[], iocs2: any[]): HashOverlap {
    const hashes1 = this.extractByType(iocs1, ['file-hash', 'md5', 'sha1', 'sha256']);
    const hashes2 = this.extractByType(iocs2, ['file-hash', 'md5', 'sha1', 'sha256']);

    const sharedHashes = this.findSharedValues(hashes1, hashes2);

    // Extract malware families if available
    const families1 = this.extractMalwareFamilies(iocs1);
    const families2 = this.extractMalwareFamilies(iocs2);
    const sharedFamilies = this.findSharedValues(families1, families2);

    // Calculate malware overlap score
    const totalHashes = new Set([...hashes1, ...hashes2]).size;
    const malwareOverlapScore =
      totalHashes > 0 ? sharedHashes.length / totalHashes : 0;

    return {
      shared_file_hashes: sharedHashes,
      hash_families: sharedFamilies,
      malware_overlap_score: malwareOverlapScore,
    };
  }

  /**
   * Analyze network patterns
   */
  private analyzeNetworkOverlap(iocs1: any[], iocs2: any[]): NetworkOverlap {
    const ports1 = this.extractPorts(iocs1);
    const ports2 = this.extractPorts(iocs2);

    const protocols1 = this.extractProtocols(iocs1);
    const protocols2 = this.extractProtocols(iocs2);

    const sharedPorts = this.findSharedValues(ports1, ports2);
    const sharedProtocols = this.findSharedValues(protocols1, protocols2);

    // Calculate network pattern score
    const totalPatterns = new Set([
      ...ports1.map(String),
      ...ports2.map(String),
      ...protocols1,
      ...protocols2,
    ]).size;
    const sharedPatterns = sharedPorts.length + sharedProtocols.length;
    const networkPatternScore = totalPatterns > 0 ? sharedPatterns / totalPatterns : 0;

    return {
      shared_ports: sharedPorts,
      shared_protocols: sharedProtocols,
      network_pattern_score: networkPatternScore,
    };
  }

  /**
   * Extract IOCs by type
   */
  private extractByType(iocs: any[], types: string[]): string[] {
    return iocs
      .filter((ioc) => {
        const type = this.normalizeIOCType(ioc.type || ioc.ioc_type);
        return types.includes(type);
      })
      .map((ioc) => (ioc.value || ioc.indicator || '').toString().toLowerCase().trim())
      .filter(Boolean);
  }

  /**
   * Extract malware families from IOCs
   */
  private extractMalwareFamilies(iocs: any[]): string[] {
    const families: string[] = [];
    iocs.forEach((ioc) => {
      if (ioc.malware_family) {
        families.push(ioc.malware_family.toLowerCase());
      }
      if (ioc.family) {
        families.push(ioc.family.toLowerCase());
      }
      if (ioc.tags) {
        const tags = Array.isArray(ioc.tags) ? ioc.tags : [ioc.tags];
        tags.forEach((tag: string) => {
          if (typeof tag === 'string' && tag.toLowerCase().includes('malware')) {
            families.push(tag.toLowerCase());
          }
        });
      }
    });
    return [...new Set(families)];
  }

  /**
   * Extract ports from IOCs
   */
  private extractPorts(iocs: any[]): number[] {
    const ports: number[] = [];
    iocs.forEach((ioc) => {
      if (ioc.port) {
        const port = parseInt(ioc.port.toString(), 10);
        if (!isNaN(port)) ports.push(port);
      }
      // Extract from URLs
      if (ioc.type === 'url' && ioc.value) {
        try {
          const url = new URL(ioc.value);
          if (url.port) {
            const port = parseInt(url.port, 10);
            if (!isNaN(port)) ports.push(port);
          }
        } catch {
          // Ignore invalid URLs
        }
      }
    });
    return [...new Set(ports)];
  }

  /**
   * Extract protocols from IOCs
   */
  private extractProtocols(iocs: any[]): string[] {
    const protocols: string[] = [];
    iocs.forEach((ioc) => {
      if (ioc.protocol) {
        protocols.push(ioc.protocol.toLowerCase());
      }
      // Extract from URLs
      if (ioc.type === 'url' && ioc.value) {
        try {
          const url = new URL(ioc.value);
          protocols.push(url.protocol.replace(':', '').toLowerCase());
        } catch {
          // Ignore invalid URLs
        }
      }
    });
    return [...new Set(protocols)];
  }

  /**
   * Find shared values between two arrays
   */
  private findSharedValues<T>(arr1: T[], arr2: T[]): T[] {
    const set2 = new Set(arr2);
    return [...new Set(arr1.filter((item) => set2.has(item)))];
  }

  /**
   * Create empty overlap result
   */
  private createEmptyOverlap(): IOCOverlap {
    return {
      overlap_score: 0,
      shared_iocs: [],
      ioc_count_flow1: 0,
      ioc_count_flow2: 0,
      overlap_count: 0,
      overlap_ratio: 0,
      infrastructure_overlap: {
        shared_ips: [],
        shared_domains: [],
        shared_urls: [],
        c2_overlap_score: 0,
      },
      hash_overlap: {
        shared_file_hashes: [],
        hash_families: [],
        malware_overlap_score: 0,
      },
      network_overlap: {
        shared_ports: [],
        shared_protocols: [],
        network_pattern_score: 0,
      },
    };
  }

  /**
   * Identify potential IOC pivots for threat hunting
   */
  identifyPivotPoints(iocs: any[]): Array<{ ioc: any; pivot_score: number; reason: string }> {
    return iocs
      .map((ioc) => {
        const type = this.normalizeIOCType(ioc.type || ioc.ioc_type);
        let pivotScore = 0;
        const reasons: string[] = [];

        // High-value pivot points
        if (['domain', 'ip', 'ipv4', 'ipv6'].includes(type)) {
          pivotScore += 0.8;
          reasons.push('Infrastructure pivot');
        }

        if (['md5', 'sha1', 'sha256', 'file-hash'].includes(type)) {
          pivotScore += 0.9;
          reasons.push('Malware family pivot');
        }

        if (type === 'certificate') {
          pivotScore += 0.95;
          reasons.push('Certificate reuse');
        }

        if (type === 'mutex') {
          pivotScore += 0.85;
          reasons.push('Malware behavior pivot');
        }

        // Boost score for rare indicators
        if (ioc.prevalence === 'rare' || ioc.confidence === 'high') {
          pivotScore += 0.1;
          reasons.push('Rare indicator');
        }

        return {
          ioc,
          pivot_score: Math.min(pivotScore, 1.0),
          reason: reasons.join(', '),
        };
      })
      .filter((pivot) => pivot.pivot_score >= 0.5)
      .sort((a, b) => b.pivot_score - a.pivot_score);
  }

  /**
   * Calculate IOC confidence score
   */
  calculateIOCConfidence(ioc: any): number {
    let confidence = 0.5; // Base confidence

    // Explicit confidence value
    if (ioc.confidence) {
      const confMap: Record<string, number> = {
        low: 0.3,
        medium: 0.6,
        high: 0.9,
      };
      if (typeof ioc.confidence === 'string') {
        confidence = confMap[ioc.confidence.toLowerCase()] || 0.5;
      } else if (typeof ioc.confidence === 'number') {
        confidence = ioc.confidence;
      }
    }

    // Adjust based on source
    if (ioc.source) {
      const trustedSources = ['crowdstrike', 'mandiant', 'kaspersky', 'symantec', 'virustotal'];
      if (trustedSources.some((s) => ioc.source.toLowerCase().includes(s))) {
        confidence += 0.2;
      }
    }

    // Adjust based on age
    if (ioc.first_seen) {
      const age = Date.now() - new Date(ioc.first_seen).getTime();
      const daysSinceFirstSeen = age / (1000 * 60 * 60 * 24);
      if (daysSinceFirstSeen > 365) {
        confidence -= 0.1; // Older IOCs may be less relevant
      }
    }

    return Math.max(0, Math.min(confidence, 1.0));
  }
}
