/**
 * Playbook Generation API Routes
 *
 * Complete REST API for automated playbook generation, management, and execution
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { PlaybookGeneratorService } from '../services/PlaybookGeneratorService';
import { SOARIntegrationService } from '../services/SOARIntegrationService';
import { ruleGeneratorFactory, RuleGenerationContext } from '../utils/detectionRuleGenerators';
import type {
  PlaybookGenerationRequest,
  CreatePlaybookRequest,
  UpdatePlaybookRequest,
  ExecutePlaybookRequest,
  AddPhaseRequest,
  AddActionRequest,
  AddDetectionRuleRequest,
  GenerateDetectionRulesRequest,
  TestDetectionRuleRequest,
  DeployDetectionRuleRequest,
  PlaybookSearchFilters,
  PlaybookSortOptions,
  PlaybookMetadata,
  SOARPlatform,
  SOARConfig,
} from '../types';

/**
 * Setup playbook API routes
 */
export function setupPlaybookRoutes(app: any, pool: Pool): void {
  const router = Router();
  const generatorService = new PlaybookGeneratorService(pool);
  const soarService = new SOARIntegrationService(pool);

  // ========================================================================
  // Playbook Management
  // ========================================================================

  /**
   * POST /api/playbooks - Create new playbook
   */
  router.post('/playbooks', async (req: Request, res: Response) => {
    try {
      const request: CreatePlaybookRequest = req.body;

      // Validate request
      if (!request.name) {
        return res.status(400).json({ error: 'Playbook name is required' });
      }

      const playbookRequest: PlaybookGenerationRequest = {
        source: 'manual',
        name: request.name,
        severity: request.severity || 'medium',
        includeDetectionRules: false,
        includeAutomation: false,
      };

      const result = await generatorService.generatePlaybook(playbookRequest);

      res.json({
        playbook: result.playbook,
        generationTime: result.generationTime,
        confidence: result.confidence,
      });
    } catch (error) {
      console.error('Error creating playbook:', error);
      res.status(500).json({
        error: 'Failed to create playbook',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/playbooks - List all playbooks with filters
   */
  router.get('/playbooks', async (req: Request, res: Response) => {
    try {
      const filters: Partial<PlaybookSearchFilters> = {
        status: req.query.status ? (req.query.status as string).split(',') as any : undefined,
        severity: req.query.severity ? (req.query.severity as string).split(',') as any : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        searchQuery: req.query.q as string,
      };

      const sortOptions: PlaybookSortOptions = {
        field: (req.query.sortBy as any) || 'createdAt',
        direction: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      };

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const offset = (page - 1) * pageSize;

      // Build query
      let query = 'SELECT * FROM playbooks WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.status && filters.status.length > 0) {
        query += ` AND status = ANY($${paramIndex})`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.severity && filters.severity.length > 0) {
        query += ` AND severity = ANY($${paramIndex})`;
        params.push(filters.severity);
        paramIndex++;
      }

      if (filters.tags && filters.tags.length > 0) {
        query += ` AND tags && $${paramIndex}`;
        params.push(filters.tags);
        paramIndex++;
      }

      if (filters.searchQuery) {
        query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${filters.searchQuery}%`);
        paramIndex++;
      }

      // Add sorting
      const sortField = sortOptions.field === 'name' ? 'name' :
                       sortOptions.field === 'severity' ? 'severity' :
                       sortOptions.field === 'executionCount' ? 'execution_count' :
                       sortOptions.field === 'successRate' ? 'success_rate' :
                       sortOptions.field === 'lastExecuted' ? 'last_executed' : 'created_at';
      query += ` ORDER BY ${sortField} ${sortOptions.direction}`;

      // Add pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(pageSize, offset);

      const result = await pool.query(query, params);

      // Get total count
      const countResult = await pool.query('SELECT COUNT(*) FROM playbooks');
      const total = parseInt(countResult.rows[0].count);

      res.json({
        items: result.rows.map(row => row.playbook_data),
        total,
        page,
        pageSize,
        hasMore: offset + result.rows.length < total,
      });
    } catch (error) {
      console.error('Error listing playbooks:', error);
      res.status(500).json({
        error: 'Failed to list playbooks',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/playbooks/:id - Get specific playbook
   */
  router.get('/playbooks/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query('SELECT * FROM playbooks WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Playbook not found' });
      }

      res.json(result.rows[0].playbook_data);
    } catch (error) {
      console.error('Error getting playbook:', error);
      res.status(500).json({
        error: 'Failed to get playbook',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/playbooks/:id - Update playbook
   */
  router.put('/playbooks/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: UpdatePlaybookRequest = req.body;

      // Get current playbook
      const current = await pool.query('SELECT * FROM playbooks WHERE id = $1', [id]);
      if (current.rows.length === 0) {
        return res.status(404).json({ error: 'Playbook not found' });
      }

      const playbook = current.rows[0].playbook_data;

      // Apply updates
      if (updates.name) playbook.name = updates.name;
      if (updates.description) playbook.description = updates.description;
      if (updates.severity) playbook.severity = updates.severity;
      if (updates.status) playbook.status = updates.status;
      if (updates.estimatedTimeMinutes) playbook.estimatedTimeMinutes = updates.estimatedTimeMinutes;
      if (updates.requiredRoles) playbook.requiredRoles = updates.requiredRoles;
      if (updates.tags) playbook.tags = updates.tags;

      playbook.updatedAt = new Date();
      playbook.version += 1;

      // Save updates
      await pool.query(
        `UPDATE playbooks
         SET playbook_data = $1, updated_at = $2, version = $3
         WHERE id = $4`,
        [JSON.stringify(playbook), playbook.updatedAt, playbook.version, id]
      );

      res.json(playbook);
    } catch (error) {
      console.error('Error updating playbook:', error);
      res.status(500).json({
        error: 'Failed to update playbook',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * DELETE /api/playbooks/:id - Delete (archive) playbook
   */
  router.delete('/playbooks/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await pool.query(
        "UPDATE playbooks SET status = 'archived', updated_at = NOW() WHERE id = $1",
        [id]
      );

      res.json({ success: true, message: 'Playbook archived' });
    } catch (error) {
      console.error('Error deleting playbook:', error);
      res.status(500).json({
        error: 'Failed to delete playbook',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/playbooks/:id/clone - Clone playbook
   */
  router.post('/playbooks/:id/clone', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const result = await pool.query('SELECT * FROM playbooks WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Playbook not found' });
      }

      const original = result.rows[0].playbook_data;
      const cloned = {
        ...original,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name || `${original.name} (Copy)`,
        status: 'draft',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0,
      };

      // Save cloned playbook
      await pool.query(
        `INSERT INTO playbooks (id, name, description, playbook_data, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [cloned.id, cloned.name, cloned.description, JSON.stringify(cloned), cloned.createdAt]
      );

      res.json(cloned);
    } catch (error) {
      console.error('Error cloning playbook:', error);
      res.status(500).json({
        error: 'Failed to clone playbook',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ========================================================================
  // Playbook Generation
  // ========================================================================

  /**
   * POST /api/playbooks/generate - Generate playbook from request
   */
  router.post('/playbooks/generate', async (req: Request, res: Response) => {
    try {
      const request: PlaybookGenerationRequest = req.body;

      // Validate request
      if (!request.name || !request.severity || !request.source) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await generatorService.generatePlaybook(request);

      res.json(result);
    } catch (error) {
      console.error('Error generating playbook:', error);
      res.status(500).json({
        error: 'Failed to generate playbook',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/playbooks/generate/from-flow - Generate from attack flow
   */
  router.post('/playbooks/generate/from-flow', async (req: Request, res: Response) => {
    try {
      const { flowId, name, severity, includeDetectionRules, includeAutomation } = req.body;

      if (!flowId || !name) {
        return res.status(400).json({ error: 'Flow ID and name are required' });
      }

      const request: PlaybookGenerationRequest = {
        source: 'flow',
        sourceId: flowId,
        name,
        severity: severity || 'medium',
        includeDetectionRules: includeDetectionRules !== false,
        includeAutomation: includeAutomation !== false,
      };

      const result = await generatorService.generatePlaybook(request);

      res.json(result);
    } catch (error) {
      console.error('Error generating playbook from flow:', error);
      res.status(500).json({
        error: 'Failed to generate playbook from flow',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/playbooks/generate/from-campaign - Generate from campaign
   */
  router.post('/playbooks/generate/from-campaign', async (req: Request, res: Response) => {
    try {
      const { campaignId, name, severity } = req.body;

      if (!campaignId || !name) {
        return res.status(400).json({ error: 'Campaign ID and name are required' });
      }

      const request: PlaybookGenerationRequest = {
        source: 'campaign',
        sourceId: campaignId,
        name,
        severity: severity || 'high',
        includeDetectionRules: true,
        includeAutomation: true,
      };

      const result = await generatorService.generatePlaybook(request);

      res.json(result);
    } catch (error) {
      console.error('Error generating playbook from campaign:', error);
      res.status(500).json({
        error: 'Failed to generate playbook from campaign',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ========================================================================
  // Playbook Execution
  // ========================================================================

  /**
   * POST /api/playbooks/:id/execute - Execute playbook
   */
  router.post('/playbooks/:id/execute', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const execRequest: ExecutePlaybookRequest = req.body;

      // Create execution record
      const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const execution = {
        id: executionId,
        playbookId: id,
        incidentId: execRequest.incidentId,
        campaignId: execRequest.campaignId,
        flowId: execRequest.flowId,
        executedBy: execRequest.executedBy,
        notes: execRequest.notes,
        startedAt: new Date(),
        status: 'running',
        completionPercentage: 0,
        actionsCompleted: 0,
        actionsFailed: 0,
        executionLog: [],
        artifactsCollected: [],
        createdAt: new Date(),
      };

      await pool.query(
        `INSERT INTO playbook_executions (
          id, playbook_id, incident_id, campaign_id, flow_id,
          executed_by, notes, started_at, status, execution_data, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          execution.id,
          execution.playbookId,
          execution.incidentId,
          execution.campaignId,
          execution.flowId,
          execution.executedBy,
          execution.notes,
          execution.startedAt,
          execution.status,
          JSON.stringify(execution),
          execution.createdAt,
        ]
      );

      res.json({ executionId: execution.id, status: 'started', execution });
    } catch (error) {
      console.error('Error executing playbook:', error);
      res.status(500).json({
        error: 'Failed to execute playbook',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/playbooks/:id/executions - Get execution history
   */
  router.get('/playbooks/:id/executions', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await pool.query(
        `SELECT * FROM playbook_executions
         WHERE playbook_id = $1
         ORDER BY started_at DESC
         LIMIT $2`,
        [id, limit]
      );

      res.json(result.rows.map(row => row.execution_data));
    } catch (error) {
      console.error('Error getting execution history:', error);
      res.status(500).json({
        error: 'Failed to get execution history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/executions/:id - Get execution details
   */
  router.get('/executions/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'SELECT * FROM playbook_executions WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Execution not found' });
      }

      res.json(result.rows[0].execution_data);
    } catch (error) {
      console.error('Error getting execution:', error);
      res.status(500).json({
        error: 'Failed to get execution',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ========================================================================
  // Detection Rules
  // ========================================================================

  /**
   * GET /api/playbooks/:id/rules - Get detection rules
   */
  router.get('/playbooks/:id/rules', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'SELECT * FROM playbook_detection_rules WHERE playbook_id = $1',
        [id]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error getting detection rules:', error);
      res.status(500).json({
        error: 'Failed to get detection rules',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/playbooks/:id/rules - Add detection rule
   */
  router.post('/playbooks/:id/rules', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ruleRequest: AddDetectionRuleRequest = req.body;

      const ruleId = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await pool.query(
        `INSERT INTO playbook_detection_rules (
          id, playbook_id, rule_name, description, rule_type, rule_content,
          mitre_technique_id, applicable_platforms, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          ruleId,
          id,
          ruleRequest.ruleName,
          ruleRequest.description,
          ruleRequest.ruleType,
          ruleRequest.ruleContent,
          ruleRequest.mitreTechniqueId,
          ruleRequest.applicablePlatforms,
          new Date(),
          new Date(),
        ]
      );

      res.json({ id: ruleId, message: 'Detection rule added' });
    } catch (error) {
      console.error('Error adding detection rule:', error);
      res.status(500).json({
        error: 'Failed to add detection rule',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/rules/generate - Generate rules from techniques
   */
  router.post('/rules/generate', async (req: Request, res: Response) => {
    try {
      const request: GenerateDetectionRulesRequest = req.body;

      if (!request.techniques || !request.ruleTypes) {
        return res.status(400).json({ error: 'Techniques and rule types are required' });
      }

      const rules = [];

      for (const techniqueId of request.techniques) {
        const context: RuleGenerationContext = {
          technique: {
            techniqueId,
            techniqueName: techniqueId, // Would normally fetch from database
            tactic: 'unknown',
          },
        };

        for (const ruleType of request.ruleTypes) {
          const rule = ruleGeneratorFactory.generateRule(ruleType, context);
          if (rule) {
            rules.push(rule);
          }
        }
      }

      res.json({ rules, count: rules.length });
    } catch (error) {
      console.error('Error generating rules:', error);
      res.status(500).json({
        error: 'Failed to generate rules',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ========================================================================
  // SOAR Integration
  // ========================================================================

  /**
   * GET /api/soar/platforms - List supported platforms
   */
  router.get('/soar/platforms', (req: Request, res: Response) => {
    res.json({
      platforms: [
        { id: 'cortex_xsoar', name: 'Cortex XSOAR (Palo Alto)', supported: true },
        { id: 'splunk_soar', name: 'Splunk SOAR (Phantom)', supported: true },
        { id: 'ibm_resilient', name: 'IBM Resilient', supported: false },
        { id: 'servicenow', name: 'ServiceNow SecOps', supported: false },
        { id: 'custom', name: 'Custom REST API', supported: true },
      ],
    });
  });

  /**
   * POST /api/soar/connect - Connect to SOAR platform
   */
  router.post('/soar/connect', async (req: Request, res: Response) => {
    try {
      const { playbookId, platform, config } = req.body;

      if (!playbookId || !platform || !config) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const integration = await soarService.createIntegration(
        playbookId,
        platform as SOARPlatform,
        config as SOARConfig
      );

      res.json(integration);
    } catch (error) {
      console.error('Error connecting to SOAR:', error);
      res.status(500).json({
        error: 'Failed to connect to SOAR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/soar/sync - Sync playbook to SOAR
   */
  router.post('/soar/sync', async (req: Request, res: Response) => {
    try {
      const { integrationId } = req.body;

      if (!integrationId) {
        return res.status(400).json({ error: 'Integration ID is required' });
      }

      await soarService.syncPlaybook(integrationId);

      res.json({ success: true, message: 'Playbook synced to SOAR platform' });
    } catch (error) {
      console.error('Error syncing to SOAR:', error);
      res.status(500).json({
        error: 'Failed to sync to SOAR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/soar/test - Test SOAR connection
   */
  router.post('/soar/test', async (req: Request, res: Response) => {
    try {
      const { platform, config } = req.body;

      if (!platform || !config) {
        return res.status(400).json({ error: 'Platform and config are required' });
      }

      const connected = await soarService.testConnection(
        platform as SOARPlatform,
        config as SOARConfig
      );

      res.json({ connected, message: connected ? 'Connection successful' : 'Connection failed' });
    } catch (error) {
      console.error('Error testing SOAR connection:', error);
      res.status(500).json({
        error: 'Failed to test connection',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ========================================================================
  // Analytics
  // ========================================================================

  /**
   * GET /api/playbooks/analytics - Get playbook analytics
   */
  router.get('/playbooks/analytics', async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM playbook_analytics');

      res.json(result.rows[0] || {});
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({
        error: 'Failed to get analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Mount router
  app.use('/api', router);
}
