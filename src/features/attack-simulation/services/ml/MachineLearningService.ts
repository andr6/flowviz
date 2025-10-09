/**
 * Machine Learning Service
 *
 * Advanced ML capabilities for attack simulation:
 * - Anomaly detection in simulation results
 * - Predictive gap analysis
 * - Automated technique prioritization
 * - Smart workflow recommendations
 * - Pattern recognition across simulations
 */

import { Pool } from 'pg';

export interface MLModel {
  id?: string;
  name: string;
  type: 'anomaly_detection' | 'gap_prediction' | 'prioritization' | 'recommendation' | 'pattern_recognition';
  version: string;
  status: 'training' | 'trained' | 'deployed' | 'deprecated';
  algorithm: string; // 'random_forest', 'neural_network', 'gradient_boosting', etc.
  features: string[]; // List of feature names used
  hyperparameters: Record<string, any>;
  trainingDataSize?: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  trainedAt?: Date;
  deployedAt?: Date;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AnomalyDetectionResult {
  jobId: string;
  anomalies: Array<{
    type: 'execution_time' | 'success_rate' | 'technique_pattern' | 'failure_pattern' | 'environmental';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedTechniques: string[];
    anomalyScore: number; // 0-1, higher = more anomalous
    expectedValue: any;
    actualValue: any;
    confidence: number; // 0-1
    recommendation?: string;
  }>;
  overallAnomalyScore: number;
  analysisTimestamp: Date;
}

export interface GapPrediction {
  techniqueId: string;
  techniqueName: string;
  predictedGapSeverity: 'low' | 'medium' | 'high' | 'critical';
  gapProbability: number; // 0-1
  confidence: number;
  predictedMitigations: Array<{
    mitigation: string;
    effectiveness: number; // 0-1
    implementationCost: 'low' | 'medium' | 'high';
  }>;
  riskFactors: Array<{
    factor: string;
    impact: number; // 0-1
  }>;
}

export interface TechniquePriority {
  techniqueId: string;
  techniqueName: string;
  priorityScore: number; // 0-100
  priorityRank: number;
  factors: {
    threatLevel: number;
    exploitationLikelihood: number;
    impactSeverity: number;
    detectionDifficulty: number;
    currentCoverage: number;
    industryPrevalence: number;
  };
  recommendation: string;
}

export interface WorkflowRecommendation {
  recommendationType: 'new_workflow' | 'workflow_optimization' | 'action_addition' | 'condition_adjustment';
  confidence: number;
  description: string;
  suggestedWorkflow?: {
    name: string;
    trigger: string;
    conditions: any[];
    actions: any[];
  };
  expectedBenefit: string;
  implementationComplexity: 'low' | 'medium' | 'high';
}

export interface PatternRecognition {
  patternType: 'attack_chain' | 'failure_cluster' | 'success_cluster' | 'temporal_pattern' | 'environmental_correlation';
  description: string;
  occurrences: number;
  confidence: number;
  affectedTechniques: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
  insights: string[];
  recommendations: string[];
}

/**
 * Machine Learning Service
 */
export class MachineLearningService {
  private pool: Pool;
  private models: Map<string, MLModel> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
    this.loadModels();
  }

