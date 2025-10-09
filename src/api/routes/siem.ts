import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';

import { SIEMConfig } from '../../integrations/siem/base-siem-connector';
import { siemIntegrationService } from '../../integrations/siem/SIEMIntegrationService';
import { authService, AuthenticatedRequest } from '../../shared/services/auth/AuthService';
import { databaseService } from '../../shared/services/database/DatabaseService';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Apply authentication to all routes
router.use(authService.authenticate());

// ==========================================
// SIEM INTEGRATION MANAGEMENT
// ==========================================

/**
 * @route GET /api/siem/integrations
 * @desc Get organization's SIEM integrations
 * @access Private (team_lead, admin)
 */
router.get('/integrations',
  authService.requireRole(['team_lead', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || !req.organizationId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await siemIntegrationService.initialize(req.organizationId);
      const integrationStatuses = await siemIntegrationService.getIntegrationStatus();

      res.json({
        success: true,
        integrations: Object.values(integrationStatuses),
        count: Object.keys(integrationStatuses).length
      });

    } catch (error) {
      logger.error('Get SIEM integrations error:', error);
      res.status(500).json({
        error: 'Failed to get SIEM integrations'
      });
    }
  }
);

/**
 * @route POST /api/siem/integrations
 * @desc Add new SIEM integration
 * @access Private (admin)
 */
router.post('/integrations',
  authService.requireRole('admin'),
  [
    body('name').isLength({ min: 1, max: 255 }).withMessage('Name is required (max 255 chars)'),
    body('type').isIn(['splunk', 'qradar', 'sentinel', 'elastic', 'chronicle']).withMessage('Valid SIEM type required'),
    body('baseUrl').isURL().withMessage('Valid base URL required'),
    body('authentication.type').isIn(['api_key', 'basic', 'oauth', 'token']).withMessage('Valid auth type required'),
    body('authentication.credentials').isObject().withMessage('Authentication credentials required'),
    body('settings').optional().isObject().withMessage('Settings must be an object')
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

      const { name, type, baseUrl, authentication, settings = {} } = req.body;

      const siemConfig: SIEMConfig = {
        id: `${req.organizationId}_${type}_${Date.now()}`,
        name,
        type,
        baseUrl,
        authentication,
        settings,
        isActive: true
      };

      await siemIntegrationService.initialize(req.organizationId);
      await siemIntegrationService.addIntegration(siemConfig);

      // Log integration creation
      await databaseService.logAudit({
        organization_id: req.organizationId,
        user_id: req.user.id,
        action: 'create_siem_integration',
        resource_type: 'siem_integration',
        resource_id: siemConfig.id,
        details: {
          name,
          type,
          baseUrl: baseUrl.replace(/\/+$/, '') // Remove trailing slashes for logging
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        integration: {
          id: siemConfig.id,
          name: siemConfig.name,
          type: siemConfig.type,
          isActive: siemConfig.isActive
        }
      });

    } catch (error) {
      logger.error('Add SIEM integration error:', error);
      res.status(500).json({
        error: 'Failed to add SIEM integration'
      });
    }
  }
);

/**
 * @route GET /api/siem/integrations/:id/test
 * @desc Test SIEM integration connection
 * @access Private (team_lead, admin)
 */
