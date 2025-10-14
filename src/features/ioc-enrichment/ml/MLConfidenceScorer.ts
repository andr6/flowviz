/**
 * ML Confidence Scorer
 *
 * Machine learning-based confidence scoring that learns from historical
 * enrichment results to improve accuracy over time
 */

import { EventEmitter } from 'events';
import { logger } from '../../../shared/utils/logger';
import { AggregatedIOC } from '../aggregation/AggregationEngine';
import { EnrichmentResponse } from '../providers/BaseProvider';

export interface MLFeatures {
  // Provider agreement features
  providerAgreement: number;        // 0-1
  verdictConsistency: number;       // 0-1
  scoreVariance: number;            // 0-100

  // Individual provider features
  highestConfidence: number;        // 0-1
  lowestConfidence: number;         // 0-1
  avgConfidence: number;            // 0-1

  // Metadata completeness
  metadataCompleteness: number;     // 0-1
  relatedIndicatorCount: number;    // Count
  threatCount: number;              // Count
  tagCount: number;                 // Count

  // Provider-specific features
  providerCount: number;            // Count
  highTrustProviders: number;       // Count of providers with weight > 0.9

  // Historical features (if available)
  previousEnrichments?: number;     // Count of previous enrichments for this IOC
  avgHistoricalScore?: number;      // 0-100
  historicalVerdictChanges?: number; // Count of verdict changes
}

export interface MLPrediction {
  confidenceScore: number;          // 0-1, adjusted confidence
  reliabilityScore: number;         // 0-1, how reliable is this enrichment
  recommendedAction: 'accept' | 'review' | 're-enrich';
  reasoning: string[];              // Explanation of the prediction
  features: MLFeatures;
}

export interface TrainingData {
  features: MLFeatures;
  actualVerdict: 'benign' | 'suspicious' | 'malicious' | 'unknown';
  userFeedback?: 'correct' | 'incorrect' | 'uncertain';
  timestamp: Date;
}

export interface MLConfig {
  enabled: boolean;
  learningRate: number;             // 0-1, how quickly to adapt
  minTrainingSamples: number;       // Minimum samples before ML kicks in
  confidenceThreshold: number;      // 0-1, threshold for "review" action
  featureWeights: Partial<Record<keyof MLFeatures, number>>;
}

const DEFAULT_CONFIG: MLConfig = {
  enabled: true,
  learningRate: 0.1,
  minTrainingSamples: 100,
  confidenceThreshold: 0.7,
  featureWeights: {
    providerAgreement: 0.3,
    verdictConsistency: 0.25,
    avgConfidence: 0.2,
    metadataCompleteness: 0.1,
    highTrustProviders: 0.15,
  },
};

export class MLConfidenceScorer extends EventEmitter {
  private config: MLConfig;
  private trainingData: TrainingData[] = [];
  private featureImportance: Partial<Record<keyof MLFeatures, number>> = {};
  private modelTrained: boolean = false;

  constructor(config?: Partial<MLConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeFeatureImportance();
  }

  /**
   * Score an aggregated IOC result and provide ML-enhanced confidence
   */
  async score(aggregated: AggregatedIOC): Promise<MLPrediction> {
    // Extract features from the aggregated result
    const features = this.extractFeatures(aggregated);

    // Calculate base confidence score
    let confidenceScore = aggregated.consensus.reputation.confidence;

    // Apply ML adjustments if model is trained
    if (this.modelTrained && this.config.enabled) {
      confidenceScore = this.applyMLAdjustments(features, confidenceScore);
    }

    // Calculate reliability score
    const reliabilityScore = this.calculateReliability(features);

    // Determine recommended action
    const recommendedAction = this.determineAction(
      confidenceScore,
      reliabilityScore,
      features
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      features,
      confidenceScore,
      reliabilityScore,
      recommendedAction
    );

    const prediction: MLPrediction = {
      confidenceScore,
      reliabilityScore,
      recommendedAction,
      reasoning,
      features,
    };

    this.emit('predictionMade', prediction);

    return prediction;
  }

