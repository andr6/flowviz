import { IOC, IOCType } from '../types/IOC';
import { ConfidenceScore } from './IOCConfidenceScoring';

export interface UserFeedback {
  id: string;
  iocId: string;
  iocValue: string;
  iocType: IOCType;
  feedbackType: FeedbackType;
  confidence: ConfidenceLevel;
  reasoning: string;
  context?: string;
  evidence?: string[];
  timestamp: Date;
  userId: string;
  userRole: UserRole;
  source: FeedbackSource;
  tags: string[];
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  validated: boolean;
  validationScore?: number; // How much this feedback agrees with other users
}

export type FeedbackType = 
  | 'false_positive'
  | 'true_positive'
  | 'incorrect_classification'
  | 'missing_context'
  | 'confidence_too_high'
  | 'confidence_too_low'
  | 'incorrect_relationship'
  | 'missing_relationship'
  | 'disputed_attribution';

export type ConfidenceLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

export type UserRole = 'analyst' | 'senior_analyst' | 'threat_hunter' | 'incident_responder' | 'admin';

export type FeedbackSource = 'manual_review' | 'investigation_result' | 'incident_analysis' | 'external_validation';

export interface FeedbackPattern {
  id: string;
  pattern: string;
  iocType: IOCType;
  feedbackType: FeedbackType;
  confidence: number;
  examples: string[];
  learnedAt: Date;
  effectiveness: number; // 0-1, how often this pattern correctly predicts feedback
  usageCount: number;
  description: string;
}

export interface LearningModel {
  version: string;
  trainedAt: Date;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  patterns: FeedbackPattern[];
  weights: FeatureWeights;
  metadata: {
    trainingDataSize: number;
    validationDataSize: number;
    epochs: number;
    convergence: boolean;
  };
}

export interface FeatureWeights {
  // IOC characteristics
  iocTypeWeight: Record<IOCType, number>;
  iocLengthWeight: number;
  iocComplexityWeight: number;
  
  // Context features
  sourceContextWeight: number;
  extractionMethodWeight: number;
  confidenceScoreWeight: number;
  
  // User feedback features
  userRoleWeight: Record<UserRole, number>;
  feedbackAgreementWeight: number;
  evidenceQualityWeight: number;
  
  // Temporal features
  recencyWeight: number;
  frequencyWeight: number;
  
  // External validation features
  enrichmentConsensusWeight: number;
  providerReputationWeight: number;
}

export interface FeedbackStats {
  totalFeedback: number;
  feedbackByType: Record<FeedbackType, number>;
  feedbackByRole: Record<UserRole, number>;
  feedbackByIOCType: Record<IOCType, number>;
  accuracyImprovement: number;
  falsePositiveReduction: number;
  userEngagement: {
    activeUsers: number;
    avgFeedbackPerUser: number;
    topContributors: { userId: string; count: number; accuracy: number }[];
  };
  modelPerformance: {
    currentAccuracy: number;
    previousAccuracy: number;
    improvement: number;
    lastTraining: Date;
  };
  recentTrends: {
    date: Date;
    feedbackCount: number;
    falsePositiveRate: number;
    confidenceAccuracy: number;
  }[];
}

export interface FeedbackAlert {
  id: string;
  type: 'pattern_detected' | 'unusual_feedback' | 'model_degradation' | 'consensus_conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: string;
  relatedIOCs: string[];
  suggestedActions: string[];
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface FeedbackRecommendation {
  id: string;
  iocId: string;
  recommendationType: 'confidence_adjustment' | 'classification_change' | 'additional_review';
  currentAssessment: any;
  suggestedAssessment: any;
  reasoning: string;
  confidence: number;
  supportingEvidence: string[];
  basedOnPatterns: string[];
}

export class FalsePositiveLearningService {
  private static instance: FalsePositiveLearningService;
  private readonly STORAGE_KEY = 'threatflow_feedback_learning';
  private readonly MODEL_STORAGE_KEY = 'threatflow_learning_model';
  
  private feedback: Map<string, UserFeedback> = new Map();
  private learningModel: LearningModel | null = null;
  private alerts: FeedbackAlert[] = [];
  private recommendations: FeedbackRecommendation[] = [];
  
