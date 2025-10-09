/**
 * D3FEND Mapping API Routes
 *
 * Provides REST API endpoints for MITRE D3FEND defensive countermeasure
 * mapping, coverage assessment, and security architecture generation.
 *
 * Endpoints:
 * - Technique-to-defense mapping
 * - Defense matrix generation
 * - Coverage assessment
 * - Countermeasure prioritization
 * - Architecture document export
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { D3FENDMappingService } from '../services/D3FENDMappingService';

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Audit logging for D3FEND operations
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
      `INSERT INTO d3fend_audit_log
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

export function setupD3FENDRoutes(app: Router, pool: Pool): void {
  const d3fendService = new D3FENDMappingService(pool);

  // =====================================================
  // TECHNIQUE-TO-DEFENSE MAPPING
  // =====================================================

  /**
   * POST /api/d3fend/map-technique
   * Map ATT&CK technique to D3FEND defensive countermeasures
   */
  app.post('/api/d3fend/map-technique', async (req: Request, res: Response) => {
    try {
      const { technique, userId } = req.body;

      if (!technique || !technique.id) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: technique with id',
        });
        return;
      }

      const countermeasures = await d3fendService.mapAttackToDefense(technique);

      await auditLog(pool, 'mapping_created', 'mapping', userId, 'mapping', technique.id, 'success', {
        techniqueId: technique.id,
        countermeasuresFound: countermeasures.length,
      });

      res.json({
        success: true,
        technique,
        countermeasures,
        count: countermeasures.length,
      });
    } catch (error: any) {
      console.error('Error mapping technique to defenses:', error);
      await auditLog(pool, 'mapping_created', 'mapping', req.body.userId, 'mapping', req.body.technique?.id, 'error', undefined, error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to map technique to defenses',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/d3fend/countermeasures
   * List all D3FEND countermeasures with filtering
   */
  app.get('/api/d3fend/countermeasures', async (req: Request, res: Response) => {
    try {
      const {
        category,
        artifactType,
        complexity,
        cost,
        page = 1,
        limit = 50,
      } = req.query;

      let query = 'SELECT * FROM d3fend_countermeasures WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(category);
      }

      if (artifactType) {
        query += ` AND artifact_type = $${paramIndex++}`;
        params.push(artifactType);
      }

      if (complexity) {
        query += ` AND implementation_complexity = $${paramIndex++}`;
        params.push(complexity);
      }

      if (cost) {
        query += ` AND implementation_cost = $${paramIndex++}`;
        params.push(cost);
      }

      query += ` ORDER BY name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(Number(limit), (Number(page) - 1) * Number(limit));

      const result = await pool.query(query, params);

      // Get total count
      const countResult = await pool.query('SELECT COUNT(*) FROM d3fend_countermeasures WHERE 1=1');

      res.json({
        success: true,
        countermeasures: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(countResult.rows[0].count),
          pages: Math.ceil(Number(countResult.rows[0].count) / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error('Error listing countermeasures:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list countermeasures',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/d3fend/countermeasures/:id
   * Get specific countermeasure details
   */
  app.get('/api/d3fend/countermeasures/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query('SELECT * FROM d3fend_countermeasures WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Countermeasure not found',
        });
        return;
      }

      // Get associated mappings
      const mappingsResult = await pool.query(
        'SELECT * FROM d3fend_attack_mappings WHERE countermeasure_id = $1',
        [id]
      );

      res.json({
        success: true,
        countermeasure: result.rows[0],
        mappings: mappingsResult.rows,
      });
    } catch (error: any) {
      console.error('Error retrieving countermeasure:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve countermeasure',
        message: error.message,
      });
    }
  });

  // =====================================================
  // DEFENSE MATRIX GENERATION
  // =====================================================

  /**
   * POST /api/d3fend/generate-matrix
   * Generate defense matrix for an attack flow
   */
  app.post('/api/d3fend/generate-matrix', async (req: Request, res: Response) => {
    try {
      const { flow, userId } = req.body;

      if (!flow || !flow.id || !flow.techniques || flow.techniques.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: flow with id and techniques',
        });
        return;
      }

      const matrix = await d3fendService.generateDefenseMatrix(flow);

      // Store matrix in database
      const dbResult = await pool.query(
        `INSERT INTO defense_matrices
         (flow_id, flow_name, matrix_data, total_techniques, total_countermeasures,
          unique_categories, avg_coverage_per_technique, overall_coverage_percentage,
          overall_coverage_level, generated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          flow.id,
          matrix.flowName,
          JSON.stringify(matrix),
          matrix.metadata.totalTechniques,
          matrix.metadata.totalCountermeasures,
          matrix.metadata.uniqueCategories,
          matrix.metadata.avgCoveragePerTechnique,
          matrix.coverage.overall.percentage,
          matrix.coverage.overall.level,
          userId,
        ]
      );

      await auditLog(pool, 'matrix_generated', 'analysis', userId, 'matrix', dbResult.rows[0].id, 'success', {
        flowId: flow.id,
        techniquesCount: matrix.metadata.totalTechniques,
        countermeasuresCount: matrix.metadata.totalCountermeasures,
      });

      res.json({
        success: true,
        matrix,
        matrixId: dbResult.rows[0].id,
      });
    } catch (error: any) {
      console.error('Error generating defense matrix:', error);
      await auditLog(pool, 'matrix_generated', 'analysis', req.body.userId, 'matrix', undefined, 'error', undefined, error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to generate defense matrix',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/d3fend/matrices
   * List all defense matrices
   */
  app.get('/api/d3fend/matrices', async (req: Request, res: Response) => {
    try {
      const { flowId, page = 1, limit = 20 } = req.query;

      let query = 'SELECT * FROM defense_matrices WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (flowId) {
        query += ` AND flow_id = $${paramIndex++}`;
        params.push(flowId);
      }

      query += ` ORDER BY generated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(Number(limit), (Number(page) - 1) * Number(limit));

      const result = await pool.query(query, params);

      const countResult = await pool.query('SELECT COUNT(*) FROM defense_matrices WHERE 1=1');

      res.json({
        success: true,
        matrices: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(countResult.rows[0].count),
          pages: Math.ceil(Number(countResult.rows[0].count) / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error('Error listing defense matrices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list defense matrices',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/d3fend/matrices/:id
   * Get specific defense matrix
   */
  app.get('/api/d3fend/matrices/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query('SELECT * FROM defense_matrices WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Defense matrix not found',
        });
        return;
      }

      res.json({
        success: true,
        matrix: result.rows[0].matrix_data,
        metadata: {
          id: result.rows[0].id,
          flowId: result.rows[0].flow_id,
          flowName: result.rows[0].flow_name,
          generatedAt: result.rows[0].generated_at,
          generatedBy: result.rows[0].generated_by,
        },
      });
    } catch (error: any) {
      console.error('Error retrieving defense matrix:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve defense matrix',
        message: error.message,
      });
    }
  });

  // =====================================================
  // ENVIRONMENTS & ASSETS
  // =====================================================

  /**
   * POST /api/d3fend/environments
   * Create security environment
   */
  app.post('/api/d3fend/environments', async (req: Request, res: Response) => {
    try {
      const { environment, userId } = req.body;

      const result = await pool.query(
        `INSERT INTO security_environments
         (name, description, type, budget, allowed_tools, restricted_categories,
          compliance_requirements, performance_impact_limit)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          environment.name,
          environment.description,
          environment.type,
          environment.budget,
          environment.allowedTools || [],
          environment.restrictedCategories || [],
          environment.complianceRequirements || [],
          environment.performanceImpactLimit,
        ]
      );

      res.json({
        success: true,
        environment: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error creating environment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create environment',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/d3fend/environments
   * List all environments
   */
  app.get('/api/d3fend/environments', async (req: Request, res: Response) => {
    try {
      const { type, isActive } = req.query;

      let query = 'SELECT * FROM security_environments WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (type) {
        query += ` AND type = $${paramIndex++}`;
        params.push(type);
      }

      if (isActive !== undefined) {
        query += ` AND is_active = $${paramIndex++}`;
        params.push(isActive === 'true');
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        environments: result.rows,
      });
    } catch (error: any) {
      console.error('Error listing environments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list environments',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/d3fend/environments/:id/assets
   * Add asset to environment
   */
  app.post('/api/d3fend/environments/:id/assets', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { asset } = req.body;

      const result = await pool.query(
        `INSERT INTO security_assets
         (environment_id, name, description, asset_type, criticality, exposed_techniques,
          ip_addresses, hostnames, network_segment, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          id,
          asset.name,
          asset.description,
          asset.assetType,
          asset.criticality,
          asset.exposedTechniques || [],
          asset.ipAddresses || [],
          asset.hostnames || [],
          asset.networkSegment,
          asset.tags || [],
        ]
      );

      res.json({
        success: true,
        asset: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error creating asset:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create asset',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/d3fend/environments/:id/defenses
   * Deploy countermeasure to environment
   */
  app.post('/api/d3fend/environments/:id/defenses', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { defense, userId } = req.body;

      const result = await pool.query(
        `INSERT INTO deployed_defenses
         (environment_id, countermeasure_id, status, deployed_at, version,
          coverage_asset_ids, coverage_groups, implementation_notes, owner_team, owner_contact)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          id,
          defense.countermeasureId,
          defense.status || 'planned',
          defense.deployedAt,
          defense.version,
          defense.coverageAssetIds || [],
          defense.coverageGroups || [],
          defense.implementationNotes,
          defense.ownerTeam,
          defense.ownerContact,
        ]
      );

      await auditLog(pool, 'countermeasure_deployed', 'deployment', userId, 'defense', result.rows[0].id, 'success', {
        environmentId: id,
        countermeasureId: defense.countermeasureId,
        status: defense.status,
      });

      res.json({
        success: true,
        defense: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error deploying countermeasure:', error);
      await auditLog(pool, 'countermeasure_deployed', 'deployment', req.body.userId, 'defense', undefined, 'error', undefined, error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to deploy countermeasure',
        message: error.message,
      });
    }
  });

  // =====================================================
  // COVERAGE ASSESSMENT
  // =====================================================

  /**
   * POST /api/d3fend/assess-coverage
   * Perform coverage assessment for an environment
   */
  app.post('/api/d3fend/assess-coverage', async (req: Request, res: Response) => {
    try {
      const { environmentId, userId } = req.body;

      if (!environmentId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: environmentId',
        });
        return;
      }

      // Get environment
      const envResult = await pool.query(
        'SELECT * FROM security_environments WHERE id = $1',
        [environmentId]
      );

      if (envResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Environment not found',
        });
        return;
      }

      // Get deployed defenses
      const defensesResult = await pool.query(
        'SELECT * FROM deployed_defenses WHERE environment_id = $1',
        [environmentId]
      );

      // Get assets
      const assetsResult = await pool.query(
        'SELECT * FROM security_assets WHERE environment_id = $1',
        [environmentId]
      );

      // Build environment object
      const environment = {
        id: envResult.rows[0].id,
        name: envResult.rows[0].name,
        type: envResult.rows[0].type,
        deployedDefenses: defensesResult.rows.map((row: any) => ({
          countermeasureId: row.countermeasure_id,
          status: row.status,
          deployedAt: row.deployed_at,
          version: row.version,
          coverage: row.coverage_asset_ids || [],
          effectiveness: {
            prevention: row.measured_effectiveness_prevention || 0,
            detection: row.measured_effectiveness_detection || 0,
            response: row.measured_effectiveness_response || 0,
            overall: row.measured_effectiveness_overall || 0,
          },
          notes: row.implementation_notes,
        })),
        constraints: {
          budget: envResult.rows[0].budget,
          allowedTools: envResult.rows[0].allowed_tools || [],
          restrictedCategories: envResult.rows[0].restricted_categories || [],
          complianceRequirements: envResult.rows[0].compliance_requirements || [],
          performanceImpactLimit: envResult.rows[0].performance_impact_limit,
        },
        assets: assetsResult.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          type: row.asset_type,
          criticality: row.criticality,
          exposedTechniques: row.exposed_techniques || [],
        })),
      };

      // Perform assessment
      const assessment = await d3fendService.assessControlCoverage(environment.deployedDefenses, environment);

      // Store assessment in database
      const dbResult = await pool.query(
        `INSERT INTO coverage_assessments
         (environment_id, detailed_coverage, overall_coverage_percentage, overall_coverage_level,
          implemented_controls, total_controls, total_countermeasures, deployed_countermeasures,
          planned_countermeasures, testing_countermeasures, not_deployed_countermeasures,
          deployment_percentage, overall_risk, risk_score, critical_gaps, exposed_techniques_count,
          recommendations, prioritized_actions, assessed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         RETURNING id`,
        [
          environmentId,
          JSON.stringify(assessment.detailedCoverage),
          assessment.overallCoverage.percentage,
          assessment.overallCoverage.level,
          assessment.overallCoverage.implementedControls,
          assessment.overallCoverage.totalControls,
          assessment.deploymentStatus.totalCountermeasures,
          assessment.deploymentStatus.deployed,
          assessment.deploymentStatus.planned,
          assessment.deploymentStatus.testing,
          assessment.deploymentStatus.notDeployed,
          assessment.deploymentStatus.deploymentPercentage,
          assessment.riskAssessment.overallRisk,
          assessment.riskAssessment.riskScore,
          assessment.riskAssessment.criticalGaps.length,
          assessment.riskAssessment.exposedTechniques.length,
          JSON.stringify(assessment.recommendations),
          JSON.stringify(assessment.prioritizedActions),
          userId,
        ]
      );

      await auditLog(pool, 'assessment_performed', 'analysis', userId, 'assessment', dbResult.rows[0].id, 'success', {
        environmentId,
        overallCoverage: assessment.overallCoverage.percentage,
        riskScore: assessment.riskAssessment.riskScore,
      });

      res.json({
        success: true,
        assessment,
        assessmentId: dbResult.rows[0].id,
      });
    } catch (error: any) {
      console.error('Error assessing coverage:', error);
      await auditLog(pool, 'assessment_performed', 'analysis', req.body.userId, 'assessment', undefined, 'error', undefined, error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to assess coverage',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/d3fend/assessments
   * List coverage assessments
   */
  app.get('/api/d3fend/assessments', async (req: Request, res: Response) => {
    try {
      const { environmentId, page = 1, limit = 20 } = req.query;

      let query = 'SELECT * FROM coverage_assessments WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (environmentId) {
        query += ` AND environment_id = $${paramIndex++}`;
        params.push(environmentId);
      }

      query += ` ORDER BY assessed_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(Number(limit), (Number(page) - 1) * Number(limit));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        assessments: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
        },
      });
    } catch (error: any) {
      console.error('Error listing assessments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list assessments',
        message: error.message,
      });
    }
  });

  // =====================================================
  // PRIORITIZATION
  // =====================================================

  /**
   * POST /api/d3fend/prioritize
   * Prioritize countermeasure implementation
   */
  app.post('/api/d3fend/prioritize', async (req: Request, res: Response) => {
    try {
      const { countermeasures, userId } = req.body;

      if (!countermeasures || !Array.isArray(countermeasures) || countermeasures.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: countermeasures array',
        });
        return;
      }

      const prioritized = await d3fendService.prioritizeImplementation(countermeasures);

      await auditLog(pool, 'countermeasure_prioritized', 'analysis', userId, 'prioritization', undefined, 'success', {
        countermeasuresCount: countermeasures.length,
      });

      res.json({
        success: true,
        prioritized,
      });
    } catch (error: any) {
      console.error('Error prioritizing countermeasures:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to prioritize countermeasures',
        message: error.message,
      });
    }
  });

  // =====================================================
  // ARCHITECTURE EXPORT
  // =====================================================

  /**
   * POST /api/d3fend/export-architecture
   * Generate security architecture document
   */
  app.post('/api/d3fend/export-architecture', async (req: Request, res: Response) => {
    try {
      const { matrixId, userId } = req.body;

      if (!matrixId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: matrixId',
        });
        return;
      }

      // Get defense matrix
      const matrixResult = await pool.query(
        'SELECT * FROM defense_matrices WHERE id = $1',
        [matrixId]
      );

      if (matrixResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Defense matrix not found',
        });
        return;
      }

      const matrix = matrixResult.rows[0].matrix_data;

      // Generate architecture document
      const document = await d3fendService.exportToSecurityArchitecture(matrix);

      // Store document in database
      const dbResult = await pool.query(
        `INSERT INTO architecture_documents
         (title, version, defense_matrix_id, document_data, executive_summary,
          total_techniques, total_countermeasures, overall_coverage_percentage,
          overall_risk_score, total_phases, estimated_timeline, total_estimated_cost,
          generated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          document.title,
          document.version,
          matrixId,
          JSON.stringify(document),
          document.executiveSummary,
          document.currentState.defenseMatrix.metadata.totalTechniques,
          document.currentState.defenseMatrix.metadata.totalCountermeasures,
          document.currentState.defenseMatrix.coverage.overall.percentage,
          document.currentState.riskProfile.riskScore,
          document.roadmap.phases.length,
          document.roadmap.timeline,
          document.roadmap.phases.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
          userId,
        ]
      );

      await auditLog(pool, 'architecture_generated', 'documentation', userId, 'architecture', dbResult.rows[0].id, 'success', {
        matrixId,
      });

      res.json({
        success: true,
        document,
        documentId: dbResult.rows[0].id,
      });
    } catch (error: any) {
      console.error('Error generating architecture document:', error);
      await auditLog(pool, 'architecture_generated', 'documentation', req.body.userId, 'architecture', undefined, 'error', undefined, error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to generate architecture document',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/d3fend/architectures
   * List architecture documents
   */
  app.get('/api/d3fend/architectures', async (req: Request, res: Response) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      let query = 'SELECT * FROM architecture_documents WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      query += ` ORDER BY generated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(Number(limit), (Number(page) - 1) * Number(limit));

      const result = await pool.query(query, params);

      res.json({
        success: true,
        documents: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
        },
      });
    } catch (error: any) {
      console.error('Error listing architecture documents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list architecture documents',
        message: error.message,
      });
    }
  });

  // =====================================================
  // ANALYTICS & INSIGHTS
  // =====================================================

  /**
   * GET /api/d3fend/analytics/coverage-summary
   * Get coverage summary for all environments
   */
  app.get('/api/d3fend/analytics/coverage-summary', async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM v_defense_coverage_summary');

      res.json({
        success: true,
        coverageSummary: result.rows,
      });
    } catch (error: any) {
      console.error('Error retrieving coverage summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve coverage summary',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/d3fend/analytics/top-countermeasures
   * Get top countermeasures by coverage
   */
  app.get('/api/d3fend/analytics/top-countermeasures', async (req: Request, res: Response) => {
    try {
      const { limit = 10 } = req.query;

      const result = await pool.query(
        'SELECT * FROM v_top_countermeasures_by_coverage LIMIT $1',
        [Number(limit)]
      );

      res.json({
        success: true,
        topCountermeasures: result.rows,
      });
    } catch (error: any) {
      console.error('Error retrieving top countermeasures:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve top countermeasures',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/d3fend/analytics/technique-gaps
   * Get techniques with defensive coverage gaps
   */
  app.get('/api/d3fend/analytics/technique-gaps', async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM v_technique_defense_gaps ORDER BY gap_severity DESC');

      res.json({
        success: true,
        gaps: result.rows,
      });
    } catch (error: any) {
      console.error('Error retrieving technique gaps:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve technique gaps',
        message: error.message,
      });
    }
  });

  // =====================================================
  // HEALTH & STATUS
  // =====================================================

  /**
   * GET /api/d3fend/health
   * Health check endpoint
   */
  app.get('/api/d3fend/health', async (req: Request, res: Response) => {
    try {
      await pool.query('SELECT 1');

      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'd3fend-mapping',
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
   * GET /api/d3fend/stats
   * Get D3FEND service statistics
   */
  app.get('/api/d3fend/stats', async (req: Request, res: Response) => {
    try {
      const stats = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM d3fend_countermeasures) as total_countermeasures,
          (SELECT COUNT(DISTINCT attack_technique_id) FROM d3fend_attack_mappings) as mapped_techniques,
          (SELECT COUNT(*) FROM defense_matrices) as total_matrices,
          (SELECT COUNT(*) FROM coverage_assessments) as total_assessments,
          (SELECT COUNT(*) FROM architecture_documents) as total_architectures,
          (SELECT COUNT(DISTINCT environment_id) FROM deployed_defenses WHERE status = 'deployed') as environments_with_defenses,
          (SELECT AVG(overall_coverage_percentage) FROM coverage_assessments WHERE assessed_at >= NOW() - INTERVAL '30 days') as avg_coverage_30d
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

export default setupD3FENDRoutes;
