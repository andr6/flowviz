/**
 * Ticketing Integration API Routes
 *
 * Provides endpoints for ticketing/ITSM platform integration including:
 * - Configuration management
 * - Connection testing
 * - Ticket creation and management
 * - Auto-ticketing rules
 * - Sync logging
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { TicketingIntegrationService, TicketingConfig, Ticket } from '../services/integrations/TicketingIntegrationService';

export function setupTicketingIntegrationRoutes(app: Router, pool: Pool): void {
  const ticketingService = new TicketingIntegrationService(pool);

  /**
   * GET /api/simulations/ticketing/configs
   * List all ticketing configurations
   */
  app.get('/api/simulations/ticketing/configs', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        'SELECT id, platform, name, base_url, username, project_key, organization_id, repository_owner, repository_name, enabled, created_at FROM ticketing_integrations ORDER BY created_at DESC'
      );

      res.json({
        success: true,
        configs: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch ticketing configs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch ticketing configurations',
      });
    }
  });

  /**
   * POST /api/simulations/ticketing/configs
   * Create new ticketing configuration
   */
  app.post('/api/simulations/ticketing/configs', async (req: Request, res: Response) => {
    try {
      const {
        platform,
        name,
        baseUrl,
        apiKey,
        username,
        projectKey,
        organizationId,
        repositoryOwner,
        repositoryName,
        additionalConfig,
        enabled,
      } = req.body;

      if (!platform || !name || !baseUrl || !apiKey) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: platform, name, baseUrl, apiKey',
        });
      }

      const config: Omit<TicketingConfig, 'id'> = {
        platform,
        name,
        baseUrl,
        apiKey,
        username,
        projectKey,
        organizationId,
        repositoryOwner,
        repositoryName,
        additionalConfig: additionalConfig || {},
        enabled: enabled !== undefined ? enabled : true,
      };

      const savedConfig = await ticketingService.addConfiguration(config);

      res.json({
        success: true,
        config: {
          ...savedConfig,
          apiKey: '***', // Redact API key
        },
      });
    } catch (error) {
      console.error('Failed to create ticketing config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create configuration',
      });
    }
  });

  /**
   * PUT /api/simulations/ticketing/configs/:id
   * Update ticketing configuration
   */
  app.put('/api/simulations/ticketing/configs/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      const fields = [
        'platform',
        'name',
        'base_url',
        'api_key',
        'username',
        'project_key',
        'organization_id',
        'repository_owner',
        'repository_name',
        'additional_config',
        'enabled',
      ];

      for (const field of fields) {
        const camelField = field.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        if (req.body[camelField] !== undefined) {
          updates.push(`${field} = $${paramCount++}`);
          values.push(
            field === 'additional_config' ? JSON.stringify(req.body[camelField]) : req.body[camelField]
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

      const query = `UPDATE ticketing_integrations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Configuration not found',
        });
      }

      res.json({
        success: true,
        config: {
          ...result.rows[0],
          api_key: '***',
        },
      });
    } catch (error) {
      console.error('Failed to update ticketing config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
      });
    }
  });

  /**
   * DELETE /api/simulations/ticketing/configs/:id
   * Delete ticketing configuration
   */
  app.delete('/api/simulations/ticketing/configs/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM ticketing_integrations WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Configuration not found',
        });
      }

      res.json({
        success: true,
        message: 'Configuration deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete ticketing config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete configuration',
      });
    }
  });

  /**
   * POST /api/simulations/ticketing/configs/:id/test
   * Test ticketing system connection
   */
  app.post('/api/simulations/ticketing/configs/:id/test', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await ticketingService.testConnection(id);
      res.json(result);
    } catch (error) {
      console.error('Failed to test ticketing connection:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    }
  });

  /**
   * POST /api/simulations/ticketing/tickets
   * Create ticket manually
   */
  app.post('/api/simulations/ticketing/tickets', async (req: Request, res: Response) => {
    try {
      const ticket: Ticket = req.body;

      if (!ticket.ticketingConfigId || !ticket.title || !ticket.description) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: ticketingConfigId, title, description',
        });
      }

      const result = await ticketingService.createTicket(ticket);

      // Log sync operation
      await pool.query(
        `INSERT INTO ticketing_sync_log (
          ticketing_config_id, ticket_id, sync_type, sync_status,
          request_data, response_data, synced_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          ticket.ticketingConfigId,
          result.ticketId || null,
          'create',
          result.success ? 'success' : 'failed',
          JSON.stringify(ticket),
          JSON.stringify(result),
          req.body.userId || null,
        ]
      );

      res.json(result);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Ticket creation failed',
      });
    }
  });

  /**
   * POST /api/simulations/ticketing/tickets/from-gaps
   * Create tickets from control gaps
   */
  app.post('/api/simulations/ticketing/tickets/from-gaps', async (req: Request, res: Response) => {
    try {
      const { jobId, ticketingConfigId, gapIds } = req.body;

      if (!jobId || !ticketingConfigId || !gapIds || !Array.isArray(gapIds)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: jobId, ticketingConfigId, gapIds (array)',
        });
      }

      const results = await ticketingService.createTicketsFromGaps(jobId, ticketingConfigId, gapIds);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      res.json({
        success: true,
        summary: {
          total: results.length,
          succeeded: successCount,
          failed: failureCount,
        },
        results,
      });
    } catch (error) {
      console.error('Failed to create tickets from gaps:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Bulk ticket creation failed',
      });
    }
  });

  /**
   * POST /api/simulations/ticketing/tickets/from-recommendations
   * Create tickets from remediation recommendations
   */
  app.post('/api/simulations/ticketing/tickets/from-recommendations', async (req: Request, res: Response) => {
    try {
      const { recommendationIds, ticketingConfigId } = req.body;

      if (!ticketingConfigId || !recommendationIds || !Array.isArray(recommendationIds)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: ticketingConfigId, recommendationIds (array)',
        });
      }

      const results = await ticketingService.createTicketsFromRecommendations(
        recommendationIds,
        ticketingConfigId
      );

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      res.json({
        success: true,
        summary: {
          total: results.length,
          succeeded: successCount,
          failed: failureCount,
        },
        results,
      });
    } catch (error) {
      console.error('Failed to create tickets from recommendations:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Bulk ticket creation failed',
      });
    }
  });

  /**
   * GET /api/simulations/ticketing/tickets
   * List tickets with filtering
   */
  app.get('/api/simulations/ticketing/tickets', async (req: Request, res: Response) => {
    try {
      const { ticketingConfigId, sourceType, jobId, status, limit = 50, offset = 0 } = req.query;

      let query = 'SELECT * FROM tickets WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (ticketingConfigId) {
        query += ` AND ticketing_config_id = $${paramCount++}`;
        params.push(ticketingConfigId);
      }

      if (sourceType) {
        query += ` AND source_type = $${paramCount++}`;
        params.push(sourceType);
      }

      if (jobId) {
        query += ` AND job_id = $${paramCount++}`;
        params.push(jobId);
      }

      if (status) {
        query += ` AND status = $${paramCount++}`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      params.push(Number(limit), Number(offset));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        tickets: result.rows,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          total: result.rows.length,
        },
      });
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tickets',
      });
    }
  });

  /**
   * GET /api/simulations/ticketing/tickets/:id
   * Get ticket details
   */
  app.get('/api/simulations/ticketing/tickets/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);

      if (ticketResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
      }

      // Get status history
      const historyResult = await pool.query(
        'SELECT * FROM ticket_status_history WHERE ticket_id = $1 ORDER BY changed_at DESC',
        [id]
      );

      // Get comments
      const commentsResult = await pool.query(
        'SELECT * FROM ticket_comments WHERE ticket_id = $1 ORDER BY created_at ASC',
        [id]
      );

      res.json({
        success: true,
        ticket: ticketResult.rows[0],
        statusHistory: historyResult.rows,
        comments: commentsResult.rows,
      });
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch ticket details',
      });
    }
  });

  /**
   * PATCH /api/simulations/ticketing/tickets/:id/status
   * Update ticket status
   */
  app.patch('/api/simulations/ticketing/tickets/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, comment } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: status',
        });
      }

      const result = await ticketingService.updateTicketStatus(id, status, comment);

      // Log sync operation
      const ticketResult = await pool.query('SELECT ticketing_config_id FROM tickets WHERE id = $1', [id]);
      if (ticketResult.rows.length > 0) {
        await pool.query(
          `INSERT INTO ticketing_sync_log (
            ticketing_config_id, ticket_id, sync_type, sync_status,
            request_data, response_data
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            ticketResult.rows[0].ticketing_config_id,
            id,
            'status_change',
            result.success ? 'success' : 'failed',
            JSON.stringify({ status, comment }),
            JSON.stringify(result),
          ]
        );
      }

      res.json(result);
    } catch (error) {
      console.error('Failed to update ticket status:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Status update failed',
      });
    }
  });

  /**
   * POST /api/simulations/ticketing/tickets/:id/comments
   * Add comment to ticket
   */
  app.post('/api/simulations/ticketing/tickets/:id/comments', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { comment, author, isInternal } = req.body;

      if (!comment) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: comment',
        });
      }

      const result = await pool.query(
        `INSERT INTO ticket_comments (
          ticket_id, comment_text, author, is_internal, created_by
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [id, comment, author, isInternal || false, req.body.userId || null]
      );

      res.json({
        success: true,
        comment: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to add comment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add comment',
      });
    }
  });

  /**
   * GET /api/simulations/ticketing/auto-rules
   * List auto-ticketing rules
   */
  app.get('/api/simulations/ticketing/auto-rules', async (req: Request, res: Response) => {
    try {
      const { enabled } = req.query;

      let query = 'SELECT * FROM auto_ticketing_rules WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (enabled !== undefined) {
        query += ` AND enabled = $${paramCount++}`;
        params.push(enabled === 'true');
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        rules: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch auto-ticketing rules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rules',
      });
    }
  });

  /**
   * POST /api/simulations/ticketing/auto-rules
   * Create auto-ticketing rule
   */
  app.post('/api/simulations/ticketing/auto-rules', async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        ticketingConfigId,
        enabled,
        triggerOnSourceType,
        minSeverity,
        techniqueIds,
        categories,
        titleTemplate,
        descriptionTemplate,
        defaultPriority,
        defaultAssignee,
        defaultLabels,
      } = req.body;

      if (!name || !ticketingConfigId || !titleTemplate || !descriptionTemplate) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, ticketingConfigId, titleTemplate, descriptionTemplate',
        });
      }

      const result = await pool.query(
        `INSERT INTO auto_ticketing_rules (
          name, description, ticketing_config_id, enabled,
          trigger_on_source_type, min_severity, technique_ids, categories,
          title_template, description_template, default_priority,
          default_assignee, default_labels, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          name,
          description,
          ticketingConfigId,
          enabled !== undefined ? enabled : true,
          triggerOnSourceType,
          minSeverity,
          techniqueIds,
          categories,
          titleTemplate,
          descriptionTemplate,
          defaultPriority || 'medium',
          defaultAssignee,
          JSON.stringify(defaultLabels || []),
          req.body.userId || null,
        ]
      );

      res.json({
        success: true,
        rule: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to create auto-ticketing rule:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create rule',
      });
    }
  });

  /**
   * PUT /api/simulations/ticketing/auto-rules/:id
   * Update auto-ticketing rule
   */
  app.put('/api/simulations/ticketing/auto-rules/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      const fields = [
        'name',
        'description',
        'ticketing_config_id',
        'enabled',
        'trigger_on_source_type',
        'min_severity',
        'technique_ids',
        'categories',
        'title_template',
        'description_template',
        'default_priority',
        'default_assignee',
        'default_labels',
      ];

      for (const field of fields) {
        const camelField = field.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        if (req.body[camelField] !== undefined) {
          updates.push(`${field} = $${paramCount++}`);
          values.push(
            field === 'default_labels' ? JSON.stringify(req.body[camelField]) : req.body[camelField]
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

      const query = `UPDATE auto_ticketing_rules SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Rule not found',
        });
      }

      res.json({
        success: true,
        rule: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to update auto-ticketing rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update rule',
      });
    }
  });

  /**
   * DELETE /api/simulations/ticketing/auto-rules/:id
   * Delete auto-ticketing rule
   */
  app.delete('/api/simulations/ticketing/auto-rules/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM auto_ticketing_rules WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Rule not found',
        });
      }

      res.json({
        success: true,
        message: 'Rule deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete auto-ticketing rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete rule',
      });
    }
  });

  /**
   * GET /api/simulations/ticketing/sync-log
   * Get ticketing sync log
   */
  app.get('/api/simulations/ticketing/sync-log', async (req: Request, res: Response) => {
    try {
      const { ticketingConfigId, syncStatus, limit = 100 } = req.query;

      let query = 'SELECT * FROM ticketing_sync_log WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (ticketingConfigId) {
        query += ` AND ticketing_config_id = $${paramCount++}`;
        params.push(ticketingConfigId);
      }

      if (syncStatus) {
        query += ` AND sync_status = $${paramCount++}`;
        params.push(syncStatus);
      }

      query += ` ORDER BY synced_at DESC LIMIT $${paramCount}`;
      params.push(Number(limit));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        logs: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch sync log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sync log',
      });
    }
  });

  /**
   * GET /api/simulations/ticketing/platforms
   * Get supported ticketing platforms
   */
  app.get('/api/simulations/ticketing/platforms', async (req: Request, res: Response) => {
    res.json({
      success: true,
      platforms: [
        {
          id: 'jira',
          name: 'Jira',
          description: 'Atlassian Jira project tracking',
          requiredFields: ['projectKey'],
          features: ['issues', 'comments', 'status_transitions', 'labels'],
        },
        {
          id: 'servicenow',
          name: 'ServiceNow',
          description: 'ServiceNow ITSM platform',
          requiredFields: ['username'],
          features: ['incidents', 'comments', 'status_updates', 'priority'],
        },
        {
          id: 'azure_devops',
          name: 'Azure DevOps',
          description: 'Microsoft Azure DevOps work items',
          requiredFields: ['organizationId', 'projectKey'],
          features: ['work_items', 'comments', 'status_updates', 'tags'],
        },
        {
          id: 'github',
          name: 'GitHub Issues',
          description: 'GitHub issue tracking',
          requiredFields: ['repositoryOwner', 'repositoryName'],
          features: ['issues', 'comments', 'labels', 'milestones'],
        },
        {
          id: 'custom',
          name: 'Custom Integration',
          description: 'Custom ticketing system via REST API',
          requiredFields: [],
          features: ['basic_ticketing'],
        },
      ],
    });
  });
}

export default setupTicketingIntegrationRoutes;