router.get('/integrations/:id/test',
  authService.requireRole(['team_lead', 'admin']),
  [
    param('id').isLength({ min: 1 }).withMessage('Integration ID required')
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

      await siemIntegrationService.initialize(req.organizationId);
      const status = await siemIntegrationService.getIntegrationStatus(id);

      if (!status[id]) {
        return res.status(404).json({
          error: 'SIEM integration not found'
        });
      }

      res.json({
        success: true,
        connectionStatus: status[id].lastHealthCheck,
        testedAt: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Test SIEM integration error:', error);
      res.status(500).json({
        error: 'Failed to test SIEM integration'
      });
    }
  }
);

/**
 * @route PUT /api/siem/integrations/:id
 * @desc Update SIEM integration
 * @access Private (admin)
 */
router.put('/integrations/:id',
  authService.requireRole('admin'),
  [
    param('id').isLength({ min: 1 }).withMessage('Integration ID required'),
    body('name').optional().isLength({ min: 1, max: 255 }).withMessage('Name max 255 chars'),
    body('baseUrl').optional().isURL().withMessage('Valid base URL required'),
    body('authentication').optional().isObject().withMessage('Authentication must be an object'),
    body('settings').optional().isObject().withMessage('Settings must be an object'),
    body('isActive').optional().isBoolean().withMessage('IsActive must be boolean')
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
      const updates = req.body;

      await siemIntegrationService.initialize(req.organizationId);
      await siemIntegrationService.updateIntegration(id, updates);

      // Log integration update
      await databaseService.logAudit({
        organization_id: req.organizationId,
        user_id: req.user.id,
        action: 'update_siem_integration',
        resource_type: 'siem_integration',
        resource_id: id,
        details: updates,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'SIEM integration updated successfully'
      });

    } catch (error) {
      logger.error('Update SIEM integration error:', error);
      res.status(500).json({
        error: 'Failed to update SIEM integration'
      });
    }
  }
);

/**
 * @route DELETE /api/siem/integrations/:id
 * @desc Remove SIEM integration
 * @access Private (admin)
 */
router.delete('/integrations/:id',
  authService.requireRole('admin'),
  [
    param('id').isLength({ min: 1 }).withMessage('Integration ID required')
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

      await siemIntegrationService.initialize(req.organizationId);
      await siemIntegrationService.removeIntegration(id);

      // Log integration removal
      await databaseService.logAudit({
        organization_id: req.organizationId,
        user_id: req.user.id,
        action: 'delete_siem_integration',
        resource_type: 'siem_integration',
        resource_id: id,
        details: {},
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'SIEM integration removed successfully'
      });

    } catch (error) {
      logger.error('Remove SIEM integration error:', error);
      res.status(500).json({
        error: 'Failed to remove SIEM integration'
      });
    }
  }
);

// ==========================================
// THREAT CORRELATION
// ==========================================

/**
 * @route POST /api/siem/correlate
 * @desc Correlate IOCs with SIEM data
 * @access Private
 */
