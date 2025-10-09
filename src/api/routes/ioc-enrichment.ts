import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, validationResult } from 'express-validator';

import { iocEnrichmentService } from '../../features/ioc-enrichment/services/IOCEnrichmentService';
import { multiProviderEnrichmentService } from '../../features/ioc-enrichment/services/MultiProviderEnrichmentService';
import {
  IOC,
  IOCType,
  EnrichmentProvider,
} from '../../features/ioc-enrichment/types/EnrichmentTypes';
import { logger } from '../../shared/utils/logger';

const router = Router();

// Rate limiting for enrichment endpoints
const enrichmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many enrichment requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const bulkEnrichmentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 bulk requests per hour
  message: 'Too many bulk enrichment requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const validateIOC = [
  body('value').isString().notEmpty().withMessage('IOC value is required'),
  body('type').isIn([
    'ip_address',
    'domain',
    'url',
    'file_hash',
    'email',
    'cve',
    'registry_key',
    'file_path',
    'user_agent',
    'certificate',
    'mutex',
    'process_name',
    'yara_rule',
  ]).withMessage('Invalid IOC type'),
  body('confidence').optional().isIn(['low', 'medium', 'high', 'verified']).withMessage('Invalid confidence level'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('source').optional().isString().withMessage('Source must be a string'),
];

const validateEnrichmentOptions = [
  body('providers').optional().isArray().withMessage('Providers must be an array'),
  body('forceRefresh').optional().isBoolean().withMessage('Force refresh must be a boolean'),
  body('maxConcurrency').optional().isInt({ min: 1, max: 10 }).withMessage('Max concurrency must be between 1 and 10'),
  body('includeRelationships').optional().isBoolean().withMessage('Include relationships must be a boolean'),
  body('includeTimeline').optional().isBoolean().withMessage('Include timeline must be a boolean'),
];

const validateBulkEnrichment = [
  body('iocs').isArray({ min: 1, max: 100 }).withMessage('IOCs array must contain 1-100 items'),
  body('iocs.*.value').isString().notEmpty().withMessage('Each IOC must have a value'),
  body('iocs.*.type').isIn([
    'ip_address',
    'domain',
    'url',
    'file_hash',
    'email',
    'cve',
    'registry_key',
    'file_path',
    'user_agent',
    'certificate',
    'mutex',
    'process_name',
    'yara_rule',
  ]).withMessage('Each IOC must have a valid type'),
  ...validateEnrichmentOptions,
];

// Helper function to handle validation errors
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

