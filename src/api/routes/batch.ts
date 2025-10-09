import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';

import { batchProcessingService } from '../../features/batch-processing/services/BatchProcessingService';
import { BatchJobType } from '../../features/batch-processing/types/BatchTypes';
import { LIMITS } from '../../shared/constants/AppConstants';
import { authMiddleware } from '../../shared/services/auth/AuthMiddleware';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: LIMITS.REQUEST.MAX_ARTICLE_SIZE,
    files: 100, // Maximum 100 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain', 'text/html', 'application/json'];
    const allowedExtensions = ['.pdf', '.txt', '.html', '.json', '.doc', '.docx'];
    
    const hasValidType = allowedTypes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    if (hasValidType || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported: PDF, TXT, HTML, JSON, DOC, DOCX'));
    }
  },
});

// Rate limiting for batch operations
const batchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 batch requests per windowMs
  message: 'Too many batch requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 API requests per minute
  message: 'Too many API requests, please try again later.',
});

/**
 * POST /api/batch/submit-bulk-analysis
 * Submit bulk document analysis job
 */
router.post('/submit-bulk-analysis',
  batchRateLimit,
  authMiddleware,
  upload.array('documents', 100),
  [
    body('aiProvider')
      .optional()
      .isIn(['claude', 'openai', 'ollama', 'openrouter'])
      .withMessage('Invalid AI provider'),
    body('analysisDepth')
      .optional()
      .isIn(['fast', 'standard', 'comprehensive'])
      .withMessage('Invalid analysis depth'),
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'critical'])
      .withMessage('Invalid priority level'),
    body('batchSize')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Batch size must be between 1 and 10'),
    body('enableDuplicateDetection')
      .optional()
      .isBoolean()
      .withMessage('enableDuplicateDetection must be boolean'),
    body('enableIOCExtraction')
      .optional()
      .isBoolean()
      .withMessage('enableIOCExtraction must be boolean'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be 1-50 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided',
        });
      }

      if (files.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 files allowed per batch',
        });
      }

      const options = {
        aiProvider: req.body.aiProvider || 'claude',
        analysisDepth: req.body.analysisDepth || 'standard',
        priority: req.body.priority || 'normal',
        batchSize: parseInt(req.body.batchSize) || 5,
        enableDuplicateDetection: req.body.enableDuplicateDetection !== false,
        enableIOCExtraction: req.body.enableIOCExtraction !== false,
        userId: req.user?.id,
        tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      };

      const jobId = await batchProcessingService.submitBulkDocumentAnalysis(
        files,
        options
      );

      res.json({
        success: true,
        jobId,
        message: `Batch job submitted with ${files.length} files`,
        estimatedDuration: Math.ceil(files.length / options.batchSize * 2), // minutes
      });

    } catch (error) {
      console.error('Bulk analysis submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit batch job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/batch/submit-url-analysis
 * Submit bulk URL analysis job
 */
router.post('/submit-url-analysis',
  batchRateLimit,
  authMiddleware,
  [
    body('urls')
      .isArray({ min: 1, max: 50 })
      .withMessage('URLs must be an array with 1-50 items'),
    body('urls.*')
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Each URL must be valid HTTP/HTTPS URL'),
    body('aiProvider')
      .optional()
      .isIn(['claude', 'openai', 'ollama', 'openrouter'])
      .withMessage('Invalid AI provider'),
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'critical'])
      .withMessage('Invalid priority level'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { urls, aiProvider = 'claude', priority = 'normal', tags = [] } = req.body;

      const documentSources = urls.map((url: string) => ({
        type: 'url' as const,
        location: url,
      }));

      const jobId = await batchProcessingService.submitJob(
        'bulk_document_analysis',
        {
          documents: {
            sources: documentSources,
            formats: ['html'],
            maxFileSize: LIMITS.REQUEST.MAX_ARTICLE_SIZE,
            concurrency: 3,
            aiProvider,
            analysisDepth: 'standard',
          },
          processing: {
            enableDuplicateDetection: true,
            enableIOCExtraction: true,
            enableEnrichment: true,
            confidenceThreshold: 0.7,
            batchSize: 5,
          },
          output: {
            format: 'json',
            destination: 'database',
            notifications: [],
          },
        },
        priority,
        {
          userId: req.user?.id,
          tags,
          description: `Bulk URL analysis of ${urls.length} URLs`,
        }
      );

      res.json({
        success: true,
        jobId,
        message: `URL analysis job submitted with ${urls.length} URLs`,
        estimatedDuration: Math.ceil(urls.length / 3 * 2), // minutes
      });

    } catch (error) {
      console.error('URL analysis submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit URL analysis job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/batch/jobs
 * Get batch jobs for the current user
 */
router.get('/jobs',
  apiRateLimit,
  authMiddleware,
  [
    query('status')
      .optional()
      .isIn(['queued', 'running', 'completed', 'failed', 'cancelled', 'paused'])
      .withMessage('Invalid status filter'),
    query('type')
      .optional()
      .isIn(['bulk_document_analysis', 'scheduled_feed_analysis', 'ioc_extraction_pipeline', 'duplicate_detection'])
      .withMessage('Invalid job type filter'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      let jobs = batchProcessingService.getUserJobs(userId);

      // Apply filters
      if (req.query.status) {
        jobs = jobs.filter(job => job.status === req.query.status);
      }

      if (req.query.type) {
        jobs = jobs.filter(job => job.type === req.query.type);
      }

      // Sort by creation date (newest first)
      jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply pagination
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const paginatedJobs = jobs.slice(offset, offset + limit);

      res.json({
        success: true,
        jobs: paginatedJobs,
        pagination: {
          total: jobs.length,
          limit,
          offset,
          hasMore: offset + limit < jobs.length,
        },
      });

    } catch (error) {
      console.error('Get jobs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch jobs',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/batch/jobs/:jobId
 * Get specific job details
 */
router.get('/jobs/:jobId',
  apiRateLimit,
  authMiddleware,
  [
    param('jobId')
      .isUUID()
      .withMessage('Invalid job ID format'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const job = batchProcessingService.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      // Check if user owns this job (unless admin)
      if (job.metadata.userId !== req.user?.id && !req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      res.json({
        success: true,
        job,
      });

    } catch (error) {
      console.error('Get job error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/batch/jobs/:jobId/cancel
 * Cancel a batch job
 */
router.post('/jobs/:jobId/cancel',
  apiRateLimit,
  authMiddleware,
  [
    param('jobId')
      .isUUID()
      .withMessage('Invalid job ID format'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const job = batchProcessingService.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      // Check if user owns this job (unless admin)
      if (job.metadata.userId !== req.user?.id && !req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      const cancelled = await batchProcessingService.cancelJob(req.params.jobId);
      if (!cancelled) {
        return res.status(400).json({
          success: false,
          error: 'Job cannot be cancelled in its current state',
        });
      }

      res.json({
        success: true,
        message: 'Job cancelled successfully',
      });

    } catch (error) {
      console.error('Cancel job error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/batch/metrics
 * Get batch processing metrics (admin only)
 */
router.get('/metrics',
  apiRateLimit,
  authMiddleware,
  async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const metrics = batchProcessingService.getMetrics();

      res.json({
        success: true,
        metrics,
      });

    } catch (error) {
      console.error('Get metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/batch/webhook
 * Webhook endpoint for external systems to submit batch jobs
 */
router.post('/webhook',
  rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // Limit to 50 webhook requests per 5 minutes
  }),
  [
    body('apiKey')
      .notEmpty()
      .withMessage('API key is required'),
    body('type')
      .isIn(['bulk_document_analysis', 'ioc_extraction_pipeline'])
      .withMessage('Invalid job type'),
    body('sources')
      .isArray({ min: 1 })
      .withMessage('Sources must be a non-empty array'),
    body('sources.*.type')
      .isIn(['url', 'file', 's3', 'ftp'])
      .withMessage('Invalid source type'),
    body('sources.*.location')
      .notEmpty()
      .withMessage('Source location is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      // TODO: Validate API key against database
      const { apiKey, type, sources, config = {} } = req.body;

      const jobId = await batchProcessingService.submitJob(
        type as BatchJobType,
        {
          documents: {
            sources,
            formats: ['pdf', 'txt', 'html', 'json'],
            maxFileSize: LIMITS.REQUEST.MAX_ARTICLE_SIZE,
            concurrency: config.concurrency || 3,
            aiProvider: config.aiProvider || 'claude',
            analysisDepth: config.analysisDepth || 'standard',
          },
          processing: {
            enableDuplicateDetection: config.enableDuplicateDetection !== false,
            enableIOCExtraction: config.enableIOCExtraction !== false,
            enableEnrichment: config.enableEnrichment !== false,
            confidenceThreshold: config.confidenceThreshold || 0.7,
            batchSize: config.batchSize || 5,
          },
          output: config.output || {
            format: 'json',
            destination: 'database',
            notifications: [],
          },
        },
        config.priority || 'normal',
        {
          tags: config.tags || ['webhook'],
          description: config.description || `Webhook job: ${type}`,
        }
      );

      res.json({
        success: true,
        jobId,
        message: 'Batch job submitted via webhook',
      });

    } catch (error) {
      console.error('Webhook submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;