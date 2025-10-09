import crypto from 'crypto';

import { logger } from '../../../shared/utils/logger';

export interface DocumentFingerprint {
  id: string;
  filename: string;
  contentHash: string;
  structuralHash: string;
  textSimilarityHash: string;
  metadata: {
    size: number;
    type: string;
    extractedText: string;
    iocs: string[];
    entities: string[];
    keywords: string[];
  };
  createdAt: Date;
}

export interface DuplicateMatch {
  originalId: string;
  duplicateId: string;
  similarityScore: number;
  matchType: 'exact' | 'near_exact' | 'semantic' | 'structural';
  confidence: number;
  details: {
    contentSimilarity: number;
    structuralSimilarity: number;
    semanticSimilarity: number;
    entityOverlap: number;
    iocOverlap: number;
  };
}

export interface DuplicateCluster {
  id: string;
  representative: string; // ID of the representative document
  members: string[];
  similarityScore: number;
  createdAt: Date;
  mergedAt?: Date;
}

export class DuplicateDetectionService {
  private static instance: DuplicateDetectionService;
  private fingerprints: Map<string, DocumentFingerprint> = new Map();
  private clusters: Map<string, DuplicateCluster> = new Map();
  private threshold = 0.85; // Default similarity threshold

  private constructor() {}

  static getInstance(): DuplicateDetectionService {
    if (!DuplicateDetectionService.instance) {
      DuplicateDetectionService.instance = new DuplicateDetectionService();
    }
    return DuplicateDetectionService.instance;
  }

  /**
   * Generate a comprehensive fingerprint for a document
   */
  async generateFingerprint(
    id: string,
    filename: string,
    content: string,
    extractedData: {
      iocs: string[];
      entities: string[];
      keywords: string[];
    }
  ): Promise<DocumentFingerprint> {
    const normalizedContent = this.normalizeText(content);
    
    const fingerprint: DocumentFingerprint = {
      id,
      filename,
      contentHash: this.generateContentHash(normalizedContent),
      structuralHash: this.generateStructuralHash(content),
      textSimilarityHash: this.generateTextSimilarityHash(normalizedContent),
      metadata: {
        size: content.length,
        type: this.detectDocumentType(filename, content),
        extractedText: normalizedContent.substring(0, 10000), // Store first 10k chars for analysis
        iocs: extractedData.iocs || [],
        entities: extractedData.entities || [],
        keywords: extractedData.keywords || [],
      },
      createdAt: new Date(),
    };

    this.fingerprints.set(id, fingerprint);
    logger.info(`Generated fingerprint for document: ${id}`);
    
    return fingerprint;
  }

