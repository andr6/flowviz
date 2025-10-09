/**
 * Executive Reporting API Routes
 *
 * Provides comprehensive REST API endpoints for executive reporting,
 * metrics tracking, compliance monitoring, and business intelligence.
 *
 * Features:
 * - Executive report generation
 * - MTTD/MTTR metrics tracking
 * - Risk score calculation and trends
 * - Compliance assessment tracking
 * - Cost analysis and ROI reporting
 * - Report template management
 * - Scheduled report automation
 * - Dashboard configuration
 * - Audit logging
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { ExecutiveReportingService } from '../services/ExecutiveReportingService';
import { ReportTemplateService } from '../services/ReportTemplateService';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface DateRange {
  start: Date;
  end: Date;
}

interface Investigation {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  status: string;
  createdAt: Date;
  detectedAt?: Date;
  assignedAt?: Date;
  investigatingAt?: Date;
  containedAt?: Date;
  respondedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  mttdSeconds?: number;
  mttrSeconds?: number;
  mttiSeconds?: number;
  mtticSeconds?: number;
  assignedTo?: string;
  team?: string;
  source?: string;
  attackTechniques?: string[];
  affectedSystems?: number;
  affectedUsers?: number;
  estimatedCost?: number;
}

interface ScheduledReportRequest {
  name: string;
  description?: string;
  templateId: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually' | 'custom';
  cronExpression?: string;
  timezone?: string;
  timeframeType: 'last_24h' | 'last_7d' | 'last_30d' | 'last_quarter' | 'last_year' | 'custom';
  customTimeframeDays?: number;
  recipients: string[];
  distributionFormat: 'pdf' | 'pptx' | 'html' | 'xlsx' | 'json';
  emailSubject?: string;
  emailBody?: string;
  attachReport?: boolean;
  createdBy?: string;
  organizationId?: string;
}

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Validate date range parameters
 */
function validateDateRange(req: Request, res: Response, next: NextFunction): void {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameters: startDate and endDate',
    });
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({
      success: false,
      error: 'Invalid date format',
    });
    return;
  }

  if (start > end) {
    res.status(400).json({
      success: false,
      error: 'Start date must be before end date',
    });
    return;
  }

  next();
}

/**
 * Audit logging middleware
 */
