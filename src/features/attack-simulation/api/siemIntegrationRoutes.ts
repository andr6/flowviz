/**
 * SIEM Integration API Routes
 *
 * Provides endpoints for SIEM platform integration including:
 * - Configuration management
 * - Connection testing
 * - Detection rule deployment
 * - Alert querying
 * - Simulation correlation
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { SiemIntegrationService, SiemConfig, DetectionRule } from '../services/integrations/SiemIntegrationService';

export function setupSiemIntegrationRoutes(app: Router, pool: Pool): void {
  const siemService = new SiemIntegrationService(pool);

  /**
   * GET /api/simulations/siem/configs
   * List all SIEM configurations
   */
  app.get('/api/simulations/siem/configs', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        'SELECT id, platform, name, api_url, tenant_id, workspace_id, enabled, created_at FROM siem_integrations ORDER BY created_at DESC'
      );

      res.json({
        success: true,
        configs: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch SIEM configs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch SIEM configurations',
      });
    }
  });

  /**
   * POST /api/simulations/siem/configs
   * Create new SIEM configuration
   */
  app.post('/api/simulations/siem/configs', async (req: Request, res: Response) => {
    try {
      const { platform, name, apiUrl, apiKey, tenantId, workspaceId, additionalConfig, enabled } = req.body;

      // Validate required fields
      if (!platform || !name || !apiUrl || !apiKey) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: platform, name, apiUrl, apiKey',
        });
      }

      const config: Omit<SiemConfig, 'id'> = {
        platform,
        name,
        apiUrl,
        apiKey,
        tenantId,
        workspaceId,
        additionalConfig: additionalConfig || {},
        enabled: enabled !== undefined ? enabled : true,
      };

      const savedConfig = await siemService.addConfiguration(config);

      res.json({
        success: true,
        config: {
          ...savedConfig,
          apiKey: '***', // Redact API key in response
        },
      });
    } catch (error) {
      console.error('Failed to create SIEM config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create SIEM configuration',
      });
    }
  });

  /**
   * PUT /api/simulations/siem/configs/:id
   * Update SIEM configuration
   */
  app.put('/api/simulations/siem/configs/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { platform, name, apiUrl, apiKey, tenantId, workspaceId, additionalConfig, enabled } = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (platform !== undefined) {
        updates.push(`platform = $${paramCount++}`);
        values.push(platform);
      }
      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }
      if (apiUrl !== undefined) {
        updates.push(`api_url = $${paramCount++}`);
        values.push(apiUrl);
      }
      if (apiKey !== undefined) {
        updates.push(`api_key = $${paramCount++}`);
        values.push(apiKey);
      }
      if (tenantId !== undefined) {
        updates.push(`tenant_id = $${paramCount++}`);
        values.push(tenantId);
      }
      if (workspaceId !== undefined) {
        updates.push(`workspace_id = $${paramCount++}`);
        values.push(workspaceId);
      }
      if (additionalConfig !== undefined) {
        updates.push(`additional_config = $${paramCount++}`);
        values.push(JSON.stringify(additionalConfig));
      }
      if (enabled !== undefined) {
        updates.push(`enabled = $${paramCount++}`);
        values.push(enabled);
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE siem_integrations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'SIEM configuration not found',
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
      console.error('Failed to update SIEM config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update SIEM configuration',
      });
    }
  });

  /**
   * DELETE /api/simulations/siem/configs/:id
   * Delete SIEM configuration
   */
  app.delete('/api/simulations/siem/configs/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query('DELETE FROM siem_integrations WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'SIEM configuration not found',
        });
      }

      res.json({
        success: true,
        message: 'SIEM configuration deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete SIEM config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete SIEM configuration',
      });
    }
  });

  /**
   * POST /api/simulations/siem/configs/:id/test
   * Test SIEM connection
   */
  app.post('/api/simulations/siem/configs/:id/test', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await siemService.testConnection(id);

      res.json(result);
    } catch (error) {
      console.error('Failed to test SIEM connection:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    }
  });

  /**
   * POST /api/simulations/siem/rules/deploy
   * Deploy detection rule to SIEM
   */
  app.post('/api/simulations/siem/rules/deploy', async (req: Request, res: Response) => {
    try {
      const { siemConfigId, rule } = req.body;

      if (!siemConfigId || !rule) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: siemConfigId, rule',
        });
      }

      const result = await siemService.deployDetectionRule(siemConfigId, rule as DetectionRule);

      if (result.success) {
        // Save rule to database
        await pool.query(
          `INSERT INTO siem_detection_rules (
            siem_config_id, rule_id, rule_name, description, technique_id,
            platform, query, severity, enabled, metadata, deployed_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (siem_config_id, rule_id) DO UPDATE SET
            rule_name = EXCLUDED.rule_name,
            description = EXCLUDED.description,
            query = EXCLUDED.query,
            severity = EXCLUDED.severity,
            enabled = EXCLUDED.enabled,
            metadata = EXCLUDED.metadata,
            last_modified = NOW()`,
          [
            siemConfigId,
            rule.id,
            rule.name,
            rule.description,
            rule.techniqueId,
            rule.platform,
            rule.query,
            rule.severity,
            rule.enabled,
            JSON.stringify(rule.metadata || {}),
            req.body.userId || null,
          ]
        );
      }

      res.json(result);
    } catch (error) {
      console.error('Failed to deploy detection rule:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Rule deployment failed',
      });
    }
  });

  /**
   * GET /api/simulations/siem/rules
   * List deployed detection rules
   */
  app.get('/api/simulations/siem/rules', async (req: Request, res: Response) => {
    try {
      const { siemConfigId, techniqueId, enabled } = req.query;

      let query = 'SELECT * FROM siem_detection_rules WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (siemConfigId) {
        query += ` AND siem_config_id = $${paramCount++}`;
        params.push(siemConfigId);
      }

      if (techniqueId) {
        query += ` AND technique_id = $${paramCount++}`;
        params.push(techniqueId);
      }

      if (enabled !== undefined) {
        query += ` AND enabled = $${paramCount++}`;
        params.push(enabled === 'true');
      }

      query += ' ORDER BY deployed_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        rules: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch detection rules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch detection rules',
      });
    }
  });

  /**
   * POST /api/simulations/siem/alerts/query
   * Query alerts from SIEM
   */
  app.post('/api/simulations/siem/alerts/query', async (req: Request, res: Response) => {
    try {
      const { siemConfigId, startTime, endTime, techniqueId, severity, limit } = req.body;

      if (!siemConfigId || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: siemConfigId, startTime, endTime',
        });
      }

      const result = await siemService.queryAlerts(siemConfigId, {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        techniqueId,
        severity,
        limit,
      });

      // Log query to history
      await pool.query(
        `INSERT INTO siem_query_history (
          siem_config_id, query_type, query_params, results_count, status, executed_by
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          siemConfigId,
          'alert_query',
          JSON.stringify({ startTime, endTime, techniqueId, severity, limit }),
          result.total,
          'success',
          req.body.userId || null,
        ]
      );

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error('Failed to query SIEM alerts:', error);

      // Log failure
      if (req.body.siemConfigId) {
        await pool.query(
          `INSERT INTO siem_query_history (
            siem_config_id, query_type, query_params, results_count, status, error_message
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.body.siemConfigId,
            'alert_query',
            JSON.stringify(req.body),
            0,
            'failed',
            error instanceof Error ? error.message : 'Query failed',
          ]
        );
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query alerts',
      });
    }
  });

  /**
   * POST /api/simulations/siem/correlate/:jobId
   * Correlate simulation with SIEM alerts
   */
  app.post('/api/simulations/siem/correlate/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const { siemConfigId } = req.body;

      if (!siemConfigId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: siemConfigId',
        });
      }

      const result = await siemService.correlateSimulationWithAlerts(jobId, siemConfigId);

      // Save correlation results
      for (const correlation of result.correlations) {
        await pool.query(
          `INSERT INTO siem_alert_correlations (
            job_id, siem_config_id, technique_id, technique_name,
            matched_alerts_count, detection_time_seconds, alerts_data,
            correlation_confidence
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (job_id, siem_config_id, technique_id) DO UPDATE SET
            matched_alerts_count = EXCLUDED.matched_alerts_count,
            detection_time_seconds = EXCLUDED.detection_time_seconds,
            alerts_data = EXCLUDED.alerts_data,
            correlation_confidence = EXCLUDED.correlation_confidence,
            created_at = NOW()`,
          [
            jobId,
            siemConfigId,
            correlation.techniqueId,
            correlation.techniqueName,
            correlation.alerts.length,
            correlation.detectionTime || null,
            JSON.stringify(correlation.alerts),
            correlation.alerts.length > 0 ? 0.9 : 0.0,
          ]
        );
      }

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error('Failed to correlate simulation with alerts:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Correlation failed',
      });
    }
  });

  /**
   * GET /api/simulations/siem/correlations/:jobId
   * Get correlation results for a simulation job
   */
  app.get('/api/simulations/siem/correlations/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      const result = await pool.query(
        `SELECT c.*, s.name as siem_name, s.platform
         FROM siem_alert_correlations c
         JOIN siem_integrations s ON c.siem_config_id = s.id
         WHERE c.job_id = $1
         ORDER BY c.correlation_confidence DESC, c.technique_id`,
        [jobId]
      );

      res.json({
        success: true,
        correlations: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch correlation results:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch correlation results',
      });
    }
  });

  /**
   * GET /api/simulations/siem/query-history
   * Get SIEM query history
   */
  app.get('/api/simulations/siem/query-history', async (req: Request, res: Response) => {
    try {
      const { siemConfigId, limit = 50 } = req.query;

      let query = 'SELECT * FROM siem_query_history WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (siemConfigId) {
        query += ` AND siem_config_id = $${paramCount++}`;
        params.push(siemConfigId);
      }

      query += ` ORDER BY executed_at DESC LIMIT $${paramCount}`;
      params.push(Number(limit));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        history: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch query history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch query history',
      });
    }
  });

  /**
   * GET /api/simulations/siem/platforms
   * Get supported SIEM platforms
   */
  app.get('/api/simulations/siem/platforms', async (req: Request, res: Response) => {
    res.json({
      success: true,
      platforms: [
        {
          id: 'splunk',
          name: 'Splunk Enterprise Security',
          description: 'Splunk SIEM platform with SPL query language',
          features: ['detection_rules', 'alert_query', 'correlation'],
        },
        {
          id: 'sentinel',
          name: 'Microsoft Sentinel',
          description: 'Cloud-native SIEM with KQL query language',
          features: ['detection_rules', 'alert_query', 'correlation', 'automation'],
        },
        {
          id: 'elastic',
          name: 'Elastic Security',
          description: 'Elastic SIEM with detection engine',
          features: ['detection_rules', 'alert_query', 'correlation', 'threat_hunting'],
        },
        {
          id: 'qradar',
          name: 'IBM QRadar',
          description: 'IBM SIEM with AQL query language',
          features: ['alert_query', 'correlation'],
        },
        {
          id: 'chronicle',
          name: 'Google Chronicle',
          description: 'Google Cloud SIEM with YARA-L',
          features: ['detection_rules', 'alert_query', 'threat_intelligence'],
        },
        {
          id: 'custom',
          name: 'Custom SIEM',
          description: 'Custom SIEM integration via REST API',
          features: ['alert_query'],
        },
      ],
    });
  });
}

export default setupSiemIntegrationRoutes;
