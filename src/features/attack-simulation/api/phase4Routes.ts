/**
 * Phase 4 API Routes
 *
 * Consolidated routes for:
 * - Machine Learning Integration
 * - Enhanced Reporting
 * - Additional Integrations (EDR, Cloud, Vuln Scanners, Config Mgmt)
 * - Attack Simulation enhancements
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { MachineLearningService } from '../services/ml/MachineLearningService';
import { EnhancedReportingService } from '../services/reporting/EnhancedReportingService';
import { AdditionalIntegrationsService } from '../services/integrations/AdditionalIntegrationsService';

export function setupPhase4Routes(app: Router, pool: Pool): void {
  const mlService = new MachineLearningService(pool);
  const reportingService = new EnhancedReportingService(pool);
  const integrationsService = new AdditionalIntegrationsService(pool);

  // ==================== MACHINE LEARNING ROUTES ====================

  /**
   * POST /api/simulations/ml/anomaly-detection
   * Detect anomalies in simulation results
   */
  app.post('/api/simulations/ml/anomaly-detection', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.body;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: jobId',
        });
      }

      const result = await mlService.detectAnomalies(jobId);

      res.json({
        success: true,
        anomalyDetection: result,
      });
    } catch (error) {
      console.error('Failed to detect anomalies:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect anomalies',
      });
    }
  });

  /**
   * POST /api/simulations/ml/predict-gaps
   * Predict gaps for techniques
   */
  app.post('/api/simulations/ml/predict-gaps', async (req: Request, res: Response) => {
    try {
      const { techniqueIds } = req.body;

      if (!techniqueIds || !Array.isArray(techniqueIds)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid techniqueIds: must be an array',
        });
      }

      const predictions = await mlService.predictGaps(techniqueIds);

      res.json({
        success: true,
        predictions,
      });
    } catch (error) {
      console.error('Failed to predict gaps:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to predict gaps',
      });
    }
  });

  /**
   * POST /api/simulations/ml/prioritize-techniques
   * Prioritize techniques based on ML analysis
   */
  app.post('/api/simulations/ml/prioritize-techniques', async (req: Request, res: Response) => {
    try {
      const { techniqueIds } = req.body;

      const priorities = await mlService.prioritizeTechniques(techniqueIds);

      res.json({
        success: true,
        priorities,
      });
    } catch (error) {
      console.error('Failed to prioritize techniques:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prioritize techniques',
      });
    }
  });

  /**
   * POST /api/simulations/ml/workflow-recommendations
   * Generate workflow recommendations
   */
  app.post('/api/simulations/ml/workflow-recommendations', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.body;

      const recommendations = await mlService.generateWorkflowRecommendations(jobId);

      res.json({
        success: true,
        recommendations,
      });
    } catch (error) {
      console.error('Failed to generate workflow recommendations:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate recommendations',
      });
    }
  });

  /**
   * POST /api/simulations/ml/pattern-recognition
   * Recognize patterns across simulations
   */
  app.post('/api/simulations/ml/pattern-recognition', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.body;

      const patterns = await mlService.recognizePatterns(
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        patterns,
      });
    } catch (error) {
      console.error('Failed to recognize patterns:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to recognize patterns',
      });
    }
  });

  // ==================== ENHANCED REPORTING ROUTES ====================

  /**
   * POST /api/reports/executive-dashboard
   * Generate executive dashboard
   */
  app.post('/api/reports/executive-dashboard', async (req: Request, res: Response) => {
    try {
      const { name, startDate, endDate } = req.body;

      const dashboard = await reportingService.generateExecutiveDashboard(
        name,
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        dashboard,
      });
    } catch (error) {
      console.error('Failed to generate executive dashboard:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate dashboard',
      });
    }
  });

  /**
   * POST /api/reports/trend-analysis
   * Generate trend analysis
   */
  app.post('/api/reports/trend-analysis', async (req: Request, res: Response) => {
    try {
      const { metric, startDate, endDate, granularity } = req.body;

      const analysis = await reportingService.generateTrendAnalysis(
        metric,
        new Date(startDate),
        new Date(endDate),
        granularity
      );

      res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      console.error('Failed to generate trend analysis:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate trend analysis',
      });
    }
  });

  /**
   * POST /api/reports/comparative-analysis
   * Generate comparative analysis
   */
  app.post('/api/reports/comparative-analysis', async (req: Request, res: Response) => {
    try {
      const { comparisonType, entityIds, metrics } = req.body;

      const analysis = await reportingService.generateComparativeAnalysis(
        comparisonType,
        entityIds,
        metrics
      );

      res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      console.error('Failed to generate comparative analysis:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate comparative analysis',
      });
    }
  });

  /**
   * POST /api/reports/benchmark
   * Generate benchmark report
   */
  app.post('/api/reports/benchmark', async (req: Request, res: Response) => {
    try {
      const { industry, organizationSize, region } = req.body;

      const report = await reportingService.generateBenchmarkReport(
        industry,
        organizationSize,
        region
      );

      res.json({
        success: true,
        report,
      });
    } catch (error) {
      console.error('Failed to generate benchmark report:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate benchmark report',
      });
    }
  });

  /**
   * POST /api/reports/export/pdf
   * Export report to PDF
   */
  app.post('/api/reports/export/pdf', async (req: Request, res: Response) => {
    try {
      const { reportData, template } = req.body;

      const report = await reportingService.exportToPDF(reportData, template);

      res.json({
        success: true,
        report,
      });
    } catch (error) {
      console.error('Failed to export PDF:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export PDF',
      });
    }
  });

  /**
   * POST /api/reports/export/powerpoint
   * Export report to PowerPoint
   */
  app.post('/api/reports/export/powerpoint', async (req: Request, res: Response) => {
    try {
      const { reportData, template } = req.body;

      const report = await reportingService.exportToPowerPoint(reportData, template);

      res.json({
        success: true,
        report,
      });
    } catch (error) {
      console.error('Failed to export PowerPoint:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export PowerPoint',
      });
    }
  });

  /**
   * GET /api/reports/templates
   * Get report templates
   */
  app.get('/api/reports/templates', async (req: Request, res: Response) => {
    try {
      const templates = await reportingService.getTemplates();

      res.json({
        success: true,
        templates,
      });
    } catch (error) {
      console.error('Failed to get templates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get templates',
      });
    }
  });

  /**
   * POST /api/reports/templates
   * Create report template
   */
  app.post('/api/reports/templates', async (req: Request, res: Response) => {
    try {
      const template = await reportingService.createTemplate(req.body);

      res.json({
        success: true,
        template,
      });
    } catch (error) {
      console.error('Failed to create template:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template',
      });
    }
  });

  // ==================== EDR INTEGRATION ROUTES ====================

  /**
   * POST /api/integrations/edr/query-alerts
   * Query EDR alerts
   */
  app.post('/api/integrations/edr/query-alerts', async (req: Request, res: Response) => {
    try {
      const { configId, filters } = req.body;

      const alerts = await integrationsService.queryEDRAlerts(configId, filters);

      res.json({
        success: true,
        alerts,
      });
    } catch (error) {
      console.error('Failed to query EDR alerts:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query EDR alerts',
      });
    }
  });

  /**
   * POST /api/integrations/edr/telemetry
   * Get EDR telemetry
   */
  app.post('/api/integrations/edr/telemetry', async (req: Request, res: Response) => {
    try {
      const { configId, endpoint, timeRange } = req.body;

      const telemetry = await integrationsService.getEDRTelemetry(configId, endpoint, timeRange);

      res.json({
        success: true,
        telemetry,
      });
    } catch (error) {
      console.error('Failed to get EDR telemetry:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get EDR telemetry',
      });
    }
  });

  /**
   * POST /api/integrations/edr/correlate/:jobId
   * Correlate simulation with EDR alerts
   */
  app.post('/api/integrations/edr/correlate/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const { edrConfigId } = req.body;

      const correlation = await integrationsService.correlateSimulationWithEDR(jobId, edrConfigId);

      res.json({
        success: true,
        correlation,
      });
    } catch (error) {
      console.error('Failed to correlate with EDR:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to correlate with EDR',
      });
    }
  });

  // ==================== CLOUD SECURITY ROUTES ====================

  /**
   * POST /api/integrations/cloud/findings
   * Get cloud security findings
   */
  app.post('/api/integrations/cloud/findings', async (req: Request, res: Response) => {
    try {
      const { configId, filters } = req.body;

      const findings = await integrationsService.getCloudSecurityFindings(configId, filters);

      res.json({
        success: true,
        findings,
      });
    } catch (error) {
      console.error('Failed to get cloud security findings:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cloud findings',
      });
    }
  });

  /**
   * POST /api/integrations/cloud/map-techniques/:jobId
   * Map techniques to cloud findings
   */
  app.post('/api/integrations/cloud/map-techniques/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const { cloudConfigId } = req.body;

      const mapping = await integrationsService.mapTechniquesToCloudFindings(jobId, cloudConfigId);

      res.json({
        success: true,
        mapping,
      });
    } catch (error) {
      console.error('Failed to map techniques to cloud findings:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to map techniques',
      });
    }
  });

  // ==================== VULNERABILITY SCANNER ROUTES ====================

  /**
   * POST /api/integrations/vuln/scan
   * Launch vulnerability scan
   */
  app.post('/api/integrations/vuln/scan', async (req: Request, res: Response) => {
    try {
      const { configId, scanName, targets } = req.body;

      const scan = await integrationsService.launchVulnerabilityScan(configId, scanName, targets);

      res.json({
        success: true,
        scan,
      });
    } catch (error) {
      console.error('Failed to launch vulnerability scan:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to launch scan',
      });
    }
  });

  /**
   * GET /api/integrations/vuln/scan/:scanId
   * Get scan results
   */
  app.get('/api/integrations/vuln/scan/:scanId', async (req: Request, res: Response) => {
    try {
      const { scanId } = req.params;

      const scan = await integrationsService.getScanResults(scanId);

      res.json({
        success: true,
        scan,
      });
    } catch (error) {
      console.error('Failed to get scan results:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scan results',
      });
    }
  });

  /**
   * POST /api/integrations/vuln/correlate/:scanId/:jobId
   * Correlate vulnerabilities with simulation gaps
   */
  app.post('/api/integrations/vuln/correlate/:scanId/:jobId', async (req: Request, res: Response) => {
    try {
      const { scanId, jobId } = req.params;

      const correlation = await integrationsService.correlateVulnerabilitiesWithGaps(scanId, jobId);

      res.json({
        success: true,
        correlation,
      });
    } catch (error) {
      console.error('Failed to correlate vulnerabilities:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to correlate vulnerabilities',
      });
    }
  });

  // ==================== CONFIGURATION MANAGEMENT ROUTES ====================

  /**
   * POST /api/integrations/config-mgmt/playbook/deploy
   * Deploy remediation playbook
   */
  app.post('/api/integrations/config-mgmt/playbook/deploy', async (req: Request, res: Response) => {
    try {
      const { playbookId, targets } = req.body;

      const execution = await integrationsService.deployRemediationPlaybook(playbookId, targets);

      res.json({
        success: true,
        execution,
      });
    } catch (error) {
      console.error('Failed to deploy playbook:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deploy playbook',
      });
    }
  });

  /**
   * POST /api/integrations/config-mgmt/playbook/generate
   * Generate remediation playbook from gaps
   */
  app.post('/api/integrations/config-mgmt/playbook/generate', async (req: Request, res: Response) => {
    try {
      const { gapIds, platform } = req.body;

      const playbook = await integrationsService.generateRemediationPlaybook(gapIds, platform);

      res.json({
        success: true,
        playbook,
      });
    } catch (error) {
      console.error('Failed to generate playbook:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate playbook',
      });
    }
  });

  // ==================== HEALTH CHECK ROUTES ====================

  /**
   * GET /api/phase4/health
   * Phase 4 health check
   */
  app.get('/api/phase4/health', async (req: Request, res: Response) => {
    res.json({
      success: true,
      phase: 4,
      services: {
        machineLearning: 'available',
        enhancedReporting: 'available',
        edrIntegration: 'available',
        cloudSecurity: 'available',
        vulnScanner: 'available',
        configManagement: 'available',
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/phase4/capabilities
   * Get Phase 4 capabilities
   */
  app.get('/api/phase4/capabilities', async (req: Request, res: Response) => {
    res.json({
      success: true,
      capabilities: {
        machineLearning: {
          anomalyDetection: true,
          gapPrediction: true,
          techniquePrioritization: true,
          workflowRecommendations: true,
          patternRecognition: true,
        },
        enhancedReporting: {
          executiveDashboards: true,
          trendAnalysis: true,
          comparativeAnalysis: true,
          benchmarking: true,
          pdfExport: true,
          pptxExport: true,
        },
        integrations: {
          edr: {
            platforms: ['crowdstrike', 'carbon_black', 'sentinelone', 'microsoft_defender', 'cortex_xdr'],
            features: ['alertQuerying', 'telemetry', 'correlation'],
          },
          cloudSecurity: {
            providers: ['aws_security_hub', 'azure_security_center', 'gcp_security_command_center'],
            features: ['findingRetrieval', 'techniqueMapping'],
          },
          vulnerabilityScanning: {
            platforms: ['tenable', 'qualys', 'rapid7', 'nessus', 'openvas'],
            features: ['scanLaunch', 'resultRetrieval', 'gapCorrelation'],
          },
          configManagement: {
            platforms: ['ansible', 'puppet', 'chef', 'saltstack'],
            features: ['playbookGeneration', 'deployment', 'remediationAutomation'],
          },
        },
      },
    });
  });
}

export default setupPhase4Routes;