async function auditLog(
  pool: Pool,
  eventType: string,
  eventCategory: string,
  userId: string | undefined,
  targetType: string | undefined,
  targetId: string | undefined,
  status: 'success' | 'failure' | 'error' | 'warning',
  eventData?: any,
  errorMessage?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO executive_reporting_audit_log
       (event_type, event_category, user_id, target_type, target_id, status, event_data, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [eventType, eventCategory, userId, targetType, targetId, status, JSON.stringify(eventData || {}), errorMessage]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

// =====================================================
// ROUTE SETUP
// =====================================================

export function setupExecutiveReportingRoutes(app: Router, pool: Pool): void {
  const executiveService = new ExecutiveReportingService(pool);
  const templateService = new ReportTemplateService();

  // =====================================================
  // EXECUTIVE REPORT GENERATION
  // =====================================================

  /**
   * POST /api/executive-reporting/generate
   * Generate comprehensive executive report
   */
  app.post('/api/executive-reporting/generate', validateDateRange, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, reportType, userId } = req.body;

      const timeframe: DateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };

      const report = await executiveService.generateExecutiveSummary(timeframe);

      // Store report in database
      const dbResult = await pool.query(
        `INSERT INTO executive_reports
         (name, report_type, timeframe_start, timeframe_end, report_data,
          total_threats, total_investigations, critical_incidents, overall_risk_score,
          control_coverage_percentage, mttd_seconds, mttr_seconds, generated_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [
          `Executive Report - ${timeframe.start.toISOString().split('T')[0]} to ${timeframe.end.toISOString().split('T')[0]}`,
          reportType || 'executive_briefing',
          timeframe.start,
          timeframe.end,
          JSON.stringify(report),
          report.threatMetrics.totalThreatsAnalyzed,
          report.summary.totalInvestigations,
          report.summary.criticalIncidents,
          report.riskScore.overall,
          report.summary.controlCoverage,
          report.responseMetrics.mttd,
          report.responseMetrics.mttr,
          userId,
          'draft',
        ]
      );

      await auditLog(pool, 'report_generated', 'reporting', userId, 'report', dbResult.rows[0].id, 'success', {
        timeframe,
        reportType,
      });

      res.json({
        success: true,
        report,
        reportId: dbResult.rows[0].id,
      });
    } catch (error: any) {
      console.error('Error generating executive report:', error);
      await auditLog(pool, 'report_generated', 'reporting', req.body.userId, 'report', undefined, 'error', undefined, error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to generate executive report',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/executive-reporting/reports
   * List all executive reports with pagination
   */
  app.get('/api/executive-reporting/reports', async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20, reportType, status, startDate, endDate } = req.query;

      let query = 'SELECT * FROM executive_reports WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (reportType) {
        query += ` AND report_type = $${paramIndex++}`;
        params.push(reportType);
      }

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      if (startDate) {
        query += ` AND timeframe_start >= $${paramIndex++}`;
        params.push(new Date(startDate as string));
      }

      if (endDate) {
        query += ` AND timeframe_end <= $${paramIndex++}`;
        params.push(new Date(endDate as string));
      }

      query += ` ORDER BY generated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(Number(limit), (Number(page) - 1) * Number(limit));

      const result = await pool.query(query, params);

      // Get total count
      const countResult = await pool.query('SELECT COUNT(*) FROM executive_reports WHERE 1=1');

      res.json({
        success: true,
        reports: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(countResult.rows[0].count),
          pages: Math.ceil(Number(countResult.rows[0].count) / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error('Error listing executive reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list executive reports',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/executive-reporting/reports/:id
   * Get specific executive report by ID
   */
  app.get('/api/executive-reporting/reports/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.query;

      const result = await pool.query('SELECT * FROM executive_reports WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Report not found',
        });
        return;
      }

      await auditLog(pool, 'report_viewed', 'access', userId as string, 'report', id, 'success');

      res.json({
        success: true,
        report: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error retrieving executive report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve executive report',
        message: error.message,
      });
    }
  });

  /**
   * PUT /api/executive-reporting/reports/:id/approve
   * Approve an executive report
   */
  app.put('/api/executive-reporting/reports/:id/approve', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId, userName } = req.body;

      const result = await pool.query(
        `UPDATE executive_reports
         SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [userName || userId, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Report not found',
        });
        return;
      }

      await auditLog(pool, 'report_approved', 'security', userId, 'report', id, 'success');

      res.json({
        success: true,
        report: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error approving executive report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve executive report',
        message: error.message,
      });
    }
  });

  // =====================================================
  // METRICS ENDPOINTS
  // =====================================================

  /**
   * POST /api/executive-reporting/metrics/threat
   * Calculate threat metrics for a timeframe
   */
  app.post('/api/executive-reporting/metrics/threat', validateDateRange, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.body;
      const timeframe: DateRange = { start: new Date(startDate), end: new Date(endDate) };

      const metrics = await executiveService.calculateThreatMetrics(timeframe);

      res.json({
        success: true,
        metrics,
      });
    } catch (error: any) {
      console.error('Error calculating threat metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate threat metrics',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/executive-reporting/metrics/response
   * Calculate response metrics (MTTD/MTTR)
   */
  app.post('/api/executive-reporting/metrics/response', validateDateRange, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.body;
      const timeframe: DateRange = { start: new Date(startDate), end: new Date(endDate) };

      const metrics = await executiveService.calculateResponseMetrics(timeframe);

      res.json({
        success: true,
        metrics,
      });
    } catch (error: any) {
      console.error('Error calculating response metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate response metrics',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/executive-reporting/metrics/risk
   * Generate risk score for a timeframe
   */
  app.post('/api/executive-reporting/metrics/risk', validateDateRange, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.body;
      const timeframe: DateRange = { start: new Date(startDate), end: new Date(endDate) };

      const riskScore = await executiveService.generateRiskScore(timeframe);

      // Store risk score in database
      await pool.query(
        `INSERT INTO risk_scores
         (timeframe_start, timeframe_end, overall_score, risk_level,
          threat_exposure_score, vulnerability_density_score, control_effectiveness_score,
          incident_frequency_score, impact_severity_score, trend, trend_confidence,
          estimated_annual_loss, potential_breach_cost, recommendations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          timeframe.start,
          timeframe.end,
          riskScore.overall,
          riskScore.riskLevel,
          riskScore.breakdown.threatExposure,
          riskScore.breakdown.vulnerabilityDensity,
          riskScore.breakdown.controlEffectiveness,
          riskScore.breakdown.incidentFrequency,
          riskScore.breakdown.impactSeverity,
          riskScore.trend,
          riskScore.trendConfidence,
          riskScore.financialImpact.estimatedAnnualLoss,
          riskScore.financialImpact.potentialBreachCost,
          JSON.stringify(riskScore.recommendations),
        ]
      );

      res.json({
        success: true,
        riskScore,
      });
    } catch (error: any) {
      console.error('Error generating risk score:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate risk score',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/executive-reporting/metrics/cost
   * Calculate cost analysis and ROI
   */
  app.post('/api/executive-reporting/metrics/cost', validateDateRange, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.body;
      const timeframe: DateRange = { start: new Date(startDate), end: new Date(endDate) };

      const costAnalysis = await executiveService.calculateCostAnalysis(timeframe);

      res.json({
        success: true,
        costAnalysis,
      });
    } catch (error: any) {
      console.error('Error calculating cost analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate cost analysis',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/executive-reporting/metrics/compliance
   * Calculate compliance status across frameworks
   */
  app.post('/api/executive-reporting/metrics/compliance', validateDateRange, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.body;
      const timeframe: DateRange = { start: new Date(startDate), end: new Date(endDate) };

      const complianceStatus = await executiveService.calculateComplianceStatus(timeframe);

      res.json({
        success: true,
        complianceStatus,
      });
    } catch (error: any) {
      console.error('Error calculating compliance status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate compliance status',
        message: error.message,
      });
    }
  });

  // =====================================================
  // TREND ANALYSIS
  // =====================================================

  /**
   * POST /api/executive-reporting/trends
   * Create trend analysis for metrics
   */
  app.post('/api/executive-reporting/trends', validateDateRange, async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, metricNames, aggregationLevel } = req.body;
      const timeframe: DateRange = { start: new Date(startDate), end: new Date(endDate) };

      const trends = await executiveService.createTrendAnalysis(timeframe);

      res.json({
        success: true,
        trends,
      });
    } catch (error: any) {
      console.error('Error creating trend analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create trend analysis',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/executive-reporting/trends/:metricName
   * Get historical trend data for a specific metric
   */
  app.get('/api/executive-reporting/trends/:metricName', async (req: Request, res: Response) => {
    try {
      const { metricName } = req.params;
      const { aggregationLevel = 'daily', limit = 100 } = req.query;

      const result = await pool.query(
        `SELECT * FROM metric_trends
         WHERE metric_name = $1 AND aggregation_level = $2
         ORDER BY timestamp DESC
         LIMIT $3`,
        [metricName, aggregationLevel, Number(limit)]
      );

      res.json({
        success: true,
        trends: result.rows,
      });
    } catch (error: any) {
      console.error('Error retrieving trend data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve trend data',
        message: error.message,
      });
    }
  });

  // =====================================================
  // REPORT EXPORT
  // =====================================================

  /**
   * POST /api/executive-reporting/export/pdf
   * Export report to PDF format
   */
  app.post('/api/executive-reporting/export/pdf', async (req: Request, res: Response) => {
    try {
      const { reportId, templateId, userId } = req.body;

      // Get report data
      const reportResult = await pool.query('SELECT * FROM executive_reports WHERE id = $1', [reportId]);

      if (reportResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Report not found',
        });
        return;
      }

      const reportData = reportResult.rows[0].report_data;

      // Apply template and export
      const template = templateService.getStandardTemplate(templateId);
      const file = await executiveService.exportToBoardReport(reportData, 'pdf');

      // Update report with PDF URL
      await pool.query('UPDATE executive_reports SET pdf_url = $1 WHERE id = $2', [file.fileUrl, reportId]);

      await auditLog(pool, 'data_exported', 'reporting', userId, 'report', reportId, 'success', { format: 'pdf' });

      res.json({
        success: true,
        file,
      });
    } catch (error: any) {
      console.error('Error exporting to PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export to PDF',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/executive-reporting/export/pptx
   * Export report to PowerPoint format
   */
  app.post('/api/executive-reporting/export/pptx', async (req: Request, res: Response) => {
    try {
      const { reportId, templateId, userId } = req.body;

      // Get report data
      const reportResult = await pool.query('SELECT * FROM executive_reports WHERE id = $1', [reportId]);

      if (reportResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Report not found',
        });
        return;
      }

      const reportData = reportResult.rows[0].report_data;

      // Export to PowerPoint
      const file = await executiveService.exportToBoardReport(reportData, 'pptx');

      // Update report with PPTX URL
      await pool.query('UPDATE executive_reports SET pptx_url = $1 WHERE id = $2', [file.fileUrl, reportId]);

      await auditLog(pool, 'data_exported', 'reporting', userId, 'report', reportId, 'success', { format: 'pptx' });

      res.json({
        success: true,
        file,
      });
    } catch (error: any) {
      console.error('Error exporting to PPTX:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export to PPTX',
        message: error.message,
      });
    }
  });

  // =====================================================
  // REPORT TEMPLATES
  // =====================================================

  /**
   * GET /api/executive-reporting/templates
   * List all available report templates
   */
  app.get('/api/executive-reporting/templates', async (req: Request, res: Response) => {
    try {
      const { category, targetAudience, format } = req.query;

      // Get standard templates
      const standardTemplates = templateService.listStandardTemplates();

      // Get custom templates from database
      let query = 'SELECT * FROM report_templates WHERE is_active = true';
      const params: any[] = [];
      let paramIndex = 1;

      if (category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(category);
      }

      if (targetAudience) {
        query += ` AND target_audience = $${paramIndex++}`;
        params.push(targetAudience);
      }

      if (format) {
        query += ` AND format = $${paramIndex++}`;
        params.push(format);
      }

      const customTemplatesResult = await pool.query(query, params);

      res.json({
        success: true,
        templates: {
          standard: standardTemplates,
          custom: customTemplatesResult.rows,
        },
      });
    } catch (error: any) {
      console.error('Error listing templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list templates',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/executive-reporting/templates/:id
   * Get specific template details
   */
  app.get('/api/executive-reporting/templates/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Try standard templates first
      try {
        const template = templateService.getStandardTemplate(id);
        res.json({
          success: true,
          template,
          isStandard: true,
        });
        return;
      } catch {
        // Not a standard template, try database
      }

      // Try custom templates
      const result = await pool.query('SELECT * FROM report_templates WHERE template_id = $1', [id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }

      res.json({
        success: true,
        template: result.rows[0],
        isStandard: false,
      });
    } catch (error: any) {
      console.error('Error retrieving template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve template',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/executive-reporting/templates
   * Create custom report template
   */
  app.post('/api/executive-reporting/templates', async (req: Request, res: Response) => {
    try {
      const { template, userId } = req.body;

      const result = await pool.query(
        `INSERT INTO report_templates
         (template_id, name, description, category, target_audience, format, sections, styling, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          template.templateId,
          template.name,
          template.description,
          template.category,
          template.targetAudience,
          template.format,
          JSON.stringify(template.sections),
          JSON.stringify(template.styling),
          userId,
        ]
      );

      await auditLog(pool, 'template_created', 'configuration', userId, 'template', result.rows[0].id, 'success');

      res.json({
        success: true,
        template: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error creating template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create template',
        message: error.message,
      });
    }
  });

  // =====================================================
  // SCHEDULED REPORTS
  // =====================================================

  /**
   * POST /api/executive-reporting/schedules
   * Create scheduled report
   */
  app.post('/api/executive-reporting/schedules', async (req: Request, res: Response) => {
    try {
      const schedule: ScheduledReportRequest = req.body;

      // Calculate next run time based on frequency
      const nextRunAt = calculateNextRunTime(schedule.frequency, schedule.cronExpression);

      const result = await pool.query(
        `INSERT INTO scheduled_reports
         (name, description, template_id, frequency, cron_expression, timezone,
          next_run_at, timeframe_type, custom_timeframe_days, recipients,
          distribution_format, email_subject, email_body, attach_report, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          schedule.name,
          schedule.description,
          schedule.templateId,
          schedule.frequency,
          schedule.cronExpression,
          schedule.timezone || 'UTC',
          nextRunAt,
          schedule.timeframeType,
          schedule.customTimeframeDays,
          schedule.recipients,
          schedule.distributionFormat,
          schedule.emailSubject,
          schedule.emailBody,
          schedule.attachReport !== false,
          schedule.createdBy,
        ]
      );

      await auditLog(pool, 'schedule_created', 'configuration', schedule.createdBy, 'schedule', result.rows[0].id, 'success');

      res.json({
        success: true,
        schedule: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error creating scheduled report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create scheduled report',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/executive-reporting/schedules
   * List all scheduled reports
   */
  app.get('/api/executive-reporting/schedules', async (req: Request, res: Response) => {
    try {
      const { status, isActive } = req.query;

      let query = 'SELECT * FROM scheduled_reports WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      if (isActive !== undefined) {
        query += ` AND is_active = $${paramIndex++}`;
        params.push(isActive === 'true');
      }

      query += ' ORDER BY next_run_at ASC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        schedules: result.rows,
      });
    } catch (error: any) {
      console.error('Error listing scheduled reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list scheduled reports',
        message: error.message,
      });
    }
  });

  /**
   * PUT /api/executive-reporting/schedules/:id/pause
   * Pause a scheduled report
   */
  app.put('/api/executive-reporting/schedules/:id/pause', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const result = await pool.query(
        'UPDATE scheduled_reports SET is_active = false, status = $1 WHERE id = $2 RETURNING *',
        ['paused', id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Scheduled report not found',
        });
        return;
      }

      await auditLog(pool, 'schedule_created', 'configuration', userId, 'schedule', id, 'success', { action: 'pause' });

      res.json({
        success: true,
        schedule: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error pausing scheduled report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to pause scheduled report',
        message: error.message,
      });
    }
  });

  /**
   * PUT /api/executive-reporting/schedules/:id/resume
   * Resume a paused scheduled report
   */
  app.put('/api/executive-reporting/schedules/:id/resume', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const result = await pool.query(
        'UPDATE scheduled_reports SET is_active = true, status = $1 WHERE id = $2 RETURNING *',
        ['active', id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Scheduled report not found',
        });
        return;
      }

      await auditLog(pool, 'schedule_created', 'configuration', userId, 'schedule', id, 'success', { action: 'resume' });

      res.json({
        success: true,
        schedule: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error resuming scheduled report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resume scheduled report',
        message: error.message,
      });
    }
  });

  // =====================================================
  // INVESTIGATIONS & INCIDENT TRACKING
  // =====================================================

  /**
   * POST /api/executive-reporting/investigations
   * Create new investigation
   */
  app.post('/api/executive-reporting/investigations', async (req: Request, res: Response) => {
    try {
      const investigation: Partial<Investigation> = req.body;

      const result = await pool.query(
        `INSERT INTO investigations
         (title, description, severity, status, source, assigned_to, team,
          attack_techniques, affected_systems, affected_users, estimated_cost)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          investigation.title,
          investigation.description,
          investigation.severity,
          investigation.status || 'new',
          investigation.source,
          investigation.assignedTo,
          investigation.team,
          investigation.attackTechniques,
          investigation.affectedSystems,
          investigation.affectedUsers,
          investigation.estimatedCost,
        ]
      );

      res.json({
        success: true,
        investigation: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error creating investigation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create investigation',
        message: error.message,
      });
    }
  });

  /**
   * PUT /api/executive-reporting/investigations/:id
   * Update investigation timestamps and status
   */
  app.put('/api/executive-reporting/investigations/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Build dynamic update query
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.keys(updates).forEach((key) => {
        setClauses.push(`${key} = $${paramIndex++}`);
        values.push(updates[key]);
      });

      values.push(id);

      const result = await pool.query(
        `UPDATE investigations SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Investigation not found',
        });
        return;
      }

      res.json({
        success: true,
        investigation: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error updating investigation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update investigation',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/executive-reporting/investigations
   * List investigations with filtering
   */
  app.get('/api/executive-reporting/investigations', async (req: Request, res: Response) => {
    try {
      const { severity, status, team, startDate, endDate, limit = 100 } = req.query;

      let query = 'SELECT * FROM investigations WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (severity) {
        query += ` AND severity = $${paramIndex++}`;
        params.push(severity);
      }

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      if (team) {
        query += ` AND team = $${paramIndex++}`;
        params.push(team);
      }

      if (startDate) {
        query += ` AND created_at >= $${paramIndex++}`;
        params.push(new Date(startDate as string));
      }

      if (endDate) {
        query += ` AND created_at <= $${paramIndex++}`;
        params.push(new Date(endDate as string));
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
      params.push(Number(limit));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        investigations: result.rows,
      });
    } catch (error: any) {
      console.error('Error listing investigations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list investigations',
        message: error.message,
      });
    }
  });

  // =====================================================
  // COMPLIANCE ASSESSMENTS
  // =====================================================

  /**
   * POST /api/executive-reporting/compliance/assessments
   * Create compliance assessment
   */
  app.post('/api/executive-reporting/compliance/assessments', async (req: Request, res: Response) => {
    try {
      const assessment = req.body;

      const result = await pool.query(
        `INSERT INTO compliance_assessments
         (framework, framework_version, period_start, period_end, compliance_score,
          compliance_level, total_controls, implemented_controls, partial_controls,
          missing_controls, critical_gaps, high_gaps, medium_gaps, low_gaps,
          assessment_type, assessor, findings, recommendations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING *`,
        [
          assessment.framework,
          assessment.frameworkVersion,
          new Date(assessment.periodStart),
          new Date(assessment.periodEnd),
          assessment.complianceScore,
          assessment.complianceLevel,
          assessment.totalControls,
          assessment.implementedControls,
          assessment.partialControls || 0,
          assessment.missingControls || 0,
          assessment.criticalGaps || 0,
          assessment.highGaps || 0,
          assessment.mediumGaps || 0,
          assessment.lowGaps || 0,
          assessment.assessmentType,
          assessment.assessor,
          JSON.stringify(assessment.findings || []),
          JSON.stringify(assessment.recommendations || []),
        ]
      );

      res.json({
        success: true,
        assessment: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error creating compliance assessment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create compliance assessment',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/executive-reporting/compliance/assessments
   * List compliance assessments
   */
  app.get('/api/executive-reporting/compliance/assessments', async (req: Request, res: Response) => {
    try {
      const { framework, status, limit = 50 } = req.query;

      let query = 'SELECT * FROM compliance_assessments WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (framework) {
        query += ` AND framework = $${paramIndex++}`;
        params.push(framework);
      }

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      query += ` ORDER BY assessment_date DESC LIMIT $${paramIndex++}`;
      params.push(Number(limit));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        assessments: result.rows,
      });
    } catch (error: any) {
      console.error('Error listing compliance assessments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list compliance assessments',
        message: error.message,
      });
    }
  });

  // =====================================================
  // HEALTH & STATUS
  // =====================================================

  /**
   * GET /api/executive-reporting/health
   * Health check endpoint
   */
  app.get('/api/executive-reporting/health', async (req: Request, res: Response) => {
    try {
      // Check database connection
      await pool.query('SELECT 1');

      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'executive-reporting',
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * GET /api/executive-reporting/stats
   * Get service statistics
   */
  app.get('/api/executive-reporting/stats', async (req: Request, res: Response) => {
    try {
      const stats = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM executive_reports) as total_reports,
          (SELECT COUNT(*) FROM executive_reports WHERE status = 'published') as published_reports,
          (SELECT COUNT(*) FROM investigations) as total_investigations,
          (SELECT COUNT(*) FROM scheduled_reports WHERE is_active = true) as active_schedules,
          (SELECT COUNT(*) FROM compliance_assessments) as total_assessments,
          (SELECT AVG(overall_score) FROM risk_scores WHERE calculated_at >= NOW() - INTERVAL '30 days') as avg_risk_score_30d
      `);

      res.json({
        success: true,
        stats: stats.rows[0],
      });
    } catch (error: any) {
      console.error('Error retrieving stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve stats',
        message: error.message,
      });
    }
  });
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calculate next run time based on frequency
 */
function calculateNextRunTime(frequency: string, cronExpression?: string): Date {
  const now = new Date();

  if (cronExpression) {
    // In production, use a cron parser library
    return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now as placeholder
  }

  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'biweekly':
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() + 1));
    case 'quarterly':
      return new Date(now.setMonth(now.getMonth() + 3));
    case 'annually':
      return new Date(now.setFullYear(now.getFullYear() + 1));
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

export default setupExecutiveReportingRoutes;
