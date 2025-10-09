import { EventEmitter } from 'events';

import { databaseService } from '../../../shared/services/database/DatabaseService.js';
import { logger } from '../../../shared/utils/logger.js';
import {
  ThreatFeed,
  ThreatIndicator,
  ThreatIntelligenceQuery,
  ThreatIntelligenceResult,
  ThreatIndicatorMatch,
  ThreatFeedConfig
} from '../types/ThreatFeed';

export class ThreatIntelligenceService extends EventEmitter {
  private feeds: Map<string, ThreatFeed> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing Threat Intelligence Service...');
      
      // Load active threat feeds from database
      await this.loadFeeds();
      
      // Start sync intervals for active feeds
      this.startSyncScheduler();
      
      this.isInitialized = true;
      logger.info('✅ Threat Intelligence Service initialized');
      
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Threat Intelligence Service:', error);
      throw error;
    }
  }

  async createFeed(config: {
    name: string;
    provider: ThreatFeed['provider'];
    config: ThreatFeedConfig;
    tags?: string[];
  }): Promise<ThreatFeed> {
    try {
      const feed: ThreatFeed = {
        id: `feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: config.name,
        provider: config.provider,
        status: 'inactive',
        totalIndicators: 0,
        newIndicators24h: 0,
        confidence: 'medium',
        tags: config.tags || [],
        config: config.config,
        metrics: {
          totalQueries: 0,
          successfulQueries: 0,
          errorRate: 0,
          avgResponseTime: 0,
          uptime: 100
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store in database
      await databaseService.query(
        `INSERT INTO threat_feeds (id, name, provider, status, config, tags, metrics, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          feed.id,
          feed.name,
          feed.provider,
          feed.status,
          JSON.stringify(feed.config),
          feed.tags,
          JSON.stringify(feed.metrics),
          feed.createdAt,
          feed.updatedAt
        ]
      );

      this.feeds.set(feed.id, feed);
      
      logger.info(`Created threat feed: ${feed.name} (${feed.provider})`);
      this.emit('feedCreated', feed);
      
      return feed;
    } catch (error) {
      logger.error('Error creating threat feed:', error);
      throw error;
    }
  }

  async activateFeed(feedId: string): Promise<void> {
    const feed = this.feeds.get(feedId);
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    try {
      // Test connection first
      await this.testFeedConnection(feed);
      
      // Update status
      feed.status = 'active';
      feed.updatedAt = new Date().toISOString();
      
      // Update database
      await databaseService.query(
        'UPDATE threat_feeds SET status = $1, updated_at = $2 WHERE id = $3',
        [feed.status, feed.updatedAt, feedId]
      );

      // Start sync schedule
      this.scheduleFeedSync(feed);
      
      logger.info(`Activated threat feed: ${feed.name}`);
      this.emit('feedActivated', feed);
    } catch (error) {
      feed.status = 'error';
      feed.metrics.lastErrorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await databaseService.query(
        'UPDATE threat_feeds SET status = $1, metrics = $2 WHERE id = $3',
        [feed.status, JSON.stringify(feed.metrics), feedId]
      );
      
      logger.error(`Failed to activate feed ${feed.name}:`, error);
      throw error;
    }
  }

  async syncFeed(feedId: string): Promise<void> {
    const feed = this.feeds.get(feedId);
    if (!feed || feed.status !== 'active') {
      return;
    }

    try {
      feed.status = 'syncing';
      this.emit('feedSyncStarted', feed);
      
      logger.info(`Starting sync for feed: ${feed.name}`);
      const startTime = Date.now();
      
      // Fetch new indicators based on provider
      const indicators = await this.fetchIndicatorsFromFeed(feed);
      
      // Store indicators in database
      const newCount = await this.storeIndicators(feedId, indicators);
      
      // Update feed metrics
      const syncTime = Date.now() - startTime;
      feed.totalIndicators += newCount;
      feed.newIndicators24h = await this.getNewIndicatorsCount(feedId, 24);
      feed.lastSync = new Date().toISOString();
      feed.status = 'active';
      feed.metrics.totalQueries++;
      feed.metrics.successfulQueries++;
      feed.metrics.avgResponseTime = 
        (feed.metrics.avgResponseTime * (feed.metrics.totalQueries - 1) + syncTime) / feed.metrics.totalQueries;
      feed.metrics.errorRate = 
        ((feed.metrics.totalQueries - feed.metrics.successfulQueries) / feed.metrics.totalQueries) * 100;
      
      // Update database
      await this.updateFeedInDatabase(feed);
      
      logger.info(`Sync completed for ${feed.name}: ${newCount} new indicators in ${syncTime}ms`);
      this.emit('feedSyncCompleted', { feed, newIndicators: newCount });
      
    } catch (error) {
      feed.status = 'error';
      feed.metrics.lastErrorMessage = error instanceof Error ? error.message : 'Sync failed';
      feed.metrics.totalQueries++;
      feed.metrics.errorRate = 
        ((feed.metrics.totalQueries - feed.metrics.successfulQueries) / feed.metrics.totalQueries) * 100;
      
      await this.updateFeedInDatabase(feed);
      
      logger.error(`Feed sync failed for ${feed.name}:`, error);
      this.emit('feedSyncError', { feed, error });
    }
  }

  async queryThreatIntelligence(query: ThreatIntelligenceQuery): Promise<ThreatIntelligenceResult> {
    const startTime = Date.now();
    
    try {
      logger.debug('Executing threat intelligence query:', query);
      
      // Build SQL query
      let sql = `
        SELECT ti.*, tf.name as feed_name, tf.provider
        FROM threat_indicators ti
        JOIN threat_feeds tf ON ti.feed_id = tf.id
        WHERE ti.value = ANY($1)
      `;
      
      const params: any[] = [query.indicators];
      let paramIndex = 2;
      
      if (query.types && query.types.length > 0) {
        sql += ` AND ti.type = ANY($${paramIndex})`;
        params.push(query.types);
        paramIndex++;
      }
      
      if (query.feeds && query.feeds.length > 0) {
        sql += ` AND tf.id = ANY($${paramIndex})`;
        params.push(query.feeds);
        paramIndex++;
      }
      
      if (query.confidence_min) {
        sql += ` AND ti.confidence >= $${paramIndex}`;
        params.push(query.confidence_min);
        paramIndex++;
      }
      
      sql += ` ORDER BY ti.confidence DESC, ti.last_seen DESC`;
      
      if (query.limit) {
        sql += ` LIMIT $${paramIndex}`;
        params.push(query.limit);
      }
      
      const result = await databaseService.query(sql, params);
      
      const matches: ThreatIndicatorMatch[] = result.rows.map(row => ({
        indicator: {
          id: row.id,
          feedId: row.feed_id,
          type: row.type,
          value: row.value,
          confidence: row.confidence,
          severity: row.severity,
          tags: row.tags || [],
          malwareFamily: row.malware_family,
          threatType: row.threat_type,
          description: row.description,
          references: row.references || [],
          firstSeen: row.first_seen,
          lastSeen: row.last_seen,
          tlp: row.tlp,
          source: row.source,
          context: row.context || {},
          enrichment: query.include_enrichment ? row.enrichment : undefined
        },
        matchType: 'exact',
        relevanceScore: this.calculateRelevanceScore(row),
        feedName: row.feed_name
      }));
      
      const queryTime = Date.now() - startTime;
      
      logger.info(`Threat intelligence query completed: ${matches.length} matches in ${queryTime}ms`);
      
      return {
        query,
        matches,
        totalMatches: matches.length,
        queryTime,
        executedAt: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Threat intelligence query failed:', error);
      throw error;
    }
  }

  private async loadFeeds(): Promise<void> {
    try {
      const result = await databaseService.query(
        'SELECT * FROM threat_feeds ORDER BY created_at DESC'
      );
      
      for (const row of result.rows) {
        const feed: ThreatFeed = {
          id: row.id,
          name: row.name,
          provider: row.provider,
          status: row.status,
          lastSync: row.last_sync,
          totalIndicators: row.total_indicators || 0,
          newIndicators24h: row.new_indicators_24h || 0,
          confidence: row.confidence || 'medium',
          tags: row.tags || [],
          config: row.config || {},
          metrics: row.metrics || {
            totalQueries: 0,
            successfulQueries: 0,
            errorRate: 0,
            avgResponseTime: 0,
            uptime: 100
          },
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
        
        this.feeds.set(feed.id, feed);
      }
      
      logger.info(`Loaded ${this.feeds.size} threat feeds`);
    } catch (error) {
      // Table might not exist yet - that's okay for first run
      logger.warn('Could not load threat feeds (table may not exist yet)');
    }
  }

  private startSyncScheduler(): void {
    for (const feed of this.feeds.values()) {
      if (feed.status === 'active') {
        this.scheduleFeedSync(feed);
      }
    }
  }

  private scheduleFeedSync(feed: ThreatFeed): void {
    // Clear existing interval
    const existingInterval = this.syncIntervals.get(feed.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }
    
    // Schedule new sync
    const intervalMs = (feed.config.syncInterval || 60) * 60 * 1000; // Convert minutes to ms
    const interval = setInterval(() => {
      this.syncFeed(feed.id).catch(error => {
        logger.error(`Scheduled sync failed for feed ${feed.name}:`, error);
      });
    }, intervalMs);
    
    this.syncIntervals.set(feed.id, interval);
    
    logger.info(`Scheduled sync for feed ${feed.name} every ${feed.config.syncInterval || 60} minutes`);
  }

  private async testFeedConnection(feed: ThreatFeed): Promise<void> {
    // Basic connection test - implement specific logic per provider
    switch (feed.provider) {
      case 'misp':
        await this.testMispConnection(feed);
        break;
      case 'otx':
        await this.testOtxConnection(feed);
        break;
      case 'virustotal':
        await this.testVirusTotalConnection(feed);
        break;
      default:
        // For custom feeds, assume connection is valid
        break;
    }
  }

  private async testMispConnection(feed: ThreatFeed): Promise<void> {
    // Implementation for MISP connection test
    // This would make actual API call to verify connectivity
    logger.debug(`Testing MISP connection for ${feed.name}`);
  }

  private async testOtxConnection(feed: ThreatFeed): Promise<void> {
    // Implementation for AlienVault OTX connection test
    logger.debug(`Testing OTX connection for ${feed.name}`);
  }

  private async testVirusTotalConnection(feed: ThreatFeed): Promise<void> {
    // Implementation for VirusTotal connection test
    logger.debug(`Testing VirusTotal connection for ${feed.name}`);
  }

  private async fetchIndicatorsFromFeed(feed: ThreatFeed): Promise<ThreatIndicator[]> {
    // This would implement the actual fetching logic per provider
    // For now, return empty array as placeholder
    logger.debug(`Fetching indicators from ${feed.provider} feed: ${feed.name}`);
    return [];
  }

  private async storeIndicators(feedId: string, indicators: ThreatIndicator[]): Promise<number> {
    if (indicators.length === 0) {return 0;}
    
    try {
      // Bulk insert indicators
      const values = indicators.map(indicator => 
        `('${indicator.id}', '${feedId}', '${indicator.type}', '${indicator.value}', 
          ${indicator.confidence}, '${indicator.severity}', '${JSON.stringify(indicator.tags)}',
          '${indicator.firstSeen}', '${indicator.lastSeen}', '${indicator.tlp}',
          '${indicator.source}', '${JSON.stringify(indicator.context)}')`
      ).join(',');
      
      const sql = `
        INSERT INTO threat_indicators 
        (id, feed_id, type, value, confidence, severity, tags, first_seen, last_seen, tlp, source, context)
        VALUES ${values}
        ON CONFLICT (feed_id, type, value) 
        DO UPDATE SET 
          last_seen = EXCLUDED.last_seen,
          confidence = EXCLUDED.confidence,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await databaseService.query(sql);
      
      return indicators.length;
    } catch (error) {
      logger.error('Error storing threat indicators:', error);
      throw error;
    }
  }

  private async getNewIndicatorsCount(feedId: string, hours: number): Promise<number> {
    try {
      const result = await databaseService.query(
        `SELECT COUNT(*) as count FROM threat_indicators 
         WHERE feed_id = $1 AND first_seen >= NOW() - INTERVAL '${hours} hours'`,
        [feedId]
      );
      
      return parseInt(result.rows[0]?.count || '0');
    } catch (error) {
      logger.error('Error counting new indicators:', error);
      return 0;
    }
  }

  private async updateFeedInDatabase(feed: ThreatFeed): Promise<void> {
    await databaseService.query(
      `UPDATE threat_feeds SET 
       status = $1, last_sync = $2, total_indicators = $3, new_indicators_24h = $4,
       metrics = $5, updated_at = $6
       WHERE id = $7`,
      [
        feed.status,
        feed.lastSync,
        feed.totalIndicators,
        feed.newIndicators24h,
        JSON.stringify(feed.metrics),
        feed.updatedAt,
        feed.id
      ]
    );
  }

  private calculateRelevanceScore(indicator: any): number {
    // Simple relevance calculation - can be enhanced with ML
    let score = indicator.confidence;
    
    // Boost recent indicators
    const hoursSinceLastSeen = 
      (Date.now() - new Date(indicator.last_seen).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastSeen < 24) {score += 0.2;}
    
    // Boost high severity
    const severityBoost = {
      'critical': 0.3,
      'high': 0.2,
      'medium': 0.1,
      'low': 0.0,
      'info': -0.1
    };
    score += severityBoost[indicator.severity] || 0;
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  // Public methods for feed management
  async getFeeds(): Promise<ThreatFeed[]> {
    return Array.from(this.feeds.values());
  }

  async getFeed(feedId: string): Promise<ThreatFeed | null> {
    return this.feeds.get(feedId) || null;
  }

  async deactivateFeed(feedId: string): Promise<void> {
    const feed = this.feeds.get(feedId);
    if (!feed) {return;}
    
    feed.status = 'inactive';
    await this.updateFeedInDatabase(feed);
    
    // Clear sync interval
    const interval = this.syncIntervals.get(feedId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(feedId);
    }
    
    logger.info(`Deactivated threat feed: ${feed.name}`);
    this.emit('feedDeactivated', feed);
  }

  async deleteFeed(feedId: string): Promise<void> {
    await this.deactivateFeed(feedId);
    
    // Delete from database
    await databaseService.query('DELETE FROM threat_indicators WHERE feed_id = $1', [feedId]);
    await databaseService.query('DELETE FROM threat_feeds WHERE id = $1', [feedId]);
    
    this.feeds.delete(feedId);
    
    logger.info(`Deleted threat feed: ${feedId}`);
    this.emit('feedDeleted', feedId);
  }
}

export const threatIntelligenceService = new ThreatIntelligenceService();