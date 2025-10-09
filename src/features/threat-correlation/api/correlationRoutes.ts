/**
 * Threat Correlation API Routes
 * RESTful API endpoints for correlation and campaign management
 *
 * Add to server.ts:
 * import { setupCorrelationRoutes } from './features/threat-correlation/api/correlationRoutes';
 * setupCorrelationRoutes(app, pool);
 */

import { Express, Request, Response } from 'express';
import { Pool } from 'pg';
import { ThreatCorrelationEngine } from '../services/ThreatCorrelationEngine';
import type {
  AnalyzeCorrelationsRequest,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  MergeCampaignsRequest,
  CampaignSearchFilters,
} from '../types';

export function setupCorrelationRoutes(app: Express, pool: Pool) {
  const engine = new ThreatCorrelationEngine(pool);

  // ============================================================================
  // CORRELATION ANALYSIS ENDPOINTS
  // ============================================================================

  /**
   * POST /api/correlation/analyze
   * Trigger correlation analysis across flows
   */
  app.post('/api/correlation/analyze', async (req: Request, res: Response) => {
    try {
      const { flowIds, dateRange, config }: AnalyzeCorrelationsRequest = req.body;

      const startTime = Date.now();
      const result = await engine.analyzeFlowRelationships(flowIds);
      const executionTime = Date.now() - startTime;

      // Detect campaigns from correlations
      const campaigns = await engine.detectCampaigns();

      res.json({
        result,
        detectedCampaigns: campaigns.campaignsDetected,
        executionTime,
      });
    } catch (error) {
      console.error('Correlation analysis failed:', error);
      res.status(500).json({
        error: 'Correlation analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/correlation/:id
   * Get specific correlation details
   */
  app.get('/api/correlation/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'SELECT * FROM threat_correlations WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Correlation not found' });
      }

      res.json(mapCorrelationFromDb(result.rows[0]));
    } catch (error) {
      console.error('Failed to get correlation:', error);
      res.status(500).json({ error: 'Failed to get correlation' });
    }
  });

  /**
   * GET /api/correlation/matrix
   * Get correlation matrix for flows
   */
  app.get('/api/correlation/matrix', async (req: Request, res: Response) => {
    try {
      const { flowIds, minScore = 0.3 } = req.query;

      const ids = flowIds
        ? (flowIds as string).split(',')
        : undefined;

      const matrix = await generateCorrelationMatrix(pool, ids, parseFloat(minScore as string));

      res.json(matrix);
    } catch (error) {
      console.error('Failed to generate matrix:', error);
      res.status(500).json({ error: 'Failed to generate correlation matrix' });
    }
  });

  /**
   * GET /api/correlation/analytics
   * Get correlation analytics and metrics
   */
  app.get('/api/correlation/analytics', async (req: Request, res: Response) => {
    try {
      const { dateRange } = req.query;

      const query = dateRange
        ? `SELECT * FROM correlation_analytics
           WHERE analysis_date BETWEEN $1 AND $2
           ORDER BY analysis_date DESC`
        : `SELECT * FROM correlation_analytics
           ORDER BY analysis_date DESC
           LIMIT 30`;

      const params = dateRange
        ? JSON.parse(dateRange as string)
        : [];

      const result = await pool.query(query, params);

      res.json(result.rows);
    } catch (error) {
      console.error('Failed to get analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  });

  // ============================================================================
  // CAMPAIGN MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * POST /api/campaigns
   * Create a new campaign
   */
  app.post('/api/campaigns', async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        flowIds,
        severity,
        suspectedActor,
        tags,
      }: CreateCampaignRequest = req.body;

      if (!name || !flowIds || flowIds.length === 0) {
        return res.status(400).json({ error: 'Name and flowIds are required' });
      }

      // Get flow data
      const flows = await pool.query(
        'SELECT * FROM saved_flows WHERE id = ANY($1)',
        [flowIds]
      );

      if (flows.rows.length === 0) {
        return res.status(404).json({ error: 'No flows found with provided IDs' });
      }

      // Calculate timestamps
      const timestamps = flows.rows.map(f => new Date(f.created_at).getTime());
      const firstSeen = new Date(Math.min(...timestamps));
      const lastSeen = new Date(Math.max(...timestamps));

      // Create campaign
      const result = await pool.query(
        `INSERT INTO campaigns (
          name, description, confidence_score, status, severity,
          first_seen, last_seen, related_flows, suspected_actor, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          name,
          description || null,
          0.7, // Default confidence
          'active',
          severity || 'medium',
          firstSeen,
          lastSeen,
          flowIds,
          suspectedActor || null,
          tags || [],
        ]
      );

      const campaign = mapCampaignFromDb(result.rows[0]);

      // Add timeline event
      await pool.query(
        `INSERT INTO campaign_timeline (campaign_id, event_type, event_timestamp, description)
         VALUES ($1, $2, NOW(), $3)`,
        [campaign.id, 'campaign_detected', `Campaign created with ${flowIds.length} flows`]
      );

      res.status(201).json(campaign);
    } catch (error) {
      console.error('Failed to create campaign:', error);
      res.status(500).json({ error: 'Failed to create campaign' });
    }
  });

  /**
   * GET /api/campaigns
   * List campaigns with optional filters
   */
  app.get('/api/campaigns', async (req: Request, res: Response) => {
    try {
      const {
        status,
        severity,
        actor,
        tags,
        minConfidence,
        page = 1,
        pageSize = 50,
      } = req.query;

      let query = 'SELECT * FROM campaigns WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        const statuses = (status as string).split(',');
        query += ` AND status = ANY($${paramIndex})`;
        params.push(statuses);
        paramIndex++;
      }

      if (severity) {
        const severities = (severity as string).split(',');
        query += ` AND severity = ANY($${paramIndex})`;
        params.push(severities);
        paramIndex++;
      }

      if (actor) {
        query += ` AND suspected_actor ILIKE $${paramIndex}`;
        params.push(`%${actor}%`);
        paramIndex++;
      }

      if (tags) {
        const tagList = (tags as string).split(',');
        query += ` AND tags && $${paramIndex}`;
        params.push(tagList);
        paramIndex++;
      }

      if (minConfidence) {
        query += ` AND confidence_score >= $${paramIndex}`;
        params.push(parseFloat(minConfidence as string));
        paramIndex++;
      }

      query += ' ORDER BY last_seen DESC, confidence_score DESC';

      // Add pagination
      const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(pageSize as string), offset);

      const result = await pool.query(query, params);
      const campaigns = result.rows.map(mapCampaignFromDb);

      res.json(campaigns);
    } catch (error) {
      console.error('Failed to list campaigns:', error);
      res.status(500).json({ error: 'Failed to list campaigns' });
    }
  });

  /**
   * GET /api/campaigns/:id
   * Get specific campaign details
   */
  app.get('/api/campaigns/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'SELECT * FROM campaigns WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(mapCampaignFromDb(result.rows[0]));
    } catch (error) {
      console.error('Failed to get campaign:', error);
      res.status(500).json({ error: 'Failed to get campaign' });
    }
  });

  /**
   * PUT /api/campaigns/:id
   * Update campaign details
   */
  app.put('/api/campaigns/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: UpdateCampaignRequest = req.body;

      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name) {
        fields.push(`name = $${paramIndex}`);
        values.push(updates.name);
        paramIndex++;
      }

      if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex}`);
        values.push(updates.description);
        paramIndex++;
      }

      if (updates.status) {
        fields.push(`status = $${paramIndex}`);
        values.push(updates.status);
        paramIndex++;
      }

      if (updates.severity) {
        fields.push(`severity = $${paramIndex}`);
        values.push(updates.severity);
        paramIndex++;
      }

      if (updates.suspectedActor !== undefined) {
        fields.push(`suspected_actor = $${paramIndex}`);
        values.push(updates.suspectedActor);
        paramIndex++;
      }

      if (updates.tags) {
        fields.push(`tags = $${paramIndex}`);
        values.push(updates.tags);
        paramIndex++;
      }

      if (updates.mitigationStatus) {
        fields.push(`mitigation_status = $${paramIndex}`);
        values.push(JSON.stringify(updates.mitigationStatus));
        paramIndex++;
      }

      if (fields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Add timeline event
      await pool.query(
        `INSERT INTO campaign_timeline (campaign_id, event_type, event_timestamp, description)
         VALUES ($1, $2, NOW(), $3)`,
        [id, 'status_changed', 'Campaign updated']
      );

      res.json(mapCampaignFromDb(result.rows[0]));
    } catch (error) {
      console.error('Failed to update campaign:', error);
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  /**
   * DELETE /api/campaigns/:id
   * Delete a campaign (soft delete by archiving)
   */
  app.delete('/api/campaigns/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE campaigns SET status = 'archived', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json({ success: true, campaign: mapCampaignFromDb(result.rows[0]) });
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  });

  /**
   * POST /api/campaigns/:id/merge
   * Merge two campaigns
   */
  app.post('/api/campaigns/:id/merge', async (req: Request, res: Response) => {
    try {
      const sourceCampaignId = req.params.id;
      const { targetCampaignId, reason }: MergeCampaignsRequest = req.body;

      if (!targetCampaignId) {
        return res.status(400).json({ error: 'targetCampaignId is required' });
      }

      // Use stored procedure to merge campaigns
      const result = await pool.query(
        'SELECT merge_campaigns($1, $2) as merged_id',
        [sourceCampaignId, targetCampaignId]
      );

      const mergedId = result.rows[0].merged_id;

      // Get merged campaign
      const campaign = await pool.query(
        'SELECT * FROM campaigns WHERE id = $1',
        [mergedId]
      );

      res.json(mapCampaignFromDb(campaign.rows[0]));
    } catch (error) {
      console.error('Failed to merge campaigns:', error);
      res.status(500).json({ error: 'Failed to merge campaigns' });
    }
  });

  /**
   * GET /api/campaigns/:id/timeline
   * Get campaign timeline
   */
  app.get('/api/campaigns/:id/timeline', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const timeline = await engine.generateCampaignTimeline(id);

      res.json(timeline);
    } catch (error) {
      console.error('Failed to get timeline:', error);
      res.status(500).json({ error: 'Failed to get campaign timeline' });
    }
  });

  /**
   * GET /api/campaigns/:id/graph
   * Get threat graph for campaign
   */
  app.get('/api/campaigns/:id/graph', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const graph = await engine.buildThreatGraph(id);

      res.json(graph);
    } catch (error) {
      console.error('Failed to build graph:', error);
      res.status(500).json({ error: 'Failed to build threat graph' });
    }
  });

  /**
   * GET /api/campaigns/:id/report
   * Export campaign report
   */
  app.get('/api/campaigns/:id/report', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { format = 'json' } = req.query;

      const report = await engine.exportCampaignReport(id);

      if (format === 'json') {
        res.json(report);
      } else if (format === 'pdf') {
        // TODO: Implement PDF generation
        res.status(501).json({ error: 'PDF export not yet implemented' });
      } else if (format === 'html') {
        // TODO: Implement HTML generation
        res.status(501).json({ error: 'HTML export not yet implemented' });
      } else {
        res.status(400).json({ error: 'Invalid format. Use json, pdf, or html' });
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      res.status(500).json({ error: 'Failed to export campaign report' });
    }
  });

  /**
   * GET /api/campaigns/:id/indicators
   * Get campaign indicators
   */
  app.get('/api/campaigns/:id/indicators', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT * FROM campaign_indicators
         WHERE campaign_id = $1
         ORDER BY confidence DESC, occurrence_count DESC`,
        [id]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Failed to get indicators:', error);
      res.status(500).json({ error: 'Failed to get campaign indicators' });
    }
  });

  /**
   * GET /api/campaigns/:id/ttps
   * Get campaign TTPs
   */
  app.get('/api/campaigns/:id/ttps', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT * FROM campaign_ttps
         WHERE campaign_id = $1
         ORDER BY occurrence_count DESC`,
        [id]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Failed to get TTPs:', error);
      res.status(500).json({ error: 'Failed to get campaign TTPs' });
    }
  });

  /**
   * GET /api/campaigns/:id/flows
   * Get flows associated with campaign
   */
  app.get('/api/campaigns/:id/flows', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const campaign = await pool.query(
        'SELECT related_flows FROM campaigns WHERE id = $1',
        [id]
      );

      if (campaign.rows.length === 0) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const flowIds = campaign.rows[0].related_flows;

      if (!flowIds || flowIds.length === 0) {
        return res.json([]);
      }

      const flows = await pool.query(
        'SELECT * FROM saved_flows WHERE id = ANY($1) ORDER BY created_at DESC',
        [flowIds]
      );

      res.json(flows.rows);
    } catch (error) {
      console.error('Failed to get flows:', error);
      res.status(500).json({ error: 'Failed to get campaign flows' });
    }
  });

  /**
   * GET /api/correlation/graph
   * Get overall threat graph (all campaigns)
   */
  app.get('/api/correlation/graph', async (req: Request, res: Response) => {
    try {
      const graph = await engine.buildThreatGraph();
      res.json(graph);
    } catch (error) {
      console.error('Failed to build graph:', error);
      res.status(500).json({ error: 'Failed to build threat graph' });
    }
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapCorrelationFromDb(row: any) {
  return {
    id: row.id,
    flowId1: row.flow_id_1,
    flowId2: row.flow_id_2,
    correlationScore: parseFloat(row.correlation_score),
    correlationType: row.correlation_type,
    sharedIndicators:
      typeof row.shared_indicators === 'string'
        ? JSON.parse(row.shared_indicators)
        : row.shared_indicators || [],
    metadata: row.metadata || {},
    detectedAt: new Date(row.detected_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapCampaignFromDb(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    confidenceScore: parseFloat(row.confidence_score),
    status: row.status,
    severity: row.severity,
    firstSeen: new Date(row.first_seen),
    lastSeen: new Date(row.last_seen),
    relatedFlows: row.related_flows || [],
    sharedTtps: row.shared_ttps || [],
    sharedIocs:
      typeof row.shared_iocs === 'string'
        ? JSON.parse(row.shared_iocs)
        : row.shared_iocs || [],
    suspectedActor: row.suspected_actor,
    suspectedActorConfidence: row.suspected_actor_confidence,
    indicatorsCount: row.indicators_count || 0,
    affectedAssets: row.affected_assets || [],
    mitigationStatus: row.mitigation_status || {},
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    createdBy: row.created_by,
    tags: row.tags || [],
  };
}

async function generateCorrelationMatrix(pool: Pool, flowIds?: string[], minScore = 0.3) {
  // Get flows
  const flowQuery = flowIds
    ? 'SELECT id, name, created_at FROM saved_flows WHERE id = ANY($1) ORDER BY created_at DESC'
    : 'SELECT id, name, created_at FROM saved_flows ORDER BY created_at DESC LIMIT 50';

  const flowsResult = await pool.query(flowQuery, flowIds ? [flowIds] : []);
  const flows = flowsResult.rows.map(f => ({
    id: f.id,
    name: f.name,
    timestamp: f.created_at,
  }));

  // Get correlations
  const matrix: any[][] = [];
  let totalCorrelations = 0;
  let totalScore = 0;
  let highestScore = 0;

  for (let i = 0; i < flows.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < flows.length; j++) {
      if (i === j) {
        matrix[i][j] = {
          flowId1: flows[i].id,
          flowId2: flows[j].id,
          score: 1.0,
          type: 'self',
          hasCorrelation: false,
        };
      } else {
        const result = await pool.query(
          `SELECT correlation_score, correlation_type
           FROM threat_correlations
           WHERE (flow_id_1 = $1 AND flow_id_2 = $2)
              OR (flow_id_1 = $2 AND flow_id_2 = $1)
           ORDER BY correlation_score DESC
           LIMIT 1`,
          [flows[i].id, flows[j].id]
        );

        if (result.rows.length > 0) {
          const score = parseFloat(result.rows[0].correlation_score);
          const type = result.rows[0].correlation_type;

          matrix[i][j] = {
            flowId1: flows[i].id,
            flowId2: flows[j].id,
            score,
            type,
            hasCorrelation: score >= minScore,
          };

          if (score >= minScore) {
            totalCorrelations++;
            totalScore += score;
            highestScore = Math.max(highestScore, score);
          }
        } else {
          matrix[i][j] = {
            flowId1: flows[i].id,
            flowId2: flows[j].id,
            score: 0,
            type: 'none',
            hasCorrelation: false,
          };
        }
      }
    }
  }

  return {
    flows,
    matrix,
    statistics: {
      totalFlows: flows.length,
      totalCorrelations,
      avgScore: totalCorrelations > 0 ? totalScore / totalCorrelations : 0,
      highestScore,
    },
  };
}
