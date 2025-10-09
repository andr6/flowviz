/**
 * Scheduling Service
 *
 * Advanced scheduling system for recurring attack simulations:
 * - Cron-based scheduling
 * - One-time scheduled simulations
 * - Maintenance windows
 * - Business hours awareness
 * - Multi-timezone support
 */

import { Pool } from 'pg';

export interface SimulationSchedule {
  id?: string;
  name: string;
  description?: string;
  enabled: boolean;

  // Schedule configuration
  scheduleType: 'cron' | 'one_time' | 'interval';
  cronExpression?: string; // For cron type: "0 0 * * *" (daily at midnight)
  scheduledTime?: Date; // For one_time type
  intervalMinutes?: number; // For interval type
  timezone: string; // e.g., "America/New_York", "UTC"

  // Simulation parameters
  simulationConfig: {
    techniques?: string[]; // MITRE ATT&CK technique IDs
    platformFilter?: string; // 'windows' | 'linux' | 'macos'
    executionMode?: 'safe' | 'live';
    targetEnvironment?: string;
    maxDuration?: number; // minutes
  };

  // Execution window
  businessHoursOnly?: boolean;
  maintenanceWindows?: Array<{
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    startTime?: string; // "HH:MM"
    endTime?: string; // "HH:MM"
  }>;

  // Execution tracking
  lastExecutionAt?: Date;
  lastExecutionJobId?: string;
  lastExecutionStatus?: 'success' | 'failed' | 'cancelled';
  nextExecutionAt?: Date;
  executionCount?: number;
  failureCount?: number;

  // Limits and controls
  maxExecutions?: number; // Stop after N executions
  expiresAt?: Date; // Schedule expiration
  retryOnFailure?: boolean;
  maxRetries?: number;

  // Notifications
  notifyOnStart?: boolean;
  notifyOnComplete?: boolean;
  notifyOnFailure?: boolean;
  notificationChannels?: string[];

  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ScheduledExecution {
  id?: string;
  scheduleId: string;
  jobId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount?: number;
}

/**
 * Scheduling Service
 */
export class SchedulingService {
  private pool: Pool;
  private schedules: Map<string, SimulationSchedule> = new Map();
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor(pool: Pool) {
    this.pool = pool;
    this.loadSchedules();
  }

  /**
   * Load active schedules from database
   */
  private async loadSchedules(): Promise<void> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM simulation_schedules WHERE enabled = true AND (expires_at IS NULL OR expires_at > NOW())'
      );

      for (const row of result.rows) {
        const schedule: SimulationSchedule = {
          id: row.id,
          name: row.name,
          description: row.description,
          enabled: row.enabled,
          scheduleType: row.schedule_type,
          cronExpression: row.cron_expression,
          scheduledTime: row.scheduled_time,
          intervalMinutes: row.interval_minutes,
          timezone: row.timezone,
          simulationConfig: row.simulation_config,
          businessHoursOnly: row.business_hours_only,
          maintenanceWindows: row.maintenance_windows,
          lastExecutionAt: row.last_execution_at,
          lastExecutionJobId: row.last_execution_job_id,
          lastExecutionStatus: row.last_execution_status,
          nextExecutionAt: row.next_execution_at,
          executionCount: row.execution_count,
          failureCount: row.failure_count,
          maxExecutions: row.max_executions,
          expiresAt: row.expires_at,
          retryOnFailure: row.retry_on_failure,
          maxRetries: row.max_retries,
          notifyOnStart: row.notify_on_start,
          notifyOnComplete: row.notify_on_complete,
          notifyOnFailure: row.notify_on_failure,
          notificationChannels: row.notification_channels,
          createdBy: row.created_by,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        this.schedules.set(schedule.id!, schedule);
      }

      console.log(`Loaded ${this.schedules.size} active schedules`);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
  }

  /**
   * Start scheduler (check every minute for due schedules)
   */
  startScheduler(): void {
    if (this.schedulerInterval) {
      console.log('Scheduler already running');
      return;
    }

    console.log('Starting simulation scheduler...');

    // Check for due schedules every minute
    this.schedulerInterval = setInterval(async () => {
      await this.checkAndExecuteSchedules();
    }, 60000); // 60 seconds

    // Also check immediately on start
    this.checkAndExecuteSchedules();
  }

