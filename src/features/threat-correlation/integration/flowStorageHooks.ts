/**
 * Flow Storage Integration Hooks
 * Automatic correlation triggering when flows are saved
 *
 * Integration Instructions:
 * 1. Import in LocalStorageService.ts or flow save handler
 * 2. Call triggerCorrelationOnFlowSave() after successful flow save
 * 3. Set up background job for periodic correlation analysis
 */

import { Pool } from 'pg';
import { ThreatCorrelationEngine } from '../services/ThreatCorrelationEngine';

interface FlowSaveHookConfig {
  autoAnalyze: boolean;
  minFlowsForAnalysis: number;
  analysisThreshold: number;
  notifyOnCampaignDetection: boolean;
}

const DEFAULT_CONFIG: FlowSaveHookConfig = {
  autoAnalyze: true,
  minFlowsForAnalysis: 5,
  analysisThreshold: 0.65,
  notifyOnCampaignDetection: true,
};

/**
 * Main hook function - call this after saving a flow
 */
export async function triggerCorrelationOnFlowSave(
  flowId: string,
  pool: Pool,
  config: Partial<FlowSaveHookConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!cfg.autoAnalyze) {
    console.log('[Correlation] Auto-analysis disabled');
    return;
  }

  try {
    // Check if we have enough flows for meaningful analysis
    const countResult = await pool.query('SELECT COUNT(*) as count FROM saved_flows');
    const flowCount = parseInt(countResult.rows[0].count);

    if (flowCount < cfg.minFlowsForAnalysis) {
      console.log(
        `[Correlation] Insufficient flows for analysis (${flowCount}/${cfg.minFlowsForAnalysis})`
      );
      return;
    }

    console.log(`[Correlation] Triggering analysis for new flow: ${flowId}`);

    // Run correlation analysis in background
    setImmediate(async () => {
      try {
        await analyzeNewFlow(flowId, pool, cfg);
      } catch (error) {
        console.error('[Correlation] Background analysis failed:', error);
      }
    });
  } catch (error) {
    console.error('[Correlation] Hook execution failed:', error);
  }
}

/**
 * Analyze new flow against existing flows
 */