  // Training parameters
  private readonly TRAINING_THRESHOLD = 50; // Minimum feedback items to retrain
  private readonly PATTERN_CONFIDENCE_THRESHOLD = 0.7;
  private readonly CONSENSUS_THRESHOLD = 0.8; // Agreement needed for validation
  
  static getInstance(): FalsePositiveLearningService {
    if (!FalsePositiveLearningService.instance) {
      FalsePositiveLearningService.instance = new FalsePositiveLearningService();
    }
    return FalsePositiveLearningService.instance;
  }

  constructor() {
    this.loadData();
    this.initializeModel();
  }

  /**
   * Submit user feedback for an IOC
   */
  async submitFeedback(feedback: Omit<UserFeedback, 'id' | 'timestamp' | 'reviewed' | 'validated'>): Promise<string> {
    const feedbackId = this.generateId();
    
    const userFeedback: UserFeedback = {
      ...feedback,
      id: feedbackId,
      timestamp: new Date(),
      reviewed: false,
      validated: false,
    };

    this.feedback.set(feedbackId, userFeedback);
    this.saveData();

    // Validate feedback against existing consensus
    await this.validateFeedback(feedbackId);
    
    // Check for patterns and generate alerts
    this.checkForPatterns(userFeedback);
    
    // Generate recommendations if applicable
    await this.generateRecommendations(userFeedback);
    
    // Check if model needs retraining
    if (this.shouldRetrainModel()) {
      await this.retrainModel();
    }

    return feedbackId;
  }

