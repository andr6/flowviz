/**
 * Attack Simulation & Purple Teaming - Core Service
 *
 * Orchestrates attack simulation execution, validation, and gap analysis
 * across multiple security testing platforms (Picus, Atomic Red Team, CALDERA, etc.)
 */

import { Pool } from 'pg';
import {
  SimulationPlan,
  SimulationJob,
  ValidationResult,
  GapAnalysis,
  RemediationRecommendation,
  SimulationTechnique,
  ExecutionMode,
  SimulationPlatform,
  JobStatus,
  ValidationResultStatus,
  GapType,
  GapSeverity,
  RemediationCategory,
  DefensiveCoverage,
  TechniqueCoverage,
  SimulationScores,
  ControlCoverage,
  CreateSimulationPlanRequest,
  ExecuteSimulationRequest,
  ConvertFlowToSimulationRequest,
  ConvertFlowToSimulationResponse,
} from '../types';

// Import platform adapters (to be implemented)
import { PicusAdapter } from './adapters/PicusAdapter';
import { AtomicRedTeamAdapter } from './adapters/AtomicRedTeamAdapter';
import { CalderaAdapter } from './adapters/CalderaAdapter';

/**
 * Main Attack Simulation Service
 * Handles simulation planning, execution, validation, and analysis
 */