  /**
   * Extract ML features from aggregated IOC
   */
  private extractFeatures(aggregated: AggregatedIOC): MLFeatures {
    const results = aggregated.providerResults.filter(r => r.success && r.data);

    // Provider agreement features
    const providerAgreement = aggregated.consensus.agreement;

    // Calculate verdict consistency
    const verdicts = results.map(r => r.data!.reputation.verdict);
    const uniqueVerdicts = new Set(verdicts);
    const verdictConsistency = 1 - (uniqueVerdicts.size - 1) / Math.max(verdicts.length - 1, 1);

    // Calculate score variance
    const scores = results.map(r => r.data!.reputation.score);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    const scoreVariance = Math.sqrt(variance);

    // Confidence features
    const confidences = results.map(r => r.data!.reputation.confidence);
    const highestConfidence = Math.max(...confidences);
    const lowestConfidence = Math.min(...confidences);
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

    // Metadata completeness
    const metadataFields = [
      aggregated.metadata.geolocation,
      aggregated.metadata.network,
      aggregated.metadata.firstSeen,
      aggregated.metadata.lastSeen,
    ].filter(Boolean).length;
    const metadataCompleteness = metadataFields / 4;

    // Counts
    const relatedIndicatorCount = aggregated.relatedIndicators.length;
    const threatCount = aggregated.metadata.threats.length;
    const tagCount = aggregated.tags.length;

    // Provider features
    const providerCount = results.length;
    const highTrustProviders = results.filter(r => {
      // Assume providers with high confidence are high trust
      return r.data!.reputation.confidence > 0.85;
    }).length;

    return {
      providerAgreement,
      verdictConsistency,
      scoreVariance,
      highestConfidence,
      lowestConfidence,
      avgConfidence,
      metadataCompleteness,
      relatedIndicatorCount,
      threatCount,
      tagCount,
      providerCount,
      highTrustProviders,
    };
  }

  /**
   * Apply ML adjustments to confidence score
   */
  private applyMLAdjustments(features: MLFeatures, baseConfidence: number): number {
    let adjustment = 0;

    // Calculate weighted feature score
    let weightedScore = 0;
    let totalWeight = 0;

    Object.entries(this.featureImportance).forEach(([feature, importance]) => {
      const featureValue = features[feature as keyof MLFeatures] as number;
      const weight = importance || 0;

      if (typeof featureValue === 'number') {
        // Normalize feature value to 0-1 if needed
        let normalizedValue = featureValue;
        if (feature === 'scoreVariance') {
          normalizedValue = Math.max(0, 1 - (featureValue / 50)); // Lower variance is better
        } else if (['relatedIndicatorCount', 'threatCount', 'tagCount'].includes(feature)) {
          normalizedValue = Math.min(featureValue / 10, 1); // More is better, cap at 10
        } else if (feature === 'providerCount') {
          normalizedValue = Math.min(featureValue / 4, 1); // More is better, cap at 4
        }

        weightedScore += normalizedValue * weight;
        totalWeight += weight;
      }
    });

    const normalizedWeightedScore = totalWeight > 0 ? weightedScore / totalWeight : 0.5;

    // Calculate adjustment based on ML score vs base confidence
    adjustment = (normalizedWeightedScore - 0.5) * this.config.learningRate;

    // Apply adjustment
    const adjustedConfidence = Math.max(0, Math.min(1, baseConfidence + adjustment));

    logger.debug(
      `ML adjustment: ${baseConfidence.toFixed(3)} → ${adjustedConfidence.toFixed(3)} ` +
      `(Δ ${adjustment > 0 ? '+' : ''}${adjustment.toFixed(3)})`
    );

    return adjustedConfidence;
  }

  /**
   * Calculate reliability score based on features
   */
  private calculateReliability(features: MLFeatures): number {
    let reliability = 0;

    // High agreement increases reliability
    reliability += features.providerAgreement * 0.3;

    // High verdict consistency increases reliability
    reliability += features.verdictConsistency * 0.25;

    // Low score variance increases reliability
    reliability += Math.max(0, 1 - (features.scoreVariance / 50)) * 0.15;

    // High average confidence increases reliability
    reliability += features.avgConfidence * 0.2;

    // More providers increases reliability
    reliability += Math.min(features.providerCount / 4, 1) * 0.1;

    return Math.max(0, Math.min(1, reliability));
  }