async function analyzeNewFlow(
  flowId: string,
  pool: Pool,
  config: FlowSaveHookConfig
): Promise<void> {
  const engine = new ThreatCorrelationEngine(pool, {
    minCorrelationScore: 0.3,
    campaignDetectionThreshold: config.analysisThreshold,
  });

  // Get recent flows to analyze against (last 100)
  const recentFlows = await pool.query(
    `SELECT id FROM saved_flows
     WHERE id != $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [flowId]
  );

  const flowIds = [flowId, ...recentFlows.rows.map(r => r.id)];

  // Run correlation analysis
  console.log(`[Correlation] Analyzing ${flowIds.length} flows...`);
  const result = await engine.analyzeFlowRelationships(flowIds);

  console.log(
    `[Correlation] Found ${result.correlationsFound} correlations ` +
      `(avg score: ${(result.averageScore * 100).toFixed(1)}%)`
  );

  // Detect campaigns if high-confidence correlations found
  if (result.averageScore >= config.analysisThreshold) {
    console.log('[Correlation] High confidence correlations detected, checking for campaigns...');

    const campaigns = await engine.detectCampaigns();

    if (campaigns.newCampaigns.length > 0) {
      console.log(`[Correlation] Detected ${campaigns.newCampaigns.length} new campaigns!`);

      if (config.notifyOnCampaignDetection) {
        await notifyNewCampaigns(campaigns.newCampaigns, pool);
      }
    }

    if (campaigns.updatedCampaigns.length > 0) {
      console.log(`[Correlation] Updated ${campaigns.updatedCampaigns.length} existing campaigns`);
    }
  }
}

/**
 * Send notifications for new campaign detections
 */
async function notifyNewCampaigns(campaigns: any[], pool: Pool): Promise<void> {
  for (const campaign of campaigns) {
    console.log(
      `[Notification] New campaign detected: ${campaign.name} ` +
        `(confidence: ${(campaign.confidenceScore * 100).toFixed(1)}%, ` +
        `severity: ${campaign.severity})`
    );

    // TODO: Integrate with notification system
    // - Send email alerts
    // - Post to Slack/Teams
    // - Create SIEM alerts
    // - Update dashboard

    // For now, just log to database timeline
    await pool.query(
      `INSERT INTO campaign_timeline (campaign_id, event_type, event_timestamp, description)
       VALUES ($1, $2, NOW(), $3)`,
      [
        campaign.id,
        'campaign_detected',
        `New campaign automatically detected from flow correlation`,
      ]
    );
  }
}

/**
 * Setup periodic correlation job (run every hour)
 */
export function setupPeriodicCorrelationJob(
  pool: Pool,
  intervalMinutes: number = 60
): NodeJS.Timer {
  console.log(`[Correlation] Setting up periodic analysis (every ${intervalMinutes} minutes)`);

  return setInterval(async () => {
    try {
      console.log('[Correlation] Running scheduled analysis...');

      const engine = new ThreatCorrelationEngine(pool);

      // Analyze flows from last 24 hours
      const recentFlows = await pool.query(
        `SELECT id FROM saved_flows
         WHERE created_at > NOW() - INTERVAL '24 hours'
         ORDER BY created_at DESC`
      );

      if (recentFlows.rows.length < 5) {
        console.log('[Correlation] Not enough recent flows to analyze');
        return;
      }

      const flowIds = recentFlows.rows.map(r => r.id);
      const result = await engine.analyzeFlowRelationships(flowIds);

      console.log(
        `[Correlation] Scheduled analysis complete: ${result.correlationsFound} correlations found`
      );

      // Auto-detect campaigns
      const campaigns = await engine.detectCampaigns();

      if (campaigns.newCampaigns.length > 0 || campaigns.updatedCampaigns.length > 0) {
        console.log(
          `[Correlation] Campaign updates: ${campaigns.newCampaigns.length} new, ` +
            `${campaigns.updatedCampaigns.length} updated`
        );

        await notifyNewCampaigns(campaigns.newCampaigns, pool);
      }
    } catch (error) {
      console.error('[Correlation] Scheduled analysis failed:', error);
    }
  }, intervalMinutes * 60 * 1000);
}

/**
 * Batch analyze all existing flows (one-time operation)
 */
export async function batchAnalyzeAllFlows(
  pool: Pool,
  batchSize: number = 100
): Promise<void> {
  console.log('[Correlation] Starting batch analysis of all flows...');

  try {
    const engine = new ThreatCorrelationEngine(pool);

    // Get total flow count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM saved_flows');
    const totalFlows = parseInt(countResult.rows[0].count);

    console.log(`[Correlation] Total flows to analyze: ${totalFlows}`);

    // Process in batches
    for (let offset = 0; offset < totalFlows; offset += batchSize) {
      console.log(
        `[Correlation] Processing batch ${offset / batchSize + 1} ` +
          `(${offset + 1}-${Math.min(offset + batchSize, totalFlows)})`
      );

      const batchFlows = await pool.query(
        `SELECT id FROM saved_flows
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [batchSize, offset]
      );

      const flowIds = batchFlows.rows.map(r => r.id);

      if (flowIds.length === 0) break;

      const result = await engine.analyzeFlowRelationships(flowIds);

      console.log(
        `[Correlation] Batch ${offset / batchSize + 1}: ` +
          `${result.correlationsFound} correlations found`
      );

      // Small delay between batches to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('[Correlation] Batch analysis complete. Detecting campaigns...');

    // Run campaign detection across all correlations
    const campaigns = await engine.detectCampaigns();

    console.log(
      `[Correlation] Campaign detection complete: ` +
        `${campaigns.newCampaigns.length} campaigns detected`
    );

    await notifyNewCampaigns(campaigns.newCampaigns, pool);

    console.log('[Correlation] Batch analysis and campaign detection finished!');
  } catch (error) {
    console.error('[Correlation] Batch analysis failed:', error);
    throw error;
  }
}

