import { EventEmitter } from 'events';

import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../../shared/utils/logger';
import { DocumentSource, BatchJobConfig, JobPriority } from '../types/BatchTypes';

import { batchProcessingService } from './BatchProcessingService';

export interface ScheduledJob {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  config: ScheduledJobConfig;
  metadata: {
    userId?: string;
    tags: string[];
    retryPolicy: RetryPolicy;
  };
}

export interface ScheduledJobConfig {
  type: 'feed_analysis' | 'bulk_analysis' | 'ioc_extraction';
  sources: DocumentSource[];
  processing: {
    aiProvider: 'claude' | 'openai' | 'ollama' | 'openrouter';
    analysisDepth: 'fast' | 'standard' | 'comprehensive';
    enableDuplicateDetection: boolean;
    enableIOCExtraction: boolean;
    batchSize: number;
    priority: JobPriority;
  };
  output: {
    format: 'json' | 'stix' | 'misp' | 'csv';
    destination: 'database' | 's3' | 'webhook';
    webhookUrl?: string;
    retentionDays?: number;
  };
  filters?: {
    dateRange?: { hours?: number; days?: number };
    fileTypes?: string[];
    sizeRange?: { min: number; max: number };
    keywords?: string[];
    excludeKeywords?: string[];
  };
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryableErrors: string[];
}

export interface ScheduledJobRun {
  id: string;
  scheduledJobId: string;
  batchJobId?: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'retrying';
  error?: string;
  retryCount: number;
  metrics?: {
    documentsProcessed: number;
    duplicatesFound: number;
    iocsExtracted: number;
    processingTime: number;
  };
}

export class ScheduledAnalysisService extends EventEmitter {
  private static instance: ScheduledAnalysisService;
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private cronTasks: Map<string, cron.ScheduledTask> = new Map();
  private jobRuns: Map<string, ScheduledJobRun> = new Map();
  private isRunning = false;

  private constructor() {
    super();
  }

  static getInstance(): ScheduledAnalysisService {
    if (!ScheduledAnalysisService.instance) {
      ScheduledAnalysisService.instance = new ScheduledAnalysisService();
    }
    return ScheduledAnalysisService.instance;
  }

  /**
   * Start the scheduled analysis service
   */
  start(): void {
    if (this.isRunning) {return;}

    this.isRunning = true;
    
    // Start all enabled scheduled jobs
    for (const job of this.scheduledJobs.values()) {
      if (job.enabled) {
        this.startScheduledJob(job);
      }
    }

    logger.info('Scheduled Analysis Service started');
  }

  /**
   * Stop the scheduled analysis service
   */
  stop(): void {
    if (!this.isRunning) {return;}

    // Stop all cron tasks
    for (const task of this.cronTasks.values()) {
      task.stop();
    }
    this.cronTasks.clear();

    this.isRunning = false;
    logger.info('Scheduled Analysis Service stopped');
  }

  /**
   * Create a new scheduled job
   */
  async createScheduledJob(
    name: string,
    description: string,
    cronExpression: string,
    config: ScheduledJobConfig,
    options: {
      timezone?: string;
      enabled?: boolean;
      userId?: string;
      tags?: string[];
      retryPolicy?: Partial<RetryPolicy>;
    } = {}
  ): Promise<string> {
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error('Invalid cron expression');
    }

    const jobId = uuidv4();
    const now = new Date();

    const defaultRetryPolicy: RetryPolicy = {
      maxRetries: 3,
      backoffMultiplier: 2,
      maxBackoffMs: 300000, // 5 minutes
      retryableErrors: ['Network error', 'Timeout', 'Rate limit', 'Service unavailable'],
    };

    const job: ScheduledJob = {
      id: jobId,
      name,
      description,
      cronExpression,
      timezone: options.timezone || 'UTC',
      enabled: options.enabled !== false,
      createdAt: now,
      updatedAt: now,
      nextRun: this.calculateNextRun(cronExpression, options.timezone),
      runCount: 0,
      config,
      metadata: {
        userId: options.userId,
        tags: options.tags || [],
        retryPolicy: { ...defaultRetryPolicy, ...options.retryPolicy },
      },
    };

    this.scheduledJobs.set(jobId, job);

    if (job.enabled && this.isRunning) {
      this.startScheduledJob(job);
    }

    logger.info(`Created scheduled job: ${jobId} (${name})`);
    this.emit('jobCreated', job);