  /**
   * Determine recommended action based on scores
   */
  private determineAction(
    confidenceScore: number,
    reliabilityScore: number,
    features: MLFeatures
  ): 'accept' | 'review' | 're-enrich' {
    // High confidence and reliability → accept
    if (confidenceScore >= 0.8 && reliabilityScore >= 0.8) {
      return 'accept';
    }

    // Very low confidence or reliability → re-enrich
    if (confidenceScore < 0.4 || reliabilityScore < 0.4) {
      return 're-enrich';
    }

    // High disagreement → review
    if (features.providerAgreement < 0.5 || features.verdictConsistency < 0.5) {
      return 'review';
    }

    // High score variance → review
    if (features.scoreVariance > 30) {
      return 'review';
    }

    // Only one provider succeeded → re-enrich
    if (features.providerCount < 2) {
      return 're-enrich';
    }

    // Default to review for medium confidence
    if (confidenceScore < this.config.confidenceThreshold) {
      return 'review';
    }

    return 'accept';
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    features: MLFeatures,
    confidenceScore: number,
    reliabilityScore: number,
    action: string
  ): string[] {
    const reasoning: string[] = [];

    // Confidence reasoning
    if (confidenceScore >= 0.8) {
      reasoning.push(`High confidence (${(confidenceScore * 100).toFixed(1)}%)`);
    } else if (confidenceScore < 0.5) {
      reasoning.push(`Low confidence (${(confidenceScore * 100).toFixed(1)}%)`);
    }

    // Agreement reasoning
    if (features.providerAgreement >= 0.8) {
      reasoning.push(`Strong provider agreement (${(features.providerAgreement * 100).toFixed(1)}%)`);
    } else if (features.providerAgreement < 0.5) {
      reasoning.push(`Weak provider agreement (${(features.providerAgreement * 100).toFixed(1)}%)`);
    }

    // Verdict consistency
    if (features.verdictConsistency < 0.7) {
      reasoning.push('Inconsistent verdicts across providers');
    }

    // Score variance
    if (features.scoreVariance > 30) {
      reasoning.push(`High score variance (±${features.scoreVariance.toFixed(1)})`);
    }

    // Provider count
    if (features.providerCount < 2) {
      reasoning.push('Only one provider succeeded');
    } else if (features.providerCount >= 3) {
      reasoning.push(`Multiple providers (${features.providerCount}) provided data`);
    }

    // Metadata completeness
    if (features.metadataCompleteness >= 0.75) {
      reasoning.push('Comprehensive metadata available');
    } else if (features.metadataCompleteness < 0.25) {
      reasoning.push('Limited metadata available');
    }

    // Threats
    if (features.threatCount > 0) {
      reasoning.push(`${features.threatCount} threat${features.threatCount > 1 ? 's' : ''} identified`);
    }

    // Related indicators
    if (features.relatedIndicatorCount > 10) {
      reasoning.push(`${features.relatedIndicatorCount} related indicators found`);
    }

    // Action reasoning
    if (action === 're-enrich') {
      reasoning.push('Recommendation: Re-enrich with more providers');
    } else if (action === 'review') {
      reasoning.push('Recommendation: Manual review suggested');
    }

    return reasoning;
  }

  /**
   * Add training data for model improvement
   */
  async addTrainingData(
    aggregated: AggregatedIOC,
    userFeedback: 'correct' | 'incorrect' | 'uncertain'
  ): Promise<void> {
    const features = this.extractFeatures(aggregated);

    const trainingPoint: TrainingData = {
      features,
      actualVerdict: aggregated.consensus.reputation.verdict,
      userFeedback,
      timestamp: new Date(),
    };

    this.trainingData.push(trainingPoint);

    logger.info(
      `Training data added: ${aggregated.ioc} (${userFeedback}), ` +
      `total samples: ${this.trainingData.length}`
    );

    // Retrain model if we have enough samples
    if (this.trainingData.length >= this.config.minTrainingSamples) {
      await this.trainModel();
    }

    this.emit('trainingDataAdded', trainingPoint);
  }