  /**
   * Stop scheduler
   */
  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      console.log('Scheduler stopped');
    }
  }

  /**
   * Check and execute due schedules
   */
  private async checkAndExecuteSchedules(): Promise<void> {
    const now = new Date();

    for (const schedule of this.schedules.values()) {
      try {
        // Skip if not due yet
        if (schedule.nextExecutionAt && schedule.nextExecutionAt > now) {
          continue;
        }

        // Check if expired
        if (schedule.expiresAt && schedule.expiresAt <= now) {
          await this.disableSchedule(schedule.id!);
          continue;
        }

        // Check if max executions reached
        if (schedule.maxExecutions && schedule.executionCount! >= schedule.maxExecutions) {
          await this.disableSchedule(schedule.id!);
          continue;
        }

        // Check business hours
        if (schedule.businessHoursOnly && !this.isBusinessHours(now, schedule.timezone)) {
          continue;
        }

        // Check maintenance windows
        if (schedule.maintenanceWindows && this.isInMaintenanceWindow(now, schedule.maintenanceWindows, schedule.timezone)) {
          // Reschedule for after maintenance window
          continue;
        }

        // Execute the simulation
        await this.executeScheduledSimulation(schedule);

        // Calculate and update next execution time
        await this.updateNextExecution(schedule);
      } catch (error) {
        console.error(`Failed to process schedule ${schedule.id}:`, error);
      }
    }
  }

  /**
   * Execute scheduled simulation
   */
  private async executeScheduledSimulation(schedule: SimulationSchedule): Promise<void> {
    console.log(`Executing scheduled simulation: ${schedule.name}`);

    try {
      // Create scheduled execution record
      const executionResult = await this.pool.query(
        `INSERT INTO scheduled_executions (
          schedule_id, status, scheduled_for, started_at
        ) VALUES ($1, $2, $3, NOW())
        RETURNING id`,
        [schedule.id, 'running', schedule.nextExecutionAt]
      );

      const executionId = executionResult.rows[0].id;

      // Send start notification if configured
      if (schedule.notifyOnStart) {
        // Notification logic here
      }

      // Create simulation job (this would integrate with the simulation orchestration service)
      // For now, we'll simulate job creation
      const jobId = `job-${Date.now()}`;

      // Update execution with job ID
      await this.pool.query(
        'UPDATE scheduled_executions SET job_id = $1 WHERE id = $2',
        [jobId, executionId]
      );

      // Update schedule execution tracking
      await this.pool.query(
        `UPDATE simulation_schedules SET
          last_execution_at = NOW(),
          last_execution_job_id = $1,
          last_execution_status = $2,
          execution_count = execution_count + 1
         WHERE id = $3`,
        [jobId, 'success', schedule.id]
      );

      // Update execution status
      await this.pool.query(
        'UPDATE scheduled_executions SET status = $1, completed_at = NOW() WHERE id = $2',
        ['completed', executionId]
      );

      // Send completion notification if configured
      if (schedule.notifyOnComplete) {
        // Notification logic here
      }

      console.log(`Schedule ${schedule.name} executed successfully. Job ID: ${jobId}`);
    } catch (error) {
      console.error(`Failed to execute schedule ${schedule.name}:`, error);

      // Update failure count
      await this.pool.query(
        `UPDATE simulation_schedules SET
          last_execution_status = $1,
          failure_count = failure_count + 1
         WHERE id = $2`,
        ['failed', schedule.id]
      );

      // Send failure notification if configured
      if (schedule.notifyOnFailure) {
        // Notification logic here
      }

      // Retry logic if configured
      if (schedule.retryOnFailure) {
        // Schedule retry
      }
    }
  }

  /**
   * Update next execution time
   */
  private async updateNextExecution(schedule: SimulationSchedule): Promise<void> {
    let nextExecution: Date | null = null;

    switch (schedule.scheduleType) {
      case 'cron':
        nextExecution = this.calculateNextCronExecution(schedule.cronExpression!, schedule.timezone);
        break;

      case 'one_time':
        // One-time schedules don't repeat, disable after execution
        await this.disableSchedule(schedule.id!);
        return;

      case 'interval':
        nextExecution = new Date(Date.now() + (schedule.intervalMinutes! * 60 * 1000));
        break;
    }

    if (nextExecution) {
      await this.pool.query(
        'UPDATE simulation_schedules SET next_execution_at = $1 WHERE id = $2',
        [nextExecution, schedule.id]
      );

      schedule.nextExecutionAt = nextExecution;
    }
  }

  /**
   * Calculate next cron execution time
   */
  private calculateNextCronExecution(cronExpression: string, timezone: string): Date {
    // Simplified cron calculation
    // In production, use a library like 'node-cron' or 'cron-parser'

    // For demonstration, we'll calculate a simple daily schedule
    // Real implementation would parse cron expression properly
    const now = new Date();
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);

    return next;
  }

  /**
   * Check if current time is within business hours
   */
  private isBusinessHours(date: Date, timezone: string): boolean {
    // Convert to target timezone
    const localTime = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const hour = localTime.getHours();
    const day = localTime.getDay(); // 0 = Sunday, 6 = Saturday

    // Default business hours: Monday-Friday, 9 AM - 5 PM
    if (day === 0 || day === 6) {
      return false; // Weekend
    }

    if (hour < 9 || hour >= 17) {
      return false; // Outside 9-5
    }

    return true;
  }

  /**
   * Check if in maintenance window
   */
  private isInMaintenanceWindow(
    date: Date,
    windows: Array<{ dayOfWeek?: number; startTime?: string; endTime?: string }>,
    timezone: string
  ): boolean {
    const localTime = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const day = localTime.getDay();
    const timeStr = `${localTime.getHours().toString().padStart(2, '0')}:${localTime.getMinutes().toString().padStart(2, '0')}`;

    for (const window of windows) {
      if (window.dayOfWeek !== undefined && window.dayOfWeek !== day) {
        continue;
      }

      if (window.startTime && window.endTime) {
        if (timeStr >= window.startTime && timeStr <= window.endTime) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Disable schedule
   */
  private async disableSchedule(scheduleId: string): Promise<void> {
    await this.pool.query(
      'UPDATE simulation_schedules SET enabled = false WHERE id = $1',
      [scheduleId]
    );
    this.schedules.delete(scheduleId);
    console.log(`Schedule ${scheduleId} disabled`);
  }

  /**
   * Create new schedule
   */
  async createSchedule(schedule: Omit<SimulationSchedule, 'id'>): Promise<SimulationSchedule> {
    // Calculate initial next execution
    let nextExecution: Date | null = null;

    switch (schedule.scheduleType) {
      case 'cron':
        nextExecution = this.calculateNextCronExecution(schedule.cronExpression!, schedule.timezone);
        break;

      case 'one_time':
        nextExecution = schedule.scheduledTime!;
        break;

      case 'interval':
        nextExecution = new Date(Date.now() + (schedule.intervalMinutes! * 60 * 1000));
        break;
    }

    const result = await this.pool.query(
      `INSERT INTO simulation_schedules (
        name, description, enabled, schedule_type, cron_expression,
        scheduled_time, interval_minutes, timezone, simulation_config,
        business_hours_only, maintenance_windows, next_execution_at,
        max_executions, expires_at, retry_on_failure, max_retries,
        notify_on_start, notify_on_complete, notify_on_failure,
        notification_channels, execution_count, failure_count, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *`,
      [
        schedule.name,
        schedule.description,
        schedule.enabled,
        schedule.scheduleType,
        schedule.cronExpression,
        schedule.scheduledTime,
        schedule.intervalMinutes,
        schedule.timezone,
        JSON.stringify(schedule.simulationConfig),
        schedule.businessHoursOnly || false,
        JSON.stringify(schedule.maintenanceWindows || []),
        nextExecution,
        schedule.maxExecutions,
        schedule.expiresAt,
        schedule.retryOnFailure || false,
        schedule.maxRetries || 3,
        schedule.notifyOnStart || false,
        schedule.notifyOnComplete || false,
        schedule.notifyOnFailure || true,
        JSON.stringify(schedule.notificationChannels || []),
        0,
        0,
        schedule.createdBy,
      ]
    );

    const savedSchedule: SimulationSchedule = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      enabled: result.rows[0].enabled,
      scheduleType: result.rows[0].schedule_type,
      cronExpression: result.rows[0].cron_expression,
      scheduledTime: result.rows[0].scheduled_time,
      intervalMinutes: result.rows[0].interval_minutes,
      timezone: result.rows[0].timezone,
      simulationConfig: result.rows[0].simulation_config,
      businessHoursOnly: result.rows[0].business_hours_only,
      maintenanceWindows: result.rows[0].maintenance_windows,
      nextExecutionAt: result.rows[0].next_execution_at,
      maxExecutions: result.rows[0].max_executions,
      expiresAt: result.rows[0].expires_at,
      retryOnFailure: result.rows[0].retry_on_failure,
      maxRetries: result.rows[0].max_retries,
      notifyOnStart: result.rows[0].notify_on_start,
      notifyOnComplete: result.rows[0].notify_on_complete,
      notifyOnFailure: result.rows[0].notify_on_failure,
      notificationChannels: result.rows[0].notification_channels,
      executionCount: result.rows[0].execution_count,
      failureCount: result.rows[0].failure_count,
      createdBy: result.rows[0].created_by,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };

    if (savedSchedule.enabled) {
      this.schedules.set(savedSchedule.id!, savedSchedule);
    }

    return savedSchedule;
  }

  /**
   * Get schedule executions
   */
  async getScheduleExecutions(scheduleId: string, limit: number = 50): Promise<ScheduledExecution[]> {
    const result = await this.pool.query(
      'SELECT * FROM scheduled_executions WHERE schedule_id = $1 ORDER BY scheduled_for DESC LIMIT $2',
      [scheduleId, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      scheduleId: row.schedule_id,
      jobId: row.job_id,
      status: row.status,
      scheduledFor: row.scheduled_for,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      error: row.error,
      retryCount: row.retry_count,
    }));
  }

  /**
   * Get schedule statistics
   */
  async getScheduleStats(scheduleId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    averageExecutionTime?: number;
  }> {
    const result = await this.pool.query(
      `SELECT
        COUNT(*) as total_executions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_executions,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_executions,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_execution_time
       FROM scheduled_executions
       WHERE schedule_id = $1`,
      [scheduleId]
    );

    const row = result.rows[0];
    const totalExecutions = parseInt(row.total_executions) || 0;
    const successfulExecutions = parseInt(row.successful_executions) || 0;
    const failedExecutions = parseInt(row.failed_executions) || 0;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate: Math.round(successRate * 100) / 100,
      averageExecutionTime: row.avg_execution_time ? Math.round(parseFloat(row.avg_execution_time)) : undefined,
    };
  }
}

export default SchedulingService;