// Helper function to create IOC object
const createIOC = (data: any): IOC => ({
  id: `ioc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  value: data.value,
  type: data.type as IOCType,
  firstSeen: new Date(),
  lastSeen: new Date(),
  source: data.source || 'api',
  confidence: data.confidence || 'medium',
  tags: data.tags || [],
  metadata: data.metadata || {},
});

// Routes

/**
 * POST /api/ioc-enrichment/enrich
 * Enrich a single IOC with multi-provider intelligence
 */
router.post('/enrich',
  enrichmentLimiter,
  validateIOC,
  validateEnrichmentOptions,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const ioc = createIOC(req.body);
      const options = {
        providers: req.body.providers,
        forceRefresh: req.body.forceRefresh || false,
        maxConcurrency: req.body.maxConcurrency || 3,
        includeRelationships: req.body.includeRelationships || false,
        includeTimeline: req.body.includeTimeline || false,
      };

      logger.info(`API: Enriching IOC ${ioc.value} (${ioc.type})`);

      const results = await multiProviderEnrichmentService.enrichIOC(ioc, options);

      res.json({
        success: true,
        data: {
          ioc,
          results,
          enrichmentCount: results.length,
          successfulEnrichments: results.filter(r => r.success).length,
        },
      });

    } catch (error) {
      logger.error('IOC enrichment API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enrich IOC',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/ioc-enrichment/bulk-enrich
 * Enrich multiple IOCs in bulk
 */
router.post('/bulk-enrich',
  bulkEnrichmentLimiter,
  validateBulkEnrichment,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const iocs = req.body.iocs.map((iocData: any) => createIOC(iocData));
      const options = {
        providers: req.body.providers,
        forceRefresh: req.body.forceRefresh || false,
        maxConcurrency: req.body.maxConcurrency || 2, // Lower default for bulk
        includeRelationships: req.body.includeRelationships || false,
        includeTimeline: req.body.includeTimeline || false,
      };

      logger.info(`API: Starting bulk enrichment for ${iocs.length} IOCs`);

      const jobId = await multiProviderEnrichmentService.enrichIOCsBulk(iocs, options);

      res.json({
        success: true,
        data: {
          jobId,
          iocsCount: iocs.length,
          providers: options.providers,
          estimatedCompletionTime: `${Math.ceil(iocs.length * 2 / (options.maxConcurrency || 2))} minutes`,
        },
      });

    } catch (error) {
      logger.error('Bulk IOC enrichment API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start bulk enrichment',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/ioc-enrichment/job/:jobId
 * Get job status and results
 */
router.get('/job/:jobId',
  param('jobId').isString().notEmpty().withMessage('Job ID is required'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = multiProviderEnrichmentService.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      res.json({
        success: true,
        data: {
          job,
          progressPercentage: job.progress.total > 0 
            ? Math.round((job.progress.completed / job.progress.total) * 100)
            : 0,
        },
      });

    } catch (error) {
      logger.error('Get job API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve job',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/ioc-enrichment/job/:jobId/cancel
 * Cancel a running job
 */
router.post('/job/:jobId/cancel',
  param('jobId').isString().notEmpty().withMessage('Job ID is required'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const success = multiProviderEnrichmentService.cancelJob(jobId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Job not found or cannot be cancelled',
        });
      }

      logger.info(`API: Cancelled job ${jobId}`);

      res.json({
        success: true,
        data: {
          jobId,
          cancelled: true,
        },
      });

    } catch (error) {
      logger.error('Cancel job API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel job',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/ioc-enrichment/stats
 * Get enrichment service statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const multiProviderStats = multiProviderEnrichmentService.getStats();
    const config = multiProviderEnrichmentService.getConfig();

    res.json({
      success: true,
      data: {
        multiProvider: multiProviderStats,
        enabledProviders: Object.entries(config.providers)
          .filter(([_, config]) => config?.enabled)
          .map(([name, _]) => name),
        cacheEnabled: config.caching.enabled,
        cacheTtl: config.caching.ttl,
      },
    });

  } catch (error) {
    logger.error('Get stats API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/ioc-enrichment/enrich-with-picus
 * Enrich IOCs using the existing IOC enrichment service (Picus integration)
 */
router.post('/enrich-with-picus',
  enrichmentLimiter,
  [
    body('indicators').isArray({ min: 1, max: 50 }).withMessage('Indicators array must contain 1-50 items'),
    body('indicators.*.type').isString().notEmpty().withMessage('Each indicator must have a type'),
    body('indicators.*.value').isString().notEmpty().withMessage('Each indicator must have a value'),
    body('sources').isArray().withMessage('Sources must be an array'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
    body('organizationId').isString().notEmpty().withMessage('Organization ID is required'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const enrichmentRequest = {
        indicators: req.body.indicators,
        sources: req.body.sources || ['threat_intelligence', 'picus_security'],
        priority: req.body.priority || 'medium',
        organizationId: req.body.organizationId,
        requestId: req.body.requestId,
      };

      logger.info(`API: Enriching ${enrichmentRequest.indicators.length} indicators with Picus integration`);

      const result = await iocEnrichmentService.enrichIndicators(enrichmentRequest);

      res.json({
        success: true,
        data: result,
      });

    } catch (error) {
      logger.error('Picus IOC enrichment API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enrich indicators with Picus',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/ioc-enrichment/create-picus-threat
 * Create Picus threat from IOCs
 */
router.post('/create-picus-threat',
  [
    body('name').isString().notEmpty().withMessage('Threat name is required'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('indicators').isArray({ min: 1 }).withMessage('Indicators array is required'),
    body('indicators.*.type').isString().notEmpty().withMessage('Each indicator must have a type'),
    body('indicators.*.value').isString().notEmpty().withMessage('Each indicator must have a value'),
    body('mitreTechniques').optional().isArray().withMessage('MITRE techniques must be an array'),
    body('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      if (!iocEnrichmentService.isPicusConnected) {
        return res.status(503).json({
          success: false,
          error: 'Picus Security service not available',
        });
      }

      const threatRequest = {
        name: req.body.name,
        description: req.body.description,
        indicators: req.body.indicators,
        mitreTechniques: req.body.mitreTechniques,
        severity: req.body.severity,
      };

      logger.info(`API: Creating Picus threat: ${threatRequest.name}`);

      const threatId = await iocEnrichmentService.createPicusThreatFromIOCs(threatRequest);

      res.json({
        success: true,
        data: {
          threatId,
          name: threatRequest.name,
          indicatorsCount: threatRequest.indicators.length,
        },
      });

    } catch (error) {
      logger.error('Create Picus threat API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create Picus threat',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/ioc-enrichment/create-validation-action
 * Create Picus validation action
 */
router.post('/create-validation-action',
  [
    body('name').isString().notEmpty().withMessage('Action name is required'),
    body('threatId').isString().notEmpty().withMessage('Threat ID is required'),
    body('targetAgents').optional().isArray().withMessage('Target agents must be an array'),
    body('immediate').optional().isBoolean().withMessage('Immediate must be a boolean'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      if (!iocEnrichmentService.isPicusConnected) {
        return res.status(503).json({
          success: false,
          error: 'Picus Security service not available',
        });
      }

      const actionRequest = {
        name: req.body.name,
        threatId: req.body.threatId,
        targetAgents: req.body.targetAgents,
        immediate: req.body.immediate || false,
      };

      logger.info(`API: Creating Picus validation action: ${actionRequest.name}`);

      const actionId = await iocEnrichmentService.createPicusValidationAction(actionRequest);

      res.json({
        success: true,
        data: {
          actionId,
          name: actionRequest.name,
          threatId: actionRequest.threatId,
          immediate: actionRequest.immediate,
        },
      });

    } catch (error) {
      logger.error('Create Picus validation action API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create validation action',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/ioc-enrichment/providers
 * Get available enrichment providers and their status
 */
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const config = multiProviderEnrichmentService.getConfig();
    const providers = Object.entries(config.providers).map(([name, providerConfig]) => ({
      name,
      enabled: providerConfig?.enabled || false,
      supportedTypes: providerConfig?.supportedTypes || [],
      priority: providerConfig?.priority || 5,
      rateLimits: config.rateLimiting[name as EnrichmentProvider],
    }));

    res.json({
      success: true,
      data: {
        providers,
        picusConnected: iocEnrichmentService.isPicusConnected,
        totalProviders: providers.length,
        enabledProviders: providers.filter(p => p.enabled).length,
      },
    });

  } catch (error) {
    logger.error('Get providers API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve providers',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/ioc-enrichment/config
 * Update enrichment service configuration
 */
router.put('/config',
  [
    body('caching.enabled').optional().isBoolean().withMessage('Caching enabled must be a boolean'),
    body('caching.ttl').optional().isInt({ min: 60 }).withMessage('Cache TTL must be at least 60 seconds'),
    body('caching.maxSize').optional().isInt({ min: 100 }).withMessage('Cache max size must be at least 100'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const configUpdate = req.body;
      
      // Validate provider configurations if provided
      if (configUpdate.providers) {
        for (const [providerName, providerConfig] of Object.entries(configUpdate.providers)) {
          if (typeof providerConfig !== 'object' || providerConfig === null) {
            return res.status(400).json({
              success: false,
              error: `Invalid configuration for provider: ${providerName}`,
            });
          }
        }
      }

      multiProviderEnrichmentService.updateConfig(configUpdate);

      logger.info('API: Updated enrichment service configuration');

      res.json({
        success: true,
        data: {
          message: 'Configuration updated successfully',
          updatedFields: Object.keys(configUpdate),
        },
      });

    } catch (error) {
      logger.error('Update config API error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Error handler for this router
router.use((error: any, req: Request, res: Response, next: any) => {
  logger.error('IOC Enrichment API Error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
});

export default router;