export class AttackSimulationService {
  private pool: Pool;
  private platformAdapters: Map<SimulationPlatform, any>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.platformAdapters = new Map();
    this.initializePlatformAdapters();
  }

  /**
   * Initialize platform integration adapters
   */
  private initializePlatformAdapters(): void {
    // Initialize adapters for each platform
    this.platformAdapters.set('picus', new PicusAdapter());
    this.platformAdapters.set('atomic_red_team', new AtomicRedTeamAdapter());
    this.platformAdapters.set('caldera', new CalderaAdapter());
    // AttackIQ and custom adapters can be added later
  }

  /**
   * Get platform adapter
   */
  private getPlatformAdapter(platform: SimulationPlatform): any {
    const adapter = this.platformAdapters.get(platform);
    if (!adapter) {
      throw new Error(`Platform adapter not found: ${platform}`);
    }
    return adapter;
  }

  // ============================================================================
  // Simulation Plan Management
  // ============================================================================

  /**
   * Convert attack flow to simulation plan
   */
  async convertFlowToSimulation(
    request: ConvertFlowToSimulationRequest
  ): Promise<ConvertFlowToSimulationResponse> {
    const { flowId, targetEnvironment, executionMode, platform } = request;

    // Fetch flow data
    const flowResult = await this.pool.query(
      'SELECT * FROM saved_flows WHERE id = $1',
      [flowId]
    );

    if (flowResult.rows.length === 0) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    const flow = flowResult.rows[0];
    const flowData = flow.flow_data;

    // Extract techniques from flow
    const techniques = this.extractTechniquesFromFlow(flowData);

    // Create simulation plan
    const planData = {
      flowId,
      targetEnvironment,
      executionMode,
      platform,
      sourceFlow: flowData,
      extractedAt: new Date(),
    };

    const planResult = await this.pool.query(
      `INSERT INTO simulation_plans (
        name, description, flow_id, source_type, target_environment,
        execution_mode, platform, techniques, technique_count, plan_data,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        `Simulation: ${flow.name}`,
        `Attack simulation generated from flow: ${flow.name}`,
        flowId,
        'flow',
        targetEnvironment,
        executionMode,
        platform,
        JSON.stringify(techniques),
        techniques.length,
        JSON.stringify(planData),
        'draft',
      ]
    );

    const plan = this.mapDbRowToSimulationPlan(planResult.rows[0]);

    // Generate warnings and suggestions
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (executionMode === 'live') {
      warnings.push('Live execution mode selected - techniques will be executed in production environment');
    }

    if (techniques.length > 50) {
      suggestions.push('Consider breaking this into multiple smaller simulation runs for better tracking');
    }

    const unsupportedTechniques = techniques.filter(t => !this.isTechniqueSupported(t, platform));
    if (unsupportedTechniques.length > 0) {
      warnings.push(`${unsupportedTechniques.length} techniques are not supported by ${platform}`);
      suggestions.push('Consider using a different platform or custom implementation');
    }

    return { plan, warnings, suggestions };
  }

  /**
   * Create simulation plan
   */
  async createSimulationPlan(request: CreateSimulationPlanRequest): Promise<SimulationPlan> {
    const {
      name,
      description,
      flowId,
      campaignId,
      playbookId,
      sourceType,
      targetEnvironment,
      executionMode,
      platform,
      techniques,
      scheduledStart,
      scheduledEnd,
      recurrence,
    } = request;

    const planData = {
      sourceType,
      configuration: { targetEnvironment, executionMode, platform },
      schedule: { scheduledStart, scheduledEnd, recurrence },
      createdFrom: { flowId, campaignId, playbookId },
    };

    const result = await this.pool.query(
      `INSERT INTO simulation_plans (
        name, description, flow_id, campaign_id, playbook_id, source_type,
        target_environment, execution_mode, platform, techniques, technique_count,
        scheduled_start, scheduled_end, recurrence, plan_data, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING *`,
      [
        name,
        description,
        flowId,
        campaignId,
        playbookId,
        sourceType,
        targetEnvironment,
        executionMode,
        platform,
        JSON.stringify(techniques),
        techniques.length,
        scheduledStart,
        scheduledEnd,
        recurrence,
        JSON.stringify(planData),
        'draft',
      ]
    );

    return this.mapDbRowToSimulationPlan(result.rows[0]);
  }

  /**
   * Get simulation plan by ID
   */
  async getSimulationPlan(planId: string): Promise<SimulationPlan> {
    const result = await this.pool.query(
      'SELECT * FROM simulation_plans WHERE id = $1',
      [planId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Simulation plan not found: ${planId}`);
    }

    return this.mapDbRowToSimulationPlan(result.rows[0]);
  }

  /**
   * List simulation plans
   */
  async listSimulationPlans(filters?: {
    status?: string[];
    platform?: string[];
    executionMode?: string[];
  }): Promise<SimulationPlan[]> {
    let query = 'SELECT * FROM simulation_plans WHERE 1=1';
    const params: any[] = [];

    if (filters?.status && filters.status.length > 0) {
      params.push(filters.status);
      query += ` AND status = ANY($${params.length})`;
    }

    if (filters?.platform && filters.platform.length > 0) {
      params.push(filters.platform);
      query += ` AND platform = ANY($${params.length})`;
    }

    if (filters?.executionMode && filters.executionMode.length > 0) {
      params.push(filters.executionMode);
      query += ` AND execution_mode = ANY($${params.length})`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapDbRowToSimulationPlan(row));
  }

  // ============================================================================
  // Simulation Execution
  // ============================================================================

  /**
   * Execute simulation
   */
  async executeSimulation(request: ExecuteSimulationRequest): Promise<SimulationJob> {
    const { planId, executionMode, targetEnvironment, executedBy } = request;

    // Get plan
    const plan = await this.getSimulationPlan(planId);

    // Get next job number
    const jobNumberResult = await this.pool.query(
      'SELECT COALESCE(MAX(job_number), 0) + 1 as next_number FROM simulation_jobs WHERE plan_id = $1',
      [planId]
    );
    const jobNumber = jobNumberResult.rows[0].next_number;

    // Create job
    const jobData = {
      planName: plan.name,
      techniques: plan.techniques,
      executionConfig: {
        mode: executionMode || plan.executionMode,
        environment: targetEnvironment || plan.targetEnvironment,
      },
    };

    const result = await this.pool.query(
      `INSERT INTO simulation_jobs (
        plan_id, job_number, execution_mode, target_environment, platform,
        status, progress_percentage, total_techniques, techniques_executed,
        techniques_successful, techniques_failed, techniques_blocked,
        job_data, execution_log, executed_by, started_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *`,
      [
        planId,
        jobNumber,
        executionMode || plan.executionMode,
        targetEnvironment || plan.targetEnvironment,
        plan.platform,
        'initializing',
        0,
        plan.techniques.length,
        0,
        0,
        0,
        0,
        JSON.stringify(jobData),
        JSON.stringify([]),
        executedBy,
      ]
    );

    const job = this.mapDbRowToSimulationJob(result.rows[0]);

    // Start execution asynchronously
    this.executeSimulationAsync(job.id, plan).catch(error => {
      console.error(`Simulation execution failed for job ${job.id}:`, error);
      this.updateJobStatus(job.id, 'failed', error.message);
    });

    return job;
  }

  /**
   * Execute simulation asynchronously
   */
  private async executeSimulationAsync(jobId: string, plan: SimulationPlan): Promise<void> {
    try {
      await this.updateJobStatus(jobId, 'running');

      const adapter = this.getPlatformAdapter(plan.platform);
      const techniques = plan.techniques;

      let executed = 0;
      let successful = 0;
      let failed = 0;
      let blocked = 0;

      for (const technique of techniques) {
        try {
          // Execute technique
          const result = await adapter.executeTechnique(technique, plan.executionMode, plan.targetEnvironment);

          // Save validation result
          await this.saveValidationResult(jobId, technique, result);

          // Update counters
          executed++;
          if (result.resultStatus === 'success') successful++;
          if (result.resultStatus === 'failed') failed++;
          if (result.resultStatus === 'blocked') blocked++;

          // Update progress
          const progress = Math.round((executed / techniques.length) * 100);
          await this.updateJobProgress(jobId, progress, executed, successful, failed, blocked);

          // Add log entry
          await this.addExecutionLog(jobId, 'info', `Executed technique: ${technique.name}`, technique.id);

        } catch (error) {
          failed++;
          await this.addExecutionLog(jobId, 'error', `Failed to execute technique: ${technique.name}`, technique.id);
        }
      }

      // Calculate scores
      const scores = this.calculateSimulationScores(executed, successful, blocked);

      // Complete job
      await this.completeJob(jobId, scores);

    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Execute Picus validation
   */
  async executePicusValidation(
    techniques: SimulationTechnique[],
    mode: 'safe' | 'live' = 'safe',
    targetEnvironment?: string
  ): Promise<ValidationResult[]> {
    const adapter = this.getPlatformAdapter('picus');

    const results: ValidationResult[] = [];

    for (const technique of techniques) {
      try {
        const result = await adapter.executeTechnique(technique, mode, targetEnvironment);
        results.push(result);
      } catch (error) {
        console.error(`Failed to execute technique ${technique.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Monitor simulation progress
   */
  async monitorSimulationProgress(jobId: string): Promise<SimulationJob> {
    const result = await this.pool.query(
      'SELECT * FROM simulation_jobs WHERE id = $1',
      [jobId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Simulation job not found: ${jobId}`);
    }

    return this.mapDbRowToSimulationJob(result.rows[0]);
  }

  /**
   * Cancel simulation
   */
  async cancelSimulation(jobId: string): Promise<void> {
    await this.pool.query(
      `UPDATE simulation_jobs
       SET status = $1, completed_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      ['cancelled', jobId]
    );
  }

  // ============================================================================
  // Validation & Gap Analysis
  // ============================================================================

  /**
   * Generate validation report
   */
  async generateValidationReport(jobId: string): Promise<{
    job: SimulationJob;
    results: ValidationResult[];
    scores: SimulationScores;
    gaps: GapAnalysis[];
  }> {
    const job = await this.monitorSimulationProgress(jobId);
    const results = await this.getValidationResults(jobId);
    const scores = {
      detectionScore: job.detectionScore || 0,
      preventionScore: job.preventionScore || 0,
      overallScore: job.overallScore || 0,
      techniqueBreakdown: results.map(r => ({
        techniqueId: r.techniqueId,
        techniqueName: r.techniqueName,
        detected: r.wasDetected,
        prevented: r.wasPrevented,
        detectionTime: r.detectionTimeSeconds,
        score: this.calculateTechniqueScore(r),
      })),
    };
    const gaps = await this.getGapAnalysis(jobId);

    return { job, results, scores, gaps };
  }

  /**
   * Perform gap analysis
   */
  async performGapAnalysis(jobId: string): Promise<GapAnalysis[]> {
    const results = await this.getValidationResults(jobId);
    const gaps: GapAnalysis[] = [];

    for (const result of results) {
      // Detection gaps
      if (!result.wasDetected) {
        const gap = await this.createGap({
          jobId,
          gapType: 'detection',
          severity: this.calculateGapSeverity(result),
          techniqueId: result.techniqueId,
          techniqueName: result.techniqueName,
          title: `Detection gap for ${result.techniqueName}`,
          description: `Technique ${result.techniqueId} (${result.techniqueName}) was not detected by any security controls`,
          evidence: result.evidence,
          affectedAssets: [],
        });
        gaps.push(gap);
      }

      // Prevention gaps
      if (result.wasDetected && !result.wasPrevented) {
        const gap = await this.createGap({
          jobId,
          gapType: 'prevention',
          severity: this.calculateGapSeverity(result),
          techniqueId: result.techniqueId,
          techniqueName: result.techniqueName,
          title: `Prevention gap for ${result.techniqueName}`,
          description: `Technique ${result.techniqueId} (${result.techniqueName}) was detected but not prevented`,
          evidence: result.evidence,
          affectedAssets: [],
        });
        gaps.push(gap);
      }
    }

    return gaps;
  }

  /**
   * Map controls to defensive measures
   */
  async mapControlsToDefenses(techniques: SimulationTechnique[]): Promise<DefensiveCoverage> {
    // This would integrate with MITRE D3FEND mapping
    const techniqueCoverage: TechniqueCoverage[] = [];
    const controlsMapped: any[] = [];
    const gaps: any[] = [];

    for (const technique of techniques) {
      // Map to D3FEND defensive techniques
      const defensiveTechniques = this.mapToD3FEND(technique);

      techniqueCoverage.push({
        techniqueId: technique.id,
        techniqueName: technique.name,
        tactic: technique.tactic || '',
        controlsCovering: defensiveTechniques.map(dt => dt.id),
        coverageLevel: defensiveTechniques.length > 2 ? 'full' : defensiveTechniques.length > 0 ? 'partial' : 'none',
        detectionCapability: this.calculateDetectionCapability(defensiveTechniques),
        preventionCapability: this.calculatePreventionCapability(defensiveTechniques),
      });

      if (defensiveTechniques.length === 0) {
        gaps.push({
          techniqueId: technique.id,
          techniqueName: technique.name,
          gapType: 'both' as const,
          recommendedControls: this.getRecommendedControls(technique),
        });
      }
    }

    const overallCoverage = this.calculateOverallCoverage(techniqueCoverage);

    return {
      techniques: techniqueCoverage,
      controlsMapped,
      overallCoverage,
      gaps,
    };
  }

  /**
   * Generate remediation recommendations
   */
  async generateRemediationRecommendations(gapId: string): Promise<RemediationRecommendation[]> {
    const gapResult = await this.pool.query(
      'SELECT * FROM gap_analysis WHERE id = $1',
      [gapId]
    );

    if (gapResult.rows.length === 0) {
      throw new Error(`Gap not found: ${gapId}`);
    }

    const gap = gapResult.rows[0];
    const recommendations: RemediationRecommendation[] = [];

    // Generate recommendations based on gap type and technique
    if (gap.gap_type === 'detection') {
      recommendations.push({
        id: '', // Will be set on save
        gapId,
        title: `Implement detection for ${gap.technique_name}`,
        description: `Deploy detection rules to identify ${gap.technique_name} activity`,
        category: 'technical' as RemediationCategory,
        implementationSteps: [
          {
            order: 1,
            title: 'Identify relevant log sources',
            description: 'Determine which systems log activity related to this technique',
            estimatedHours: 2,
            completed: false,
          },
          {
            order: 2,
            title: 'Create detection rule',
            description: 'Develop Sigma/YARA/custom detection rule',
            estimatedHours: 4,
            completed: false,
          },
          {
            order: 3,
            title: 'Test and deploy',
            description: 'Test rule and deploy to production SIEM',
            estimatedHours: 3,
            completed: false,
          },
        ],
        estimatedEffortHours: 9,
        estimatedCost: 'low',
        complexity: 'medium',
        priority: this.calculateRemediationPriority(gap),
        requiredTools: ['SIEM', 'Detection Engineering Platform'],
        requiredSkills: ['Detection Engineering', 'Log Analysis'],
        requiredResources: [],
        prerequisites: [],
        dependencies: [],
        status: 'pending',
        recommendationData: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (gap.gap_type === 'prevention') {
      recommendations.push({
        id: '',
        gapId,
        title: `Implement prevention for ${gap.technique_name}`,
        description: `Deploy preventive controls to block ${gap.technique_name}`,
        category: 'technical' as RemediationCategory,
        implementationSteps: [
          {
            order: 1,
            title: 'Review security controls',
            description: 'Audit existing preventive controls',
            estimatedHours: 3,
            completed: false,
          },
          {
            order: 2,
            title: 'Implement blocking mechanism',
            description: 'Configure EDR/firewall/application control',
            estimatedHours: 5,
            completed: false,
          },
          {
            order: 3,
            title: 'Validate effectiveness',
            description: 'Re-test to ensure technique is blocked',
            estimatedHours: 2,
            completed: false,
          },
        ],
        estimatedEffortHours: 10,
        estimatedCost: 'medium',
        complexity: 'medium',
        priority: this.calculateRemediationPriority(gap),
        requiredTools: ['EDR', 'Firewall', 'Application Control'],
        requiredSkills: ['Security Engineering', 'System Administration'],
        requiredResources: [],
        prerequisites: [],
        dependencies: [],
        status: 'pending',
        recommendationData: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return recommendations;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Extract techniques from flow data
   */
  private extractTechniquesFromFlow(flowData: any): SimulationTechnique[] {
    const techniques: SimulationTechnique[] = [];

    if (flowData.nodes) {
      for (const node of flowData.nodes) {
        if (node.data?.attackId) {
          techniques.push({
            id: node.data.attackId,
            name: node.data.label || node.data.name || node.data.attackId,
            tactic: node.data.tactic,
            description: node.data.description,
            platforms: node.data.platforms || [],
            dataSource: node.data.dataSources || [],
          });
        }
      }
    }

    return techniques;
  }

  /**
   * Check if technique is supported by platform
   */
  private isTechniqueSupported(technique: SimulationTechnique, platform: SimulationPlatform): boolean {
    // This would check platform capabilities
    // For now, return true for all
    return true;
  }

  /**
   * Save validation result
   */
  private async saveValidationResult(
    jobId: string,
    technique: SimulationTechnique,
    result: any
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO validation_results (
        job_id, technique_id, technique_name, tactic, sub_technique_id,
        execution_order, executed_at, duration_seconds, result_status,
        was_detected, was_prevented, detection_time_seconds,
        detected_by, detection_rules_triggered, alerts_generated,
        prevented_by, prevention_mechanism, evidence, artifacts,
        screenshots, confidence_score, false_positive, notes, result_data,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW())`,
      [
        jobId,
        technique.id,
        technique.name,
        technique.tactic,
        technique.subTechniqueId,
        result.executionOrder || 0,
        result.durationSeconds || 0,
        result.resultStatus || 'success',
        result.wasDetected || false,
        result.wasPrevented || false,
        result.detectionTimeSeconds,
        result.detectedBy || [],
        result.detectionRulesTriggered || [],
        result.alertsGenerated || 0,
        result.preventedBy || [],
        result.preventionMechanism,
        JSON.stringify(result.evidence || {}),
        JSON.stringify(result.artifacts || []),
        result.screenshots || [],
        result.confidenceScore,
        result.falsePositive || false,
        result.notes,
        JSON.stringify(result),
      ]
    );
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    jobId: string,
    progress: number,
    executed: number,
    successful: number,
    failed: number,
    blocked: number
  ): Promise<void> {
    await this.pool.query(
      `UPDATE simulation_jobs
       SET progress_percentage = $1, techniques_executed = $2,
           techniques_successful = $3, techniques_failed = $4,
           techniques_blocked = $5, updated_at = NOW()
       WHERE id = $6`,
      [progress, executed, successful, failed, blocked, jobId]
    );
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: JobStatus, errorMessage?: string): Promise<void> {
    await this.pool.query(
      `UPDATE simulation_jobs
       SET status = $1, error_message = $2, updated_at = NOW()
       WHERE id = $3`,
      [status, errorMessage, jobId]
    );
  }

  /**
   * Complete job
   */
  private async completeJob(jobId: string, scores: { detection: number; prevention: number; overall: number }): Promise<void> {
    await this.pool.query(
      `UPDATE simulation_jobs
       SET status = $1, progress_percentage = 100,
           detection_score = $2, prevention_score = $3, overall_score = $4,
           completed_at = NOW(), updated_at = NOW()
       WHERE id = $5`,
      ['completed', scores.detection, scores.prevention, scores.overall, jobId]
    );
  }

  /**
   * Add execution log entry
   */
  private async addExecutionLog(jobId: string, level: 'info' | 'warning' | 'error', message: string, techniqueId?: string): Promise<void> {
    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      techniqueId,
    };

    await this.pool.query(
      `UPDATE simulation_jobs
       SET execution_log = execution_log || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify([logEntry]), jobId]
    );
  }

  /**
   * Calculate simulation scores
   */
  private calculateSimulationScores(executed: number, successful: number, blocked: number): {
    detection: number;
    prevention: number;
    overall: number;
  } {
    const detectionScore = executed > 0 ? (successful / executed) * 100 : 0;
    const preventionScore = executed > 0 ? (blocked / executed) * 100 : 0;
    const overallScore = (detectionScore + preventionScore) / 2;

    return {
      detection: Math.round(detectionScore * 10) / 10,
      prevention: Math.round(preventionScore * 10) / 10,
      overall: Math.round(overallScore * 10) / 10,
    };
  }

  /**
   * Get validation results
   */
  private async getValidationResults(jobId: string): Promise<ValidationResult[]> {
    const result = await this.pool.query(
      'SELECT * FROM validation_results WHERE job_id = $1 ORDER BY execution_order',
      [jobId]
    );

    return result.rows.map(row => ({
      id: row.id,
      jobId: row.job_id,
      techniqueId: row.technique_id,
      techniqueName: row.technique_name,
      tactic: row.tactic,
      subTechniqueId: row.sub_technique_id,
      executionOrder: row.execution_order,
      executedAt: row.executed_at,
      durationSeconds: row.duration_seconds,
      resultStatus: row.result_status,
      wasDetected: row.was_detected,
      wasPrevented: row.was_prevented,
      detectionTimeSeconds: row.detection_time_seconds,
      detectedBy: row.detected_by || [],
      detectionRulesTriggered: row.detection_rules_triggered || [],
      alertsGenerated: row.alerts_generated || 0,
      preventedBy: row.prevented_by || [],
      preventionMechanism: row.prevention_mechanism,
      evidence: row.evidence || {},
      artifacts: row.artifacts || [],
      screenshots: row.screenshots || [],
      confidenceScore: row.confidence_score,
      falsePositive: row.false_positive || false,
      notes: row.notes,
      resultData: row.result_data || {},
      createdAt: row.created_at,
    }));
  }

  /**
   * Get gap analysis
   */
  private async getGapAnalysis(jobId: string): Promise<GapAnalysis[]> {
    const result = await this.pool.query(
      'SELECT * FROM gap_analysis WHERE job_id = $1 ORDER BY severity DESC, created_at DESC',
      [jobId]
    );

    return result.rows.map(row => ({
      id: row.id,
      jobId: row.job_id,
      gapType: row.gap_type,
      severity: row.severity,
      techniqueId: row.technique_id,
      techniqueName: row.technique_name,
      controlId: row.control_id,
      controlName: row.control_name,
      title: row.title,
      description: row.description,
      impactDescription: row.impact_description,
      riskScore: row.risk_score,
      evidence: row.evidence || {},
      affectedAssets: row.affected_assets || [],
      status: row.status,
      assignedTo: row.assigned_to,
      dueDate: row.due_date,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      resolutionNotes: row.resolution_notes,
      gapData: row.gap_data || {},
      identifiedAt: row.identified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Create gap
   */
  private async createGap(gap: Partial<GapAnalysis>): Promise<GapAnalysis> {
    const result = await this.pool.query(
      `INSERT INTO gap_analysis (
        job_id, gap_type, severity, technique_id, technique_name,
        control_id, control_name, title, description, impact_description,
        risk_score, evidence, affected_assets, status, identified_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), NOW())
      RETURNING *`,
      [
        gap.jobId,
        gap.gapType,
        gap.severity,
        gap.techniqueId,
        gap.techniqueName,
        gap.controlId,
        gap.controlName,
        gap.title,
        gap.description,
        gap.impactDescription,
        gap.riskScore,
        JSON.stringify(gap.evidence || {}),
        gap.affectedAssets || [],
        gap.status || 'open',
      ]
    );

    return result.rows[0];
  }

  /**
   * Calculate gap severity
   */
  private calculateGapSeverity(result: ValidationResult): GapSeverity {
    // High severity if technique succeeded and was not detected
    if (result.resultStatus === 'success' && !result.wasDetected) {
      return 'critical';
    }

    // High severity if detected but not prevented
    if (result.wasDetected && !result.wasPrevented) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Calculate technique score
   */
  private calculateTechniqueScore(result: ValidationResult): number {
    let score = 0;

    if (result.wasDetected) score += 50;
    if (result.wasPrevented) score += 50;

    return score;
  }

  /**
   * Calculate remediation priority
   */
  private calculateRemediationPriority(gap: any): number {
    const severityScores: Record<string, number> = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
      info: 10,
    };

    return severityScores[gap.severity] || 50;
  }

  /**
   * Map to D3FEND defensive techniques
   */
  private mapToD3FEND(technique: SimulationTechnique): any[] {
    // This would integrate with D3FEND knowledge base
    // Placeholder implementation
    return [];
  }

  /**
   * Calculate detection capability
   */
  private calculateDetectionCapability(defensiveTechniques: any[]): number {
    return defensiveTechniques.length > 0 ? 75 : 0;
  }

  /**
   * Calculate prevention capability
   */
  private calculatePreventionCapability(defensiveTechniques: any[]): number {
    return defensiveTechniques.length > 1 ? 80 : 0;
  }

  /**
   * Get recommended controls
   */
  private getRecommendedControls(technique: SimulationTechnique): string[] {
    // Placeholder - would integrate with control recommendation engine
    return ['EDR', 'Network Monitoring', 'Application Whitelisting'];
  }

  /**
   * Calculate overall coverage
   */
  private calculateOverallCoverage(techniqueCoverage: TechniqueCoverage[]): number {
    if (techniqueCoverage.length === 0) return 0;

    const coveredCount = techniqueCoverage.filter(tc => tc.coverageLevel !== 'none').length;
    return Math.round((coveredCount / techniqueCoverage.length) * 100);
  }

  /**
   * Map database row to SimulationPlan
   */
  private mapDbRowToSimulationPlan(row: any): SimulationPlan {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      flowId: row.flow_id,
      campaignId: row.campaign_id,
      playbookId: row.playbook_id,
      sourceType: row.source_type,
      targetEnvironment: row.target_environment,
      executionMode: row.execution_mode,
      platform: row.platform,
      techniques: row.techniques || [],
      techniqueCount: row.technique_count || 0,
      scheduledStart: row.scheduled_start,
      scheduledEnd: row.scheduled_end,
      recurrence: row.recurrence,
      planData: row.plan_data || {},
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
    };
  }

  /**
   * Map database row to SimulationJob
   */
  private mapDbRowToSimulationJob(row: any): SimulationJob {
    return {
      id: row.id,
      planId: row.plan_id,
      jobNumber: row.job_number,
      executionMode: row.execution_mode,
      targetEnvironment: row.target_environment,
      platform: row.platform,
      platformJobId: row.platform_job_id,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationSeconds: row.duration_seconds,
      status: row.status,
      progressPercentage: row.progress_percentage || 0,
      totalTechniques: row.total_techniques || 0,
      techniquesExecuted: row.techniques_executed || 0,
      techniquesSuccessful: row.techniques_successful || 0,
      techniquesFailed: row.techniques_failed || 0,
      techniquesBlocked: row.techniques_blocked || 0,
      detectionScore: row.detection_score,
      preventionScore: row.prevention_score,
      overallScore: row.overall_score,
      jobData: row.job_data || {},
      executionLog: row.execution_log || [],
      errorMessage: row.error_message,
      errorDetails: row.error_details,
      executedBy: row.executed_by,
      createdAt: row.created_at,
    };
  }
}

export default AttackSimulationService;
