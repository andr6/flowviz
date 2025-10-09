import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

import { iocEnrichmentService } from '../../features/ioc-enrichment/services/IOCEnrichmentService.js';
import { authService, AuthenticatedRequest } from '../../shared/services/auth/AuthService.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Rate limiting for Picus API endpoints
const picusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window per IP
  message: 'Too many Picus API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// PICUS THREAT MANAGEMENT ENDPOINTS
// ==========================================

/**
 * @route POST /api/picus/threats/from-iocs
 * @desc Create a new Picus threat from IOCs/IOAs
 * @access Private (analyst, senior_analyst, team_lead, admin)
 */
router.post('/threats/from-iocs',
  picusLimiter,
  authService.authenticate(),
  authService.authorize('create', 'threat'),
  [
    body('name').isLength({ min: 1, max: 255 }).withMessage('Threat name is required (1-255 characters)'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    body('indicators').isArray({ min: 1 }).withMessage('At least one indicator is required'),
    body('indicators.*.type').isIn([
      'ip-addr', 'domain-name', 'url', 'file-hash-md5', 'file-hash-sha1', 'file-hash-sha256',
      'email-addr', 'file-path', 'registry-key', 'process-name', 'mutex'
    ]).withMessage('Invalid indicator type'),
    body('indicators.*.value').isLength({ min: 1 }).withMessage('Indicator value is required'),
    body('indicators.*.confidence').optional().isFloat({ min: 0, max: 1 }).withMessage('Confidence must be between 0 and 1'),
    body('mitreTechniques').optional().isArray().withMessage('MITRE techniques must be an array'),
    body('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
    body('tags').optional().isArray().withMessage('Tags must be an array')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      if (!iocEnrichmentService.isPicusConnected) {
        return res.status(503).json({
          error: 'Picus Security service not available',
          details: 'Picus integration is not configured or not connected'
        });
      }

      const { name, description, indicators, mitreTechniques, severity, tags } = req.body;

      logger.info(`Creating Picus threat from IOCs: ${name}`, {
        user: req.user?.id,
        indicatorCount: indicators.length
      });

      const threatId = await iocEnrichmentService.createPicusThreatFromIOCs({
        name,
        description,
        indicators,
        mitreTechniques,
        severity: severity || 'medium'
      });

      if (!threatId) {
        return res.status(500).json({
          error: 'Failed to create Picus threat',
          details: 'Threat creation returned null ID'
        });
      }

      res.status(201).json({
        success: true,
        threatId,
        message: 'Picus threat created successfully',
        indicators_processed: indicators.length
      });

    } catch (error) {
      logger.error('Error creating Picus threat from IOCs:', error);
      res.status(500).json({
        error: 'Failed to create Picus threat',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route POST /api/picus/actions/validation
 * @desc Create a validation action for threat testing
 * @access Private (senior_analyst, team_lead, admin)
 */
router.post('/actions/validation',
  picusLimiter,
  authService.authenticate(),
  authService.authorize('create', 'action'),
  [
    body('name').isLength({ min: 1, max: 255 }).withMessage('Action name is required (1-255 characters)'),
    body('threatId').isLength({ min: 1 }).withMessage('Threat ID is required'),
    body('targetAgents').optional().isArray().withMessage('Target agents must be an array'),
    body('immediate').optional().isBoolean().withMessage('Immediate flag must be boolean'),
    body('simulationMode').optional().isIn(['safe', 'live']).withMessage('Simulation mode must be safe or live'),
    body('notifyOnCompletion').optional().isBoolean().withMessage('Notification flag must be boolean')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      if (!iocEnrichmentService.isPicusConnected) {
        return res.status(503).json({
          error: 'Picus Security service not available',
          details: 'Picus integration is not configured or not connected'
        });
      }

      const { name, threatId, targetAgents, immediate, simulationMode, notifyOnCompletion } = req.body;

      logger.info(`Creating Picus validation action: ${name}`, {
        user: req.user?.id,
        threatId,
        immediate: immediate || false
      });

      const actionId = await iocEnrichmentService.createPicusValidationAction({
        name,
        threatId,
        targetAgents,
        immediate: immediate || false
      });

      if (!actionId) {
        return res.status(500).json({
          error: 'Failed to create Picus validation action',
          details: 'Action creation returned null ID'
        });
      }

      res.status(201).json({
        success: true,
        actionId,
        message: 'Picus validation action created successfully',
        scheduled: immediate ? 'immediate' : 'delayed'
      });

    } catch (error) {
      logger.error('Error creating Picus validation action:', error);
      res.status(500).json({
        error: 'Failed to create validation action',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route POST /api/picus/threats/from-investigation
 * @desc Create Picus threat and validation from investigation IOCs
 * @access Private (analyst, senior_analyst, team_lead, admin)
 */
router.post('/threats/from-investigation',
  picusLimiter,
  authService.authenticate(),
  authService.authorize('create', 'threat'),
  [
    body('investigationId').isUUID().withMessage('Valid investigation ID is required'),
    body('threatName').isLength({ min: 1, max: 255 }).withMessage('Threat name is required'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    body('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
    body('createValidationAction').optional().isBoolean().withMessage('Create validation flag must be boolean'),
    body('targetAgents').optional().isArray().withMessage('Target agents must be an array'),
    body('executeImmediately').optional().isBoolean().withMessage('Execute immediately flag must be boolean')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      if (!iocEnrichmentService.isPicusConnected) {
        return res.status(503).json({
          error: 'Picus Security service not available',
          details: 'Picus integration is not configured or not connected'
        });
      }

      const { 
        investigationId, 
        threatName, 
        description, 
        severity, 
        createValidationAction, 
        targetAgents, 
        executeImmediately 
      } = req.body;

      // TODO: Get investigation IOCs from database
      // For now, return placeholder response
      
      logger.info(`Creating Picus threat from investigation: ${investigationId}`, {
        user: req.user?.id,
        threatName
      });

      // Placeholder IOCs - in real implementation, these would come from the investigation
      const mockIOCs = [
        { type: 'ip-addr', value: '192.168.1.100', context: 'C2 server communication' },
        { type: 'domain-name', value: 'malicious-domain.com', context: 'Command and control' },
        { type: 'file-hash-sha256', value: 'abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234', context: 'Malware sample' }
      ];

      const threatId = await iocEnrichmentService.createPicusThreatFromIOCs({
        name: threatName,
        description: description || `Threat created from ThreatFlow investigation ${investigationId}`,
        indicators: mockIOCs,
        severity: severity || 'medium'
      });

      let actionId = null;
      if (createValidationAction && threatId) {
        try {
          actionId = await iocEnrichmentService.createPicusValidationAction({
            name: `Validation - ${threatName}`,
            threatId,
            targetAgents,
            immediate: executeImmediately || false
          });
        } catch (actionError) {
          logger.warn('Failed to create validation action, but threat was created:', actionError);
        }
      }

      res.status(201).json({
        success: true,
        threatId,
        actionId,
        message: 'Picus threat created from investigation',
        indicators_processed: mockIOCs.length,
        validation_action_created: !!actionId
      });

    } catch (error) {
      logger.error('Error creating Picus threat from investigation:', error);
      res.status(500).json({
        error: 'Failed to create threat from investigation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// ==========================================
// IOC ENRICHMENT ENDPOINTS
// ==========================================

/**
 * @route POST /api/picus/enrich/iocs
 * @desc Enrich IOCs using multiple sources including Picus
 * @access Private (analyst, senior_analyst, team_lead, admin)
 */
router.post('/enrich/iocs',
  picusLimiter,
  authService.authenticate(),
  authService.authorize('read', 'threat_intelligence'),
  [
    body('indicators').isArray({ min: 1, max: 100 }).withMessage('1-100 indicators required'),
    body('indicators.*.type').isIn([
      'ip-addr', 'domain-name', 'url', 'file-hash-md5', 'file-hash-sha1', 'file-hash-sha256',
      'email-addr', 'file-path', 'registry-key', 'process-name', 'mutex'
    ]).withMessage('Invalid indicator type'),
    body('indicators.*.value').isLength({ min: 1 }).withMessage('Indicator value is required'),
    body('sources').optional().isArray().withMessage('Sources must be an array'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority level')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { indicators, sources, priority } = req.body;
      const defaultSources = ['threat_intelligence'];
      
      // Add Picus if available and not explicitly excluded
      if (iocEnrichmentService.isPicusConnected && !sources?.includes('picus_security')) {
        defaultSources.push('picus_security');
      }

      const enrichmentSources = sources || defaultSources;

      logger.info(`Enriching ${indicators.length} IOCs with sources: ${enrichmentSources.join(', ')}`, {
        user: req.user?.id,
        organizationId: req.organizationId
      });

      const enrichmentResult = await iocEnrichmentService.enrichIndicators({
        indicators,
        sources: enrichmentSources,
        priority: priority || 'medium',
        organizationId: req.organizationId!
      });

      res.json({
        success: true,
        ...enrichmentResult,
        sources_used: enrichmentSources,
        picus_available: iocEnrichmentService.isPicusConnected
      });

    } catch (error) {
      logger.error('Error enriching IOCs:', error);
      res.status(500).json({
        error: 'IOC enrichment failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route GET /api/picus/status
 * @desc Get Picus integration status and capabilities
 * @access Private (all authenticated users)
 */
router.get('/status',
  authService.authenticate(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isPicusConnected = iocEnrichmentService.isPicusConnected;

      res.json({
        success: true,
        status: {
          connected: isPicusConnected,
          service_name: 'Picus Security',
          capabilities: isPicusConnected ? [
            'threat_creation',
            'validation_actions',
            'ioc_enrichment',
            'threat_simulation',
            'security_validation'
          ] : [],
          last_check: new Date().toISOString(),
          integration_version: '1.0.0'
        }
      });

    } catch (error) {
      logger.error('Error getting Picus status:', error);
      res.status(500).json({
        error: 'Failed to get Picus status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// ==========================================
// BATCH OPERATIONS
// ==========================================

/**
 * @route POST /api/picus/batch/enrich-and-validate
 * @desc Batch enrich IOCs and create validation actions
 * @access Private (senior_analyst, team_lead, admin)
 */
router.post('/batch/enrich-and-validate',
  picusLimiter,
  authService.authenticate(),
  authService.authorize('create', 'action'),
  [
    body('batches').isArray({ min: 1, max: 10 }).withMessage('1-10 batches allowed'),
    body('batches.*.name').isLength({ min: 1 }).withMessage('Batch name is required'),
    body('batches.*.indicators').isArray({ min: 1 }).withMessage('Each batch must have indicators'),
    body('batches.*.severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
    body('defaultTargetAgents').optional().isArray().withMessage('Default target agents must be an array'),
    body('executeImmediately').optional().isBoolean().withMessage('Execute immediately flag must be boolean')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      if (!iocEnrichmentService.isPicusConnected) {
        return res.status(503).json({
          error: 'Picus Security service not available',
          details: 'Picus integration is not configured or not connected'
        });
      }

      const { batches, defaultTargetAgents, executeImmediately } = req.body;

      logger.info(`Processing ${batches.length} IOC batches for enrichment and validation`, {
        user: req.user?.id,
        organizationId: req.organizationId
      });

      const results = [];

      for (const batch of batches) {
        try {
          // Enrich IOCs first
          const enrichmentResult = await iocEnrichmentService.enrichIndicators({
            indicators: batch.indicators,
            sources: ['threat_intelligence', 'picus_security'],
            priority: 'high',
            organizationId: req.organizationId!
          });

          // Create threat from enriched IOCs
          const threatId = await iocEnrichmentService.createPicusThreatFromIOCs({
            name: batch.name,
            description: `Batch threat validation: ${batch.name}`,
            indicators: batch.indicators,
            severity: batch.severity || 'medium'
          });

          let actionId = null;
          if (threatId) {
            // Create validation action
            actionId = await iocEnrichmentService.createPicusValidationAction({
              name: `Batch Validation - ${batch.name}`,
              threatId,
              targetAgents: defaultTargetAgents,
              immediate: executeImmediately || false
            });
          }

          results.push({
            batchName: batch.name,
            success: true,
            threatId,
            actionId,
            enrichmentRequestId: enrichmentResult.requestId,
            indicatorsProcessed: batch.indicators.length,
            maliciousIndicators: enrichmentResult.summary.maliciousIndicators,
            riskScore: enrichmentResult.summary.avgRiskScore
          });

        } catch (batchError) {
          logger.error(`Error processing batch ${batch.name}:`, batchError);
          results.push({
            batchName: batch.name,
            success: false,
            error: batchError instanceof Error ? batchError.message : 'Unknown error',
            indicatorsProcessed: 0
          });
        }
      }

      const successfulBatches = results.filter(r => r.success).length;

      res.json({
        success: successfulBatches > 0,
        message: `Processed ${results.length} batches, ${successfulBatches} successful`,
        results,
        summary: {
          total_batches: results.length,
          successful_batches: successfulBatches,
          failed_batches: results.length - successfulBatches,
          total_indicators: results.reduce((sum, r) => sum + r.indicatorsProcessed, 0)
        }
      });

    } catch (error) {
      logger.error('Error in batch enrich and validate:', error);
      res.status(500).json({
        error: 'Batch operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;