/**
 * Provider Accuracy Tracker
 *
 * Tracks the accuracy of each threat intelligence provider over time
 * and provides recommendations for adjusting provider weights
 */

import { EventEmitter } from 'events';
import { logger } from '../../../shared/utils/logger';
import { ProviderName } from '../providers/ProviderFactory';
import { AggregatedIOC } from '../aggregation/AggregationEngine';

export interface ProviderAccuracy {
  provider: ProviderName;

  // Overall statistics
  totalPredictions: number;
  correctPredictions: number;
  incorrectPredictions: number;
  accuracy: number;                  // 0-1

  // Verdict-specific accuracy
  verdictAccuracy: {
    benign: { correct: number; total: number; accuracy: number };
    suspicious: { correct: number; total: number; accuracy: number };
    malicious: { correct: number; total: number; accuracy: number };
    unknown: { correct: number; total: number; accuracy: number };
  };

  // Confidence calibration
  avgConfidence: number;             // 0-1, average confidence
  confidenceAccuracy: number;        // 0-1, how well confidence matches accuracy
  overconfident: boolean;            // confidence > actual accuracy

  // Performance metrics
  avgResponseTime: number;           // milliseconds
  failureRate: number;               // 0-1

  // Recommendations
  recommendedWeight: number;         // 0-1, suggested weight adjustment
  trend: 'improving' | 'declining' | 'stable';
}

export interface AccuracyFeedback {
  ioc: string;
  iocType: string;
  provider: ProviderName;
  predictedVerdict: 'benign' | 'suspicious' | 'malicious' | 'unknown';
  actualVerdict: 'benign' | 'suspicious' | 'malicious' | 'unknown';
  confidence: number;
  correct: boolean;
  timestamp: Date;
}

export interface TrackerConfig {
  enabled: boolean;
  minSamplesForAccuracy: number;     // Minimum samples before calculating accuracy
  weightAdjustmentRate: number;      // 0-1, how aggressively to adjust weights
  recentSamplesWindow: number;       // Number of recent samples for trend analysis
}

const DEFAULT_CONFIG: TrackerConfig = {
  enabled: true,
  minSamplesForAccuracy: 50,
  weightAdjustmentRate: 0.05,        // 5% max adjustment per update
  recentSamplesWindow: 100,
};

export class ProviderAccuracyTracker extends EventEmitter {
  private config: TrackerConfig;
  private feedback: Map<ProviderName, AccuracyFeedback[]> = new Map();
  private accuracy: Map<ProviderName, ProviderAccuracy> = new Map();

  constructor(config?: Partial<TrackerConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeAccuracy();
  }

  /**
   * Record feedback for a provider's prediction
   */
  async recordFeedback(
    aggregated: AggregatedIOC,
    actualVerdict: 'benign' | 'suspicious' | 'malicious' | 'unknown'
  ): Promise<void> {
    if (!this.config.enabled) return;

    // Record feedback for each provider
    for (const result of aggregated.providerResults) {
      if (!result.success || !result.data) continue;

      const feedback: AccuracyFeedback = {
        ioc: aggregated.ioc,
        iocType: aggregated.iocType,
        provider: result.provider as ProviderName,
        predictedVerdict: result.data.reputation.verdict,
        actualVerdict,
        confidence: result.data.reputation.confidence,
        correct: result.data.reputation.verdict === actualVerdict,
        timestamp: new Date(),
      };

      // Add to feedback history
      if (!this.feedback.has(feedback.provider)) {
        this.feedback.set(feedback.provider, []);
      }
      this.feedback.get(feedback.provider)!.push(feedback);

      logger.debug(
        `Feedback recorded for ${feedback.provider}: ` +
        `${feedback.predictedVerdict} → ${actualVerdict} ` +
        `(${feedback.correct ? 'correct' : 'incorrect'})`
      );
    }

    // Update accuracy metrics
    await this.updateAccuracy();

    this.emit('feedbackRecorded', {
      ioc: aggregated.ioc,
      actualVerdict,
      providerCount: aggregated.providerResults.length,
    });
  }