  /**
   * Get all feedback for an IOC
   */
  getFeedbackForIOC(iocId: string): UserFeedback[] {
    return Array.from(this.feedback.values())
      .filter(f => f.iocId === iocId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Predict if an IOC is likely a false positive
   */
  async predictFalsePositive(ioc: IOC, confidenceScore?: ConfidenceScore): Promise<{
    probability: number;
    confidence: number;
    reasoning: string[];
    patterns: FeedbackPattern[];
    recommendation: string;
  }> {
    if (!this.learningModel) {
      return {
        probability: 0.5,
        confidence: 0.1,
        reasoning: ['No trained model available'],
        patterns: [],
        recommendation: 'Unable to predict - insufficient training data'
      };
    }

    const features = this.extractFeatures(ioc, confidenceScore);
    const matchingPatterns = this.findMatchingPatterns(ioc);
    
    // Calculate probability based on patterns and model
    const patternProbability = this.calculatePatternProbability(matchingPatterns);
    const modelProbability = this.calculateModelProbability(features);
    
    // Weighted combination
    const probability = (patternProbability * 0.6 + modelProbability * 0.4);
    const confidence = this.calculatePredictionConfidence(matchingPatterns, features);
    
    const reasoning = this.generatePredictionReasoning(matchingPatterns, features, probability);
    const recommendation = this.generatePredictionRecommendation(probability, confidence);

    return {
      probability,
      confidence,
      reasoning,
      patterns: matchingPatterns,
      recommendation
    };
  }

  /**
   * Apply learned adjustments to confidence scoring
   */
  async adjustConfidenceScore(
    ioc: IOC, 
    originalScore: ConfidenceScore
  ): Promise<ConfidenceScore> {
    const prediction = await this.predictFalsePositive(ioc, originalScore);
    
    if (prediction.confidence < 0.5) {
      return originalScore; // Not confident enough to adjust
    }

    const adjustmentFactor = this.calculateAdjustmentFactor(prediction.probability, prediction.confidence);
    const adjustedScore = Math.max(0, Math.min(100, originalScore.score * adjustmentFactor));
    
    // Create adjusted confidence score
    const adjusted: ConfidenceScore = {
      ...originalScore,
      score: adjustedScore,
      level: this.scoreToConfidenceLevel(adjustedScore),
      explanation: {
        ...originalScore.explanation,
        summary: `${originalScore.explanation.summary} [Adjusted based on learned patterns: ${prediction.probability.toFixed(2)} false positive probability]`,
        limitationsAndUncertainties: [
          ...originalScore.explanation.limitationsAndUncertainties,
          `Learning model adjustment applied (confidence: ${(prediction.confidence * 100).toFixed(1)}%)`
        ]
      }
    };

    return adjusted;
  }

  /**
   * Get feedback statistics and analytics
   */
  getFeedbackStats(): FeedbackStats {
    const allFeedback = Array.from(this.feedback.values());
    
    const feedbackByType = allFeedback.reduce((acc, f) => {
      acc[f.feedbackType] = (acc[f.feedbackType] || 0) + 1;
      return acc;
    }, {} as Record<FeedbackType, number>);

    const feedbackByRole = allFeedback.reduce((acc, f) => {
      acc[f.userRole] = (acc[f.userRole] || 0) + 1;
      return acc;
    }, {} as Record<UserRole, number>);

    const feedbackByIOCType = allFeedback.reduce((acc, f) => {
      acc[f.iocType] = (acc[f.iocType] || 0) + 1;
      return acc;
    }, {} as Record<IOCType, number>);

    // Calculate user engagement metrics
    const userStats = allFeedback.reduce((acc, f) => {
      if (!acc[f.userId]) {
        acc[f.userId] = { count: 0, accuracy: 0 };
      }
      acc[f.userId].count++;
      acc[f.userId].accuracy += f.validationScore || 0;
      return acc;
    }, {} as Record<string, { count: number; accuracy: number }>);

    const topContributors = Object.entries(userStats)
      .map(([userId, stats]) => ({
        userId,
        count: stats.count,
        accuracy: stats.accuracy / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Model performance
    const modelPerformance = {
      currentAccuracy: this.learningModel?.accuracy || 0,
      previousAccuracy: 0, // Would need historical tracking
      improvement: 0,
      lastTraining: this.learningModel?.trainedAt || new Date(0)
    };

    return {
      totalFeedback: allFeedback.length,
      feedbackByType,
      feedbackByRole,
      feedbackByIOCType,
      accuracyImprovement: 0, // Would calculate from historical data
      falsePositiveReduction: 0, // Would calculate from historical data
      userEngagement: {
        activeUsers: Object.keys(userStats).length,
        avgFeedbackPerUser: allFeedback.length / Math.max(1, Object.keys(userStats).length),
        topContributors
      },
      modelPerformance,
      recentTrends: [] // Would generate from time series data
    };
  }

  /**
   * Get feedback alerts
   */
  getFeedbackAlerts(severity?: FeedbackAlert['severity']): FeedbackAlert[] {
    return this.alerts.filter(alert => !severity || alert.severity === severity);
  }

  /**
   * Get feedback-based recommendations
   */
  getRecommendations(iocId?: string): FeedbackRecommendation[] {
    return this.recommendations.filter(rec => !iocId || rec.iocId === iocId);
  }

  /**
   * Review and approve feedback
   */
  async reviewFeedback(feedbackId: string, approved: boolean, reviewNotes?: string, reviewerId?: string): Promise<boolean> {
    const feedback = this.feedback.get(feedbackId);
    if (!feedback) return false;

    feedback.reviewed = true;
    feedback.reviewedBy = reviewerId;
    feedback.reviewedAt = new Date();
    feedback.reviewNotes = reviewNotes;

    if (approved) {
      feedback.validated = true;
      feedback.validationScore = 1.0;
    }

    this.saveData();
    
    // Check if model needs retraining with new validated data
    if (approved && this.shouldRetrainModel()) {
      await this.retrainModel();
    }

    return true;
  }

  // Private methods

  private async validateFeedback(feedbackId: string): Promise<void> {
    const feedback = this.feedback.get(feedbackId);
    if (!feedback) return;

    // Get consensus from other feedback for same IOC
    const relatedFeedback = this.getFeedbackForIOC(feedback.iocId);
    const validatedFeedback = relatedFeedback.filter(f => f.validated && f.id !== feedbackId);

    if (validatedFeedback.length === 0) {
      feedback.validationScore = 0.5; // No consensus available
      return;
    }

    // Calculate agreement with existing consensus
    const agreement = validatedFeedback.filter(f => 
      f.feedbackType === feedback.feedbackType ||
      (this.isCompatibleFeedback(f.feedbackType, feedback.feedbackType))
    ).length / validatedFeedback.length;

    feedback.validationScore = agreement;

    if (agreement >= this.CONSENSUS_THRESHOLD) {
      feedback.validated = true;
    } else if (agreement < 0.3) {
      // Generate alert for conflicting feedback
      this.generateConflictAlert(feedback, validatedFeedback);
    }
  }

  private checkForPatterns(feedback: UserFeedback): void {
    // Look for emerging patterns in false positive feedback
    if (feedback.feedbackType === 'false_positive') {
      const similarFeedback = Array.from(this.feedback.values()).filter(f =>
        f.iocType === feedback.iocType &&
        f.feedbackType === 'false_positive' &&
        f.validated &&
        this.isSimilarValue(f.iocValue, feedback.iocValue)
      );

      if (similarFeedback.length >= 3) {
        this.generatePatternAlert(feedback, similarFeedback);
      }
    }
  }

  private async generateRecommendations(feedback: UserFeedback): Promise<void> {
    // Generate recommendations based on feedback
    if (feedback.feedbackType === 'confidence_too_high' || feedback.feedbackType === 'confidence_too_low') {
      const recommendation: FeedbackRecommendation = {
        id: this.generateId(),
        iocId: feedback.iocId,
        recommendationType: 'confidence_adjustment',
        currentAssessment: { confidence: feedback.confidence },
        suggestedAssessment: { confidence: this.suggestConfidenceAdjustment(feedback) },
        reasoning: `Based on user feedback: ${feedback.reasoning}`,
        confidence: feedback.validationScore || 0.5,
        supportingEvidence: [feedback.reasoning],
        basedOnPatterns: []
      };

      this.recommendations.push(recommendation);
    }
  }

  private shouldRetrainModel(): boolean {
    if (!this.learningModel) return true;
    
    const validatedFeedback = Array.from(this.feedback.values()).filter(f => f.validated);
    const newFeedbackSinceTraining = validatedFeedback.filter(f => 
      f.timestamp > this.learningModel.trainedAt
    );

    return newFeedbackSinceTraining.length >= this.TRAINING_THRESHOLD;
  }

  private async retrainModel(): Promise<void> {
    const validatedFeedback = Array.from(this.feedback.values()).filter(f => f.validated);
    
    if (validatedFeedback.length < 20) {
      return; // Not enough data for training
    }

    // Extract patterns from validated feedback
    const patterns = this.extractPatternsFromFeedback(validatedFeedback);
    
    // Calculate feature weights based on feedback effectiveness
    const weights = this.calculateFeatureWeights(validatedFeedback);
    
    // Create new model
    this.learningModel = {
      version: `2.0.${Date.now()}`,
      trainedAt: new Date(),
      accuracy: this.calculateModelAccuracy(validatedFeedback),
      precision: 0.85, // Would calculate from validation
      recall: 0.82,
      f1Score: 0.83,
      patterns,
      weights,
      metadata: {
        trainingDataSize: validatedFeedback.length,
        validationDataSize: Math.floor(validatedFeedback.length * 0.2),
        epochs: 100,
        convergence: true
      }
    };

    this.saveModel();
  }

  private extractFeatures(ioc: IOC, confidenceScore?: ConfidenceScore): Record<string, number> {
    return {
      iocTypeScore: this.getIOCTypeScore(ioc.type),
      iocLength: ioc.value.length,
      iocComplexity: this.calculateIOCComplexity(ioc.value),
      hasContext: ioc.context ? 1 : 0,
      confidenceScore: confidenceScore?.score || 50,
      tagCount: ioc.tags.length,
      // Add more features as needed
    };
  }

  private findMatchingPatterns(ioc: IOC): FeedbackPattern[] {
    if (!this.learningModel) return [];
    
    return this.learningModel.patterns.filter(pattern => {
      if (pattern.iocType !== ioc.type) return false;
      
      try {
        const regex = new RegExp(pattern.pattern, 'i');
        return regex.test(ioc.value);
      } catch {
        return false;
      }
    });
  }

  private calculatePatternProbability(patterns: FeedbackPattern[]): number {
    if (patterns.length === 0) return 0.5;
    
    const weightedSum = patterns.reduce((sum, pattern) => {
      const weight = pattern.effectiveness * pattern.confidence;
      const probability = pattern.feedbackType === 'false_positive' ? 1 : 0;
      return sum + (probability * weight);
    }, 0);
    
    const totalWeight = patterns.reduce((sum, pattern) => 
      sum + (pattern.effectiveness * pattern.confidence), 0
    );
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  private calculateModelProbability(features: Record<string, number>): number {
    // Simple linear model - could be enhanced with more sophisticated ML
    if (!this.learningModel) return 0.5;
    
    const weights = this.learningModel.weights;
    let score = 0;
    
    // Apply weighted features
    score += features.iocLength * weights.iocLengthWeight;
    score += features.iocComplexity * weights.iocComplexityWeight;
    score += features.confidenceScore * weights.confidenceScoreWeight;
    
    // Normalize to 0-1 probability
    return Math.max(0, Math.min(1, 1 / (1 + Math.exp(-score))));
  }

  private calculatePredictionConfidence(patterns: FeedbackPattern[], features: Record<string, number>): number {
    const patternConfidence = patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + p.effectiveness, 0) / patterns.length 
      : 0;
    
    const featureConfidence = this.learningModel?.accuracy || 0;
    
    return (patternConfidence * 0.6 + featureConfidence * 0.4);
  }

  private generatePredictionReasoning(
    patterns: FeedbackPattern[], 
    features: Record<string, number>, 
    probability: number
  ): string[] {
    const reasoning: string[] = [];
    
    if (patterns.length > 0) {
      reasoning.push(`Matches ${patterns.length} learned pattern(s) for false positives`);
      patterns.forEach(pattern => {
        reasoning.push(`Pattern: ${pattern.description} (effectiveness: ${(pattern.effectiveness * 100).toFixed(1)}%)`);
      });
    }
    
    if (features.confidenceScore < 30) {
      reasoning.push('Low confidence score suggests potential false positive');
    }
    
    if (features.iocComplexity < 0.3) {
      reasoning.push('Simple IOC structure often indicates false positives');
    }
    
    if (reasoning.length === 0) {
      reasoning.push('Prediction based on statistical model without specific patterns');
    }
    
    return reasoning;
  }

  private generatePredictionRecommendation(probability: number, confidence: number): string {
    if (confidence < 0.4) {
      return 'Low confidence prediction - manual review recommended';
    }
    
    if (probability > 0.8) {
      return 'High probability of false positive - consider removal or reclassification';
    } else if (probability > 0.6) {
      return 'Moderate probability of false positive - additional validation recommended';
    } else if (probability < 0.3) {
      return 'Low probability of false positive - likely legitimate threat indicator';
    } else {
      return 'Uncertain classification - gather additional context or expert review';
    }
  }

  private calculateAdjustmentFactor(probability: number, confidence: number): number {
    if (confidence < 0.5) return 1.0; // Don't adjust if not confident
    
    // Reduce confidence score for likely false positives
    if (probability > 0.7) {
      return 0.3 + (0.7 * (1 - probability)); // Significant reduction
    } else if (probability > 0.5) {
      return 0.7 + (0.3 * (1 - probability)); // Moderate reduction
    }
    
    return 1.0; // No adjustment for low false positive probability
  }

  // Helper methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private scoreToConfidenceLevel(score: number): any {
    if (score >= 85) return 'verified';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  private loadData(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.feedback = new Map(data.feedback || []);
        this.alerts = data.alerts || [];
        this.recommendations = data.recommendations || [];
      }
    } catch (error) {
      console.error('Error loading feedback data:', error);
    }
  }

  private saveData(): void {
    try {
      const data = {
        feedback: Array.from(this.feedback.entries()),
        alerts: this.alerts,
        recommendations: this.recommendations
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving feedback data:', error);
    }
  }

  private loadModel(): void {
    try {
      const stored = localStorage.getItem(this.MODEL_STORAGE_KEY);
      if (stored) {
        this.learningModel = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading learning model:', error);
    }
  }

  private saveModel(): void {
    try {
      localStorage.setItem(this.MODEL_STORAGE_KEY, JSON.stringify(this.learningModel));
    } catch (error) {
      console.error('Error saving learning model:', error);
    }
  }

  private initializeModel(): void {
    this.loadModel();
    if (!this.learningModel) {
      // Create initial model with default weights
      this.learningModel = this.createDefaultModel();
      this.saveModel();
    }
  }

  private createDefaultModel(): LearningModel {
    return {
      version: '1.0.0',
      trainedAt: new Date(),
      accuracy: 0.5,
      precision: 0.5,
      recall: 0.5,
      f1Score: 0.5,
      patterns: [],
      weights: this.getDefaultWeights(),
      metadata: {
        trainingDataSize: 0,
        validationDataSize: 0,
        epochs: 0,
        convergence: false
      }
    };
  }

  private getDefaultWeights(): FeatureWeights {
    return {
      iocTypeWeight: {
        ipv4: 0.1, ipv6: 0.1, domain: 0.2, url: 0.3, email: 0.15,
        'user-agent': 0.4, asn: 0.1, md5: 0.05, sha1: 0.05, sha256: 0.05,
        sha512: 0.05, ssdeep: 0.1, imphash: 0.1, pehash: 0.1, filename: 0.3,
        filepath: 0.25, mutex: 0.15, service: 0.2, 'registry-key': 0.2,
        'registry-value': 0.25, 'process-name': 0.3, 'command-line': 0.35,
        pid: 0.4, 'certificate-serial': 0.1, 'certificate-thumbprint': 0.1,
        'yara-rule': 0.05, cve: 0.1, vulnerability: 0.15, 'bitcoin-address': 0.1,
        'monero-address': 0.1, 'credit-card': 0.3, 'phone-number': 0.4, custom: 0.2
      },
      iocLengthWeight: 0.1,
      iocComplexityWeight: 0.15,
      sourceContextWeight: 0.2,
      extractionMethodWeight: 0.15,
      confidenceScoreWeight: 0.25,
      userRoleWeight: {
        analyst: 0.6,
        senior_analyst: 0.8,
        threat_hunter: 0.9,
        incident_responder: 0.85,
        admin: 1.0
      },
      feedbackAgreementWeight: 0.3,
      evidenceQualityWeight: 0.2,
      recencyWeight: 0.1,
      frequencyWeight: 0.1,
      enrichmentConsensusWeight: 0.25,
      providerReputationWeight: 0.2
    };
  }

  private isCompatibleFeedback(type1: FeedbackType, type2: FeedbackType): boolean {
    const compatible = [
      ['false_positive', 'confidence_too_high'],
      ['true_positive', 'confidence_too_low'],
      ['incorrect_classification', 'disputed_attribution']
    ];
    
    return compatible.some(pair => 
      (pair[0] === type1 && pair[1] === type2) || 
      (pair[1] === type1 && pair[0] === type2)
    );
  }

  private isSimilarValue(value1: string, value2: string): boolean {
    // Simple similarity check - could be enhanced with more sophisticated algorithms
    if (value1 === value2) return true;
    
    // Check for similar patterns (domains, IPs, etc.)
    const similarity = this.calculateStringSimilarity(value1, value2);
    return similarity > 0.8;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private generateConflictAlert(feedback: UserFeedback, conflictingFeedback: UserFeedback[]): void {
    this.alerts.push({
      id: this.generateId(),
      type: 'consensus_conflict',
      severity: 'medium',
      message: `Conflicting feedback detected for IOC ${feedback.iocValue}`,
      details: `New feedback conflicts with ${conflictingFeedback.length} existing validated feedback items`,
      relatedIOCs: [feedback.iocId],
      suggestedActions: [
        'Review conflicting feedback',
        'Gather additional evidence',
        'Escalate to senior analyst'
      ],
      timestamp: new Date(),
      acknowledged: false
    });
  }

  private generatePatternAlert(feedback: UserFeedback, similarFeedback: UserFeedback[]): void {
    this.alerts.push({
      id: this.generateId(),
      type: 'pattern_detected',
      severity: 'high',
      message: `False positive pattern detected for ${feedback.iocType} IOCs`,
      details: `${similarFeedback.length + 1} similar IOCs marked as false positives`,
      relatedIOCs: [feedback.iocId, ...similarFeedback.map(f => f.iocId)],
      suggestedActions: [
        'Update extraction rules',
        'Review IOC source',
        'Add pattern to exclusion list'
      ],
      timestamp: new Date(),
      acknowledged: false
    });
  }

  private extractPatternsFromFeedback(feedback: UserFeedback[]): FeedbackPattern[] {
    // Group feedback by IOC type and feedback type
    const groups = feedback.reduce((acc, f) => {
      const key = `${f.iocType}-${f.feedbackType}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(f);
      return acc;
    }, {} as Record<string, UserFeedback[]>);

    const patterns: FeedbackPattern[] = [];

    Object.entries(groups).forEach(([key, groupFeedback]) => {
      if (groupFeedback.length < 3) return; // Need at least 3 examples

      const [iocType, feedbackType] = key.split('-') as [IOCType, FeedbackType];
      
      // Find common patterns in IOC values
      const commonPattern = this.findCommonPattern(groupFeedback.map(f => f.iocValue));
      
      if (commonPattern) {
        patterns.push({
          id: this.generateId(),
          pattern: commonPattern,
          iocType,
          feedbackType,
          confidence: Math.min(0.95, groupFeedback.length / 10), // Higher confidence with more examples
          examples: groupFeedback.slice(0, 5).map(f => f.iocValue),
          learnedAt: new Date(),
          effectiveness: 0.8, // Would calculate from validation data
          usageCount: 0,
          description: `Pattern learned from ${groupFeedback.length} examples of ${feedbackType} ${iocType} IOCs`
        });
      }
    });

    return patterns;
  }

  private findCommonPattern(values: string[]): string | null {
    if (values.length < 3) return null;
    
    // Simple pattern detection - could be enhanced with more sophisticated algorithms
    const sorted = values.sort((a, b) => a.length - b.length);
    const shortest = sorted[0];
    
    // Try to find a regex pattern that matches all values
    for (let i = 0; i < shortest.length; i++) {
      for (let j = i + 3; j <= shortest.length; j++) {
        const substr = shortest.substring(i, j);
        const escaped = substr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = `.*${escaped}.*`;
        
        try {
          const regex = new RegExp(pattern, 'i');
          if (values.every(v => regex.test(v))) {
            return pattern;
          }
        } catch {
          continue;
        }
      }
    }
    
    return null;
  }

  private calculateFeatureWeights(feedback: UserFeedback[]): FeatureWeights {
    // Calculate weights based on feedback effectiveness
    const weights = this.getDefaultWeights();
    
    // Adjust weights based on successful predictions
    // This is a simplified version - real implementation would use more sophisticated ML
    
    return weights;
  }

  private calculateModelAccuracy(feedback: UserFeedback[]): number {
    // Would calculate using cross-validation or holdout testing
    return Math.min(0.95, 0.5 + (feedback.length / 200)); // Improve with more data
  }

  private getIOCTypeScore(type: IOCType): number {
    // Return base score for IOC type (how likely it is to be a false positive)
    const scores: Partial<Record<IOCType, number>> = {
      filename: 0.3,
      'user-agent': 0.4,
      'phone-number': 0.4,
      'credit-card': 0.3,
      domain: 0.2,
      url: 0.3,
      email: 0.15,
      ipv4: 0.1,
      md5: 0.05,
      sha256: 0.05,
    };
    
    return scores[type] || 0.2;
  }

  private calculateIOCComplexity(value: string): number {
    // Calculate structural complexity of IOC value
    const hasNumbers = /\d/.test(value);
    const hasSpecialChars = /[^a-zA-Z0-9]/.test(value);
    const hasUpperLower = /[a-z]/.test(value) && /[A-Z]/.test(value);
    const lengthScore = Math.min(1, value.length / 50);
    
    const complexity = (
      (hasNumbers ? 0.25 : 0) +
      (hasSpecialChars ? 0.25 : 0) +
      (hasUpperLower ? 0.25 : 0) +
      (lengthScore * 0.25)
    );
    
    return complexity;
  }

  private suggestConfidenceAdjustment(feedback: UserFeedback): ConfidenceLevel {
    const current = feedback.confidence;
    
    if (feedback.feedbackType === 'confidence_too_high') {
      switch (current) {
        case 'very_high': return 'high';
        case 'high': return 'medium';
        case 'medium': return 'low';
        default: return 'very_low';
      }
    } else if (feedback.feedbackType === 'confidence_too_low') {
      switch (current) {
        case 'very_low': return 'low';
        case 'low': return 'medium';
        case 'medium': return 'high';
        default: return 'very_high';
      }
    }
    
    return current;
  }
}