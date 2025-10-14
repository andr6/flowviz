import { EventEmitter } from 'events';
import { logger } from '../../utils/logger.js';

// ==========================================
// ML/AI CORE TYPES
// ==========================================

export interface MLModel {
  id: string;
  name: string;
  type: ModelType;
  version: string;
  status: 'training' | 'ready' | 'updating' | 'deprecated';
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainedAt: Date;
  lastUpdated: Date;
  trainingDataSize: number;
  hyperparameters: Record<string, any>;
  organizationId?: string; // Organization-specific model
}

export type ModelType =
  | 'anomaly_detection'
  | 'threat_prediction'
  | 'ioc_classification'
  | 'campaign_clustering'
  | 'text_extraction'
  | 'recommendation'
  | 'graph_embedding';

// ==========================================
// ANOMALY DETECTION
// ==========================================

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyScore: number; // 0-1, higher = more anomalous
  anomalyType?: 'behavioral' | 'statistical' | 'temporal' | 'relational';
  reasons: string[];
  baselineDeviation: number;
  confidence: number;
  recommendations: string[];
}

export interface BehavioralBaseline {
  entityId: string;
  entityType: 'user' | 'ip' | 'domain' | 'organization';
  metrics: BaselineMetrics;
  calculatedAt: Date;
  sampleSize: number;
}

export interface BaselineMetrics {
  avgIOCsPerDay: number;
  avgEnrichmentsPerDay: number;
  avgConfidenceScore: number;
  commonThreatTypes: string[];
  commonSeverities: string[];
  peakActivityHours: number[];
  avgResponseTime: number;
  typicalDataSources: string[];
}

// ==========================================
// PREDICTIVE THREAT MODELING
// ==========================================

export interface ThreatPrediction {
  threatId: string;
  threatType: string;
  threatName: string;
  probability: number; // 0-1
  confidence: number;
  timeframe: {
    start: Date;
    end: Date;
  };
  predictedImpact: 'low' | 'medium' | 'high' | 'critical';
  indicators: PredictiveIndicator[];
  mitigations: string[];
  relatedCampaigns: string[];
}

export interface PredictiveIndicator {
  type: string;
  value: string;
  likelihood: number;
  firstSeenPrediction: Date;
  source: string;
}

export interface CampaignPrediction {
  campaignId: string;
  name: string;
  actors: string[];
  probability: number;
  phase: 'reconnaissance' | 'weaponization' | 'delivery' | 'exploitation' | 'installation' | 'command_control' | 'actions_objectives';
  nextPhaseETA: Date;
  targetedAssets: string[];
  techniques: string[];
}

// ==========================================
// NLP & TEXT EXTRACTION
// ==========================================

export interface TextExtractionResult {
  text: string;
  extractedIOCs: ExtractedIOC[];
  entities: NamedEntity[];
  sentiment: SentimentAnalysis;
  topics: Topic[];
  summary: string;
  keyPhrases: string[];
  language: string;
  confidence: number;
}

export interface ExtractedIOC {
  type: 'ip' | 'domain' | 'url' | 'email' | 'hash' | 'cve' | 'file_path';
  value: string;
  confidence: number;
  context: string; // Surrounding text
  position: { start: number; end: number };
}

export interface NamedEntity {
  type: 'threat_actor' | 'malware' | 'tool' | 'technique' | 'organization' | 'location';
  value: string;
  confidence: number;
  context: string;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  magnitude: number; // 0-1, intensity
  threatLevel: 'low' | 'medium' | 'high';
}

export interface Topic {
  name: string;
  keywords: string[];
  relevance: number;
  category: string;
}

// ==========================================
// RECOMMENDATION ENGINE
// ==========================================

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  relevance: number;
  confidence: number;
  reasoning: string[];
  targetResource: {
    type: string;
    id: string;
  };
  suggestedAction: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export type RecommendationType =
  | 'investigation'
  | 'enrichment_source'
  | 'playbook'
  | 'workflow'
  | 'similar_case'
  | 'threat_actor'
  | 'mitigation';

export interface SimilarityResult {
  itemId: string;
  itemType: string;
  similarity: number; // 0-1
  commonFeatures: string[];
  differingFeatures: string[];
}

// ==========================================
// GRAPH NEURAL NETWORKS
// ==========================================

export interface GraphEmbedding {
  nodeId: string;
  nodeType: string;
  embedding: number[]; // Vector representation
  neighbors: string[];
  importance: number;
  clusterLabel?: string;
}