    return jobId;
  }

  /**
   * Update a scheduled job
   */
  async updateScheduledJob(
    jobId: string,
    updates: Partial<ScheduledJob>
  ): Promise<boolean> {
    const job = this.scheduledJobs.get(jobId);
    if (!job) {return false;}

    // Stop existing cron task if changing timing or disabling
    if (updates.cronExpression || updates.enabled === false) {
      const task = this.cronTasks.get(jobId);
      if (task) {
        task.stop();
        this.cronTasks.delete(jobId);
      }
    }

    // Apply updates
    Object.assign(job, updates, { updatedAt: new Date() });

    // Recalculate next run if cron expression changed
    if (updates.cronExpression) {
      job.nextRun = this.calculateNextRun(job.cronExpression, job.timezone);
    }

    // Restart if enabled and service is running
    if (job.enabled && this.isRunning && (updates.cronExpression || updates.enabled)) {
      this.startScheduledJob(job);
    }

    logger.info(`Updated scheduled job: ${jobId}`);
    this.emit('jobUpdated', job);

    return true;
  }

  /**
   * Delete a scheduled job
   */
  async deleteScheduledJob(jobId: string): Promise<boolean> {
    const job = this.scheduledJobs.get(jobId);
    if (!job) {return false;}

    // Stop cron task
    const task = this.cronTasks.get(jobId);
    if (task) {
      task.stop();
      this.cronTasks.delete(jobId);
    }

    this.scheduledJobs.delete(jobId);

    logger.info(`Deleted scheduled job: ${jobId}`);
    this.emit('jobDeleted', job);

    return true;
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): ScheduledJob[] {
    return Array.from(this.scheduledJobs.values());
  }

  /**
   * Get scheduled jobs for a specific user
   */
  getUserScheduledJobs(userId: string): ScheduledJob[] {
    return Array.from(this.scheduledJobs.values()).filter(
      job => job.metadata.userId === userId
    );
  }

  /**
   * Get a specific scheduled job
   */
  getScheduledJob(jobId: string): ScheduledJob | undefined {
    return this.scheduledJobs.get(jobId);
  }

  /**
   * Get job runs for a scheduled job
   */
  getJobRuns(scheduledJobId: string): ScheduledJobRun[] {
    return Array.from(this.jobRuns.values()).filter(
      run => run.scheduledJobId === scheduledJobId
    );
  }

  /**
   * Manually trigger a scheduled job
   */
  async triggerJob(jobId: string): Promise<string> {
    const job = this.scheduledJobs.get(jobId);
    if (!job) {
      throw new Error('Scheduled job not found');
    }

    return this.executeScheduledJob(job, true);
  }

  /**
   * Create predefined scheduled jobs for common use cases
   */
  async createDailyThreatFeedAnalysis(
    userId: string,
    feeds: string[],
    options: {
      time?: string; // HH:mm format
      timezone?: string;
      aiProvider?: 'claude' | 'openai' | 'ollama' | 'openrouter';
    } = {}
  ): Promise<string> {
    const time = options.time || '06:00';
    const [hour, minute] = time.split(':');
    const cronExpression = `${minute} ${hour} * * *`; // Daily at specified time

    const sources: DocumentSource[] = feeds.map(url => ({
      type: 'url',
      location: url,
      filters: {
        extensions: ['xml', 'json', 'csv'],
        dateRange: { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() },
      },
    }));

    return this.createScheduledJob(
      'Daily Threat Feed Analysis',
      'Automated daily analysis of threat intelligence feeds',
      cronExpression,
      {
        type: 'feed_analysis',
        sources,
        processing: {
          aiProvider: options.aiProvider || 'claude',
          analysisDepth: 'standard',
          enableDuplicateDetection: true,
          enableIOCExtraction: true,
          batchSize: 10,
          priority: 'normal',
        },
        output: {
          format: 'stix',
          destination: 'database',
          retentionDays: 90,
        },
        filters: {
          dateRange: { hours: 24 },
          keywords: ['threat', 'malware', 'vulnerability', 'attack', 'breach'],
        },
      },
      {
        timezone: options.timezone || 'UTC',
        enabled: true,
        userId,
        tags: ['threat-feed', 'daily', 'automated'],
      }
    );
  }

  /**
   * Create weekly comprehensive analysis
   */
  async createWeeklyComprehensiveAnalysis(
    userId: string,
    sources: DocumentSource[],
    options: {
      dayOfWeek?: number; // 0-6 (Sunday-Saturday)
      time?: string;
      timezone?: string;
    } = {}
  ): Promise<string> {
    const dayOfWeek = options.dayOfWeek || 1; // Default to Monday
    const time = options.time || '02:00';
    const [hour, minute] = time.split(':');
    const cronExpression = `${minute} ${hour} * * ${dayOfWeek}`;

    return this.createScheduledJob(
      'Weekly Comprehensive Analysis',
      'Weekly deep analysis of collected documents and feeds',
      cronExpression,
      {
        type: 'bulk_analysis',
        sources,
        processing: {
          aiProvider: 'claude',
          analysisDepth: 'comprehensive',
          enableDuplicateDetection: true,
          enableIOCExtraction: true,
          batchSize: 5,
          priority: 'high',
        },
        output: {
          format: 'json',
          destination: 'database',
          retentionDays: 365,
        },
        filters: {
          dateRange: { days: 7 },
        },
      },
      {
        timezone: options.timezone || 'UTC',
        enabled: true,
        userId,
        tags: ['comprehensive', 'weekly', 'automated'],
      }
    );
  }

  /**
   * Start a scheduled job's cron task
   */
  private startScheduledJob(job: ScheduledJob): void {
    const task = cron.schedule(
      job.cronExpression,
      () => {
        this.executeScheduledJob(job);
      },
      {
        scheduled: false,
        timezone: job.timezone,
      }
    );

    task.start();
    this.cronTasks.set(job.id, task);

    logger.info(`Started scheduled job: ${job.id} with cron: ${job.cronExpression}`);
  }

  /**
   * Execute a scheduled job
   */
  private async executeScheduledJob(job: ScheduledJob, isManual = false): Promise<string> {
    const runId = uuidv4();
    const run: ScheduledJobRun = {
      id: runId,
      scheduledJobId: job.id,
      startedAt: new Date(),
      status: 'running',
      retryCount: 0,
    };

    this.jobRuns.set(runId, run);

    try {
      logger.info(`Executing scheduled job: ${job.id} (${job.name})${isManual ? ' [MANUAL]' : ''}`);

      // Apply filters to sources
      const filteredSources = await this.applyFilters(job.config.sources, job.config.filters);

      if (filteredSources.length === 0) {
        logger.info(`No sources match filters for job: ${job.id}`);
        run.status = 'completed';
        run.completedAt = new Date();
        run.metrics = {
          documentsProcessed: 0,
          duplicatesFound: 0,
          iocsExtracted: 0,
          processingTime: 0,
        };
        return runId;
      }

      // Create batch job configuration
      const batchConfig: BatchJobConfig = {
        documents: {
          sources: filteredSources,
          formats: ['pdf', 'txt', 'html', 'json', 'xml'],
          maxFileSize: 10485760, // 10MB
          concurrency: job.config.processing.batchSize,
          aiProvider: job.config.processing.aiProvider,
          analysisDepth: job.config.processing.analysisDepth,
        },
        processing: {
          enableDuplicateDetection: job.config.processing.enableDuplicateDetection,
          enableIOCExtraction: job.config.processing.enableIOCExtraction,
          enableEnrichment: true,
          confidenceThreshold: 0.7,
          batchSize: job.config.processing.batchSize,
        },
        output: {
          format: job.config.output.format,
          destination: job.config.output.destination,
          notifications: [],
        },
      };

      // Submit batch job
      const batchJobId = await batchProcessingService.submitJob(
        'scheduled_feed_analysis',
        batchConfig,
        job.config.processing.priority,
        {
          userId: job.metadata.userId,
          tags: [...job.metadata.tags, 'scheduled', job.id],
          description: `Scheduled: ${job.name}`,
        }
      );

      run.batchJobId = batchJobId;

      // Update job statistics
      job.runCount++;
      job.lastRun = new Date();
      job.nextRun = this.calculateNextRun(job.cronExpression, job.timezone);
      job.updatedAt = new Date();

      // Monitor batch job completion
      this.monitorBatchJob(run, batchJobId);

      logger.info(`Scheduled job ${job.id} submitted as batch job: ${batchJobId}`);
      this.emit('jobExecuted', job, run);

      return runId;

    } catch (error) {
      run.status = 'failed';
      run.error = error instanceof Error ? error.message : 'Unknown error';
      run.completedAt = new Date();

      logger.error(`Scheduled job execution failed: ${job.id}`, error);
      this.emit('jobFailed', job, run);

      // Handle retry logic
      if (this.shouldRetry(error, job.metadata.retryPolicy, run.retryCount)) {
        setTimeout(() => {
          this.retryJob(job, run);
        }, this.calculateBackoff(run.retryCount, job.metadata.retryPolicy));
      }

      throw error;
    }
  }

  /**
   * Apply filters to document sources
   */
  private async applyFilters(
    sources: DocumentSource[],
    filters?: ScheduledJobConfig['filters']
  ): Promise<DocumentSource[]> {
    if (!filters) {return sources;}

    let filteredSources = [...sources];

    // Apply date range filter
    if (filters.dateRange) {
      const cutoffTime = new Date();
      if (filters.dateRange.hours) {
        cutoffTime.setHours(cutoffTime.getHours() - filters.dateRange.hours);
      }
      if (filters.dateRange.days) {
        cutoffTime.setDate(cutoffTime.getDate() - filters.dateRange.days);
      }

      filteredSources = filteredSources.map(source => ({
        ...source,
        filters: {
          ...source.filters,
          dateRange: {
            start: cutoffTime,
            end: new Date(),
          },
        },
      }));
    }

    // Apply file type filter
    if (filters.fileTypes) {
      filteredSources = filteredSources.map(source => ({
        ...source,
        filters: {
          ...source.filters,
          extensions: filters.fileTypes,
        },
      }));
    }

    // Apply size range filter
    if (filters.sizeRange) {
      filteredSources = filteredSources.map(source => ({
        ...source,
        filters: {
          ...source.filters,
          sizeRange: filters.sizeRange,
        },
      }));
    }

    return filteredSources;
  }

  /**
   * Monitor batch job completion
   */
  private monitorBatchJob(run: ScheduledJobRun, batchJobId: string): void {
    const checkStatus = () => {
      const batchJob = batchProcessingService.getJob(batchJobId);
      if (!batchJob) {return;}

      if (batchJob.status === 'completed') {
        run.status = 'completed';
        run.completedAt = new Date();
        run.metrics = {
          documentsProcessed: batchJob.progress.completed,
          duplicatesFound: 0, // TODO: Get from duplicate detection service
          iocsExtracted: 0, // TODO: Get from IOC extraction
          processingTime: batchJob.completedAt && batchJob.startedAt
            ? batchJob.completedAt.getTime() - batchJob.startedAt.getTime()
            : 0,
        };
        this.emit('jobCompleted', run);
      } else if (batchJob.status === 'failed') {
        run.status = 'failed';
        run.error = batchJob.errors?.[0]?.message || 'Batch job failed';
        run.completedAt = new Date();
        this.emit('jobFailed', run);
      } else {
        // Still running, check again in 30 seconds
        setTimeout(checkStatus, 30000);
      }
    };

    // Start monitoring after 10 seconds
    setTimeout(checkStatus, 10000);
  }

  /**
   * Calculate next run time for a cron expression
   */
  private calculateNextRun(cronExpression: string, timezone?: string): Date {
    // This is a simplified implementation
    // In a real application, you'd use a proper cron parser
    const now = new Date();
    return new Date(now.getTime() + 60000); // Next minute (placeholder)
  }

  /**
   * Check if a job should be retried
   */
  private shouldRetry(error: any, retryPolicy: RetryPolicy, currentRetryCount: number): boolean {
    if (currentRetryCount >= retryPolicy.maxRetries) {return false;}

    const errorMessage = error instanceof Error ? error.message : String(error);
    return retryPolicy.retryableErrors.some(retryableError =>
      errorMessage.toLowerCase().includes(retryableError.toLowerCase())
    );
  }

  /**
   * Calculate backoff delay for retry
   */
  private calculateBackoff(retryCount: number, retryPolicy: RetryPolicy): number {
    const baseDelay = 1000; // 1 second
    const delay = baseDelay * Math.pow(retryPolicy.backoffMultiplier, retryCount);
    return Math.min(delay, retryPolicy.maxBackoffMs);
  }

  /**
   * Retry a failed job
   */
  private async retryJob(job: ScheduledJob, run: ScheduledJobRun): Promise<void> {
    run.retryCount++;
    run.status = 'retrying';

    logger.info(`Retrying scheduled job: ${job.id} (attempt ${run.retryCount})`);

    try {
      await this.executeScheduledJob(job);
    } catch (error) {
      logger.error(`Retry failed for scheduled job: ${job.id}`, error);
    }
  }

  /**
   * Get scheduling statistics
   */
  getStatistics(): {
    totalScheduledJobs: number;
    enabledJobs: number;
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    averageRunTime: number;
  } {
    const totalScheduledJobs = this.scheduledJobs.size;
    const enabledJobs = Array.from(this.scheduledJobs.values()).filter(j => j.enabled).length;
    
    const runs = Array.from(this.jobRuns.values());
    const totalRuns = runs.length;
    const successfulRuns = runs.filter(r => r.status === 'completed').length;
    const failedRuns = runs.filter(r => r.status === 'failed').length;
    
    const completedRuns = runs.filter(r => r.status === 'completed' && r.completedAt);
    const averageRunTime = completedRuns.length > 0
      ? completedRuns.reduce((sum, run) => {
          const duration = run.completedAt!.getTime() - run.startedAt.getTime();
          return sum + duration;
        }, 0) / completedRuns.length
      : 0;

    return {
      totalScheduledJobs,
      enabledJobs,
      totalRuns,
      successfulRuns,
      failedRuns,
      averageRunTime,
    };
  }
}

export const scheduledAnalysisService = ScheduledAnalysisService.getInstance();