  /**
   * Update accuracy metrics for all providers
   */
  private async updateAccuracy(): Promise<void> {
    for (const [provider, feedbackList] of this.feedback.entries()) {
      if (feedbackList.length < this.config.minSamplesForAccuracy) {
        continue; // Not enough data yet
      }

      // Calculate overall accuracy
      const totalPredictions = feedbackList.length;
      const correctPredictions = feedbackList.filter(f => f.correct).length;
      const incorrectPredictions = totalPredictions - correctPredictions;
      const accuracy = correctPredictions / totalPredictions;

      // Calculate verdict-specific accuracy
      const verdictAccuracy = this.calculateVerdictAccuracy(feedbackList);

      // Calculate confidence calibration
      const avgConfidence = feedbackList.reduce((sum, f) => sum + f.confidence, 0) / totalPredictions;
      const confidenceAccuracy = this.calculateConfidenceAccuracy(feedbackList);
      const overconfident = avgConfidence > accuracy;

      // Calculate trend
      const trend = this.calculateTrend(feedbackList);

      // Calculate recommended weight
      const currentWeight = this.accuracy.get(provider)?.recommendedWeight || 0.5;
      const recommendedWeight = this.calculateRecommendedWeight(
        accuracy,
        confidenceAccuracy,
        trend,
        currentWeight
      );

      const providerAccuracy: ProviderAccuracy = {
        provider,
        totalPredictions,
        correctPredictions,
        incorrectPredictions,
        accuracy,
        verdictAccuracy,
        avgConfidence,
        confidenceAccuracy,
        overconfident,
        avgResponseTime: 0, // Will be populated from provider stats
        failureRate: 0,     // Will be populated from provider stats
        recommendedWeight,
        trend,
      };

      this.accuracy.set(provider, providerAccuracy);

      logger.debug(
        `Updated accuracy for ${provider}: ` +
        `${(accuracy * 100).toFixed(1)}% (${correctPredictions}/${totalPredictions}), ` +
        `trend: ${trend}, recommended weight: ${recommendedWeight.toFixed(2)}`
      );
    }

    this.emit('accuracyUpdated', this.getAccuracySummary());
  }

  /**
   * Calculate verdict-specific accuracy
   */
  private calculateVerdictAccuracy(
    feedbackList: AccuracyFeedback[]
  ): ProviderAccuracy['verdictAccuracy'] {
    const verdicts: ('benign' | 'suspicious' | 'malicious' | 'unknown')[] = [
      'benign',
      'suspicious',
      'malicious',
      'unknown',
    ];

    const verdictAccuracy: any = {};

    verdicts.forEach(verdict => {
      const verdictFeedback = feedbackList.filter(
        f => f.predictedVerdict === verdict
      );
      const total = verdictFeedback.length;
      const correct = verdictFeedback.filter(f => f.correct).length;
      const accuracy = total > 0 ? correct / total : 0;

      verdictAccuracy[verdict] = { correct, total, accuracy };
    });

    return verdictAccuracy;
  }

  /**
   * Calculate how well confidence matches actual accuracy
   */
  private calculateConfidenceAccuracy(feedbackList: AccuracyFeedback[]): number {
    // Bin predictions by confidence ranges
    const bins = [
      { min: 0.0, max: 0.2, predictions: [] as AccuracyFeedback[] },
      { min: 0.2, max: 0.4, predictions: [] as AccuracyFeedback[] },
      { min: 0.4, max: 0.6, predictions: [] as AccuracyFeedback[] },
      { min: 0.6, max: 0.8, predictions: [] as AccuracyFeedback[] },
      { min: 0.8, max: 1.0, predictions: [] as AccuracyFeedback[] },
    ];

    feedbackList.forEach(f => {
      const bin = bins.find(b => f.confidence >= b.min && f.confidence <= b.max);
      if (bin) bin.predictions.push(f);
    });

    // Calculate calibration error (how far off confidence is from accuracy)
    let totalError = 0;
    let binCount = 0;

    bins.forEach(bin => {
      if (bin.predictions.length > 0) {
        const binAccuracy = bin.predictions.filter(p => p.correct).length / bin.predictions.length;
        const binConfidence = (bin.min + bin.max) / 2;
        const error = Math.abs(binConfidence - binAccuracy);
        totalError += error;
        binCount++;
      }
    });

    // Lower error = better calibration
    const avgError = binCount > 0 ? totalError / binCount : 1;
    return Math.max(0, 1 - avgError);
  }

