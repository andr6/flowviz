/**
 * Compliance Mapping API Routes
 *
 * Provides endpoints for compliance framework integration:
 * - Control mappings (MITRE -> Compliance frameworks)
 * - Compliance report generation
 * - Gap analysis and remediation tracking
 * - Compliance assessments
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { ComplianceMappingService, ComplianceFramework } from '../services/ComplianceMappingService';

export function setupComplianceMappingRoutes(app: Router, pool: Pool): void {
  const complianceService = new ComplianceMappingService(pool);

  /**
   * GET /api/simulations/compliance/frameworks
   * List supported compliance frameworks
   */
  app.get('/api/simulations/compliance/frameworks', async (req: Request, res: Response) => {
    res.json({
      success: true,
      frameworks: [
        {
          id: 'nist_csf',
          name: 'NIST Cybersecurity Framework',
          version: '1.1',
          description: 'Framework for improving critical infrastructure cybersecurity',
          categories: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover'],
        },
        {
          id: 'nist_800_53',
          name: 'NIST SP 800-53',
          version: 'Rev. 5',
          description: 'Security and Privacy Controls for Information Systems',
          categories: ['Access Control', 'Audit and Accountability', 'Security Assessment', 'System Protection'],
        },
        {
          id: 'cis_controls',
          name: 'CIS Critical Security Controls',
          version: '8.0',
          description: 'Prioritized set of actions to protect against cyber attacks',
          categories: ['Basic', 'Foundational', 'Organizational'],
        },
        {
          id: 'pci_dss',
          name: 'PCI DSS',
          version: '4.0',
          description: 'Payment Card Industry Data Security Standard',
          categories: ['Build and Maintain', 'Protect Cardholder Data', 'Vulnerability Management'],
        },
        {
          id: 'iso_27001',
          name: 'ISO/IEC 27001',
          version: '2022',
          description: 'Information security management systems requirements',
          categories: ['Organizational', 'People', 'Physical', 'Technological'],
        },
        {
          id: 'hipaa',
          name: 'HIPAA Security Rule',
          version: '2023',
          description: 'Health Insurance Portability and Accountability Act security requirements',
          categories: ['Administrative', 'Physical', 'Technical'],
        },
        {
          id: 'soc2',
          name: 'SOC 2',
          version: '2017',
          description: 'Service Organization Control 2 trust principles',
          categories: ['Security', 'Availability', 'Processing Integrity', 'Confidentiality', 'Privacy'],
        },
        {
          id: 'gdpr',
          name: 'GDPR',
          version: '2016',
          description: 'General Data Protection Regulation',
          categories: ['Lawfulness', 'Purpose Limitation', 'Data Minimization', 'Accuracy', 'Security'],
        },
      ],
    });
  });

  /**
   * GET /api/simulations/compliance/controls
   * List compliance controls
   */
  app.get('/api/simulations/compliance/controls', async (req: Request, res: Response) => {
    try {
      const { framework, category, priority } = req.query;

      let query = 'SELECT * FROM compliance_controls WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (framework) {
        query += ` AND framework = $${paramCount++}`;
        params.push(framework);
      }

      if (category) {
        query += ` AND category = $${paramCount++}`;
        params.push(category);
      }

      if (priority) {
        query += ` AND priority = $${paramCount++}`;
        params.push(priority);
      }

      query += ' ORDER BY framework, control_id';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        controls: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch compliance controls:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch compliance controls',
      });
    }
  });

  /**
   * GET /api/simulations/compliance/mappings
   * Get compliance mappings for technique
   */
  app.get('/api/simulations/compliance/mappings', async (req: Request, res: Response) => {
    try {
      const { techniqueId, framework } = req.query;

      if (!techniqueId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: techniqueId',
        });
      }

      const mappings = await complianceService.getMappingsForTechnique(
        techniqueId as string,
        framework as ComplianceFramework | undefined
      );

      res.json({
        success: true,
        mappings,
      });
    } catch (error) {
      console.error('Failed to fetch mappings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch mappings',
      });
    }
  });

  /**
   * POST /api/simulations/compliance/mappings/import
   * Import compliance mappings
   */
  app.post('/api/simulations/compliance/mappings/import', async (req: Request, res: Response) => {
    try {
      const { mappings } = req.body;

      if (!mappings || !Array.isArray(mappings)) {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid parameter: mappings (must be an array)',
        });
      }

      const result = await complianceService.importMappings(mappings);

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error('Failed to import mappings:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import mappings',
      });
    }
  });

  /**
   * POST /api/simulations/compliance/reports/generate
   * Generate compliance report for simulation job
   */
  app.post('/api/simulations/compliance/reports/generate', async (req: Request, res: Response) => {
    try {
      const { jobId, framework } = req.body;

      if (!jobId || !framework) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: jobId, framework',
        });
      }

      const report = await complianceService.generateComplianceReport(jobId, framework as ComplianceFramework);

      // Save report
      const reportId = await complianceService.saveComplianceReport(report);

      res.json({
        success: true,
        reportId,
        report,
      });
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  });

  /**
   * GET /api/simulations/compliance/reports
   * List compliance reports
   */
  app.get('/api/simulations/compliance/reports', async (req: Request, res: Response) => {
    try {
      const { jobId, framework, minScore, limit = 50, offset = 0 } = req.query;

      let query = 'SELECT * FROM compliance_reports WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (jobId) {
        query += ` AND job_id = $${paramCount++}`;
        params.push(jobId);
      }

      if (framework) {
        query += ` AND framework = $${paramCount++}`;
        params.push(framework);
      }

      if (minScore) {
        query += ` AND overall_score >= $${paramCount++}`;
        params.push(Number(minScore));
      }

      query += ` ORDER BY generated_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      params.push(Number(limit), Number(offset));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        reports: result.rows,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      console.error('Failed to fetch compliance reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch compliance reports',
      });
    }
  });

  /**
   * GET /api/simulations/compliance/reports/:id
   * Get compliance report details
   */
  app.get('/api/simulations/compliance/reports/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query('SELECT * FROM compliance_reports WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
        });
      }

      // Get associated gaps
      const gapsResult = await pool.query(
        'SELECT * FROM compliance_gaps WHERE report_id = $1 ORDER BY severity DESC, control_id',
        [id]
      );

      res.json({
        success: true,
        report: result.rows[0],
        gaps: gapsResult.rows,
      });
    } catch (error) {
      console.error('Failed to fetch report details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch report details',
      });
    }
  });

  /**
   * GET /api/simulations/compliance/gaps
   * List compliance gaps
   */
  app.get('/api/simulations/compliance/gaps', async (req: Request, res: Response) => {
    try {
      const { reportId, severity, status, assignedTo, framework } = req.query;

      let query = 'SELECT * FROM compliance_gaps WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (reportId) {
        query += ` AND report_id = $${paramCount++}`;
        params.push(reportId);
      }

      if (severity) {
        query += ` AND severity = $${paramCount++}`;
        params.push(severity);
      }

      if (status) {
        query += ` AND status = $${paramCount++}`;
        params.push(status);
      }

      if (assignedTo) {
        query += ` AND assigned_to = $${paramCount++}`;
        params.push(assignedTo);
      }

      if (framework) {
        query += ` AND framework = $${paramCount++}`;
        params.push(framework);
      }

      query += ' ORDER BY severity DESC, created_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        gaps: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch compliance gaps:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch compliance gaps',
      });
    }
  });

  /**
   * PATCH /api/simulations/compliance/gaps/:id
   * Update compliance gap
   */
  app.patch('/api/simulations/compliance/gaps/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, assignedTo, dueDate } = req.body;

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (status) {
        updates.push(`status = $${paramCount++}`);
        values.push(status);
      }

      if (assignedTo !== undefined) {
        updates.push(`assigned_to = $${paramCount++}`);
        values.push(assignedTo);
      }

      if (dueDate !== undefined) {
        updates.push(`due_date = $${paramCount++}`);
        values.push(dueDate);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE compliance_gaps SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Gap not found',
        });
      }

      res.json({
        success: true,
        gap: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to update gap:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update gap',
      });
    }
  });

  /**
   * GET /api/simulations/compliance/assessments
   * List compliance assessments
   */
  app.get('/api/simulations/compliance/assessments', async (req: Request, res: Response) => {
    try {
      const { status } = req.query;

      let query = 'SELECT * FROM compliance_assessments WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (status) {
        query += ` AND status = $${paramCount++}`;
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        assessments: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch assessments',
      });
    }
  });

  /**
   * POST /api/simulations/compliance/assessments
   * Create compliance assessment
   */
  app.post('/api/simulations/compliance/assessments', async (req: Request, res: Response) => {
    try {
      const { name, description, frameworks, scope, startDate, endDate } = req.body;

      if (!name || !frameworks || !Array.isArray(frameworks) || frameworks.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, frameworks (array)',
        });
      }

      const result = await pool.query(
        `INSERT INTO compliance_assessments (
          name, description, frameworks, scope, start_date, end_date,
          status, assessed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          name,
          description,
          frameworks,
          scope,
          startDate ? new Date(startDate) : null,
          endDate ? new Date(endDate) : null,
          'planned',
          req.body.userId || null,
        ]
      );

      res.json({
        success: true,
        assessment: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to create assessment:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create assessment',
      });
    }
  });

  /**
   * GET /api/simulations/compliance/baselines
   * List compliance baselines
   */
  app.get('/api/simulations/compliance/baselines', async (req: Request, res: Response) => {
    try {
      const { framework, isActive } = req.query;

      let query = 'SELECT * FROM compliance_baselines WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (framework) {
        query += ` AND framework = $${paramCount++}`;
        params.push(framework);
      }

      if (isActive !== undefined) {
        query += ` AND is_active = $${paramCount++}`;
        params.push(isActive === 'true');
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        baselines: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch baselines:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch baselines',
      });
    }
  });

  /**
   * POST /api/simulations/compliance/baselines
   * Create compliance baseline
   */
  app.post('/api/simulations/compliance/baselines', async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        framework,
        requiredControls,
        minimumScore,
        autoRemediate,
        blockOnFailure,
        notificationChannels,
        escalationPolicy,
      } = req.body;

      if (!name || !framework || !requiredControls || !Array.isArray(requiredControls)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, framework, requiredControls (array)',
        });
      }

      const result = await pool.query(
        `INSERT INTO compliance_baselines (
          name, description, framework, required_controls, minimum_score,
          auto_remediate, block_on_failure, notification_channels,
          escalation_policy, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          name,
          description,
          framework,
          requiredControls,
          minimumScore || 70,
          autoRemediate || false,
          blockOnFailure || false,
          JSON.stringify(notificationChannels || []),
          JSON.stringify(escalationPolicy || {}),
          true,
          req.body.userId || null,
        ]
      );

      res.json({
        success: true,
        baseline: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to create baseline:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create baseline',
      });
    }
  });

  /**
   * POST /api/simulations/compliance/evidence
   * Add compliance evidence
   */
  app.post('/api/simulations/compliance/evidence', async (req: Request, res: Response) => {
    try {
      const {
        gapId,
        controlId,
        framework,
        evidenceType,
        evidenceTitle,
        evidenceDescription,
        evidenceData,
        fileUrl,
      } = req.body;

      if (!controlId || !framework || !evidenceType || !evidenceTitle) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: controlId, framework, evidenceType, evidenceTitle',
        });
      }

      const result = await pool.query(
        `INSERT INTO compliance_evidence (
          gap_id, control_id, framework, evidence_type, evidence_title,
          evidence_description, evidence_data, file_url, collected_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          gapId || null,
          controlId,
          framework,
          evidenceType,
          evidenceTitle,
          evidenceDescription,
          JSON.stringify(evidenceData || {}),
          fileUrl,
          req.body.userId || null,
        ]
      );

      res.json({
        success: true,
        evidence: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to add evidence:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add evidence',
      });
    }
  });

  /**
   * GET /api/simulations/compliance/evidence
   * List compliance evidence
   */
  app.get('/api/simulations/compliance/evidence', async (req: Request, res: Response) => {
    try {
      const { gapId, controlId, framework, evidenceType } = req.query;

      let query = 'SELECT * FROM compliance_evidence WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (gapId) {
        query += ` AND gap_id = $${paramCount++}`;
        params.push(gapId);
      }

      if (controlId) {
        query += ` AND control_id = $${paramCount++}`;
        params.push(controlId);
      }

      if (framework) {
        query += ` AND framework = $${paramCount++}`;
        params.push(framework);
      }

      if (evidenceType) {
        query += ` AND evidence_type = $${paramCount++}`;
        params.push(evidenceType);
      }

      query += ' ORDER BY collected_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        evidence: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch evidence:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch evidence',
      });
    }
  });

  /**
   * GET /api/simulations/compliance/audit-trail
   * Get compliance audit trail
   */
  app.get('/api/simulations/compliance/audit-trail', async (req: Request, res: Response) => {
    try {
      const { entityType, entityId, limit = 100 } = req.query;

      let query = 'SELECT * FROM compliance_audit_trail WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (entityType) {
        query += ` AND entity_type = $${paramCount++}`;
        params.push(entityType);
      }

      if (entityId) {
        query += ` AND entity_id = $${paramCount++}`;
        params.push(entityId);
      }

      query += ` ORDER BY performed_at DESC LIMIT $${paramCount}`;
      params.push(Number(limit));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        auditTrail: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit trail',
      });
    }
  });
}

export default setupComplianceMappingRoutes;