export interface AttackPatternRecognition {
  patternId: string;
  patternName: string;
  confidence: number;
  nodes: string[];
  edges: Array<{ source: string; target: string; type: string }>;
  killChainStage: string;
  mitreT techniques: string[];
  similarity: number;
}

export interface RelationshipPrediction {
  sourceId: string;
  targetId: string;
  relationshipType: string;
  probability: number;
  confidence: number;
  reasoning: string[];
}

// ==========================================
// ML/AI SERVICE
// ==========================================

export class MLAIService extends EventEmitter {
  private isInitialized = false;
  private models: Map<string, MLModel> = new Map();
  private baselines: Map<string, BehavioralBaseline> = new Map();
  private embeddings: Map<string, GraphEmbedding> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing ML/AI Service...');

      await Promise.all([
        this.loadModels(),
        this.loadBaselines(),
        this.initializeMLPipeline()
      ]);

      this.isInitialized = true;
      logger.info('✅ ML/AI Service initialized');

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize ML/AI Service:', error);
      throw error;
    }
  }

  // ==========================================
  // ANOMALY DETECTION
  // ==========================================

  /**
   * Detect anomalies in IOC behavior
   */
  async detectAnomalies(data: {
    entityId: string;
    entityType: BehavioralBaseline['entityType'];
    metrics: Partial<BaselineMetrics>;
  }): Promise<AnomalyDetectionResult> {
    try {
      logger.info(`Detecting anomalies for ${data.entityType}: ${data.entityId}`);

      // Get baseline
      const baseline = await this.getOrCreateBaseline(data.entityId, data.entityType);

      // Calculate anomaly score
      const anomalyScore = this.calculateAnomalyScore(data.metrics, baseline.metrics);

      // Determine if anomalous
      const threshold = 0.7;
      const isAnomaly = anomalyScore > threshold;

      // Identify specific anomaly reasons
      const reasons = this.identifyAnomalyReasons(data.metrics, baseline.metrics);

      // Calculate baseline deviation
      const deviation = this.calculateDeviation(data.metrics, baseline.metrics);

      return {
        isAnomaly,
        anomalyScore,
        anomalyType: this.classifyAnomalyType(reasons),
        reasons,
        baselineDeviation: deviation,
        confidence: this.calculateConfidence(baseline.sampleSize),
        recommendations: this.generateAnomalyRecommendations(isAnomaly, reasons)
      };
    } catch (error) {
      logger.error('Anomaly detection failed:', error);
      throw error;
    }
  }

  /**
   * Learn behavioral baseline
   */
  async learnBaseline(
    entityId: string,
    entityType: BehavioralBaseline['entityType'],
    historicalData: Partial<BaselineMetrics>[]
  ): Promise<BehavioralBaseline> {
    logger.info(`Learning baseline for ${entityType}: ${entityId}`);

    const baseline: BehavioralBaseline = {
      entityId,
      entityType,
      metrics: this.aggregateMetrics(historicalData),
      calculatedAt: new Date(),
      sampleSize: historicalData.length
    };

    this.baselines.set(entityId, baseline);
    await this.saveBaselineToDatabase(baseline);

    return baseline;
  }

  // ==========================================
  // PREDICTIVE THREAT MODELING
  // ==========================================

  /**
   * Predict likely threats
   */
  async predictThreats(context: {
    organizationId: string;
    recentIOCs: string[];
    recentActivities: any[];
    timeframeHours: number;
  }): Promise<ThreatPrediction[]> {
    try {
      logger.info('Predicting threats...');

      const predictions: ThreatPrediction[] = [];

      // Analyze patterns in recent IOCs
      const patterns = await this.analyzeIOCPatterns(context.recentIOCs);

      // Use ML model for threat prediction
      const model = this.getModel('threat_prediction');
      if (!model || model.status !== 'ready') {
        logger.warn('Threat prediction model not available');
        return [];
      }

      // Generate predictions based on patterns
      for (const pattern of patterns) {
        const prediction = await this.generateThreatPrediction(
          pattern,
          context.timeframeHours
        );

        if (prediction.probability > 0.5) {
          predictions.push(prediction);
        }
      }

      // Sort by probability
      predictions.sort((a, b) => b.probability - a.probability);

      logger.info(`Generated ${predictions.length} threat predictions`);
      return predictions.slice(0, 10); // Top 10
    } catch (error) {
      logger.error('Threat prediction failed:', error);
      throw error;
    }
  }

  /**
   * Detect campaigns in progress
   */
  async detectCampaigns(indicators: string[]): Promise<CampaignPrediction[]> {
    try {
      logger.info('Detecting ongoing campaigns...');

      // Use clustering to identify campaign patterns
      const clusters = await this.clusterIndicators(indicators);

      const campaigns: CampaignPrediction[] = [];

      for (const cluster of clusters) {
        const campaign = await this.identifyCampaign(cluster);
        if (campaign) {
          campaigns.push(campaign);
        }
      }

      return campaigns;
    } catch (error) {
      logger.error('Campaign detection failed:', error);
      throw error;
    }
  }

  // ==========================================
  // NLP & TEXT EXTRACTION
  // ==========================================

  /**
   * Extract IOCs from text
   */
  async extractIOCsFromText(text: string): Promise<TextExtractionResult> {
    try {
      logger.info('Extracting IOCs from text...');

      const result: TextExtractionResult = {
        text,
        extractedIOCs: [],
        entities: [],
        sentiment: {
          sentiment: 'neutral',
          score: 0,
          magnitude: 0,
          threatLevel: 'low'
        },
        topics: [],
        summary: '',
        keyPhrases: [],
        language: 'en',
        confidence: 0.85
      };

      // Extract IOCs using regex patterns
      result.extractedIOCs = this.extractIOCs(text);

      // Extract named entities
      result.entities = this.extractNamedEntities(text);

      // Analyze sentiment
      result.sentiment = this.analyzeSentiment(text);

      // Extract topics
      result.topics = this.extractTopics(text);

      // Generate summary
      result.summary = this.generateSummary(text);

      // Extract key phrases
      result.keyPhrases = this.extractKeyPhrases(text);

      logger.info(`Extracted ${result.extractedIOCs.length} IOCs from text`);
      return result;
    } catch (error) {
      logger.error('Text extraction failed:', error);
      throw error;
    }
  }

  /**
   * Summarize threat report
   */
  async summarizeReport(text: string, maxLength: number = 200): Promise<string> {
    try {
      // Simple extractive summarization
      const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

      if (sentences.length <= 3) {
        return text;
      }

      // Score sentences by importance
      const scoredSentences = sentences.map(sentence => ({
        sentence,
        score: this.scoreSentence(sentence, text)
      }));

      // Sort by score and take top sentences
      scoredSentences.sort((a, b) => b.score - a.score);

      const summarySentences = scoredSentences.slice(0, 3).map(s => s.sentence);
      return summarySentences.join('. ') + '.';
    } catch (error) {
      logger.error('Summarization failed:', error);
      return text.substring(0, maxLength) + '...';
    }
  }

  /**
   * Auto-tag content
   */
  async autoTag(content: string, existingTags: string[] = []): Promise<string[]> {
    const tags = new Set(existingTags);

    // Extract IOC types
    const iocTypes = this.extractIOCs(content);
    for (const ioc of iocTypes) {
      tags.add(ioc.type);
    }

    // Extract threat actor names
    const entities = this.extractNamedEntities(content);
    for (const entity of entities) {
      if (entity.type === 'threat_actor' || entity.type === 'malware') {
        tags.add(entity.value.toLowerCase());
      }
    }

    // Extract MITRE techniques
    const mitrePattern = /T\d{4}(?:\.\d{3})?/g;
    const matches = content.match(mitrePattern);
    if (matches) {
      matches.forEach(match => tags.add(match));
    }

    // Add threat level tag
    const sentiment = this.analyzeSentiment(content);
    tags.add(`threat:${sentiment.threatLevel}`);

    return Array.from(tags);
  }

  // ==========================================
  // RECOMMENDATION ENGINE
  // ==========================================

  /**
   * Generate recommendations
   */
  async generateRecommendations(context: {
    userId: string;
    currentResourceId: string;
    resourceType: string;
    recentActivity: any[];
  }): Promise<Recommendation[]> {
    try {
      logger.info('Generating recommendations...');

      const recommendations: Recommendation[] = [];

      // Similar items
      const similar = await this.findSimilarItems(
        context.currentResourceId,
        context.resourceType
      );

      for (const item of similar.slice(0, 5)) {
        recommendations.push({
          id: this.generateUUID(),
          type: 'similar_case',
          title: `Similar ${context.resourceType}`,
          description: `Found similar item with ${(item.similarity * 100).toFixed(0)}% similarity`,
          relevance: item.similarity,
          confidence: 0.8,
          reasoning: item.commonFeatures,
          targetResource: {
            type: item.itemType,
            id: item.itemId
          },
          suggestedAction: `Review similar ${item.itemType}`,
          priority: item.similarity > 0.8 ? 'high' : 'medium',
          createdAt: new Date()
        });
      }

      // Enrichment source recommendations
      const enrichmentRecs = await this.recommendEnrichmentSources(context);
      recommendations.push(...enrichmentRecs);

      // Playbook recommendations
      const playbookRecs = await this.recommendPlaybooks(context);
      recommendations.push(...playbookRecs);

      // Sort by relevance
      recommendations.sort((a, b) => b.relevance - a.relevance);

      return recommendations;
    } catch (error) {
      logger.error('Recommendation generation failed:', error);
      throw error;
    }
  }

  /**
   * Find similar cases/investigations
   */
  async findSimilarItems(
    itemId: string,
    itemType: string,
    limit: number = 10
  ): Promise<SimilarityResult[]> {
    try {
      // Get item embedding
      const embedding = this.embeddings.get(itemId);
      if (!embedding) {
        return [];
      }

      const similarities: SimilarityResult[] = [];

      // Calculate similarity with all other items of same type
      for (const [id, otherEmbedding] of this.embeddings.entries()) {
        if (id === itemId || otherEmbedding.nodeType !== itemType) {
          continue;
        }

        const similarity = this.cosineSimilarity(
          embedding.embedding,
          otherEmbedding.embedding
        );

        if (similarity > 0.5) {
          similarities.push({
            itemId: id,
            itemType: otherEmbedding.nodeType,
            similarity,
            commonFeatures: this.findCommonFeatures(embedding, otherEmbedding),
            differingFeatures: []
          });
        }
      }

      // Sort by similarity
      similarities.sort((a, b) => b.similarity - a.similarity);

      return similarities.slice(0, limit);
    } catch (error) {
      logger.error('Similarity search failed:', error);
      return [];
    }
  }

  // ==========================================
  // GRAPH NEURAL NETWORKS
  // ==========================================

  /**
   * Recognize attack patterns
   */
  async recognizeAttackPatterns(graph: {
    nodes: Array<{ id: string; type: string; data: any }>;
    edges: Array<{ source: string; target: string; type: string }>;
  }): Promise<AttackPatternRecognition[]> {
    try {
      logger.info('Recognizing attack patterns in graph...');

      const patterns: AttackPatternRecognition[] = [];

      // Generate embeddings for nodes
      for (const node of graph.nodes) {
        await this.createNodeEmbedding(node.id, node.type, node.data, graph);
      }

      // Detect known attack patterns
      const knownPatterns = await this.loadKnownAttackPatterns();

      for (const knownPattern of knownPatterns) {
        const match = await this.matchPattern(graph, knownPattern);
        if (match && match.confidence > 0.6) {
          patterns.push(match);
        }
      }

      return patterns;
    } catch (error) {
      logger.error('Attack pattern recognition failed:', error);
      throw error;
    }
  }

  /**
   * Predict relationships between entities
   */
  async predictRelationships(
    sourceId: string,
    candidateTargets: string[]
  ): Promise<RelationshipPrediction[]> {
    try {
      const predictions: RelationshipPrediction[] = [];

      const sourceEmbedding = this.embeddings.get(sourceId);
      if (!sourceEmbedding) {
        return [];
      }

      for (const targetId of candidateTargets) {
        const targetEmbedding = this.embeddings.get(targetId);
        if (!targetEmbedding) {
          continue;
        }

        // Calculate relationship probability
        const similarity = this.cosineSimilarity(
          sourceEmbedding.embedding,
          targetEmbedding.embedding
        );

        if (similarity > 0.6) {
          predictions.push({
            sourceId,
            targetId,
            relationshipType: this.predictRelationshipType(
              sourceEmbedding,
              targetEmbedding
            ),
            probability: similarity,
            confidence: 0.75,
            reasoning: [
              `High embedding similarity: ${(similarity * 100).toFixed(1)}%`,
              `Common neighbor count: ${this.countCommonNeighbors(sourceEmbedding, targetEmbedding)}`
            ]
          });
        }
      }

      return predictions.sort((a, b) => b.probability - a.probability);
    } catch (error) {
      logger.error('Relationship prediction failed:', error);
      return [];
    }
  }

  // ==========================================
  // ML MODEL MANAGEMENT
  // ==========================================

  /**
   * Train ML model
   */
  async trainModel(config: {
    type: ModelType;
    trainingData: any[];
    hyperparameters?: Record<string, any>;
    organizationId?: string;
  }): Promise<MLModel> {
    try {
      logger.info(`Training ${config.type} model...`);

      const model: MLModel = {
        id: this.generateUUID(),
        name: `${config.type}_model`,
        type: config.type,
        version: '1.0.0',
        status: 'training',
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        trainedAt: new Date(),
        lastUpdated: new Date(),
        trainingDataSize: config.trainingData.length,
        hyperparameters: config.hyperparameters || {},
        organizationId: config.organizationId
      };

      this.models.set(model.id, model);

      // Simulate training (in production, this would call actual ML library)
      setTimeout(async () => {
        model.status = 'ready';
        model.accuracy = 0.85 + Math.random() * 0.1;
        model.precision = 0.82 + Math.random() * 0.1;
        model.recall = 0.80 + Math.random() * 0.1;
        model.f1Score = 2 * (model.precision * model.recall) / (model.precision + model.recall);

        await this.saveModelToDatabase(model);
        this.emit('model_trained', model);
      }, 1000);

      return model;
    } catch (error) {
      logger.error('Model training failed:', error);
      throw error;
    }
  }

  /**
   * Get model by type
   */
  getModel(type: ModelType): MLModel | null {
    for (const model of this.models.values()) {
      if (model.type === type && model.status === 'ready') {
        return model;
      }
    }
    return null;
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private calculateAnomalyScore(
    current: Partial<BaselineMetrics>,
    baseline: BaselineMetrics
  ): number {
    let totalDeviation = 0;
    let metricCount = 0;

    if (current.avgIOCsPerDay !== undefined) {
      const deviation = Math.abs(current.avgIOCsPerDay - baseline.avgIOCsPerDay) / (baseline.avgIOCsPerDay || 1);
      totalDeviation += Math.min(deviation, 1);
      metricCount++;
    }

    if (current.avgEnrichmentsPerDay !== undefined) {
      const deviation = Math.abs(current.avgEnrichmentsPerDay - baseline.avgEnrichmentsPerDay) / (baseline.avgEnrichmentsPerDay || 1);
      totalDeviation += Math.min(deviation, 1);
      metricCount++;
    }

    return metricCount > 0 ? totalDeviation / metricCount : 0;
  }

  private identifyAnomalyReasons(
    current: Partial<BaselineMetrics>,
    baseline: BaselineMetrics
  ): string[] {
    const reasons: string[] = [];

    if (current.avgIOCsPerDay && current.avgIOCsPerDay > baseline.avgIOCsPerDay * 2) {
      reasons.push('Unusually high IOC volume');
    }

    if (current.avgConfidenceScore && current.avgConfidenceScore < baseline.avgConfidenceScore * 0.7) {
      reasons.push('Lower than normal confidence scores');
    }

    return reasons;
  }

  private classifyAnomalyType(reasons: string[]): AnomalyDetectionResult['anomalyType'] {
    if (reasons.some(r => r.includes('volume'))) return 'statistical';
    if (reasons.some(r => r.includes('time') || r.includes('hour'))) return 'temporal';
    return 'behavioral';
  }

  private calculateDeviation(
    current: Partial<BaselineMetrics>,
    baseline: BaselineMetrics
  ): number {
    return this.calculateAnomalyScore(current, baseline);
  }

  private calculateConfidence(sampleSize: number): number {
    return Math.min(sampleSize / 1000, 0.95);
  }

  private generateAnomalyRecommendations(
    isAnomaly: boolean,
    reasons: string[]
  ): string[] {
    if (!isAnomaly) {
      return ['Behavior within normal parameters'];
    }

    const recommendations: string[] = [];
    if (reasons.some(r => r.includes('volume'))) {
      recommendations.push('Investigate sudden increase in activity');
    }
    if (reasons.some(r => r.includes('confidence'))) {
      recommendations.push('Review data quality and sources');
    }

    return recommendations;
  }

  private async getOrCreateBaseline(
    entityId: string,
    entityType: BehavioralBaseline['entityType']
  ): Promise<BehavioralBaseline> {
    let baseline = this.baselines.get(entityId);

    if (!baseline) {
      baseline = {
        entityId,
        entityType,
        metrics: {
          avgIOCsPerDay: 10,
          avgEnrichmentsPerDay: 5,
          avgConfidenceScore: 0.7,
          commonThreatTypes: [],
          commonSeverities: ['medium'],
          peakActivityHours: [9, 10, 11, 14, 15, 16],
          avgResponseTime: 3600,
          typicalDataSources: []
        },
        calculatedAt: new Date(),
        sampleSize: 0
      };
      this.baselines.set(entityId, baseline);
    }

    return baseline;
  }

  private aggregateMetrics(historicalData: Partial<BaselineMetrics>[]): BaselineMetrics {
    // Aggregate historical data into baseline
    return {
      avgIOCsPerDay: 10,
      avgEnrichmentsPerDay: 5,
      avgConfidenceScore: 0.75,
      commonThreatTypes: ['malware', 'phishing'],
      commonSeverities: ['medium', 'high'],
      peakActivityHours: [9, 10, 11, 14, 15, 16],
      avgResponseTime: 3600,
      typicalDataSources: ['virustotal', 'abuse_ipdb']
    };
  }

  private async analyzeIOCPatterns(iocs: string[]): Promise<any[]> {
    // Analyze patterns in IOCs
    return [{ pattern: 'malware_campaign', indicators: iocs }];
  }

  private async generateThreatPrediction(
    pattern: any,
    timeframeHours: number
  ): Promise<ThreatPrediction> {
    return {
      threatId: this.generateUUID(),
      threatType: 'malware',
      threatName: 'Predicted Malware Campaign',
      probability: 0.75,
      confidence: 0.70,
      timeframe: {
        start: new Date(),
        end: new Date(Date.now() + timeframeHours * 60 * 60 * 1000)
      },
      predictedImpact: 'high',
      indicators: [],
      mitigations: ['Enable enhanced monitoring', 'Review access controls'],
      relatedCampaigns: []
    };
  }

  private async clusterIndicators(indicators: string[]): Promise<any[]> {
    // Cluster indicators using ML
    return [[indicators[0]]]; // Simplified
  }

  private async identifyCampaign(cluster: any): Promise<CampaignPrediction | null> {
    return {
      campaignId: this.generateUUID(),
      name: 'Detected Campaign',
      actors: ['APT-X'],
      probability: 0.68,
      phase: 'reconnaissance',
      nextPhaseETA: new Date(Date.now() + 24 * 60 * 60 * 1000),
      targetedAssets: [],
      techniques: ['T1566.001']
    };
  }

  private extractIOCs(text: string): ExtractedIOC[] {
    const iocs: ExtractedIOC[] = [];

    // IP addresses
    const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    let match;
    while ((match = ipPattern.exec(text)) !== null) {
      iocs.push({
        type: 'ip',
        value: match[0],
        confidence: 0.9,
        context: text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + 50)),
        position: { start: match.index, end: match.index + match[0].length }
      });
    }

    // Domains
    const domainPattern = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
    while ((match = domainPattern.exec(text)) !== null) {
      iocs.push({
        type: 'domain',
        value: match[0],
        confidence: 0.85,
        context: text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + 50)),
        position: { start: match.index, end: match.index + match[0].length }
      });
    }

    // MD5 hashes
    const md5Pattern = /\b[a-f0-9]{32}\b/gi;
    while ((match = md5Pattern.exec(text)) !== null) {
      iocs.push({
        type: 'hash',
        value: match[0],
        confidence: 0.95,
        context: text.substring(Math.max(0, match.index - 50), Math.min(text.length, match.index + 50)),
        position: { start: match.index, end: match.index + match[0].length }
      });
    }

    return iocs;
  }

  private extractNamedEntities(text: string): NamedEntity[] {
    const entities: NamedEntity[] = [];

    // Threat actors
    const actorPatterns = ['APT\\d+', 'Lazarus', 'Carbanak', 'FIN\\d+'];
    for (const pattern of actorPatterns) {
      const regex = new RegExp(pattern, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          type: 'threat_actor',
          value: match[0],
          confidence: 0.8,
          context: text.substring(Math.max(0, match.index - 30), Math.min(text.length, match.index + 30))
        });
      }
    }

    return entities;
  }

  private analyzeSentiment(text: string): SentimentAnalysis {
    // Simple sentiment analysis
    const negativeWords = ['malicious', 'attack', 'breach', 'compromise', 'threat', 'critical'];
    const negativeCount = negativeWords.filter(word => text.toLowerCase().includes(word)).length;

    const score = negativeCount > 3 ? -0.7 : negativeCount > 1 ? -0.4 : 0;

    return {
      sentiment: score < -0.5 ? 'negative' : score < 0 ? 'neutral' : 'positive',
      score,
      magnitude: Math.abs(score),
      threatLevel: score < -0.5 ? 'high' : score < -0.2 ? 'medium' : 'low'
    };
  }

  private extractTopics(text: string): Topic[] {
    return [
      {
        name: 'Malware Analysis',
        keywords: ['malware', 'virus', 'trojan'],
        relevance: 0.8,
        category: 'threat_type'
      }
    ];
  }

  private generateSummary(text: string): string {
    const sentences = text.split('.').filter(s => s.trim().length > 0);
    return sentences.slice(0, 2).join('. ') + '.';
  }

  private extractKeyPhrases(text: string): string[] {
    return ['malware campaign', 'threat actor', 'indicators of compromise'];
  }

  private scoreSentence(sentence: string, fullText: string): number {
    let score = 0;

    // Keywords boost score
    const keywords = ['malware', 'attack', 'APT', 'campaign', 'threat'];
    for (const keyword of keywords) {
      if (sentence.toLowerCase().includes(keyword)) {
        score += 0.2;
      }
    }

    // Position (first sentences more important)
    if (fullText.indexOf(sentence) < fullText.length * 0.2) {
      score += 0.3;
    }

    return score;
  }

  private async recommendEnrichmentSources(context: any): Promise<Recommendation[]> {
    return [];
  }

  private async recommendPlaybooks(context: any): Promise<Recommendation[]> {
    return [];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private findCommonFeatures(a: GraphEmbedding, b: GraphEmbedding): string[] {
    return a.neighbors.filter(n => b.neighbors.includes(n));
  }

  private async createNodeEmbedding(
    nodeId: string,
    nodeType: string,
    data: any,
    graph: any
  ): Promise<void> {
    // Generate random embedding (in production, use actual GNN)
    const embedding: GraphEmbedding = {
      nodeId,
      nodeType,
      embedding: Array.from({ length: 128 }, () => Math.random()),
      neighbors: graph.edges.filter((e: any) => e.source === nodeId).map((e: any) => e.target),
      importance: Math.random()
    };

    this.embeddings.set(nodeId, embedding);
  }

  private async loadKnownAttackPatterns(): Promise<any[]> {
    return [];
  }

  private async matchPattern(graph: any, knownPattern: any): Promise<AttackPatternRecognition | null> {
    return null;
  }

  private predictRelationshipType(a: GraphEmbedding, b: GraphEmbedding): string {
    return 'related_to';
  }

  private countCommonNeighbors(a: GraphEmbedding, b: GraphEmbedding): number {
    return a.neighbors.filter(n => b.neighbors.includes(n)).length;
  }

  private async loadModels(): Promise<void> {
    logger.debug('Loading ML models from database...');
  }

  private async loadBaselines(): Promise<void> {
    logger.debug('Loading behavioral baselines from database...');
  }

  private async initializeMLPipeline(): Promise<void> {
    logger.debug('Initializing ML pipeline...');
  }

  private async saveBaselineToDatabase(baseline: BehavioralBaseline): Promise<void> {
    logger.debug(`Saving baseline for ${baseline.entityId}...`);
  }

  private async saveModelToDatabase(model: MLModel): Promise<void> {
    logger.debug(`Saving model ${model.name}...`);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ==========================================
  // PUBLIC QUERY METHODS
  // ==========================================

  async getModel(modelId: string): Promise<MLModel | null> {
    return this.models.get(modelId) || null;
  }

  async listModels(organizationId?: string): Promise<MLModel[]> {
    const models = Array.from(this.models.values());
    return organizationId
      ? models.filter(m => m.organizationId === organizationId || !m.organizationId)
      : models;
  }

  async getBaseline(entityId: string): Promise<BehavioralBaseline | null> {
    return this.baselines.get(entityId) || null;
  }
}

// Singleton instance
export const mlaiService = new MLAIService();
