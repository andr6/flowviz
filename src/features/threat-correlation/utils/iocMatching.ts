/**
 * IOC Matching and Scoring Algorithms
 * Advanced algorithms for matching and scoring Indicators of Compromise
 */

import type { IOC, IOCType } from '../types';

/**
 * Calculate Jaccard similarity between two IOC sets
 */
export function calculateJaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Calculate weighted IOC overlap score with type-specific weights
 */
export function calculateWeightedIOCScore(iocs1: IOC[], iocs2: IOC[]): number {
  const typeWeights: Record<IOCType, number> = {
    hash: 1.0,      // Hashes are most specific
    email: 0.9,
    mutex: 0.85,
    registry_key: 0.8,
    file_path: 0.75,
    cve: 0.7,
    url: 0.6,
    domain: 0.5,
    ip: 0.4,        // IPs are less specific (can be shared infrastructure)
  };

  const typeScores: Record<IOCType, { matches: number; total: number }> = {} as any;

  // Initialize
  for (const type of Object.keys(typeWeights) as IOCType[]) {
    typeScores[type] = { matches: 0, total: 0 };
  }

  // Count IOCs by type
  for (const ioc of iocs1) {
    typeScores[ioc.type].total++;
  }

  for (const ioc of iocs2) {
    typeScores[ioc.type].total++;
  }

  // Find matches
  for (const ioc1 of iocs1) {
    const match = iocs2.find(ioc2 => 
      ioc1.type === ioc2.type && 
      normalizeIOCValue(ioc1.value, ioc1.type) === normalizeIOCValue(ioc2.value, ioc2.type)
    );
    
    if (match) {
      typeScores[ioc1.type].matches++;
    }
  }

  // Calculate weighted score
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [type, { matches, total }] of Object.entries(typeScores)) {
    if (total > 0) {
      const weight = typeWeights[type as IOCType];
      const typeScore = (matches * 2) / total; // Multiply by 2 because we counted both sets
      
      weightedSum += typeScore * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.min(weightedSum / totalWeight, 1.0) : 0;
}

/**
 * Normalize IOC values for consistent comparison
 */
export function normalizeIOCValue(value: string, type: IOCType): string {
  switch (type) {
    case 'domain':
    case 'url':
    case 'email':
      return value.toLowerCase().trim();
    
    case 'hash':
      return value.toLowerCase().replace(/[^a-f0-9]/g, '');
    
    case 'ip':
      return value.trim();
    
    case 'file_path':
    case 'registry_key':
      return value.toLowerCase().replace(/\\/g, '/').trim();
    
    default:
      return value.trim();
  }
}

/**
 * Extract domain from URL
 */
export function extractDomainFromURL(url: string): string | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Check if two IPs are in the same subnet
 */
export function isSameSubnet(ip1: string, ip2: string, cidr: number = 24): boolean {
  try {
    const ip1Parts = ip1.split('.').map(Number);
    const ip2Parts = ip2.split('.').map(Number);
    
    const maskBits = cidr;
    const fullBytes = Math.floor(maskBits / 8);
    const remainingBits = maskBits % 8;
    
    // Check full bytes
    for (let i = 0; i < fullBytes; i++) {
      if (ip1Parts[i] !== ip2Parts[i]) return false;
    }
    
    // Check remaining bits
    if (remainingBits > 0 && fullBytes < 4) {
      const mask = (0xFF << (8 - remainingBits)) & 0xFF;
      if ((ip1Parts[fullBytes] & mask) !== (ip2Parts[fullBytes] & mask)) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculate infrastructure overlap score (considers domain families, IP subnets)
 */
export function calculateInfrastructureScore(iocs1: IOC[], iocs2: IOC[]): number {
  const infra1 = iocs1.filter(ioc => ['ip', 'domain', 'url'].includes(ioc.type));
  const infra2 = iocs2.filter(ioc => ['ip', 'domain', 'url'].includes(ioc.type));
  
  if (infra1.length === 0 || infra2.length === 0) return 0;
  
  let matches = 0;
  let checked = 0;
  
  for (const ioc1 of infra1) {
    for (const ioc2 of infra2) {
      checked++;
      
      // Exact match
      if (ioc1.type === ioc2.type && 
          normalizeIOCValue(ioc1.value, ioc1.type) === normalizeIOCValue(ioc2.value, ioc2.type)) {
        matches += 1.0;
        continue;
      }
      
      // Domain family match (same TLD+1)
      if ((ioc1.type === 'domain' || ioc1.type === 'url') && 
          (ioc2.type === 'domain' || ioc2.type === 'url')) {
        const domain1 = ioc1.type === 'url' ? extractDomainFromURL(ioc1.value) : ioc1.value;
        const domain2 = ioc2.type === 'url' ? extractDomainFromURL(ioc2.value) : ioc2.value;
        
        if (domain1 && domain2 && areSameDomainFamily(domain1, domain2)) {
          matches += 0.7; // Partial match for domain family
          continue;
        }
      }
      
      // Same subnet match
      if (ioc1.type === 'ip' && ioc2.type === 'ip') {
        if (isSameSubnet(ioc1.value, ioc2.value, 24)) {
          matches += 0.6; // Partial match for same subnet
          continue;
        }
      }
    }
  }
  
  return checked > 0 ? Math.min(matches / Math.min(infra1.length, infra2.length), 1.0) : 0;
}

/**
 * Check if two domains belong to same family (same registered domain)
 */
export function areSameDomainFamily(domain1: string, domain2: string): boolean {
  const registeredDomain1 = getRegisteredDomain(domain1);
  const registeredDomain2 = getRegisteredDomain(domain2);
  
  return registeredDomain1 === registeredDomain2;
}

/**
 * Extract registered domain (TLD + 1 level)
 */
export function getRegisteredDomain(domain: string): string {
  const parts = domain.toLowerCase().split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return domain.toLowerCase();
}

/**
 * Fuzzy match IOC values using Levenshtein distance
 */
export function fuzzyMatchIOC(value1: string, value2: string, threshold: number = 0.8): boolean {
  const distance = levenshteinDistance(value1.toLowerCase(), value2.toLowerCase());
  const maxLength = Math.max(value1.length, value2.length);
  
  if (maxLength === 0) return true;
  
  const similarity = 1 - (distance / maxLength);
  return similarity >= threshold;
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Group similar IOCs using clustering
 */
export function clusterIOCs(iocs: IOC[], similarityThreshold: number = 0.8): IOC[][] {
  const clusters: IOC[][] = [];
  const processed = new Set<number>();
  
  for (let i = 0; i < iocs.length; i++) {
    if (processed.has(i)) continue;
    
    const cluster: IOC[] = [iocs[i]];
    processed.add(i);
    
    for (let j = i + 1; j < iocs.length; j++) {
      if (processed.has(j)) continue;
      
      if (iocs[i].type === iocs[j].type) {
        const normalized1 = normalizeIOCValue(iocs[i].value, iocs[i].type);
        const normalized2 = normalizeIOCValue(iocs[j].value, iocs[j].type);
        
        if (fuzzyMatchIOC(normalized1, normalized2, similarityThreshold)) {
          cluster.push(iocs[j]);
          processed.add(j);
        }
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters;
}

/**
 * Calculate IOC confidence score based on multiple factors
 */
export function calculateIOCConfidence(ioc: IOC): number {
  let confidence = 0.5; // Base confidence
  
  // Factor 1: IOC type (some are more reliable)
  const typeConfidence: Record<IOCType, number> = {
    hash: 0.9,
    mutex: 0.85,
    registry_key: 0.8,
    cve: 0.9,
    email: 0.75,
    file_path: 0.7,
    url: 0.7,
    domain: 0.65,
    ip: 0.6,
  };
  
  confidence += (typeConfidence[ioc.type] - 0.5);
  
  // Factor 2: Enrichment data availability
  if (ioc.enrichment && Object.keys(ioc.enrichment).length > 0) {
    confidence += 0.1;
  }
  
  // Factor 3: Source reputation
  if (ioc.source && ['virustotal', 'misp', 'opencti'].includes(ioc.source.toLowerCase())) {
    confidence += 0.1;
  }
  
  // Factor 4: Temporal freshness
  if (ioc.firstSeen && ioc.lastSeen) {
    const daysSinceLastSeen = (Date.now() - new Date(ioc.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSeen <= 7) {
      confidence += 0.1;
    } else if (daysSinceLastSeen <= 30) {
      confidence += 0.05;
    }
  }
  
  return Math.min(Math.max(confidence, 0), 1);
}

/**
 * Deduplicate IOCs while preserving enrichment data
 */
export function deduplicateIOCs(iocs: IOC[]): IOC[] {
  const map = new Map<string, IOC>();
  
  for (const ioc of iocs) {
    const key = `${ioc.type}:${normalizeIOCValue(ioc.value, ioc.type)}`;
    
    const existing = map.get(key);
    if (!existing) {
      map.set(key, ioc);
    } else {
      // Merge enrichment data
      map.set(key, {
        ...existing,
        confidence: Math.max(existing.confidence || 0, ioc.confidence || 0),
        enrichment: {
          ...existing.enrichment,
          ...ioc.enrichment,
        },
        firstSeen: existing.firstSeen && ioc.firstSeen
          ? new Date(Math.min(new Date(existing.firstSeen).getTime(), new Date(ioc.firstSeen).getTime()))
          : existing.firstSeen || ioc.firstSeen,
        lastSeen: existing.lastSeen && ioc.lastSeen
          ? new Date(Math.max(new Date(existing.lastSeen).getTime(), new Date(ioc.lastSeen).getTime()))
          : existing.lastSeen || ioc.lastSeen,
      });
    }
  }
  
  return Array.from(map.values());
}
