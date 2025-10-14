/**
 * Threat Intelligence Enrichment API
 *
 * REST API endpoints for the new provider-based enrichment system
 * with aggregation, ML scoring, and provider accuracy tracking
 */

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';

import {
  initializeEnrichmentSystem,
  getEnrichmentOrchestrator,
  getProviderFactory,
} from '../../features/ioc-enrichment';
import { MLConfidenceScorer } from '../../features/ioc-enrichment/ml/MLConfidenceScorer';
import { ProviderAccuracyTracker } from '../../features/ioc-enrichment/ml/ProviderAccuracyTracker';
import { logger } from '../../shared/utils/logger';

const router = Router();

// Initialize enrichment system
initializeEnrichmentSystem();

// Initialize ML components
const mlScorer = new MLConfidenceScorer({ enabled: true });
const accuracyTracker = new ProviderAccuracyTracker({ enabled: true });

// Rate limiting
const enrichmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many enrichment requests, please try again later',
});

const batchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many batch requests, please try again later',
});

// Validation helpers
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// ============================================================================
// Core Enrichment Endpoints
// ============================================================================

/**
 * POST /api/threat-intelligence/enrich
 * Enrich a single IOC with consensus-based intelligence
 */
router.post(
  '/enrich',
  enrichmentLimiter,
  [
    body('ioc').isString().notEmpty().withMessage('IOC value is required'),
    body('iocType')
      .isIn(['ip', 'domain', 'url', 'hash', 'email', 'cve'])
      .withMessage('Invalid IOC type'),
    body('maxConcurrentProviders')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Max concurrent must be 1-10'),
    body('useCache').optional().isBoolean(),
    body('mlScoring').optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { ioc, iocType, maxConcurrentProviders, useCache = true, mlScoring = true } = req.body;

      logger.info(`TI API: Enriching ${iocType} ${ioc}`);

      // Get orchestrator with custom config
      const orchestrator = getEnrichmentOrchestrator({
        maxConcurrentProviders: maxConcurrentProviders || 4,
        cacheEnabled: useCache,
      });

      // Perform enrichment
      const { result, stats } = await orchestrator.enrich(ioc, iocType);

      // Apply ML scoring if enabled
      let mlPrediction = null;
      if (mlScoring) {
        mlPrediction = await mlScorer.score(result);
      }

      res.json({
        success: true,
        data: {
          ioc: result.ioc,
          iocType: result.iocType,
          consensus: result.consensus,
          metadata: result.metadata,
          relatedIndicators: result.relatedIndicators.slice(0, 20), // Limit for API response
          tags: result.tags.slice(0, 30),
          aggregation: result.aggregation,
          providerResults: result.providerResults.map(pr => ({
            provider: pr.provider,
            success: pr.success,
            verdict: pr.data?.reputation.verdict,
            score: pr.data?.reputation.score,
            confidence: pr.data?.reputation.confidence,
            responseTime: pr.responseTime,
            cached: pr.cached,
          })),
          mlScoring: mlPrediction,
          stats,
        },
      });
    } catch (error) {
      logger.error('TI Enrichment API error:', error);
      res.status(500).json({
        success: false,
        error: 'Enrichment failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/threat-intelligence/enrich/batch
 * Enrich multiple IOCs in batch
 */
router.post(
  '/enrich/batch',
  batchLimiter,
  [
    body('iocs')
      .isArray({ min: 1, max: 100 })
      .withMessage('IOCs must be an array of 1-100 items'),
    body('iocs.*.ioc').isString().notEmpty(),
    body('iocs.*.iocType').isIn(['ip', 'domain', 'url', 'hash', 'email', 'cve']),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { iocs } = req.body;

      logger.info(`TI API: Batch enriching ${iocs.length} IOCs`);

      const orchestrator = getEnrichmentOrchestrator();
      const results = await orchestrator.enrichBatch(iocs);

      // Calculate summary stats
      const successful = results.filter(r => r.result).length;
      const failed = results.filter(r => r.error).length;

      res.json({
        success: true,
        data: {
          results: results.map(r => ({
            ioc: r.ioc,
            iocType: r.iocType,
            success: !!r.result,
            verdict: r.result?.consensus.reputation.verdict,
            score: r.result?.consensus.reputation.score,
            confidence: r.result?.consensus.reputation.confidence,
            processingTime: r.stats?.processingTime,
            error: r.error,
          })),
          summary: {
            total: iocs.length,
            successful,
            failed,
            totalProcessingTime: results.reduce(
              (sum, r) => sum + (r.stats?.processingTime || 0),
              0
            ),
          },
        },
      });
    } catch (error) {
      logger.error('TI Batch enrichment error:', error);
      res.status(500).json({
        success: false,
        error: 'Batch enrichment failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ============================================================================
// Provider Management Endpoints
// ============================================================================

/**
 * GET /api/threat-intelligence/providers
 * Get all providers and their information
 */
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const factory = getProviderFactory();
    const providers = factory.getAllProviderInfo();

    res.json({
      success: true,
      data: {
        providers,
        totalProviders: providers.length,
        enabledProviders: providers.filter(p => p.enabled).length,
      },
    });
  } catch (error) {
    logger.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get providers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/threat-intelligence/providers/:providerName
 * Get detailed information about a specific provider
 */
router.get(
  '/providers/:providerName',
  param('providerName').isString().notEmpty(),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const factory = getProviderFactory();
      const info = factory.getProviderInfo(req.params.providerName as any);

      if (!info) {
        return res.status(404).json({
          success: false,
          error: 'Provider not found',
        });
      }

      // Get accuracy info if available
      const accuracy = accuracyTracker.getProviderAccuracy(req.params.providerName as any);

      res.json({
        success: true,
        data: {
          ...info,
          accuracy,
        },
      });
    } catch (error) {
      logger.error('Get provider error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get provider',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/threat-intelligence/providers/test
 * Test connectivity to all providers
 */
router.post('/providers/test', async (req: Request, res: Response) => {
  try {
    const factory = getProviderFactory();
    const results = await factory.testAllConnections();

    const connected = Object.entries(results).filter(([_, status]) => status).length;
    const total = Object.keys(results).length;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          connected,
          total,
          connectionRate: connected / total,
        },
      },
    });
  } catch (error) {
    logger.error('Test providers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test providers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/threat-intelligence/providers/statistics
 * Get provider performance statistics
 */
router.get('/providers/statistics', async (req: Request, res: Response) => {
  try {
    const factory = getProviderFactory();
    const stats = factory.getStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get provider stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/threat-intelligence/providers/recommendations
 * Get provider recommendations for an IOC type
 */
router.get(
  '/providers/recommendations',
  [query('iocType').isIn(['ip', 'domain', 'url', 'hash', 'email', 'cve'])],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const factory = getProviderFactory();
      const recommendations = factory.getRecommendedProviders(req.query.iocType as string);

      res.json({
        success: true,
        data: {
          iocType: req.query.iocType,
          recommendations,
        },
      });
    } catch (error) {
      logger.error('Get recommendations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// ============================================================================
// ML and Accuracy Tracking Endpoints
// ============================================================================

/**
 * POST /api/threat-intelligence/ml/feedback
 * Submit feedback for ML training
 */
router.post(
  '/ml/feedback',
  [
    body('ioc').isString().notEmpty(),
    body('iocType').isString().notEmpty(),
    body('actualVerdict').isIn(['benign', 'suspicious', 'malicious', 'unknown']),
    body('userFeedback').isIn(['correct', 'incorrect', 'uncertain']),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { ioc, iocType, actualVerdict, userFeedback, aggregatedResult } = req.body;

      logger.info(`TI API: ML feedback for ${ioc}: ${userFeedback}`);

      // Record feedback for accuracy tracking
      if (aggregatedResult) {
        await accuracyTracker.recordFeedback(aggregatedResult, actualVerdict);
      }

      // Add training data for ML
      if (aggregatedResult) {
        await mlScorer.addTrainingData(aggregatedResult, userFeedback);
      }

      res.json({
        success: true,
        data: {
          message: 'Feedback recorded successfully',
          ioc,
          actualVerdict,
          userFeedback,
        },
      });
    } catch (error) {
      logger.error('ML feedback error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record feedback',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/threat-intelligence/ml/stats
 * Get ML training statistics
 */
router.get('/ml/stats', async (req: Request, res: Response) => {
  try {
    const trainingStats = mlScorer.getTrainingStats();
    const featureImportance = mlScorer.getFeatureImportance();

    res.json({
      success: true,
      data: {
        training: trainingStats,
        featureImportance,
      },
    });
  } catch (error) {
    logger.error('Get ML stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ML statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/threat-intelligence/accuracy/summary
 * Get accuracy summary for all providers
 */
router.get('/accuracy/summary', async (req: Request, res: Response) => {
  try {
    const summary = accuracyTracker.getAccuracySummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Get accuracy summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get accuracy summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/threat-intelligence/accuracy/weights
 * Get recommended provider weights based on accuracy
 */
router.get('/accuracy/weights', async (req: Request, res: Response) => {
  try {
    const weights = accuracyTracker.getWeightRecommendations();

    res.json({
      success: true,
      data: {
        weights,
        description: 'Recommended provider weights based on historical accuracy',
      },
    });
  } catch (error) {
    logger.error('Get weight recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get weight recommendations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// Cache Management Endpoints
// ============================================================================

/**
 * GET /api/threat-intelligence/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const orchestrator = getEnrichmentOrchestrator();
    const stats = orchestrator.getCacheStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get cache stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/threat-intelligence/cache/clear
 * Clear the enrichment cache
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    const orchestrator = getEnrichmentOrchestrator();
    await orchestrator.clearCache();

    logger.info('TI API: Cache cleared');

    res.json({
      success: true,
      data: {
        message: 'Cache cleared successfully',
      },
    });
  } catch (error) {
    logger.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// Configuration Endpoints
// ============================================================================

/**
 * GET /api/threat-intelligence/config
 * Get current orchestration configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const orchestrator = getEnrichmentOrchestrator();
    const config = orchestrator.getConfig();

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Get config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/threat-intelligence/config
 * Update orchestration configuration
 */
router.patch(
  '/config',
  [
    body('maxConcurrentProviders')
      .optional()
      .isInt({ min: 1, max: 10 }),
    body('totalTimeout').optional().isInt({ min: 10000, max: 300000 }),
    body('cacheEnabled').optional().isBoolean(),
    body('cacheTTL').optional().isInt({ min: 60 }),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const orchestrator = getEnrichmentOrchestrator();
      orchestrator.updateConfig(req.body);

      logger.info('TI API: Configuration updated');

      res.json({
        success: true,
        data: {
          message: 'Configuration updated successfully',
          updatedFields: Object.keys(req.body),
        },
      });
    } catch (error) {
      logger.error('Update config error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Error handler
router.use((error: any, req: Request, res: Response, next: any) => {
  logger.error('TI API Error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
});

export default router;