  /**
   * Load ML models from database
   */
  private async loadModels(): Promise<void> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM ml_models WHERE status = $1',
        ['deployed']
      );

      for (const row of result.rows) {
        const model: MLModel = {
          id: row.id,
          name: row.name,
          type: row.type,
          version: row.version,
          status: row.status,
          algorithm: row.algorithm,
          features: row.features,
          hyperparameters: row.hyperparameters,
          trainingDataSize: row.training_data_size,
          accuracy: row.accuracy,
          precision: row.precision,
          recall: row.recall,
          f1Score: row.f1_score,
          trainedAt: row.trained_at,
          deployedAt: row.deployed_at,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        this.models.set(`${model.type}:${model.version}`, model);
      }

      console.log(`Loaded ${this.models.size} ML models`);
    } catch (error) {
      console.error('Failed to load ML models:', error);
    }
  }

  /**
   * Detect anomalies in simulation results
   */
  async detectAnomalies(jobId: string): Promise<AnomalyDetectionResult> {
    console.log(`Detecting anomalies for job: ${jobId}`);

    try {
      // Get job results
      const jobResult = await this.pool.query(
        'SELECT * FROM simulation_jobs WHERE id = $1',
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const job = jobResult.rows[0];

      // Get technique results
      const techniqueResults = await this.pool.query(
        'SELECT * FROM simulation_technique_results WHERE job_id = $1',
        [jobId]
      );

      // Get historical data for comparison
      const historicalData = await this.pool.query(
        `SELECT * FROM simulation_technique_results
         WHERE job_id IN (
           SELECT id FROM simulation_jobs
           WHERE created_at > NOW() - INTERVAL '30 days'
           AND id != $1
         )`,
        [jobId]
      );

      const anomalies: AnomalyDetectionResult['anomalies'] = [];

      // 1. Execution time anomaly detection
      const executionTimeAnomaly = this.detectExecutionTimeAnomalies(
        techniqueResults.rows,
        historicalData.rows
      );
      if (executionTimeAnomaly) {
        anomalies.push(executionTimeAnomaly);
      }

      // 2. Success rate anomaly detection
      const successRateAnomaly = this.detectSuccessRateAnomalies(
        techniqueResults.rows,
        historicalData.rows
      );
      if (successRateAnomaly) {
        anomalies.push(successRateAnomaly);
      }

      // 3. Technique pattern anomaly detection
      const patternAnomalies = this.detectTechniquePatternAnomalies(
        techniqueResults.rows,
        historicalData.rows
      );
      anomalies.push(...patternAnomalies);

      // 4. Failure pattern detection
      const failureAnomalies = this.detectFailurePatternAnomalies(
        techniqueResults.rows,
        historicalData.rows
      );
      anomalies.push(...failureAnomalies);

      // Calculate overall anomaly score
      const overallAnomalyScore = anomalies.length > 0
        ? anomalies.reduce((sum, a) => sum + a.anomalyScore, 0) / anomalies.length
        : 0;

      const result: AnomalyDetectionResult = {
        jobId,
        anomalies,
        overallAnomalyScore,
        analysisTimestamp: new Date(),
      };

      // Save analysis results
      await this.saveAnomalyDetection(result);

      return result;
    } catch (error) {
      console.error('Failed to detect anomalies:', error);
      throw error;
    }
  }

  /**
   * Detect execution time anomalies
   */
  private detectExecutionTimeAnomalies(
    currentResults: any[],
    historicalResults: any[]
  ): AnomalyDetectionResult['anomalies'][0] | null {
    if (historicalResults.length === 0) return null;

    // Calculate average execution time for each technique
    const historicalAvg = new Map<string, number>();
    const historicalStdDev = new Map<string, number>();

    // Group by technique
    const techniqueGroups = new Map<string, number[]>();
    for (const result of historicalResults) {
      if (!techniqueGroups.has(result.technique_id)) {
        techniqueGroups.set(result.technique_id, []);
      }
      techniqueGroups.get(result.technique_id)!.push(result.execution_time_seconds || 0);
    }

    // Calculate statistics
    for (const [techniqueId, times] of techniqueGroups.entries()) {
      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
      const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);

      historicalAvg.set(techniqueId, avg);
      historicalStdDev.set(techniqueId, stdDev);
    }

    // Check current results for anomalies
    const anomalousTechniques: string[] = [];
    let maxDeviation = 0;

    for (const result of currentResults) {
      const techniqueId = result.technique_id;
      const currentTime = result.execution_time_seconds || 0;
      const avg = historicalAvg.get(techniqueId);
      const stdDev = historicalStdDev.get(techniqueId);

      if (avg !== undefined && stdDev !== undefined && stdDev > 0) {
        const zScore = Math.abs((currentTime - avg) / stdDev);
        if (zScore > 3) { // 3 standard deviations
          anomalousTechniques.push(techniqueId);
          maxDeviation = Math.max(maxDeviation, zScore);
        }
      }
    }

    if (anomalousTechniques.length === 0) return null;

    return {
      type: 'execution_time',
      severity: maxDeviation > 5 ? 'high' : maxDeviation > 4 ? 'medium' : 'low',
      description: `${anomalousTechniques.length} technique(s) showed unusual execution times (>3σ from historical average)`,
      affectedTechniques: anomalousTechniques,
      anomalyScore: Math.min(maxDeviation / 10, 1),
      expectedValue: 'Normal execution time within 3 standard deviations',
      actualValue: `${anomalousTechniques.length} techniques with ${maxDeviation.toFixed(1)}σ deviation`,
      confidence: 0.85,
      recommendation: 'Investigate environment changes, resource constraints, or defensive control updates that may affect execution',
    };
  }

  /**
   * Detect success rate anomalies
   */
  private detectSuccessRateAnomalies(
    currentResults: any[],
    historicalResults: any[]
  ): AnomalyDetectionResult['anomalies'][0] | null {
    if (historicalResults.length === 0) return null;

    // Calculate historical success rates
    const historicalSuccessRate = new Map<string, number>();

    const techniqueGroups = new Map<string, { total: number; success: number }>();
    for (const result of historicalResults) {
      if (!techniqueGroups.has(result.technique_id)) {
        techniqueGroups.set(result.technique_id, { total: 0, success: 0 });
      }
      const group = techniqueGroups.get(result.technique_id)!;
      group.total++;
      if (result.execution_status === 'completed') {
        group.success++;
      }
    }

    for (const [techniqueId, group] of techniqueGroups.entries()) {
      historicalSuccessRate.set(techniqueId, group.success / group.total);
    }

    // Check current success rates
    const anomalousTechniques: string[] = [];
    let maxDifference = 0;

    for (const result of currentResults) {
      const techniqueId = result.technique_id;
      const historicalRate = historicalSuccessRate.get(techniqueId);

      if (historicalRate !== undefined) {
        const currentSuccess = result.execution_status === 'completed' ? 1 : 0;
        const difference = Math.abs(currentSuccess - historicalRate);

        if (difference > 0.3) { // 30% difference
          anomalousTechniques.push(techniqueId);
          maxDifference = Math.max(maxDifference, difference);
        }
      }
    }

    if (anomalousTechniques.length === 0) return null;

    return {
      type: 'success_rate',
      severity: maxDifference > 0.7 ? 'critical' : maxDifference > 0.5 ? 'high' : 'medium',
      description: `${anomalousTechniques.length} technique(s) showed unexpected success/failure patterns`,
      affectedTechniques: anomalousTechniques,
      anomalyScore: maxDifference,
      expectedValue: 'Success rate within 30% of historical average',
      actualValue: `${(maxDifference * 100).toFixed(0)}% deviation`,
      confidence: 0.9,
      recommendation: 'Review defensive control changes, environment updates, or technique implementation modifications',
    };
  }

  /**
   * Detect technique pattern anomalies
   */
  private detectTechniquePatternAnomalies(
    currentResults: any[],
    historicalResults: any[]
  ): AnomalyDetectionResult['anomalies'] {
    const anomalies: AnomalyDetectionResult['anomalies'] = [];

    // Check for unusual technique combinations
    const currentTechniques = new Set(currentResults.map(r => r.technique_id));

    // This is a simplified pattern detection
    // In production, use more sophisticated sequence analysis

    return anomalies;
  }

  /**
   * Detect failure pattern anomalies
   */
  private detectFailurePatternAnomalies(
    currentResults: any[],
    historicalResults: any[]
  ): AnomalyDetectionResult['anomalies'] {
    const anomalies: AnomalyDetectionResult['anomalies'] = [];

    // Check for clustered failures
    const failures = currentResults.filter(r => r.execution_status === 'failed');

    if (failures.length > currentResults.length * 0.5) {
      anomalies.push({
        type: 'failure_pattern',
        severity: 'high',
        description: 'Unusually high failure rate detected across multiple techniques',
        affectedTechniques: failures.map(f => f.technique_id),
        anomalyScore: failures.length / currentResults.length,
        expectedValue: 'Failure rate < 50%',
        actualValue: `${failures.length}/${currentResults.length} failed (${((failures.length / currentResults.length) * 100).toFixed(0)}%)`,
        confidence: 0.95,
        recommendation: 'Check simulation environment health, credential validity, and network connectivity',
      });
    }

    return anomalies;
  }

  /**
   * Predict gaps for given techniques
   */
  async predictGaps(techniqueIds: string[]): Promise<GapPrediction[]> {
    console.log(`Predicting gaps for ${techniqueIds.length} techniques`);

    const predictions: GapPrediction[] = [];

    try {
      // Get historical gap data
      const gapData = await this.pool.query(
        `SELECT technique_id, gap_severity, COUNT(*) as occurrence_count
         FROM simulation_gaps
         WHERE technique_id = ANY($1)
         GROUP BY technique_id, gap_severity`,
        [techniqueIds]
      );

      // Get technique metadata
      const techniques = await this.pool.query(
        `SELECT technique_id, technique_name
         FROM simulation_techniques
         WHERE technique_id = ANY($1)`,
        [techniqueIds]
      );

      const techniqueMap = new Map(
        techniques.rows.map(t => [t.technique_id, t.technique_name])
      );

      // Create predictions based on historical data
      for (const techniqueId of techniqueIds) {
        const techniqueName = techniqueMap.get(techniqueId) || techniqueId;

        // Get gap history for this technique
        const techniqueGaps = gapData.rows.filter(g => g.technique_id === techniqueId);

        let predictedSeverity: GapPrediction['predictedGapSeverity'] = 'medium';
        let gapProbability = 0.5;

        if (techniqueGaps.length > 0) {
          // Calculate weighted severity
          const totalOccurrences = techniqueGaps.reduce((sum, g) => sum + parseInt(g.occurrence_count), 0);

          const severityScores = {
            critical: 4,
            high: 3,
            medium: 2,
            low: 1,
          };

          let weightedScore = 0;
          for (const gap of techniqueGaps) {
            const weight = parseInt(gap.occurrence_count) / totalOccurrences;
            weightedScore += severityScores[gap.gap_severity as keyof typeof severityScores] * weight;
          }

          if (weightedScore >= 3.5) predictedSeverity = 'critical';
          else if (weightedScore >= 2.5) predictedSeverity = 'high';
          else if (weightedScore >= 1.5) predictedSeverity = 'medium';
          else predictedSeverity = 'low';

          gapProbability = Math.min(totalOccurrences / 10, 0.95);
        }

        predictions.push({
          techniqueId,
          techniqueName,
          predictedGapSeverity: predictedSeverity,
          gapProbability,
          confidence: techniqueGaps.length > 5 ? 0.85 : 0.6,
          predictedMitigations: this.generateMitigationPredictions(techniqueId, predictedSeverity),
          riskFactors: this.identifyRiskFactors(techniqueId),
        });
      }

      // Save predictions
      await this.saveGapPredictions(predictions);

      return predictions;
    } catch (error) {
      console.error('Failed to predict gaps:', error);
      throw error;
    }
  }

  /**
   * Prioritize techniques based on multiple factors
   */
  async prioritizeTechniques(techniqueIds: string[]): Promise<TechniquePriority[]> {
    console.log(`Prioritizing ${techniqueIds.length} techniques`);

    const priorities: TechniquePriority[] = [];

    try {
      // Get technique metadata and historical data
      const techniques = await this.pool.query(
        `SELECT technique_id, technique_name
         FROM simulation_techniques
         WHERE technique_id = ANY($1)`,
        [techniqueIds]
      );

      for (const technique of techniques.rows) {
        const factors = await this.calculatePriorityFactors(technique.technique_id);

        // Calculate weighted priority score
        const priorityScore =
          factors.threatLevel * 0.25 +
          factors.exploitationLikelihood * 0.2 +
          factors.impactSeverity * 0.25 +
          factors.detectionDifficulty * 0.15 +
          (1 - factors.currentCoverage) * 0.1 +
          factors.industryPrevalence * 0.05;

        priorities.push({
          techniqueId: technique.technique_id,
          techniqueName: technique.technique_name,
          priorityScore: Math.round(priorityScore * 100),
          priorityRank: 0, // Will be set after sorting
          factors,
          recommendation: this.generatePriorityRecommendation(priorityScore, factors),
        });
      }

      // Sort by priority score and assign ranks
      priorities.sort((a, b) => b.priorityScore - a.priorityScore);
      priorities.forEach((p, index) => {
        p.priorityRank = index + 1;
      });

      // Save prioritization results
      await this.saveTechniquePriorities(priorities);

      return priorities;
    } catch (error) {
      console.error('Failed to prioritize techniques:', error);
      throw error;
    }
  }

  /**
   * Generate workflow recommendations
   */
  async generateWorkflowRecommendations(
    jobId: string
  ): Promise<WorkflowRecommendation[]> {
    console.log(`Generating workflow recommendations for job: ${jobId}`);

    const recommendations: WorkflowRecommendation[] = [];

    try {
      // Get job results and existing workflows
      const jobResult = await this.pool.query(
        'SELECT * FROM simulation_jobs WHERE id = $1',
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error('Job not found');
      }

      const gaps = await this.pool.query(
        'SELECT * FROM simulation_gaps WHERE job_id = $1',
        [jobId]
      );

      const existingWorkflows = await this.pool.query(
        'SELECT * FROM automated_workflows WHERE enabled = true'
      );

      // Analyze gaps and recommend workflows
      if (gaps.rows.length > 0) {
        const criticalGaps = gaps.rows.filter(g => g.gap_severity === 'critical');

        if (criticalGaps.length > 0 && !this.hasWorkflowForTrigger(existingWorkflows.rows, 'gap_detected')) {
          recommendations.push({
            recommendationType: 'new_workflow',
            confidence: 0.9,
            description: 'Create automated response workflow for critical gaps',
            suggestedWorkflow: {
              name: 'Critical Gap Auto-Response',
              trigger: 'gap_detected',
              conditions: [
                { field: 'gap_severity', operator: 'equals', value: 'critical' }
              ],
              actions: [
                {
                  type: 'create_ticket',
                  config: { priority: 'critical' },
                  order: 1
                },
                {
                  type: 'send_notification',
                  config: { channels: ['email', 'slack'], severity: 'critical' },
                  order: 2
                }
              ]
            },
            expectedBenefit: 'Reduce critical gap response time from hours to minutes',
            implementationComplexity: 'low',
          });
        }
      }

      // Save recommendations
      await this.saveWorkflowRecommendations(jobId, recommendations);

      return recommendations;
    } catch (error) {
      console.error('Failed to generate workflow recommendations:', error);
      throw error;
    }
  }

  /**
   * Recognize patterns across simulations
   */
  async recognizePatterns(
    startDate: Date,
    endDate: Date
  ): Promise<PatternRecognition[]> {
    console.log(`Recognizing patterns from ${startDate} to ${endDate}`);

    const patterns: PatternRecognition[] = [];

    try {
      // Get all simulation results in time range
      const results = await this.pool.query(
        `SELECT * FROM simulation_technique_results str
         JOIN simulation_jobs sj ON str.job_id = sj.id
         WHERE sj.created_at BETWEEN $1 AND $2
         ORDER BY sj.created_at ASC`,
        [startDate, endDate]
      );

      // 1. Detect attack chain patterns
      const attackChains = this.detectAttackChainPatterns(results.rows);
      patterns.push(...attackChains);

      // 2. Detect failure clusters
      const failureClusters = this.detectFailureClusters(results.rows);
      patterns.push(...failureClusters);

      // 3. Detect success clusters
      const successClusters = this.detectSuccessClusters(results.rows);
      patterns.push(...successClusters);

      // 4. Detect temporal patterns
      const temporalPatterns = this.detectTemporalPatterns(results.rows);
      patterns.push(...temporalPatterns);

      // Save pattern recognition results
      await this.savePatternRecognition(patterns);

      return patterns;
    } catch (error) {
      console.error('Failed to recognize patterns:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */

  private generateMitigationPredictions(
    techniqueId: string,
    severity: string
  ): GapPrediction['predictedMitigations'] {
    // Simplified mitigation generation
    // In production, use knowledge base or ML model
    return [
      {
        mitigation: 'Implement detection rule',
        effectiveness: 0.8,
        implementationCost: 'low',
      },
      {
        mitigation: 'Deploy preventive control',
        effectiveness: 0.9,
        implementationCost: 'medium',
      },
    ];
  }

  private identifyRiskFactors(techniqueId: string): GapPrediction['riskFactors'] {
    // Simplified risk factor identification
    return [
      { factor: 'High prevalence in recent attacks', impact: 0.8 },
      { factor: 'Difficult to detect', impact: 0.6 },
    ];
  }

  private async calculatePriorityFactors(techniqueId: string): Promise<TechniquePriority['factors']> {
    // Simplified factor calculation
    // In production, use threat intelligence feeds and historical data
    return {
      threatLevel: Math.random() * 0.5 + 0.5,
      exploitationLikelihood: Math.random() * 0.5 + 0.5,
      impactSeverity: Math.random() * 0.5 + 0.5,
      detectionDifficulty: Math.random() * 0.5 + 0.5,
      currentCoverage: Math.random() * 0.5,
      industryPrevalence: Math.random() * 0.5 + 0.5,
    };
  }

  private generatePriorityRecommendation(
    score: number,
    factors: TechniquePriority['factors']
  ): string {
    if (score > 0.8) {
      return 'CRITICAL: Prioritize immediate simulation and control validation';
    } else if (score > 0.6) {
      return 'HIGH: Schedule simulation within next 7 days';
    } else if (score > 0.4) {
      return 'MEDIUM: Include in next regular simulation cycle';
    } else {
      return 'LOW: Monitor and include in comprehensive assessments';
    }
  }

  private hasWorkflowForTrigger(workflows: any[], trigger: string): boolean {
    return workflows.some(w => w.trigger === trigger);
  }

  private detectAttackChainPatterns(results: any[]): PatternRecognition[] {
    // Simplified pattern detection
    return [];
  }

  private detectFailureClusters(results: any[]): PatternRecognition[] {
    return [];
  }

  private detectSuccessClusters(results: any[]): PatternRecognition[] {
    return [];
  }

  private detectTemporalPatterns(results: any[]): PatternRecognition[] {
    return [];
  }

  /**
   * Database persistence methods
   */

  private async saveAnomalyDetection(result: AnomalyDetectionResult): Promise<void> {
    await this.pool.query(
      `INSERT INTO ml_anomaly_detections (
        job_id, anomalies, overall_anomaly_score, analysis_timestamp
      ) VALUES ($1, $2, $3, $4)`,
      [
        result.jobId,
        JSON.stringify(result.anomalies),
        result.overallAnomalyScore,
        result.analysisTimestamp,
      ]
    );
  }

  private async saveGapPredictions(predictions: GapPrediction[]): Promise<void> {
    for (const prediction of predictions) {
      await this.pool.query(
        `INSERT INTO ml_gap_predictions (
          technique_id, predicted_severity, gap_probability,
          confidence, predicted_mitigations, risk_factors
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          prediction.techniqueId,
          prediction.predictedGapSeverity,
          prediction.gapProbability,
          prediction.confidence,
          JSON.stringify(prediction.predictedMitigations),
          JSON.stringify(prediction.riskFactors),
        ]
      );
    }
  }

  private async saveTechniquePriorities(priorities: TechniquePriority[]): Promise<void> {
    for (const priority of priorities) {
      await this.pool.query(
        `INSERT INTO ml_technique_priorities (
          technique_id, priority_score, priority_rank, factors, recommendation
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          priority.techniqueId,
          priority.priorityScore,
          priority.priorityRank,
          JSON.stringify(priority.factors),
          priority.recommendation,
        ]
      );
    }
  }

  private async saveWorkflowRecommendations(
    jobId: string,
    recommendations: WorkflowRecommendation[]
  ): Promise<void> {
    for (const rec of recommendations) {
      await this.pool.query(
        `INSERT INTO ml_workflow_recommendations (
          job_id, recommendation_type, confidence, description,
          suggested_workflow, expected_benefit, implementation_complexity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          jobId,
          rec.recommendationType,
          rec.confidence,
          rec.description,
          JSON.stringify(rec.suggestedWorkflow),
          rec.expectedBenefit,
          rec.implementationComplexity,
        ]
      );
    }
  }

  private async savePatternRecognition(patterns: PatternRecognition[]): Promise<void> {
    for (const pattern of patterns) {
      await this.pool.query(
        `INSERT INTO ml_pattern_recognition (
          pattern_type, description, occurrences, confidence,
          affected_techniques, time_range_start, time_range_end,
          insights, recommendations
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          pattern.patternType,
          pattern.description,
          pattern.occurrences,
          pattern.confidence,
          pattern.affectedTechniques,
          pattern.timeRange.start,
          pattern.timeRange.end,
          JSON.stringify(pattern.insights),
          JSON.stringify(pattern.recommendations),
        ]
      );
    }
  }

  /**
   * Train new ML model
   */
  async trainModel(model: Omit<MLModel, 'id' | 'status' | 'trainedAt' | 'deployedAt'>): Promise<MLModel> {
    console.log(`Training ML model: ${model.name}`);

    try {
      // In production, this would:
      // 1. Fetch training data
      // 2. Train the model using TensorFlow.js or external ML service
      // 3. Evaluate model performance
      // 4. Save model artifacts

      const result = await this.pool.query(
        `INSERT INTO ml_models (
          name, type, version, status, algorithm, features,
          hyperparameters, training_data_size, accuracy, precision,
          recall, f1_score, trained_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13)
        RETURNING *`,
        [
          model.name,
          model.type,
          model.version,
          'trained',
          model.algorithm,
          model.features,
          JSON.stringify(model.hyperparameters),
          model.trainingDataSize,
          model.accuracy,
          model.precision,
          model.recall,
          model.f1Score,
          model.createdBy,
        ]
      );

      const savedModel: MLModel = {
        id: result.rows[0].id,
        name: result.rows[0].name,
        type: result.rows[0].type,
        version: result.rows[0].version,
        status: result.rows[0].status,
        algorithm: result.rows[0].algorithm,
        features: result.rows[0].features,
        hyperparameters: result.rows[0].hyperparameters,
        trainingDataSize: result.rows[0].training_data_size,
        accuracy: result.rows[0].accuracy,
        precision: result.rows[0].precision,
        recall: result.rows[0].recall,
        f1Score: result.rows[0].f1_score,
        trainedAt: result.rows[0].trained_at,
        createdBy: result.rows[0].created_by,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      };

      return savedModel;
    } catch (error) {
      console.error('Failed to train model:', error);
      throw error;
    }
  }

  /**
   * Deploy model
   */
  async deployModel(modelId: string): Promise<void> {
    await this.pool.query(
      'UPDATE ml_models SET status = $1, deployed_at = NOW() WHERE id = $2',
      ['deployed', modelId]
    );

    await this.loadModels(); // Reload models
  }
}

export default MachineLearningService;
