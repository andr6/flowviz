/**
 * Scheduling API Routes
 *
 * Provides endpoints for simulation scheduling:
 * - Schedule management (CRUD)
 * - Cron-based recurring schedules
 * - One-time scheduled simulations
 * - Interval-based schedules
 * - Execution history and statistics
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { SchedulingService, SimulationSchedule } from '../services/SchedulingService';

export function setupSchedulingRoutes(app: Router, pool: Pool): void {
  const schedulingService = new SchedulingService(pool);

  // Start the scheduler
  schedulingService.startScheduler();

  /**
   * GET /api/simulations/schedules
   * List all schedules
   */
  app.get('/api/simulations/schedules', async (req: Request, res: Response) => {
    try {
      const { enabled, scheduleType } = req.query;

      let query = 'SELECT * FROM simulation_schedules WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (enabled !== undefined) {
        query += ` AND enabled = $${paramCount++}`;
        params.push(enabled === 'true');
      }

      if (scheduleType) {
        query += ` AND schedule_type = $${paramCount++}`;
        params.push(scheduleType);
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        schedules: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch schedules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch schedules',
      });
    }
  });

  /**
   * POST /api/simulations/schedules
   * Create new schedule
   */
  app.post('/api/simulations/schedules', async (req: Request, res: Response) => {
    try {
      const schedule: Omit<SimulationSchedule, 'id'> = {
        name: req.body.name,
        description: req.body.description,
        enabled: req.body.enabled !== undefined ? req.body.enabled : true,
        scheduleType: req.body.scheduleType,
        cronExpression: req.body.cronExpression,
        scheduledTime: req.body.scheduledTime ? new Date(req.body.scheduledTime) : undefined,
        intervalMinutes: req.body.intervalMinutes,
        timezone: req.body.timezone || 'UTC',
        simulationConfig: req.body.simulationConfig || {},
        businessHoursOnly: req.body.businessHoursOnly || false,
        maintenanceWindows: req.body.maintenanceWindows || [],
        maxExecutions: req.body.maxExecutions,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        retryOnFailure: req.body.retryOnFailure || false,
        maxRetries: req.body.maxRetries || 3,
        notifyOnStart: req.body.notifyOnStart || false,
        notifyOnComplete: req.body.notifyOnComplete || false,
        notifyOnFailure: req.body.notifyOnFailure !== undefined ? req.body.notifyOnFailure : true,
        notificationChannels: req.body.notificationChannels || [],
        createdBy: req.body.userId,
      };

      if (!schedule.name || !schedule.scheduleType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, scheduleType',
        });
      }

      // Validate schedule type configuration
      if (schedule.scheduleType === 'cron' && !schedule.cronExpression) {
        return res.status(400).json({
          success: false,
          error: 'cronExpression required for cron schedule type',
        });
      }

      if (schedule.scheduleType === 'one_time' && !schedule.scheduledTime) {
        return res.status(400).json({
          success: false,
          error: 'scheduledTime required for one_time schedule type',
        });
      }

      if (schedule.scheduleType === 'interval' && !schedule.intervalMinutes) {
        return res.status(400).json({
          success: false,
          error: 'intervalMinutes required for interval schedule type',
        });
      }

      const savedSchedule = await schedulingService.createSchedule(schedule);

      res.json({
        success: true,
        schedule: savedSchedule,
      });
    } catch (error) {
      console.error('Failed to create schedule:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create schedule',
      });
    }
  });

  /**
   * GET /api/simulations/schedules/:id
   * Get schedule details
   */
  app.get('/api/simulations/schedules/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query('SELECT * FROM simulation_schedules WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found',
        });
      }

      res.json({
        success: true,
        schedule: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch schedule',
      });
    }
  });

  /**
   * PUT /api/simulations/schedules/:id
   * Update schedule
   */
  app.put('/api/simulations/schedules/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      const fields = [
        'name',
        'description',
        'enabled',
        'schedule_type',
        'cron_expression',
        'scheduled_time',
        'interval_minutes',
        'timezone',
        'simulation_config',
        'business_hours_only',
        'maintenance_windows',
        'max_executions',
        'expires_at',
        'retry_on_failure',
        'max_retries',
        'notify_on_start',
        'notify_on_complete',
        'notify_on_failure',
        'notification_channels',
      ];

      for (const field of fields) {
        const camelField = field.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        if (req.body[camelField] !== undefined) {
          updates.push(`${field} = $${paramCount++}`);
          let value = req.body[camelField];

          // Handle JSON fields
          if (['simulation_config', 'maintenance_windows', 'notification_channels'].includes(field)) {
            value = JSON.stringify(value);
          }

          // Handle date fields
          if (['scheduled_time', 'expires_at'].includes(field) && value) {
            value = new Date(value);
          }

          values.push(value);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE simulation_schedules SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found',
        });
      }

      res.json({
        success: true,
        schedule: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to update schedule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update schedule',
      });
    }
  });

  /**
   * DELETE /api/simulations/schedules/:id
   * Delete schedule
   */
  app.delete('/api/simulations/schedules/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM simulation_schedules WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found',
        });
      }

      res.json({
        success: true,
        message: 'Schedule deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete schedule',
      });
    }
  });

  /**
   * PATCH /api/simulations/schedules/:id/enable
   * Enable schedule
   */
  app.patch('/api/simulations/schedules/:id/enable', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'UPDATE simulation_schedules SET enabled = true, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found',
        });
      }

      res.json({
        success: true,
        schedule: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to enable schedule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enable schedule',
      });
    }
  });

  /**
   * PATCH /api/simulations/schedules/:id/disable
   * Disable schedule
   */
  app.patch('/api/simulations/schedules/:id/disable', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'UPDATE simulation_schedules SET enabled = false, updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found',
        });
      }

      res.json({
        success: true,
        schedule: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to disable schedule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disable schedule',
      });
    }
  });

  /**
   * GET /api/simulations/schedules/:id/executions
   * Get schedule execution history
   */
  app.get('/api/simulations/schedules/:id/executions', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      const executions = await schedulingService.getScheduleExecutions(id, Number(limit));

      res.json({
        success: true,
        executions,
      });
    } catch (error) {
      console.error('Failed to fetch schedule executions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch schedule executions',
      });
    }
  });

  /**
   * GET /api/simulations/schedules/:id/stats
   * Get schedule statistics
   */
  app.get('/api/simulations/schedules/:id/stats', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const stats = await schedulingService.getScheduleStats(id);

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('Failed to fetch schedule stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch schedule statistics',
      });
    }
  });

  /**
   * GET /api/simulations/schedules/due
   * Get schedules due for execution
   */
  app.get('/api/simulations/schedules/due', async (req: Request, res: Response) => {
    try {
      const { bufferMinutes = 5 } = req.query;

      const result = await pool.query('SELECT * FROM get_due_schedules($1)', [Number(bufferMinutes)]);

      res.json({
        success: true,
        dueSchedules: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch due schedules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch due schedules',
      });
    }
  });

  /**
   * POST /api/simulations/schedules/:id/execute-now
   * Manually trigger schedule execution
   */
  app.post('/api/simulations/schedules/:id/execute-now', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get schedule
      const scheduleResult = await pool.query('SELECT * FROM simulation_schedules WHERE id = $1', [id]);

      if (scheduleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found',
        });
      }

      // Create execution record
      const executionResult = await pool.query(
        `INSERT INTO scheduled_executions (
          schedule_id, status, scheduled_for, started_at
        ) VALUES ($1, $2, NOW(), NOW())
        RETURNING id`,
        [id, 'running']
      );

      const executionId = executionResult.rows[0].id;

      // In production, this would trigger the actual simulation
      // For now, we'll just create the execution record

      res.json({
        success: true,
        executionId,
        message: 'Schedule execution triggered',
      });
    } catch (error) {
      console.error('Failed to trigger schedule execution:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger execution',
      });
    }
  });

  /**
   * GET /api/simulations/schedules/:id/history
   * Get schedule change history
   */
  app.get('/api/simulations/schedules/:id/history', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      const result = await pool.query(
        'SELECT * FROM schedule_change_history WHERE schedule_id = $1 ORDER BY changed_at DESC LIMIT $2',
        [id, Number(limit)]
      );

      res.json({
        success: true,
        history: result.rows,
      });
    } catch (error) {
      console.error('Failed to fetch schedule history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch schedule history',
      });
    }
  });

  /**
   * GET /api/simulations/schedule-types
   * Get supported schedule types and configuration
   */
  app.get('/api/simulations/schedule-types', async (req: Request, res: Response) => {
    res.json({
      success: true,
      scheduleTypes: [
        {
          id: 'cron',
          name: 'Cron-based',
          description: 'Recurring schedule using cron expressions',
          requiredFields: ['cronExpression'],
          examples: [
            { expression: '0 0 * * *', description: 'Daily at midnight' },
            { expression: '0 9 * * 1-5', description: 'Weekdays at 9 AM' },
            { expression: '0 */6 * * *', description: 'Every 6 hours' },
            { expression: '0 0 1 * *', description: 'First day of every month' },
          ],
        },
        {
          id: 'one_time',
          name: 'One-time',
          description: 'Execute once at a specific time',
          requiredFields: ['scheduledTime'],
          examples: [
            { description: 'Single execution at specified datetime' },
          ],
        },
        {
          id: 'interval',
          name: 'Interval-based',
          description: 'Recurring execution every N minutes',
          requiredFields: ['intervalMinutes'],
          examples: [
            { intervalMinutes: 60, description: 'Every hour' },
            { intervalMinutes: 1440, description: 'Every day' },
            { intervalMinutes: 10080, description: 'Every week' },
          ],
        },
      ],
      timezones: [
        'UTC',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Australia/Sydney',
      ],
    });
  });
}

export default setupSchedulingRoutes;