  /**
   * Train the ML model based on accumulated training data
   */
  private async trainModel(): Promise<void> {
    logger.info(`Training ML model with ${this.trainingData.length} samples`);

    // Calculate feature importance based on correlation with correct predictions
    const correctSamples = this.trainingData.filter(
      d => d.userFeedback === 'correct'
    );
    const incorrectSamples = this.trainingData.filter(
      d => d.userFeedback === 'incorrect'
    );

    if (correctSamples.length === 0 || incorrectSamples.length === 0) {
      logger.warn('Insufficient correct/incorrect samples for training');
      return;
    }

    // Calculate average feature values for correct vs incorrect
    const featureKeys = Object.keys(correctSamples[0].features) as (keyof MLFeatures)[];

    featureKeys.forEach(feature => {
      const correctAvg = correctSamples
        .map(s => s.features[feature] as number)
        .filter(v => typeof v === 'number')
        .reduce((sum, v) => sum + v, 0) / correctSamples.length;

      const incorrectAvg = incorrectSamples
        .map(s => s.features[feature] as number)
        .filter(v => typeof v === 'number')
        .reduce((sum, v) => sum + v, 0) / incorrectSamples.length;

      // Feature importance is proportional to the difference
      const importance = Math.abs(correctAvg - incorrectAvg);
      this.featureImportance[feature] = importance;
    });

    // Normalize feature importance
    const totalImportance = Object.values(this.featureImportance).reduce(
      (sum, imp) => sum + (imp || 0),
      0
    );

    if (totalImportance > 0) {
      Object.keys(this.featureImportance).forEach(feature => {
        this.featureImportance[feature as keyof MLFeatures] =
          (this.featureImportance[feature as keyof MLFeatures] || 0) / totalImportance;
      });
    }

    this.modelTrained = true;

    logger.info('ML model trained successfully');
    logger.debug('Feature importance:', this.featureImportance);

    this.emit('modelTrained', {
      sampleCount: this.trainingData.length,
      featureImportance: this.featureImportance,
    });
  }

  /**
   * Get feature importance rankings
   */
  getFeatureImportance(): Record<string, number> {
    return { ...this.featureImportance } as Record<string, number>;
  }

  /**
   * Get training statistics
   */
  getTrainingStats(): {
    totalSamples: number;
    correctSamples: number;
    incorrectSamples: number;
    uncertainSamples: number;
    modelTrained: boolean;
  } {
    return {
      totalSamples: this.trainingData.length,
      correctSamples: this.trainingData.filter(d => d.userFeedback === 'correct').length,
      incorrectSamples: this.trainingData.filter(d => d.userFeedback === 'incorrect').length,
      uncertainSamples: this.trainingData.filter(d => d.userFeedback === 'uncertain').length,
      modelTrained: this.modelTrained,
    };
  }

  /**
   * Initialize feature importance with default values
   */
  private initializeFeatureImportance(): void {
    this.featureImportance = { ...this.config.featureWeights };
  }

  /**
   * Export training data for persistence
   */
  exportTrainingData(): string {
    return JSON.stringify({
      version: '1.0',
      exportedAt: Date.now(),
      config: this.config,
      featureImportance: this.featureImportance,
      modelTrained: this.modelTrained,
      trainingData: this.trainingData,
    });
  }

  /**
   * Import training data from persistence
   */
  async importTrainingData(json: string): Promise<number> {
    try {
      const imported = JSON.parse(json);

      this.trainingData = imported.trainingData || [];
      this.featureImportance = imported.featureImportance || {};
      this.modelTrained = imported.modelTrained || false;

      logger.info(`Imported ${this.trainingData.length} training samples`);

      // Retrain model with imported data
      if (this.trainingData.length >= this.config.minTrainingSamples) {
        await this.trainModel();
      }

      return this.trainingData.length;
    } catch (error) {
      logger.error('Failed to import training data:', error);
      throw new Error('Training data import failed');
    }
  }

  /**
   * Clear all training data
   */
  clearTrainingData(): void {
    this.trainingData = [];
    this.modelTrained = false;
    this.initializeFeatureImportance();
    logger.info('Training data cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MLConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('ML config updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): MLConfig {
    return { ...this.config };
  }
}
