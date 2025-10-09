import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';

import { siemIntegrationService } from '../../integrations/siem/SIEMIntegrationService';
import { authService, AuthenticatedRequest } from '../../shared/services/auth/AuthService';
import { databaseService } from '../../shared/services/database/DatabaseService';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Apply authentication to all routes
router.use(authService.authenticate());

// ==========================================
// INVESTIGATION CRUD OPERATIONS
// ==========================================

/**
 * @route GET /api/investigations
 * @desc Get user's investigations
 * @access Private
 */
router.get('/',
  [
    query('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
    query('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0')
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

      if (!req.user || !req.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { status, priority, limit = 50 } = req.query;
      
      const investigations = await databaseService.getInvestigationsByUser(
        req.user.id,
        req.organizationId,
        parseInt(limit as string)
      );

      // Filter by status and priority if provided
      let filteredInvestigations = investigations;
      
      if (status) {
        filteredInvestigations = filteredInvestigations.filter(inv => inv.status === status);
      }
      
      if (priority) {
        filteredInvestigations = filteredInvestigations.filter(inv => inv.priority === priority);
      }

      res.json({
        success: true,
        investigations: filteredInvestigations,
        total: filteredInvestigations.length
      });

    } catch (error) {
      logger.error('Get investigations error:', error);
      res.status(500).json({
        error: 'Failed to get investigations'
      });
    }
  }
);

/**
 * @route POST /api/investigations
 * @desc Create new investigation
 * @access Private
 */
router.post('/',
  authService.authorize('create', 'investigation'),
  [
    body('title').isLength({ min: 1, max: 255 }).withMessage('Title is required (max 255 chars)'),
    body('description').optional().isLength({ max: 2000 }).withMessage('Description too long (max 2000 chars)'),
    body('priority').isIn(['low', 'medium', 'high', 'critical']).withMessage('Valid priority required'),
    body('classification').optional().isLength({ max: 50 }).withMessage('Classification too long'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('sourceUrl').optional().isURL().withMessage('Source URL must be valid'),
    body('sourceType').optional().isIn(['url', 'text', 'file', 'api']).withMessage('Invalid source type')
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

      if (!req.user || !req.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const {
        title,
        description,
        priority,
        classification,
        tags = [],
        sourceUrl,
        sourceType,
        assignedTo
      } = req.body;

      const investigation = await databaseService.createInvestigation({
        organization_id: req.organizationId,
        created_by: req.user.id,
        assigned_to: assignedTo,
        title,
        description,
        priority,
        status: 'open',
        classification,
        tags,
        metadata: {},
        source_url: sourceUrl,
        source_type: sourceType
      });

      res.status(201).json({
        success: true,
        investigation
      });

    } catch (error) {
      logger.error('Create investigation error:', error);
      res.status(500).json({
        error: 'Failed to create investigation'
      });
    }
  }
);

/**
 * @route GET /api/investigations/:id
 * @desc Get specific investigation
 * @access Private
 */
router.get('/:id',
  authService.authorize('read', 'investigation'),
  [
    param('id').isUUID().withMessage('Invalid investigation ID')
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

      if (!req.user || !req.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;

      const investigation = await databaseService.getInvestigation(id, req.organizationId);

      if (!investigation) {
        return res.status(404).json({
          error: 'Investigation not found'
        });
      }

      // Get related data
      const indicators = await databaseService.getIndicatorsByInvestigation(id);

      res.json({
        success: true,
        investigation,
        indicators,
        indicatorCount: indicators.length
      });

    } catch (error) {
      logger.error('Get investigation error:', error);
      res.status(500).json({
        error: 'Failed to get investigation'
      });
    }
  }
);

/**
 * @route PUT /api/investigations/:id/status
 * @desc Update investigation status
 * @access Private
 */
router.put('/:id/status',
  authService.authorize('update', 'investigation'),
  [
    param('id').isUUID().withMessage('Invalid investigation ID'),
    body('status').isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Valid status required'),
    body('comment').optional().isLength({ max: 500 }).withMessage('Comment too long')
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

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const { status, comment } = req.body;

      await databaseService.updateInvestigationStatus(id, status, req.user.id);

      // Log status change as audit event
      await databaseService.logAudit({
        organization_id: req.user.organization_id,
        user_id: req.user.id,
        action: 'update_investigation_status',
        resource_type: 'investigation',
        resource_id: id,
        details: { 
          new_status: status, 
          comment,
          previous_status: req.body.previousStatus 
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Investigation status updated'
      });

    } catch (error) {
      logger.error('Update investigation status error:', error);
      res.status(500).json({
        error: 'Failed to update investigation status'
      });
    }
  }
);

// ==========================================
// IOC MANAGEMENT
// ==========================================

/**
 * @route POST /api/investigations/:id/indicators
 * @desc Add indicators to investigation
 * @access Private
 */
router.post('/:id/indicators',
  authService.authorize('create', 'indicator'),
  [
    param('id').isUUID().withMessage('Invalid investigation ID'),
    body('indicators').isArray({ min: 1 }).withMessage('At least one indicator required'),
    body('indicators.*.type').isLength({ min: 1 }).withMessage('Indicator type required'),
    body('indicators.*.value').isLength({ min: 1 }).withMessage('Indicator value required'),
    body('indicators.*.confidence').optional().isFloat({ min: 0, max: 1 }).withMessage('Confidence must be 0-1'),
    body('indicators.*.severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Valid severity required')
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

      if (!req.user || !req.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const { indicators } = req.body;

      // Verify investigation exists and user has access
      const investigation = await databaseService.getInvestigation(id, req.organizationId);
      if (!investigation) {
        return res.status(404).json({ error: 'Investigation not found' });
      }

      const createdIndicators = [];

      for (const indicatorData of indicators) {
        const indicator = await databaseService.createIndicator({
          organization_id: req.organizationId,
          investigation_id: id,
          type: indicatorData.type,
          value: indicatorData.value,
          context: indicatorData.context,
          confidence: indicatorData.confidence || 0.5,
          severity: indicatorData.severity,
          source: indicatorData.source || 'ThreatFlow',
          first_seen: new Date(),
          last_seen: new Date(),
          is_active: true,
          tags: indicatorData.tags || [],
          metadata: indicatorData.metadata || {}
        });

        createdIndicators.push(indicator);
      }

      res.status(201).json({
        success: true,
        indicators: createdIndicators,
        count: createdIndicators.length
      });

    } catch (error) {
      logger.error('Add indicators error:', error);
      res.status(500).json({
        error: 'Failed to add indicators'
      });
    }
  }
);

/**
 * @route GET /api/investigations/:id/indicators
 * @desc Get investigation indicators
 * @access Private
 */
router.get('/:id/indicators',
  authService.authorize('read', 'indicator'),
  [
    param('id').isUUID().withMessage('Invalid investigation ID'),
    query('type').optional().isLength({ min: 1 }).withMessage('Invalid type filter'),
    query('active').optional().isBoolean().withMessage('Active must be boolean')
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

      if (!req.user || !req.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const { type, active } = req.query;

      // Verify investigation exists and user has access
      const investigation = await databaseService.getInvestigation(id, req.organizationId);
      if (!investigation) {
        return res.status(404).json({ error: 'Investigation not found' });
      }

      let indicators = await databaseService.getIndicatorsByInvestigation(id);

      // Apply filters
      if (type) {
        indicators = indicators.filter(ind => ind.type === type);
      }

      if (active !== undefined) {
        const isActive = active === 'true';
        indicators = indicators.filter(ind => ind.is_active === isActive);
      }

      res.json({
        success: true,
        indicators,
        count: indicators.length
      });

    } catch (error) {
      logger.error('Get indicators error:', error);
      res.status(500).json({
        error: 'Failed to get indicators'
      });
    }
  }
);

// ==========================================
// SIEM CORRELATION
// ==========================================

/**
 * @route POST /api/investigations/:id/correlate
 * @desc Correlate investigation with SIEM alerts
 * @access Private
 */
router.post('/:id/correlate',
  authService.authorize('integrate', 'siem'),
  [
    param('id').isUUID().withMessage('Invalid investigation ID'),
    body('siemIntegrations').optional().isArray().withMessage('SIEM integrations must be array'),
    body('timeWindow').optional().isInt({ min: 1, max: 168 }).withMessage('Time window must be 1-168 hours')
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

      if (!req.user || !req.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const { siemIntegrations, timeWindow = 24 } = req.body;

      // Verify investigation exists and user has access
      const investigation = await databaseService.getInvestigation(id, req.organizationId);
      if (!investigation) {
        return res.status(404).json({ error: 'Investigation not found' });
      }

      // Get investigation indicators
      const indicators = await databaseService.getIndicatorsByInvestigation(id);

      if (indicators.length === 0) {
        return res.status(400).json({
          error: 'No indicators found for correlation'
        });
      }

      // Build IOC data for correlation
      const iocData = {
        indicators: indicators.map(ind => ({
          type: ind.type,
          value: ind.value,
          confidence: ind.confidence || 0.5,
          severity: ind.severity,
          context: ind.context,
          tags: ind.tags
        })),
        activities: [], // Would include IOAs if available
        metadata: {
          investigation_id: id,
          export_timestamp: new Date().toISOString(),
          tool: 'ThreatFlow',
          version: '1.0.0'
        }
      };

      // Initialize SIEM service for this organization
      await siemIntegrationService.initialize(req.organizationId);

      // Correlate with all SIEMs or specific ones
      const correlationResults = await siemIntegrationService.correlateWithAllSIEMs(iocData, id);

      // Log correlation activity
      await databaseService.logAudit({
        organization_id: req.organizationId,
        user_id: req.user.id,
        action: 'correlate_investigation',
        resource_type: 'investigation',
        resource_id: id,
        details: {
          indicator_count: indicators.length,
          siem_count: correlationResults.length,
          total_alerts: correlationResults.reduce((sum, result) => sum + result.correlatedAlerts.length, 0)
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      res.json({
        success: true,
        correlationResults,
        summary: {
          indicatorsAnalyzed: indicators.length,
          siemIntegrations: correlationResults.length,
          totalAlertsFound: correlationResults.reduce((sum, result) => sum + result.correlatedAlerts.length, 0),
          averageCorrelationScore: correlationResults.length > 0 
            ? correlationResults.reduce((sum, result) => sum + result.correlationScore, 0) / correlationResults.length 
            : 0
        }
      });

    } catch (error) {
      logger.error('Investigation correlation error:', error);
      res.status(500).json({
        error: 'Failed to correlate investigation with SIEM'
      });
    }
  }
);

// ==========================================
// EXPORT AND SHARING
// ==========================================

/**
 * @route POST /api/investigations/:id/export
 * @desc Export investigation data
 * @access Private
 */
router.post('/:id/export',
  authService.authorize('export', 'data'),
  [
    param('id').isUUID().withMessage('Invalid investigation ID'),
    body('format').isIn(['json', 'stix', 'pdf']).withMessage('Valid export format required'),
    body('includeIndicators').optional().isBoolean().withMessage('Include indicators must be boolean'),
    body('includeNotes').optional().isBoolean().withMessage('Include notes must be boolean')
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

      if (!req.user || !req.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const { format, includeIndicators = true, includeNotes = true } = req.body;

      // Verify investigation exists and user has access
      const investigation = await databaseService.getInvestigation(id, req.organizationId);
      if (!investigation) {
        return res.status(404).json({ error: 'Investigation not found' });
      }

      const exportData: any = {
        investigation,
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.id,
        format
      };

      if (includeIndicators) {
        const indicators = await databaseService.getIndicatorsByInvestigation(id);
        exportData.indicators = indicators;
      }

      // Log export activity
      await databaseService.logAudit({
        organization_id: req.organizationId,
        user_id: req.user.id,
        action: 'export_investigation',
        resource_type: 'investigation',
        resource_id: id,
        details: {
          format,
          include_indicators: includeIndicators,
          include_notes: includeNotes
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      // Set appropriate content type and filename
      let contentType = 'application/json';
      let filename = `investigation_${id}_${new Date().toISOString().split('T')[0]}.json`;

      if (format === 'stix') {
        // Convert to STIX format (implementation would go here)
        contentType = 'application/json';
        filename = filename.replace('.json', '.stix');
      } else if (format === 'pdf') {
        // Convert to PDF format (implementation would go here)
        contentType = 'application/pdf';
        filename = filename.replace('.json', '.pdf');
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      res.json({
        success: true,
        data: exportData,
        filename
      });

    } catch (error) {
      logger.error('Export investigation error:', error);
      res.status(500).json({
        error: 'Failed to export investigation'
      });
    }
  }
);

export default router;