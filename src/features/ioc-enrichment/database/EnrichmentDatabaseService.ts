/**
 * Enrichment Database Service
 *
 * Manages persistence of enrichment history, ML training data,
 * and provider accuracy tracking
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '../../../shared/utils/logger';
import { AggregatedIOC } from '../aggregation/AggregationEngine';
import { MLFeatures } from '../ml/MLConfidenceScorer';

export interface EnrichmentHistoryQuery {
  ioc?: string;
  iocType?: string;
  verdict?: string;
  minScore?: number;
  maxScore?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface EnrichmentHistoryRecord {
  id: number;
  ioc: string;
  iocType: string;
  consensusScore: number;
  consensusVerdict: string;
  consensusConfidence: number;
  processingTime: number;
  createdAt: Date;
}

export class EnrichmentDatabaseService {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    logger.info('Enrichment database service initialized');
  }

  /**
   * Store enrichment result in database
   */
  async storeEnrichment(
    result: AggregatedIOC,
    mlScoring?: {
      confidenceScore: number;
      reliabilityScore: number;
      recommendedAction: string;
    },
    stats?: {
      processingTime: number;
      successfulProviders: number;
      failedProviders: number;
      cachedResult: boolean;
    }
  ): Promise<number> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Insert main enrichment record
      const enrichmentResult = await client.query(
        `INSERT INTO ioc_enrichment_history (
          ioc, ioc_type,
          consensus_score, consensus_verdict, consensus_confidence, consensus_agreement,
          provider_count,
          ml_confidence_score, ml_reliability_score, ml_recommended_action,
          geolocation_country, geolocation_city,
          network_asn, network_organization, network_isp,
          processing_time, successful_providers, failed_providers, cached_result,
          full_result
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING id`,
        [
          result.ioc,
          result.iocType,
          result.consensus.reputation.score,
          result.consensus.reputation.verdict,
          result.consensus.reputation.confidence,
          result.consensus.agreement,
          result.consensus.providerCount,
          mlScoring?.confidenceScore || null,
          mlScoring?.reliabilityScore || null,
          mlScoring?.recommendedAction || null,
          result.metadata.geolocation?.country || null,
          result.metadata.geolocation?.city || null,
          result.metadata.network?.asn || null,
          result.metadata.network?.organization || null,
          result.metadata.network?.isp || null,
          stats?.processingTime || 0,
          stats?.successfulProviders || result.providerResults.filter(r => r.success).length,
          stats?.failedProviders || result.providerResults.filter(r => !r.success).length,
          stats?.cachedResult || false,
          JSON.stringify(result),
        ]
      );

      const enrichmentId = enrichmentResult.rows[0].id;

      // Insert provider results
      for (const pr of result.providerResults) {
        await client.query(
          `INSERT INTO provider_enrichment_results (
            enrichment_id, provider_name, success, verdict, score, confidence,
            response_time, cached, error_message
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            enrichmentId,
            pr.provider,
            pr.success,
            pr.data?.reputation.verdict || null,
            pr.data?.reputation.score || null,
            pr.data?.reputation.confidence || null,
            pr.responseTime,
            pr.cached,
            pr.error || null,
          ]
        );
      }

      // Insert threats
      for (const threat of result.metadata.threats) {
        await client.query(
          `INSERT INTO enrichment_threats (
            enrichment_id, threat_type, threat_name, confidence, sources
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            enrichmentId,
            threat.type,
            threat.name,
            threat.confidence,
            threat.sources,
          ]
        );
      }

      // Insert related indicators
      for (const indicator of result.relatedIndicators.slice(0, 50)) {
        await client.query(
          `INSERT INTO enrichment_related_indicators (
            enrichment_id, indicator_type, indicator_value, relationship,
            confidence, sources
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            enrichmentId,
            indicator.type,
            indicator.value,
            indicator.relationship,
            indicator.confidence,
            indicator.sources,
          ]
        );
      }

      // Insert tags
      for (const tag of result.tags.slice(0, 30)) {
        await client.query(
          `INSERT INTO enrichment_tags (
            enrichment_id, tag, count, sources
          ) VALUES ($1, $2, $3, $4)`,
          [enrichmentId, tag.tag, tag.count, tag.sources]
        );
      }

      await client.query('COMMIT');

      logger.info(`Stored enrichment ${enrichmentId} for ${result.iocType} ${result.ioc}`);

      return enrichmentId;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to store enrichment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Store ML training data
   */
  async storeMLTrainingData(
    enrichmentId: number | null,
    ioc: string,
    iocType: string,
    features: MLFeatures,
    actualVerdict: string,
    userFeedback: string
  ): Promise<number> {
    const result = await this.pool.query(
      `INSERT INTO ml_training_data (
        enrichment_id, ioc, ioc_type,
        provider_agreement, verdict_consistency, score_variance,
        highest_confidence, lowest_confidence, avg_confidence,
        metadata_completeness, related_indicator_count, threat_count, tag_count,
        provider_count, high_trust_providers,
        actual_verdict, user_feedback, features
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id`,
      [
        enrichmentId,
        ioc,
        iocType,
        features.providerAgreement,
        features.verdictConsistency,
        features.scoreVariance,
        features.highestConfidence,
        features.lowestConfidence,
        features.avgConfidence,
        features.metadataCompleteness,
        features.relatedIndicatorCount,
        features.threatCount,
        features.tagCount,
        features.providerCount,
        features.highTrustProviders,
        actualVerdict,
        userFeedback,
        JSON.stringify(features),
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Store provider accuracy feedback
   */
  async storeProviderAccuracy(
    providerName: string,
    ioc: string,
    iocType: string,
    predictedVerdict: string,
    actualVerdict: string,
    confidence: number,
    correct: boolean
  ): Promise<number> {
    const result = await this.pool.query(
      `INSERT INTO provider_accuracy_tracking (
        provider_name, ioc, ioc_type, predicted_verdict, actual_verdict,
        confidence, correct
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [providerName, ioc, iocType, predictedVerdict, actualVerdict, confidence, correct]
    );

    return result.rows[0].id;
  }

  /**
   * Query enrichment history
   */
  async queryEnrichments(query: EnrichmentHistoryQuery): Promise<EnrichmentHistoryRecord[]> {
    let sql = 'SELECT * FROM ioc_enrichment_history WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (query.ioc) {
      sql += ` AND ioc = $${paramIndex++}`;
      params.push(query.ioc);
    }

    if (query.iocType) {
      sql += ` AND ioc_type = $${paramIndex++}`;
      params.push(query.iocType);
    }

    if (query.verdict) {
      sql += ` AND consensus_verdict = $${paramIndex++}`;
      params.push(query.verdict);
    }

    if (query.minScore !== undefined) {
      sql += ` AND consensus_score >= $${paramIndex++}`;
      params.push(query.minScore);
    }

    if (query.maxScore !== undefined) {
      sql += ` AND consensus_score <= $${paramIndex++}`;
      params.push(query.maxScore);
    }

    if (query.startDate) {
      sql += ` AND created_at >= $${paramIndex++}`;
      params.push(query.startDate);
    }

    if (query.endDate) {
      sql += ` AND created_at <= $${paramIndex++}`;
      params.push(query.endDate);
    }

    sql += ' ORDER BY created_at DESC';

    if (query.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(query.offset);
    }

    const result = await this.pool.query(sql, params);

    return result.rows.map(row => ({
      id: row.id,
      ioc: row.ioc,
      iocType: row.ioc_type,
      consensusScore: row.consensus_score,
      consensusVerdict: row.consensus_verdict,
      consensusConfidence: row.consensus_confidence,
      processingTime: row.processing_time,
      createdAt: row.created_at,
    }));
  }

  /**
   * Get enrichment by ID with all related data
   */
  async getEnrichmentById(id: number): Promise<AggregatedIOC | null> {
    const result = await this.pool.query(
      'SELECT full_result FROM ioc_enrichment_history WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].full_result;
  }

  /**
   * Get provider performance statistics
   */
  async getProviderStatistics(): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM provider_statistics ORDER BY accuracy DESC'
    );

    return result.rows;
  }

  /**
   * Get enrichment statistics
   */
  async getEnrichmentStatistics(days: number = 30): Promise<any> {
    const result = await this.pool.query(
      `SELECT
        COUNT(*) as total_enrichments,
        COUNT(DISTINCT ioc) as unique_iocs,
        COUNT(*) FILTER (WHERE consensus_verdict = 'malicious') as malicious_count,
        COUNT(*) FILTER (WHERE consensus_verdict = 'suspicious') as suspicious_count,
        COUNT(*) FILTER (WHERE consensus_verdict = 'benign') as benign_count,
        COUNT(*) FILTER (WHERE consensus_verdict = 'unknown') as unknown_count,
        AVG(consensus_score) as avg_score,
        AVG(consensus_confidence) as avg_confidence,
        AVG(processing_time) as avg_processing_time,
        COUNT(*) FILTER (WHERE cached_result = true) as cached_count
      FROM ioc_enrichment_history
      WHERE created_at >= NOW() - $1::INTERVAL`,
      [`${days} days`]
    );

    return result.rows[0];
  }

  /**
   * Get most common threats
   */
  async getMostCommonThreats(limit: number = 10): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM most_common_threats LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * Clean up old data
   */
  async cleanupOldData(daysToKeep: number = 90): Promise<number> {
    const result = await this.pool.query(
      'SELECT cleanup_old_enrichment_data($1)',
      [daysToKeep]
    );

    const deletedCount = result.rows[0].cleanup_old_enrichment_data;
    logger.info(`Cleaned up ${deletedCount} old enrichment records`);

    return deletedCount;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }
}