/**
 * Clean up old correlations (data retention)
 */
export async function cleanupOldCorrelations(
  pool: Pool,
  retentionDays: number = 90
): Promise<void> {
  console.log(`[Correlation] Cleaning up correlations older than ${retentionDays} days...`);

  try {
    const result = await pool.query(
      `DELETE FROM threat_correlations
       WHERE detected_at < NOW() - INTERVAL '${retentionDays} days'
       RETURNING id`,
      []
    );

    console.log(`[Correlation] Deleted ${result.rowCount} old correlations`);
  } catch (error) {
    console.error('[Correlation] Cleanup failed:', error);
    throw error;
  }
}

/**
 * Get correlation statistics for monitoring
 */
export async function getCorrelationStatistics(pool: Pool): Promise<any> {
  const stats = await pool.query(`
    SELECT
      COUNT(*) as total_correlations,
      COUNT(DISTINCT flow_id_1) + COUNT(DISTINCT flow_id_2) as unique_flows,
      AVG(correlation_score) as avg_score,
      MAX(correlation_score) as max_score,
      COUNT(CASE WHEN correlation_score >= 0.8 THEN 1 END) as high_confidence,
      COUNT(CASE WHEN correlation_score BETWEEN 0.5 AND 0.8 THEN 1 END) as medium_confidence,
      COUNT(CASE WHEN correlation_score < 0.5 THEN 1 END) as low_confidence
    FROM threat_correlations
    WHERE detected_at > NOW() - INTERVAL '7 days'
  `);

  const campaigns = await pool.query(`
    SELECT
      COUNT(*) as total_campaigns,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_campaigns,
      COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_campaigns,
      AVG(confidence_score) as avg_campaign_confidence
    FROM campaigns
    WHERE created_at > NOW() - INTERVAL '30 days'
  `);

  return {
    correlations: stats.rows[0],
    campaigns: campaigns.rows[0],
    timestamp: new Date(),
  };
}

/**
 * Integration with LocalStorageService
 *
 * Add this to src/features/flow-storage/services/LocalStorageService.ts:
 *
 * import { triggerCorrelationOnFlowSave } from '@/features/threat-correlation/integration/flowStorageHooks';
 * import { pool } from '@/shared/services/database';
 *
 * // In saveFlow method, after successful save:
 * if (process.env.ENABLE_AUTO_CORRELATION === 'true') {
 *   await triggerCorrelationOnFlowSave(flowId, pool, {
 *     autoAnalyze: true,
 *     minFlowsForAnalysis: 5,
 *     analysisThreshold: 0.65,
 *     notifyOnCampaignDetection: true,
 *   });
 * }
 */

/**
 * Integration with server.ts
 *
 * Add this to server.ts startup:
 *
 * import {
 *   setupPeriodicCorrelationJob,
 *   batchAnalyzeAllFlows,
 *   getCorrelationStatistics,
 * } from './features/threat-correlation/integration/flowStorageHooks';
 *
 * // Setup periodic job
 * if (process.env.ENABLE_AUTO_CORRELATION === 'true') {
 *   const correlationJob = setupPeriodicCorrelationJob(pool, 60); // Every 60 minutes
 *
 *   // Graceful shutdown
 *   process.on('SIGTERM', () => {
 *     clearInterval(correlationJob);
 *   });
 * }
 *
 * // Optional: Run initial batch analysis
 * if (process.env.RUN_INITIAL_CORRELATION_ANALYSIS === 'true') {
 *   batchAnalyzeAllFlows(pool, 100).catch(console.error);
 * }
 *
 * // Health check endpoint
 * app.get('/api/correlation/health', async (req, res) => {
 *   const stats = await getCorrelationStatistics(pool);
 *   res.json(stats);
 * });
 */

export default {
  triggerCorrelationOnFlowSave,
  setupPeriodicCorrelationJob,
  batchAnalyzeAllFlows,
  cleanupOldCorrelations,
  getCorrelationStatistics,
};