  /**
   * Calculate accuracy trend (improving, declining, stable)
   */
  private calculateTrend(
    feedbackList: AccuracyFeedback[]
  ): 'improving' | 'declining' | 'stable' {
    const windowSize = this.config.recentSamplesWindow;

    if (feedbackList.length < windowSize * 2) {
      return 'stable'; // Not enough data for trend
    }

    // Split into recent and older samples
    const recentSamples = feedbackList.slice(-windowSize);
    const olderSamples = feedbackList.slice(-windowSize * 2, -windowSize);

    const recentAccuracy = recentSamples.filter(f => f.correct).length / recentSamples.length;
    const olderAccuracy = olderSamples.filter(f => f.correct).length / olderSamples.length;

    const diff = recentAccuracy - olderAccuracy;

    if (diff > 0.05) return 'improving';
    if (diff < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * Calculate recommended weight based on accuracy metrics
   */
  private calculateRecommendedWeight(
    accuracy: number,
    confidenceAccuracy: number,
    trend: 'improving' | 'declining' | 'stable',
    currentWeight: number
  ): number {
    // Start with accuracy as base weight
    let weight = accuracy;

    // Adjust for confidence calibration (±10%)
    weight += (confidenceAccuracy - 0.5) * 0.2;

    // Adjust for trend (±5%)
    if (trend === 'improving') {
      weight += 0.05;
    } else if (trend === 'declining') {
      weight -= 0.05;
    }

    // Smooth weight adjustment (don't change too quickly)
    const maxChange = this.config.weightAdjustmentRate;
    const change = weight - currentWeight;
    const smoothedChange = Math.max(-maxChange, Math.min(maxChange, change));

    const recommendedWeight = currentWeight + smoothedChange;

    // Clamp to valid range
    return Math.max(0, Math.min(1, recommendedWeight));
  }

  /**
   * Get accuracy for a specific provider
   */
  getProviderAccuracy(provider: ProviderName): ProviderAccuracy | null {
    return this.accuracy.get(provider) || null;
  }

  /**
   * Get accuracy for all providers
   */
  getAllAccuracy(): Map<ProviderName, ProviderAccuracy> {
    return new Map(this.accuracy);
  }

  /**
   * Get accuracy summary
   */
  getAccuracySummary(): {
    totalFeedback: number;
    providers: Array<{
      provider: ProviderName;
      accuracy: number;
      samples: number;
      recommendedWeight: number;
      trend: string;
    }>;
    avgAccuracy: number;
    bestProvider: ProviderName | null;
    worstProvider: ProviderName | null;
  } {
    const providers = Array.from(this.accuracy.entries()).map(([provider, acc]) => ({
      provider,
      accuracy: acc.accuracy,
      samples: acc.totalPredictions,
      recommendedWeight: acc.recommendedWeight,
      trend: acc.trend,
    }));

    const totalFeedback = Array.from(this.feedback.values()).reduce(
      (sum, list) => sum + list.length,
      0
    );

    const avgAccuracy = providers.length > 0
      ? providers.reduce((sum, p) => sum + p.accuracy, 0) / providers.length
      : 0;

    const sorted = [...providers].sort((a, b) => b.accuracy - a.accuracy);
    const bestProvider = sorted[0]?.provider || null;
    const worstProvider = sorted[sorted.length - 1]?.provider || null;

    return {
      totalFeedback,
      providers,
      avgAccuracy,
      bestProvider,
      worstProvider,
    };
  }

  /**
   * Get weight recommendations for all providers
   */
  getWeightRecommendations(): Record<ProviderName, number> {
    const recommendations: any = {};

    this.accuracy.forEach((acc, provider) => {
      recommendations[provider] = acc.recommendedWeight;
    });

    return recommendations;
  }

  /**
   * Initialize accuracy tracking for all providers
   */
  private initializeAccuracy(): void {
    const providers: ProviderName[] = [
      'VirusTotal',
      'AbuseIPDB',
      'Shodan',
      'AlienVault OTX',
    ];

    providers.forEach(provider => {
      this.feedback.set(provider, []);
    });
  }

  /**
   * Export feedback history for persistence
   */
  exportFeedback(): string {
    const data: any = {};

    this.feedback.forEach((feedbackList, provider) => {
      data[provider] = feedbackList;
    });

    return JSON.stringify({
      version: '1.0',
      exportedAt: Date.now(),
      feedback: data,
      accuracy: Object.fromEntries(this.accuracy),
    });
  }

  /**
   * Import feedback history from persistence
   */
  async importFeedback(json: string): Promise<number> {
    try {
      const imported = JSON.parse(json);

      let totalImported = 0;

      // Import feedback
      Object.entries(imported.feedback).forEach(([provider, feedbackList]) => {
        this.feedback.set(provider as ProviderName, feedbackList as AccuracyFeedback[]);
        totalImported += (feedbackList as AccuracyFeedback[]).length;
      });

      // Update accuracy metrics
      await this.updateAccuracy();

      logger.info(`Imported ${totalImported} feedback samples`);

      return totalImported;
    } catch (error) {
      logger.error('Failed to import feedback:', error);
      throw new Error('Feedback import failed');
    }
  }

  /**
   * Clear all feedback history
   */
  clearFeedback(): void {
    this.feedback.clear();
    this.accuracy.clear();
    this.initializeAccuracy();
    logger.info('Feedback history cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TrackerConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Tracker config updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): TrackerConfig {
    return { ...this.config };
  }
}