  /**
   * Detect duplicates for a new document
   */
  async detectDuplicates(
    fingerprint: DocumentFingerprint,
    threshold: number = this.threshold
  ): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];

    for (const [existingId, existingFingerprint] of this.fingerprints) {
      if (existingId === fingerprint.id) {continue;}

      const similarity = await this.calculateSimilarity(fingerprint, existingFingerprint);
      
      if (similarity.overall >= threshold) {
        matches.push({
          originalId: existingId,
          duplicateId: fingerprint.id,
          similarityScore: similarity.overall,
          matchType: this.determineMatchType(similarity),
          confidence: this.calculateConfidence(similarity),
          details: {
            contentSimilarity: similarity.content,
            structuralSimilarity: similarity.structural,
            semanticSimilarity: similarity.semantic,
            entityOverlap: similarity.entityOverlap,
            iocOverlap: similarity.iocOverlap,
          },
        });
      }
    }

    // Sort by similarity score (highest first)
    matches.sort((a, b) => b.similarityScore - a.similarityScore);

    if (matches.length > 0) {
      logger.info(`Found ${matches.length} duplicate matches for document: ${fingerprint.id}`);
    }

    return matches;
  }

  /**
   * Create or update document clusters based on duplicates
   */
  async updateClusters(matches: DuplicateMatch[]): Promise<void> {
    for (const match of matches) {
      const existingCluster = this.findClusterByDocument(match.originalId);
      
      if (existingCluster) {
        // Add to existing cluster
        existingCluster.members.push(match.duplicateId);
        existingCluster.mergedAt = new Date();
        logger.info(`Added document ${match.duplicateId} to existing cluster ${existingCluster.id}`);
      } else {
        // Create new cluster
        const clusterId = crypto.randomUUID();
        const newCluster: DuplicateCluster = {
          id: clusterId,
          representative: match.originalId,
          members: [match.originalId, match.duplicateId],
          similarityScore: match.similarityScore,
          createdAt: new Date(),
        };
        
        this.clusters.set(clusterId, newCluster);
        logger.info(`Created new cluster ${clusterId} with documents ${match.originalId} and ${match.duplicateId}`);
      }
    }
  }

  /**
   * Get all duplicate clusters
   */
  getClusters(): DuplicateCluster[] {
    return Array.from(this.clusters.values());
  }

  /**
   * Get cluster containing a specific document
   */
  getClusterByDocument(documentId: string): DuplicateCluster | undefined {
    return this.findClusterByDocument(documentId);
  }

  /**
   * Calculate comprehensive similarity between two documents
   */
  private async calculateSimilarity(
    doc1: DocumentFingerprint,
    doc2: DocumentFingerprint
  ): Promise<{
    overall: number;
    content: number;
    structural: number;
    semantic: number;
    entityOverlap: number;
    iocOverlap: number;
  }> {
    // Exact hash comparison
    const contentSimilarity = doc1.contentHash === doc2.contentHash ? 1.0 : 0.0;
    const structuralSimilarity = doc1.structuralHash === doc2.structuralHash ? 1.0 : 0.0;
    
    // Text similarity using various algorithms
    const semanticSimilarity = contentSimilarity === 1.0 ? 1.0 : 
      await this.calculateTextSimilarity(doc1.metadata.extractedText, doc2.metadata.extractedText);
    
    // Entity and IOC overlap
    const entityOverlap = this.calculateSetOverlap(doc1.metadata.entities, doc2.metadata.entities);
    const iocOverlap = this.calculateSetOverlap(doc1.metadata.iocs, doc2.metadata.iocs);
    
    // Calculate weighted overall similarity
    const weights = {
      content: 0.4,
      structural: 0.2,
      semantic: 0.2,
      entity: 0.1,
      ioc: 0.1,
    };
    
    const overall = 
      (contentSimilarity * weights.content) +
      (structuralSimilarity * weights.structural) +
      (semanticSimilarity * weights.semantic) +
      (entityOverlap * weights.entity) +
      (iocOverlap * weights.ioc);

    return {
      overall,
      content: contentSimilarity,
      structural: structuralSimilarity,
      semantic: semanticSimilarity,
      entityOverlap,
      iocOverlap,
    };
  }

  /**
   * Calculate text similarity using multiple algorithms
   */
  private async calculateTextSimilarity(text1: string, text2: string): Promise<number> {
    // Jaccard similarity
    const jaccard = this.calculateJaccardSimilarity(text1, text2);
    
    // Cosine similarity (simplified)
    const cosine = this.calculateCosineSimilarity(text1, text2);
    
    // Levenshtein distance normalized
    const levenshtein = this.calculateNormalizedLevenshtein(text1, text2);
    
    // Return weighted average
    return (jaccard * 0.4) + (cosine * 0.4) + (levenshtein * 0.2);
  }

  /**
   * Generate content hash (exact duplicate detection)
   */
  private generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Generate structural hash (based on document structure)
   */
  private generateStructuralHash(content: string): string {
    // Extract structural elements (headings, lists, tables, etc.)
    const structure = content
      .replace(/\d+/g, 'NUM') // Replace numbers
      .replace(/[a-f0-9]{32,}/gi, 'HASH') // Replace hashes
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, 'IP') // Replace IPs
      .replace(/https?:\/\/[^\s]+/gi, 'URL') // Replace URLs
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 'EMAIL') // Replace emails
      .toLowerCase();
    
    return crypto.createHash('md5').update(structure).digest('hex');
  }

  /**
   * Generate text similarity hash (for fuzzy matching)
   */
  private generateTextSimilarityHash(content: string): string {
    // Create a simplified hash for similarity detection
    const normalized = content
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 3)
      .sort()
      .join('');
    
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(content: string): string {
    return content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, ' ')
      .trim();
  }

  /**
   * Detect document type from filename and content
   */
  private detectDocumentType(filename: string, content: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (extension) {
      return extension;
    }
    
    // Try to detect from content
    if (content.includes('<?xml') || content.includes('<html')) {
      return 'html';
    } else if (content.includes('{"') || content.includes('[{')) {
      return 'json';
    } else {
      return 'text';
    }
  }

  /**
   * Calculate Jaccard similarity between two texts
   */
  private calculateJaccardSimilarity(text1: string, text2: string): number {
    const set1 = new Set(text1.split(/\s+/));
    const set2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Calculate cosine similarity between two texts (simplified)
   */
  private calculateCosineSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    
    const wordSet = new Set([...words1, ...words2]);
    const vector1 = Array.from(wordSet).map(word => words1.filter(w => w === word).length);
    const vector2 = Array.from(wordSet).map(word => words2.filter(w => w === word).length);
    
    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
    
    return magnitude1 === 0 || magnitude2 === 0 ? 0 : dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Calculate normalized Levenshtein distance
   */
  private calculateNormalizedLevenshtein(text1: string, text2: string): number {
    const maxLength = Math.max(text1.length, text2.length);
    if (maxLength === 0) {return 1;}
    
    const distance = this.levenshteinDistance(text1, text2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(0).map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) {matrix[0][i] = i;}
    for (let j = 0; j <= str2.length; j++) {matrix[j][0] = j;}
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,     // deletion
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate overlap between two sets
   */
  private calculateSetOverlap(set1: string[], set2: string[]): number {
    if (set1.length === 0 && set2.length === 0) {return 1;}
    if (set1.length === 0 || set2.length === 0) {return 0;}
    
    const s1 = new Set(set1);
    const s2 = new Set(set2);
    const intersection = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);
    
    return intersection.size / union.size;
  }

  /**
   * Determine match type based on similarity scores
   */
  private determineMatchType(similarity: any): 'exact' | 'near_exact' | 'semantic' | 'structural' {
    if (similarity.content === 1.0) {return 'exact';}
    if (similarity.structural === 1.0 && similarity.semantic > 0.9) {return 'near_exact';}
    if (similarity.semantic > 0.8) {return 'semantic';}
    return 'structural';
  }

  /**
   * Calculate confidence score for a match
   */
  private calculateConfidence(similarity: any): number {
    // Higher confidence for multiple strong signals
    let confidence = similarity.overall;
    
    if (similarity.content === 1.0) {confidence = 1.0;}
    else if (similarity.structural > 0.9 && similarity.semantic > 0.8) {confidence = Math.min(0.95, confidence + 0.1);}
    else if (similarity.entityOverlap > 0.7 && similarity.iocOverlap > 0.7) {confidence = Math.min(0.9, confidence + 0.05);}
    
    return confidence;
  }

  /**
   * Find cluster containing a specific document
   */
  private findClusterByDocument(documentId: string): DuplicateCluster | undefined {
    for (const cluster of this.clusters.values()) {
      if (cluster.members.includes(documentId)) {
        return cluster;
      }
    }
    return undefined;
  }

  /**
   * Get duplicate detection statistics
   */
  getStatistics(): {
    totalDocuments: number;
    totalClusters: number;
    duplicatesDetected: number;
    averageClusterSize: number;
    duplicateRate: number;
  } {
    const totalDocuments = this.fingerprints.size;
    const totalClusters = this.clusters.size;
    const duplicatesDetected = Array.from(this.clusters.values())
      .reduce((sum, cluster) => sum + cluster.members.length - 1, 0); // Subtract 1 for representative
    
    const averageClusterSize = totalClusters > 0 
      ? Array.from(this.clusters.values()).reduce((sum, cluster) => sum + cluster.members.length, 0) / totalClusters
      : 0;
    
    const duplicateRate = totalDocuments > 0 ? duplicatesDetected / totalDocuments : 0;

    return {
      totalDocuments,
      totalClusters,
      duplicatesDetected,
      averageClusterSize,
      duplicateRate,
    };
  }
}

export const duplicateDetectionService = DuplicateDetectionService.getInstance();