router.post('/correlate',
  authService.authorize('integrate', 'siem'),
  [
    body('indicators').isArray({ min: 1 }).withMessage('At least one indicator required'),
    body('indicators.*.type').isLength({ min: 1 }).withMessage('Indicator type required'),
    body('indicators.*.value').isLength({ min: 1 }).withMessage('Indicator value required'),
    body('timeWindow').optional().isInt({ min: 1, max: 168 }).withMessage('Time window must be 1-168 hours'),
    body('integrations').optional().isArray().withMessage('Integrations must be array')
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

      const { indicators, timeWindow = 24, integrations } = req.body;

      const iocData = {
        indicators: indicators.map((ind: any) => ({
          type: ind.type,
          value: ind.value,
          confidence: ind.confidence || 0.5,
          severity: ind.severity || 'medium',
          context: ind.context,
          tags: ind.tags || []
        })),
        activities: [],
        metadata: {
          export_timestamp: new Date().toISOString(),
          tool: 'ThreatFlow',
          version: '1.0.0'
        }
      };

      await siemIntegrationService.initialize(req.organizationId);

      let correlationResults;
      if (integrations && integrations.length > 0) {
        // Correlate with specific integrations
        const results = [];
        for (const integrationId of integrations) {
          const result = await siemIntegrationService.correlateWithSIEM(integrationId, iocData);
          if (result) {
            results.push(result);
          }
        }
        correlationResults = results;
      } else {
        // Correlate with all available integrations
        correlationResults = await siemIntegrationService.correlateWithAllSIEMs(iocData);
      }

      // Log correlation activity
      await databaseService.logAudit({
        organization_id: req.organizationId,
        user_id: req.user.id,
        action: 'correlate_iocs',
        resource_type: 'correlation',
        details: {
          indicator_count: indicators.length,
          siem_count: correlationResults.length,
          time_window: timeWindow,
          total_alerts: correlationResults.reduce((sum: number, result: any) => sum + result.correlatedAlerts.length, 0)
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
          totalAlertsFound: correlationResults.reduce((sum: number, result: any) => sum + result.correlatedAlerts.length, 0),
          averageCorrelationScore: correlationResults.length > 0 
            ? correlationResults.reduce((sum: number, result: any) => sum + result.correlationScore, 0) / correlationResults.length 
            : 0,
          analysisTime: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('IOC correlation error:', error);
      res.status(500).json({
        error: 'Failed to correlate IOCs with SIEM data'
      });
    }
  }
);

// ==========================================
// IOC MANAGEMENT
// ==========================================

/**
 * @route POST /api/siem/push-iocs
 * @desc Push IOCs to SIEM systems
 * @access Private
 */
router.post('/push-iocs',
  authService.authorize('integrate', 'siem'),
  [
    body('indicators').isArray({ min: 1 }).withMessage('At least one indicator required'),
    body('indicators.*.type').isLength({ min: 1 }).withMessage('Indicator type required'),
    body('indicators.*.value').isLength({ min: 1 }).withMessage('Indicator value required'),
    body('integrations').optional().isArray().withMessage('Integrations must be array')
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

      const { indicators, integrations } = req.body;

      const siemIndicators = indicators.map((ind: any) => ({
        type: ind.type,
        value: ind.value,
        confidence: ind.confidence || 0.5,
        context: ind.context,
        firstSeen: new Date(ind.firstSeen || Date.now()),
        lastSeen: new Date(ind.lastSeen || Date.now())
      }));

      await siemIntegrationService.initialize(req.organizationId);

      let pushResults;
      if (integrations && integrations.length > 0) {
        // Push to specific integrations
        pushResults = {};
        for (const integrationId of integrations) {
          try {
            pushResults[integrationId] = await siemIntegrationService.pushIOCsToSIEM(integrationId, siemIndicators);
          } catch (error) {
            pushResults[integrationId] = false;
            logger.error(`Failed to push IOCs to ${integrationId}:`, error);
          }
        }
      } else {
        // Push to all available integrations
        pushResults = await siemIntegrationService.pushIOCsToAllSIEMs(siemIndicators);
      }

      const successCount = Object.values(pushResults).filter(success => success).length;
      const totalCount = Object.keys(pushResults).length;

      // Log IOC push activity
      await databaseService.logAudit({
        organization_id: req.organizationId,
        user_id: req.user.id,
        action: 'push_iocs',
        resource_type: 'ioc_push',
        details: {
          indicator_count: indicators.length,
          success_count: successCount,
          total_integrations: totalCount,
          push_results: pushResults
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      res.json({
        success: successCount > 0,
        pushResults,
        summary: {
          indicatorsPushed: indicators.length,
          successfulIntegrations: successCount,
          totalIntegrations: totalCount,
          successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0
        }
      });

    } catch (error) {
      logger.error('Push IOCs error:', error);
      res.status(500).json({
        error: 'Failed to push IOCs to SIEM systems'
      });
    }
  }
);

// ==========================================
// ALERT MANAGEMENT
// ==========================================

/**
 * @route GET /api/siem/alerts
 * @desc Get alerts from SIEM systems
 * @access Private
 */
router.get('/alerts',
  authService.authorize('read', 'siem_alert'),
  [
    query('integration').optional().isLength({ min: 1 }).withMessage('Invalid integration ID'),
    query('timeRange').optional().isInt({ min: 1, max: 168 }).withMessage('Time range must be 1-168 hours'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be 1-1000'),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity')
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
        integration, 
        timeRange = 24, 
        limit = 100,
        severity 
      } = req.query;

      const timeRangeObj = {
        start: new Date(Date.now() - parseInt(timeRange as string) * 60 * 60 * 1000),
        end: new Date()
      };

      await siemIntegrationService.initialize(req.organizationId);

      if (integration) {
        // Get alerts from specific integration
        const alerts = await siemIntegrationService.getAlertsFromSIEM(
          integration as string,
          timeRangeObj,
          parseInt(limit as string)
        );

        const filteredAlerts = severity 
          ? alerts.filter(alert => alert.severity === severity)
          : alerts;

        res.json({
          success: true,
          alerts: filteredAlerts,
          count: filteredAlerts.length,
          integration
        });
      } else {
        // Get alerts from all integrations
        const integrationStatuses = await siemIntegrationService.getIntegrationStatus();
        const allAlerts = [];

        for (const [integrationId, status] of Object.entries(integrationStatuses)) {
          try {
            if (status.config.isActive) {
              const alerts = await siemIntegrationService.getAlertsFromSIEM(
                integrationId,
                timeRangeObj,
                parseInt(limit as string)
              );
              
              allAlerts.push(...alerts.map(alert => ({
                ...alert,
                integration: integrationId,
                integrationName: status.config.name
              })));
            }
          } catch (error) {
            logger.error(`Failed to get alerts from ${integrationId}:`, error);
          }
        }

        const filteredAlerts = severity 
          ? allAlerts.filter(alert => alert.severity === severity)
          : allAlerts;

        // Sort by timestamp, most recent first
        filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        res.json({
          success: true,
          alerts: filteredAlerts.slice(0, parseInt(limit as string)),
          count: filteredAlerts.length,
          totalIntegrations: Object.keys(integrationStatuses).length
        });
      }

    } catch (error) {
      logger.error('Get SIEM alerts error:', error);
      res.status(500).json({
        error: 'Failed to get SIEM alerts'
      });
    }
  }
);

/**
 * @route POST /api/siem/threat-hunt
 * @desc Create threat hunt based on IOCs
 * @access Private
 */
router.post('/threat-hunt',
  authService.authorize('create', 'threat_hunt'),
  [
    body('name').isLength({ min: 1, max: 255 }).withMessage('Hunt name required (max 255 chars)'),
    body('integration').isLength({ min: 1 }).withMessage('Integration ID required'),
    body('indicators').isArray({ min: 1 }).withMessage('At least one indicator required'),
    body('indicators.*.type').isLength({ min: 1 }).withMessage('Indicator type required'),
    body('indicators.*.value').isLength({ min: 1 }).withMessage('Indicator value required')
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

      const { name, integration, indicators, description } = req.body;

      const iocData = {
        indicators: indicators.map((ind: any) => ({
          type: ind.type,
          value: ind.value,
          confidence: ind.confidence || 0.5,
          severity: ind.severity || 'medium',
          context: ind.context,
          tags: ind.tags || []
        })),
        activities: [],
        metadata: {
          export_timestamp: new Date().toISOString(),
          tool: 'ThreatFlow',
          version: '1.0.0'
        }
      };

      await siemIntegrationService.initialize(req.organizationId);
      const huntId = await siemIntegrationService.createThreatHunt(integration, name, iocData);

      // Log threat hunt creation
      await databaseService.logAudit({
        organization_id: req.organizationId,
        user_id: req.user.id,
        action: 'create_threat_hunt',
        resource_type: 'threat_hunt',
        resource_id: huntId,
        details: {
          name,
          integration,
          indicator_count: indicators.length,
          description
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        huntId,
        name,
        integration,
        indicatorCount: indicators.length,
        createdAt: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Create threat hunt error:', error);
      res.status(500).json({
        error: 'Failed to create threat hunt'
      });
    }
  }
);

export default router;