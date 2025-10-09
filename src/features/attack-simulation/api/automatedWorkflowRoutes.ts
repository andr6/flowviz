/**
 * Automated Workflow API Routes
 *
 * Provides endpoints for automated response workflow management:
 * - Workflow CRUD operations
 * - Workflow execution and monitoring
 * - Workflow templates
 * - Workflow scheduling
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { AutomatedResponseWorkflowService, Workflow } from '../services/AutomatedResponseWorkflowService';
import { SiemIntegrationService } from '../services/integrations/SiemIntegrationService';
import { TicketingIntegrationService } from '../services/integrations/TicketingIntegrationService';

export function setupAutomatedWorkflowRoutes(app: Router, pool: Pool): void {
  const siemService = new SiemIntegrationService(pool);
  const ticketingService = new TicketingIntegrationService(pool);
  const workflowService = new AutomatedResponseWorkflowService(pool, siemService, ticketingService);

  /**
   * GET /api/simulations/workflows
   * List all workflows
   */
  app.get('/api/simulations/workflows', async (req: Request, res: Response) => {
    try {
      const { enabled, trigger } = req.query;

      let query = 'SELECT * FROM automated_workflows WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (enabled !== undefined) {
        query += ` AND enabled = $${paramCount++}`;
        params.push(enabled === 'true');
      }

      if (trigger) {
        query += ` AND trigger = $${paramCount++}`;
        params.push(trigger);
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        workflows: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch workflows',
      });
    }
  });

  /**
   * POST /api/simulations/workflows
   * Create new workflow
   */
  app.post('/api/simulations/workflows', async (req: Request, res: Response) => {
    try {
      const workflow: Omit<Workflow, 'id'> = {
        name: req.body.name,
        description: req.body.description,
        enabled: req.body.enabled !== undefined ? req.body.enabled : true,
        trigger: req.body.trigger,
        triggerConditions: req.body.triggerConditions,
        actions: req.body.actions,
        notifyOnSuccess: req.body.notifyOnSuccess,
        notifyOnFailure: req.body.notifyOnFailure,
        notificationChannels: req.body.notificationChannels,
        createdBy: req.body.userId,
      };

      if (!workflow.name || !workflow.trigger || !workflow.actions || workflow.actions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, trigger, actions',
        });
      }

      const savedWorkflow = await workflowService.createWorkflow(workflow);

      res.json({
        success: true,
        workflow: savedWorkflow,
      });
    } catch (error) {
      console.error('Failed to create workflow:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create workflow',
      });
    }
  });

  /**
   * GET /api/simulations/workflows/:id
   * Get workflow details
   */
  app.get('/api/simulations/workflows/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query('SELECT * FROM automated_workflows WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found',
        });
      }

      res.json({
        success: true,
        workflow: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch workflow',
      });
    }
  });

  /**
   * PUT /api/simulations/workflows/:id
   * Update workflow
   */
  app.put('/api/simulations/workflows/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      const fields = [
        'name',
        'description',
        'enabled',
        'trigger',
        'trigger_conditions',
        'actions',
        'notify_on_success',
        'notify_on_failure',
        'notification_channels',
      ];

      for (const field of fields) {
        const camelField = field.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        if (req.body[camelField] !== undefined) {
          updates.push(`${field} = $${paramCount++}`);
          const value = req.body[camelField];
          values.push(
            ['trigger_conditions', 'actions', 'notification_channels'].includes(field)
              ? JSON.stringify(value)
              : value
          );
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE automated_workflows SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found',
        });
      }

      res.json({
        success: true,
        workflow: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to update workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update workflow',
      });
    }
  });

  /**
   * DELETE /api/simulations/workflows/:id
   * Delete workflow
   */
  app.delete('/api/simulations/workflows/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM automated_workflows WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found',
        });
      }

      res.json({
        success: true,
        message: 'Workflow deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete workflow',
      });
    }
  });

  /**
   * POST /api/simulations/workflows/:id/trigger
   * Manually trigger a workflow
   */
  app.post('/api/simulations/workflows/:id/trigger', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { jobId, sourceType, sourceId, data } = req.body;

      // Check if workflow exists
      const workflowResult = await pool.query('SELECT * FROM automated_workflows WHERE id = $1', [id]);

      if (workflowResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found',
        });
      }

      const workflow = workflowResult.rows[0];

      // Trigger the workflow
      const executions = await workflowService.triggerWorkflows('manual', {
        jobId,
        sourceType,
        sourceId,
        data,
      });

      if (executions.length === 0) {
        return res.json({
          success: false,
          message: 'Workflow conditions not met',
        });
      }

      res.json({
        success: true,
        executions,
      });
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger workflow',
      });
    }
  });

  /**
   * GET /api/simulations/workflows/:id/executions
   * Get workflow execution history
   */
  app.get('/api/simulations/workflows/:id/executions', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      const executions = await workflowService.getWorkflowExecutions(id, Number(limit));

      res.json({
        success: true,
        executions,
      });
    } catch (error) {
      console.error('Failed to fetch workflow executions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch executions',
      });
    }
  });

  /**
   * GET /api/simulations/workflow-executions/:id
   * Get execution details
   */
  app.get('/api/simulations/workflow-executions/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'SELECT * FROM workflow_executions WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Execution not found',
        });
      }

      res.json({
        success: true,
        execution: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to fetch execution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch execution',
      });
    }
  });

  /**
   * POST /api/simulations/workflow-executions/:id/cancel
   * Cancel workflow execution
   */
  app.post('/api/simulations/workflow-executions/:id/cancel', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE workflow_executions
         SET status = 'cancelled', completed_at = NOW()
         WHERE id = $1 AND status IN ('pending', 'running')
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Execution not found or already completed',
        });
      }

      res.json({
        success: true,
        execution: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to cancel execution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel execution',
      });
    }
  });

  /**
   * GET /api/simulations/workflow-templates
   * List workflow templates
   */
  app.get('/api/simulations/workflow-templates', async (req: Request, res: Response) => {
    try {
      const { category, isPublic } = req.query;

      let query = 'SELECT * FROM workflow_templates WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (category) {
        query += ` AND category = $${paramCount++}`;
        params.push(category);
      }

      if (isPublic !== undefined) {
        query += ` AND is_public = $${paramCount++}`;
        params.push(isPublic === 'true');
      }

      query += ' ORDER BY usage_count DESC, created_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        templates: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch templates',
      });
    }
  });

  /**
   * POST /api/simulations/workflow-templates
   * Create workflow template
   */
  app.post('/api/simulations/workflow-templates', async (req: Request, res: Response) => {
    try {
      const { name, description, category, trigger, defaultConditions, actionTemplates, isPublic } = req.body;

      if (!name || !trigger || !actionTemplates) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, trigger, actionTemplates',
        });
      }

      const result = await pool.query(
        `INSERT INTO workflow_templates (
          name, description, category, trigger, default_conditions,
          action_templates, is_public, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          name,
          description,
          category,
          trigger,
          JSON.stringify(defaultConditions || []),
          JSON.stringify(actionTemplates),
          isPublic || false,
          req.body.userId || null,
        ]
      );

      res.json({
        success: true,
        template: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to create template:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template',
      });
    }
  });

  /**
   * POST /api/simulations/workflow-templates/:id/instantiate
   * Create workflow from template
   */
  app.post('/api/simulations/workflow-templates/:id/instantiate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, customConfig } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: name',
        });
      }

      const templateResult = await pool.query('SELECT * FROM workflow_templates WHERE id = $1', [id]);

      if (templateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
        });
      }

      const template = templateResult.rows[0];

      // Merge custom config with template defaults
      const workflow: Omit<Workflow, 'id'> = {
        name,
        description: template.description,
        enabled: true,
        trigger: template.trigger,
        triggerConditions: customConfig?.triggerConditions || template.default_conditions,
        actions: customConfig?.actions || template.action_templates,
        notifyOnSuccess: customConfig?.notifyOnSuccess || false,
        notifyOnFailure: customConfig?.notifyOnFailure || true,
        notificationChannels: customConfig?.notificationChannels || [],
        createdBy: req.body.userId,
      };

      const savedWorkflow = await workflowService.createWorkflow(workflow);

      res.json({
        success: true,
        workflow: savedWorkflow,
      });
    } catch (error) {
      console.error('Failed to instantiate template:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to instantiate template',
      });
    }
  });

  /**
   * GET /api/simulations/workflow-actions
   * List available workflow actions
   */
  app.get('/api/simulations/workflow-actions', async (req: Request, res: Response) => {
    try {
      const { actionType, category } = req.query;

      let query = 'SELECT * FROM workflow_action_library WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (actionType) {
        query += ` AND action_type = $${paramCount++}`;
        params.push(actionType);
      }

      if (category) {
        query += ` AND category = $${paramCount++}`;
        params.push(category);
      }

      query += ' ORDER BY category, name';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        actions: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch workflow actions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch workflow actions',
      });
    }
  });

  /**
   * GET /api/simulations/workflows/:id/stats
   * Get workflow execution statistics
   */
  app.get('/api/simulations/workflows/:id/stats', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT * FROM workflow_execution_stats
         WHERE workflow_id = $1
         ORDER BY period_start DESC
         LIMIT 30`,
        [id]
      );

      res.json({
        success: true,
        stats: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch workflow stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch workflow stats',
      });
    }
  });

  /**
   * GET /api/simulations/workflow-schedules
   * List scheduled workflows
   */
  app.get('/api/simulations/workflow-schedules', async (req: Request, res: Response) => {
    try {
      const { enabled } = req.query;

      let query = 'SELECT * FROM workflow_schedules WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (enabled !== undefined) {
        query += ` AND enabled = $${paramCount++}`;
        params.push(enabled === 'true');
      }

      query += ' ORDER BY next_execution_at ASC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        schedules: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch schedules',
      });
    }
  });

  /**
   * POST /api/simulations/workflow-schedules
   * Create workflow schedule
   */
  app.post('/api/simulations/workflow-schedules', async (req: Request, res: Response) => {
    try {
      const { workflowId, cronExpression, timezone, defaultContext, enabled } = req.body;

      if (!workflowId || !cronExpression) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: workflowId, cronExpression',
        });
      }

      const result = await pool.query(
        `INSERT INTO workflow_schedules (
          workflow_id, enabled, cron_expression, timezone, default_context
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          workflowId,
          enabled !== undefined ? enabled : true,
          cronExpression,
          timezone || 'UTC',
          JSON.stringify(defaultContext || {}),
        ]
      );

      res.json({
        success: true,
        schedule: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to create schedule:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create schedule',
      });
    }
  });

  /**
   * DELETE /api/simulations/workflow-schedules/:id
   * Delete workflow schedule
   */
  app.delete('/api/simulations/workflow-schedules/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM workflow_schedules WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found',
        });
      }

      res.json({
        success: true,
        message: 'Schedule deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete schedule',
      });
    }
  });
}

export default setupAutomatedWorkflowRoutes;
