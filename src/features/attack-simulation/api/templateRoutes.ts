/**
 * Simulation Templates API Routes
 *
 * RESTful API endpoints for reusable simulation templates
 */

import { Request, Response, Router } from 'express';
import { Pool } from 'pg';
import { SimulationTemplate, TemplateType } from '../types';

/**
 * Setup Simulation Template routes
 */
export function setupTemplateRoutes(app: Router, pool: Pool): void {

  /**
   * Create simulation template
   * POST /api/simulations/templates
   */
  app.post('/api/simulations/templates', async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        category,
        templateType,
        techniques,
        configuration,
        isPublic = false,
        tags = [],
      } = req.body;

      if (!name || !templateType || !techniques) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'name, templateType, and techniques are required',
        });
      }

      const result = await pool.query(
        `INSERT INTO simulation_templates (
          name, description, category, template_type, techniques,
          configuration, is_public, tags, usage_count, created_by,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
        [
          name,
          description,
          category,
          templateType,
          JSON.stringify(techniques),
          JSON.stringify(configuration || {}),
          isPublic,
          tags,
          0,
          req.body.createdBy || 'current-user',
        ]
      );

      const template = mapDbRowToTemplate(result.rows[0]);
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({
        error: 'Failed to create template',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get template by ID
   * GET /api/simulations/templates/:id
   */
  app.get('/api/simulations/templates/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'SELECT * FROM simulation_templates WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Template not found',
          message: `Template with id ${id} not found`,
        });
      }

      // Increment usage count
      await pool.query(
        `UPDATE simulation_templates
         SET usage_count = usage_count + 1
         WHERE id = $1`,
        [id]
      );

      const template = mapDbRowToTemplate(result.rows[0]);
      res.json(template);
    } catch (error) {
      console.error('Error getting template:', error);
      res.status(500).json({
        error: 'Failed to get template',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * List simulation templates
   * GET /api/simulations/templates
   */
  app.get('/api/simulations/templates', async (req: Request, res: Response) => {
    try {
      const {
        category,
        templateType,
        isPublic,
        tags,
        search,
        limit = 50,
        offset = 0,
      } = req.query;

      let query = 'SELECT * FROM simulation_templates WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (category) {
        params.push(category);
        query += ` AND category = $${paramIndex++}`;
      }

      if (templateType) {
        params.push(templateType);
        query += ` AND template_type = $${paramIndex++}`;
      }

      if (isPublic !== undefined) {
        params.push(isPublic === 'true');
        query += ` AND is_public = $${paramIndex++}`;
      }

      if (tags) {
        const tagArray = (tags as string).split(',');
        params.push(tagArray);
        query += ` AND tags && $${paramIndex++}`;
      }

      if (search) {
        params.push(`%${search}%`);
        query += ` AND (name ILIKE $${paramIndex++} OR description ILIKE $${paramIndex - 1})`;
      }

      query += ` ORDER BY usage_count DESC, created_at DESC`;

      params.push(limit);
      query += ` LIMIT $${paramIndex++}`;

      params.push(offset);
      query += ` OFFSET $${paramIndex++}`;

      const result = await pool.query(query, params);
      const templates = result.rows.map(mapDbRowToTemplate);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM simulation_templates WHERE 1=1';
      const countParams: any[] = [];
      let countParamIndex = 1;

      if (category) {
        countParams.push(category);
        countQuery += ` AND category = $${countParamIndex++}`;
      }

      if (templateType) {
        countParams.push(templateType);
        countQuery += ` AND template_type = $${countParamIndex++}`;
      }

      if (isPublic !== undefined) {
        countParams.push(isPublic === 'true');
        countQuery += ` AND is_public = $${countParamIndex++}`;
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      res.json({
        templates,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } catch (error) {
      console.error('Error listing templates:', error);
      res.status(500).json({
        error: 'Failed to list templates',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Update simulation template
   * PUT /api/simulations/templates/:id
   */
  app.put('/api/simulations/templates/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        category,
        techniques,
        configuration,
        isPublic,
        tags,
      } = req.body;

      const result = await pool.query(
        `UPDATE simulation_templates
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             category = COALESCE($3, category),
             techniques = COALESCE($4, techniques),
             configuration = COALESCE($5, configuration),
             is_public = COALESCE($6, is_public),
             tags = COALESCE($7, tags),
             updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [
          name,
          description,
          category,
          techniques ? JSON.stringify(techniques) : null,
          configuration ? JSON.stringify(configuration) : null,
          isPublic,
          tags,
          id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Template not found',
          message: `Template with id ${id} not found`,
        });
      }

      const template = mapDbRowToTemplate(result.rows[0]);
      res.json(template);
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({
        error: 'Failed to update template',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Delete simulation template
   * DELETE /api/simulations/templates/:id
   */
  app.delete('/api/simulations/templates/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM simulation_templates WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Template not found',
          message: `Template with id ${id} not found`,
        });
      }

      res.json({ message: 'Template deleted successfully', id });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({
        error: 'Failed to delete template',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Create simulation from template
   * POST /api/simulations/templates/:id/create-plan
   */
  app.post('/api/simulations/templates/:id/create-plan', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { targetEnvironment, executionMode, platform } = req.body;

      // Get template
      const templateResult = await pool.query(
        'SELECT * FROM simulation_templates WHERE id = $1',
        [id]
      );

      if (templateResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Template not found',
          message: `Template with id ${id} not found`,
        });
      }

      const template = templateResult.rows[0];

      // Create simulation plan from template
      const planResult = await pool.query(
        `INSERT INTO simulation_plans (
          name, description, source_type, target_environment,
          execution_mode, platform, techniques, technique_count,
          plan_data, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
        [
          `${template.name} - ${new Date().toLocaleDateString()}`,
          template.description,
          'template',
          targetEnvironment,
          executionMode,
          platform,
          template.techniques,
          template.techniques.length,
          JSON.stringify({
            templateId: id,
            templateName: template.name,
            ...template.configuration,
          }),
          'draft',
        ]
      );

      // Update template usage statistics
      await pool.query(
        `UPDATE simulation_templates
         SET usage_count = usage_count + 1,
             avg_execution_time = COALESCE(
               (avg_execution_time * usage_count + 0) / (usage_count + 1),
               0
             )
         WHERE id = $1`,
        [id]
      );

      const plan = planResult.rows[0];
      res.status(201).json({
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          targetEnvironment: plan.target_environment,
          executionMode: plan.execution_mode,
          platform: plan.platform,
          techniques: plan.techniques,
          techniqueCount: plan.technique_count,
          status: plan.status,
        },
        template: mapDbRowToTemplate(template),
      });
    } catch (error) {
      console.error('Error creating plan from template:', error);
      res.status(500).json({
        error: 'Failed to create plan from template',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Get template statistics
   * GET /api/simulations/templates/:id/stats
   */
  app.get('/api/simulations/templates/:id/stats', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT
          usage_count,
          avg_execution_time,
          avg_success_rate,
          created_at,
          updated_at
         FROM simulation_templates
         WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Template not found',
          message: `Template with id ${id} not found`,
        });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error getting template stats:', error);
      res.status(500).json({
        error: 'Failed to get template statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Clone template
   * POST /api/simulations/templates/:id/clone
   */
  app.post('/api/simulations/templates/:id/clone', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, isPublic } = req.body;

      const templateResult = await pool.query(
        'SELECT * FROM simulation_templates WHERE id = $1',
        [id]
      );

      if (templateResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Template not found',
          message: `Template with id ${id} not found`,
        });
      }

      const original = templateResult.rows[0];

      const cloneResult = await pool.query(
        `INSERT INTO simulation_templates (
          name, description, category, template_type, techniques,
          configuration, is_public, tags, usage_count, created_by,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *`,
        [
          name || `${original.name} (Copy)`,
          original.description,
          original.category,
          original.template_type,
          original.techniques,
          original.configuration,
          isPublic !== undefined ? isPublic : false,
          original.tags,
          0,
          req.body.createdBy || 'current-user',
        ]
      );

      const cloned = mapDbRowToTemplate(cloneResult.rows[0]);
      res.status(201).json(cloned);
    } catch (error) {
      console.error('Error cloning template:', error);
      res.status(500).json({
        error: 'Failed to clone template',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  console.log('✅ Simulation Template API routes initialized');
}

/**
 * Map database row to SimulationTemplate
 */
function mapDbRowToTemplate(row: any): SimulationTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    templateType: row.template_type,
    techniques: row.techniques || [],
    configuration: row.configuration || {},
    usageCount: row.usage_count || 0,
    avgExecutionTime: row.avg_execution_time,
    avgSuccessRate: row.avg_success_rate,
    isPublic: row.is_public || false,
    tags: row.tags || [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default setupTemplateRoutes;
