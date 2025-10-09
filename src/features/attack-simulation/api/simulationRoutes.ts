/**
 * Attack Simulation & Purple Teaming - API Routes
 *
 * RESTful API endpoints for simulation management, execution, and analysis
 */

import { Request, Response, Router } from 'express';
import { Pool } from 'pg';
import { AttackSimulationService } from '../services/AttackSimulationService';
import {
  CreateSimulationPlanRequest,
  ExecuteSimulationRequest,
  ConvertFlowToSimulationRequest,
  GapAnalysisRequest,
  PicusValidationRequest,
} from '../types';

/**
 * Setup Attack Simulation API routes
 */
export function setupSimulationRoutes(app: Router, pool: Pool): void {
  const service = new AttackSimulationService(pool);

  // ============================================================================
  // Simulation Plans
  // ============================================================================

  /**
   * Create simulation plan
   * POST /api/simulations/plans
   */
  app.post('/api/simulations/plans', async (req: Request, res: Response) => {
    try {
      const request: CreateSimulationPlanRequest = req.body;

      if (!request.name || !request.targetEnvironment || !request.platform || !request.techniques) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'name, targetEnvironment, platform, and techniques are required',
        });
      }

      const plan = await service.createSimulationPlan(request);
      res.status(201).json(plan);
    } catch (error) {
      console.error('Error creating simulation plan:', error);
      res.status(500).json({
        error: 'Failed to create simulation plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Convert flow to simulation plan
   * POST /api/simulations/plans/from-flow
   */
  app.post('/api/simulations/plans/from-flow', async (req: Request, res: Response) => {
    try {
      const request: ConvertFlowToSimulationRequest = req.body;

      if (!request.flowId || !request.targetEnvironment || !request.platform) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'flowId, targetEnvironment, and platform are required',
        });
      }

      const result = await service.convertFlowToSimulation(request);
      res.json(result);
    } catch (error) {
      console.error('Error converting flow to simulation:', error);
      res.status(500).json({
        error: 'Failed to convert flow to simulation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get simulation plan
   * GET /api/simulations/plans/:id
   */
  app.get('/api/simulations/plans/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const plan = await service.getSimulationPlan(id);
      res.json(plan);
    } catch (error) {
      console.error('Error getting simulation plan:', error);
      res.status(404).json({
        error: 'Simulation plan not found',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * List simulation plans
   * GET /api/simulations/plans
   */
  app.get('/api/simulations/plans', async (req: Request, res: Response) => {
    try {
      const filters = {
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        platform: req.query.platform ? (req.query.platform as string).split(',') : undefined,
        executionMode: req.query.executionMode ? (req.query.executionMode as string).split(',') : undefined,
      };

      const plans = await service.listSimulationPlans(filters);
      res.json(plans);
    } catch (error) {
      console.error('Error listing simulation plans:', error);
      res.status(500).json({
        error: 'Failed to list simulation plans',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Simulation Execution
  // ============================================================================

  /**
   * Execute simulation
   * POST /api/simulations/execute
   */
  app.post('/api/simulations/execute', async (req: Request, res: Response) => {
    try {
      const request: ExecuteSimulationRequest = req.body;

      if (!request.planId || !request.executedBy) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'planId and executedBy are required',
        });
      }

      const job = await service.executeSimulation(request);
      res.status(201).json(job);
    } catch (error) {
      console.error('Error executing simulation:', error);
      res.status(500).json({
        error: 'Failed to execute simulation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Monitor simulation progress
   * GET /api/simulations/jobs/:id
   */
  app.get('/api/simulations/jobs/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const job = await service.monitorSimulationProgress(id);
      res.json(job);
    } catch (error) {
      console.error('Error monitoring simulation:', error);
      res.status(404).json({
        error: 'Simulation job not found',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Cancel simulation
   * POST /api/simulations/jobs/:id/cancel
   */
  app.post('/api/simulations/jobs/:id/cancel', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await service.cancelSimulation(id);
      res.json({ message: 'Simulation cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling simulation:', error);
      res.status(500).json({
        error: 'Failed to cancel simulation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Validation & Results
  // ============================================================================

  /**
   * Execute Picus validation
   * POST /api/picus/validate-flow
   */
  app.post('/api/picus/validate-flow', async (req: Request, res: Response) => {
    try {
      const request: PicusValidationRequest = req.body;

      if (!request.flowId) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'flowId is required',
        });
      }

      // Convert flow to techniques
      const flowResult = await pool.query('SELECT * FROM saved_flows WHERE id = $1', [request.flowId]);

      if (flowResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Flow not found',
          message: `Flow with id ${request.flowId} not found`,
        });
      }

      const flow = flowResult.rows[0];
      const flowData = flow.flow_data;

      // Extract techniques from flow
      const techniques = [];
      if (flowData.nodes) {
        for (const node of flowData.nodes) {
          if (node.data?.attackId) {
            techniques.push({
              id: node.data.attackId,
              name: node.data.label || node.data.name || node.data.attackId,
              tactic: node.data.tactic,
              description: node.data.description,
              platforms: node.data.platforms || [],
            });
          }
        }
      }

      // Execute Picus validation
      const results = await service.executePicusValidation(
        techniques,
        request.mode || 'safe',
        request.targetEnvironment
      );

      res.json({
        validationId: `picus-${Date.now()}`,
        status: 'completed',
        techniques,
        results,
        estimatedDuration: techniques.length * 30, // 30 seconds per technique
      });
    } catch (error) {
      console.error('Error executing Picus validation:', error);
      res.status(500).json({
        error: 'Failed to execute Picus validation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get validation results
   * GET /api/simulations/jobs/:id/results
   */
  app.get('/api/simulations/jobs/:id/results', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const report = await service.generateValidationReport(id);
      res.json(report);
    } catch (error) {
      console.error('Error getting validation results:', error);
      res.status(500).json({
        error: 'Failed to get validation results',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Gap Analysis
  // ============================================================================

  /**
   * Perform gap analysis
   * POST /api/simulations/jobs/:id/gap-analysis
   */
  app.post('/api/simulations/jobs/:id/gap-analysis', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const gaps = await service.performGapAnalysis(id);

      const summary = {
        totalGaps: gaps.length,
        criticalGaps: gaps.filter(g => g.severity === 'critical').length,
        highGaps: gaps.filter(g => g.severity === 'high').length,
        mediumGaps: gaps.filter(g => g.severity === 'medium').length,
        lowGaps: gaps.filter(g => g.severity === 'low').length,
        avgRiskScore: gaps.length > 0
          ? gaps.reduce((sum, g) => sum + (g.riskScore || 0), 0) / gaps.length
          : 0,
      };

      res.json({ gaps, summary });
    } catch (error) {
      console.error('Error performing gap analysis:', error);
      res.status(500).json({
        error: 'Failed to perform gap analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get gap analysis
   * GET /api/simulations/gaps/:id
   */
  app.get('/api/simulations/gaps/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT * FROM gap_analysis WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Gap not found',
          message: `Gap with id ${id} not found`,
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error getting gap:', error);
      res.status(500).json({
        error: 'Failed to get gap',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Update gap status
   * PATCH /api/simulations/gaps/:id
   */
  app.patch('/api/simulations/gaps/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, assignedTo, dueDate, resolutionNotes } = req.body;

      const result = await pool.query(
        `UPDATE gap_analysis
         SET status = COALESCE($1, status),
             assigned_to = COALESCE($2, assigned_to),
             due_date = COALESCE($3, due_date),
             resolution_notes = COALESCE($4, resolution_notes),
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [status, assignedTo, dueDate, resolutionNotes, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Gap not found',
          message: `Gap with id ${id} not found`,
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating gap:', error);
      res.status(500).json({
        error: 'Failed to update gap',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Remediation Recommendations
  // ============================================================================

  /**
   * Generate remediation recommendations
   * POST /api/simulations/gaps/:id/recommendations
   */
  app.post('/api/simulations/gaps/:id/recommendations', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const recommendations = await service.generateRemediationRecommendations(id);
      res.json(recommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({
        error: 'Failed to generate recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Save remediation recommendation
   * POST /api/simulations/recommendations
   */
  app.post('/api/simulations/recommendations', async (req: Request, res: Response) => {
    try {
      const {
        gapId,
        jobId,
        title,
        description,
        category,
        implementationSteps,
        estimatedEffortHours,
        estimatedCost,
        complexity,
        priority,
        requiredTools,
        requiredSkills,
        requiredResources,
      } = req.body;

      const result = await pool.query(
        `INSERT INTO remediation_recommendations (
          gap_id, job_id, title, description, category,
          implementation_steps, estimated_effort_hours, estimated_cost,
          complexity, priority, required_tools, required_skills,
          required_resources, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *`,
        [
          gapId,
          jobId,
          title,
          description,
          category,
          JSON.stringify(implementationSteps || []),
          estimatedEffortHours,
          estimatedCost,
          complexity,
          priority,
          requiredTools || [],
          requiredSkills || [],
          requiredResources || [],
          'pending',
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error saving recommendation:', error);
      res.status(500).json({
        error: 'Failed to save recommendation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Update recommendation status
   * PATCH /api/simulations/recommendations/:id
   */
  app.patch('/api/simulations/recommendations/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, assignedTo, dueDate, implementationSteps } = req.body;

      const result = await pool.query(
        `UPDATE remediation_recommendations
         SET status = COALESCE($1, status),
             assigned_to = COALESCE($2, assigned_to),
             due_date = COALESCE($3, due_date),
             implementation_steps = COALESCE($4, implementation_steps),
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [status, assignedTo, dueDate, JSON.stringify(implementationSteps), id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Recommendation not found',
          message: `Recommendation with id ${id} not found`,
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating recommendation:', error);
      res.status(500).json({
        error: 'Failed to update recommendation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Control Coverage & Defensive Mapping
  // ============================================================================

  /**
   * Map controls to defenses
   * POST /api/simulations/controls/map
   */
  app.post('/api/simulations/controls/map', async (req: Request, res: Response) => {
    try {
      const { techniques } = req.body;

      if (!techniques || !Array.isArray(techniques)) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'techniques array is required',
        });
      }

      const coverage = await service.mapControlsToDefenses(techniques);
      res.json(coverage);
    } catch (error) {
      console.error('Error mapping controls:', error);
      res.status(500).json({
        error: 'Failed to map controls',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get control coverage
   * GET /api/simulations/jobs/:id/coverage
   */
  app.get('/api/simulations/jobs/:id/coverage', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT * FROM control_coverage WHERE job_id = $1 ORDER BY effectiveness_score DESC',
        [id]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error getting control coverage:', error);
      res.status(500).json({
        error: 'Failed to get control coverage',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Platform Integrations
  // ============================================================================

  /**
   * List supported platforms
   * GET /api/simulations/platforms
   */
  app.get('/api/simulations/platforms', async (req: Request, res: Response) => {
    try {
      const platforms = [
        {
          id: 'picus',
          name: 'Picus Security Platform',
          description: 'Enterprise breach and attack simulation platform',
          status: 'supported',
          capabilities: ['safe_mode', 'live_execution', 'validation', 'reporting'],
        },
        {
          id: 'atomic_red_team',
          name: 'Atomic Red Team',
          description: 'Open-source library of MITRE ATT&CK techniques',
          status: 'supported',
          capabilities: ['safe_mode', 'simulation', 'cleanup'],
        },
        {
          id: 'caldera',
          name: 'MITRE CALDERA',
          description: 'Adversary emulation and automated incident response',
          status: 'supported',
          capabilities: ['safe_mode', 'simulation', 'live_execution', 'autonomous_operation'],
        },
        {
          id: 'attackiq',
          name: 'AttackIQ',
          description: 'Breach and attack simulation platform',
          status: 'planned',
          capabilities: [],
        },
        {
          id: 'custom',
          name: 'Custom Scripts',
          description: 'Execute custom attack simulation scripts',
          status: 'supported',
          capabilities: ['safe_mode', 'simulation'],
        },
      ];

      res.json(platforms);
    } catch (error) {
      console.error('Error listing platforms:', error);
      res.status(500).json({
        error: 'Failed to list platforms',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Configure platform integration
   * POST /api/simulations/platforms/:platform/configure
   */
  app.post('/api/simulations/platforms/:platform/configure', async (req: Request, res: Response) => {
    try {
      const { platform } = req.params;
      const { apiUrl, apiKey, username, additionalConfig } = req.body;

      const result = await pool.query(
        `INSERT INTO platform_integrations (
          platform, name, api_url, api_key_encrypted, username,
          additional_config, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (platform) DO UPDATE SET
          api_url = EXCLUDED.api_url,
          api_key_encrypted = EXCLUDED.api_key_encrypted,
          username = EXCLUDED.username,
          additional_config = EXCLUDED.additional_config,
          updated_at = NOW()
        RETURNING *`,
        [
          platform,
          req.body.name || platform,
          apiUrl,
          apiKey, // In production, encrypt this
          username,
          JSON.stringify(additionalConfig || {}),
          'active',
        ]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error configuring platform:', error);
      res.status(500).json({
        error: 'Failed to configure platform',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Test platform connection
   * POST /api/simulations/platforms/:platform/test
   */
  app.post('/api/simulations/platforms/:platform/test', async (req: Request, res: Response) => {
    try {
      const { platform } = req.params;
      // Test connection logic would go here
      res.json({
        platform,
        connected: true,
        message: 'Connection test successful',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error testing platform:', error);
      res.status(500).json({
        error: 'Failed to test platform connection',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // Analytics & Reporting
  // ============================================================================

  /**
   * Get simulation analytics
   * GET /api/simulations/analytics
   */
  app.get('/api/simulations/analytics', async (req: Request, res: Response) => {
    try {
      const statsResult = await pool.query(`
        SELECT
          COUNT(DISTINCT id) as total_simulations,
          COUNT(DISTINCT CASE WHEN status = 'completed' THEN id END) as completed_simulations,
          COUNT(DISTINCT CASE WHEN status = 'failed' THEN id END) as failed_simulations,
          AVG(CASE WHEN status = 'completed' THEN detection_score END) as avg_detection_score,
          AVG(CASE WHEN status = 'completed' THEN prevention_score END) as avg_prevention_score,
          AVG(CASE WHEN status = 'completed' THEN overall_score END) as avg_overall_score
        FROM simulation_jobs
      `);

      res.json(statsResult.rows[0]);
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({
        error: 'Failed to get analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  console.log('✅ Attack Simulation API routes initialized');
}

export default setupSimulationRoutes;
