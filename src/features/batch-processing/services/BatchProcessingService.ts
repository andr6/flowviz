import { EventEmitter } from 'events';

import { v4 as uuidv4 } from 'uuid';

import { LIMITS } from '../../../shared/constants/AppConstants';
import { logger } from '../../../shared/utils/logger';
import {
  BatchJob,
  BatchJobConfig,
  BatchJobResult,
  BatchJobType,
  JobPriority,
  DocumentSource,
  BatchMetrics,
  WorkerInfo,
} from '../types/BatchTypes';

export class BatchProcessingService extends EventEmitter {
  private static instance: BatchProcessingService;
  private jobs: Map<string, BatchJob> = new Map();
  private queues: Map<JobPriority, BatchJob[]> = new Map([
    ['critical', []],
    ['high', []],
    ['normal', []],
    ['low', []],
  ]);
  private workers: Map<string, WorkerInfo> = new Map();
  private isProcessing = false;
  private maxConcurrentJobs = 5;
  private processingInterval?: NodeJS.Timeout;

  private constructor() {
    super();
    this.startProcessing();
  }

  static getInstance(): BatchProcessingService {
    if (!BatchProcessingService.instance) {
      BatchProcessingService.instance = new BatchProcessingService();
    }
    return BatchProcessingService.instance;
  }

  /**
   * Submit a new batch job for processing
   */
  async submitJob(
    type: BatchJobType,
    config: BatchJobConfig,
    priority: JobPriority = 'normal',
    metadata?: { userId?: string; tags?: string[]; description?: string }
  ): Promise<string> {
    const jobId = uuidv4();
    const now = new Date();

    const job: BatchJob = {
      id: jobId,
      type,
      status: 'queued',
      priority,
      createdAt: now,
      updatedAt: now,
      progress: {
        total: 0,
        completed: 0,
        failed: 0,
        percentage: 0,
      },
      metadata: {
        userId: metadata?.userId,
        tags: metadata?.tags || [],
        description: metadata?.description || `${type} job`,
      },
      config,
      results: [],
      errors: [],
    };

    // Calculate estimated total items
    if (config.documents?.sources) {
      job.progress.total = await this.estimateDocumentCount(config.documents.sources);
    }

    this.jobs.set(jobId, job);
    this.queues.get(priority)?.push(job);

    logger.info(`Batch job submitted: ${jobId} (${type})`);
    this.emit('jobSubmitted', job);

    return jobId;
  }

  /**
   * Start bulk document processing
   */
  async submitBulkDocumentAnalysis(
    documents: File[] | DocumentSource[],
    options: {
      aiProvider?: 'claude' | 'openai' | 'ollama' | 'openrouter';
      analysisDepth?: 'fast' | 'standard' | 'comprehensive';
      enableDuplicateDetection?: boolean;
      enableIOCExtraction?: boolean;
      batchSize?: number;
      priority?: JobPriority;
      userId?: string;
      tags?: string[];
    } = {}
  ): Promise<string> {
    const config: BatchJobConfig = {
      documents: {
        sources: this.convertToDocumentSources(documents),
        formats: ['pdf', 'txt', 'docx', 'html'],
        maxFileSize: LIMITS.REQUEST.MAX_ARTICLE_SIZE,
        concurrency: options.batchSize || 3,
        aiProvider: options.aiProvider || 'claude',
        analysisDepth: options.analysisDepth || 'standard',
      },
      processing: {
        enableDuplicateDetection: options.enableDuplicateDetection ?? true,
        enableIOCExtraction: options.enableIOCExtraction ?? true,
        enableEnrichment: true,
        confidenceThreshold: 0.7,
        batchSize: options.batchSize || 10,
      },
      output: {
        format: 'json',
        destination: 'database',
        notifications: [],
      },
    };

    return this.submitJob(
      'bulk_document_analysis',
      config,
      options.priority || 'normal',
      {
        userId: options.userId,
        tags: options.tags,
        description: `Bulk analysis of ${Array.isArray(documents) ? documents.length : 'multiple'} documents`,
      }
    );
  }

  /**
   * Get job status and progress
   */
  getJob(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs for a user
   */
  getUserJobs(userId: string): BatchJob[] {
    return Array.from(this.jobs.values()).filter(
      job => job.metadata.userId === userId
    );
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {return false;}

    if (job.status === 'running') {
      job.status = 'cancelled';
      job.updatedAt = new Date();
      logger.info(`Cancelled running job: ${jobId}`);
      this.emit('jobCancelled', job);
    } else if (job.status === 'queued') {
      // Remove from queue
      const queue = this.queues.get(job.priority);
      if (queue) {
        const index = queue.findIndex(j => j.id === jobId);
        if (index !== -1) {
          queue.splice(index, 1);
        }
      }
      job.status = 'cancelled';
      job.updatedAt = new Date();
      logger.info(`Cancelled queued job: ${jobId}`);
      this.emit('jobCancelled', job);
    }

    return true;
  }

  /**
   * Pause a job
   */
  async pauseJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'running') {return false;}

    job.status = 'paused';
    job.updatedAt = new Date();
    logger.info(`Paused job: ${jobId}`);
    this.emit('jobPaused', job);
    return true;
  }

  /**
   * Resume a paused job
   */
  async resumeJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'paused') {return false;}

    job.status = 'queued';
    job.updatedAt = new Date();
    this.queues.get(job.priority)?.push(job);
    logger.info(`Resumed job: ${jobId}`);
    this.emit('jobResumed', job);
    return true;
  }

  /**
   * Get batch processing metrics
   */
  getMetrics(): BatchMetrics {
    const allJobs = Array.from(this.jobs.values());
    const totalJobs = allJobs.length;
    const activeJobs = allJobs.filter(j => j.status === 'running').length;
    const completedJobs = allJobs.filter(j => j.status === 'completed').length;
    const failedJobs = allJobs.filter(j => j.status === 'failed').length;

    const completedJobsWithTimes = allJobs.filter(
      j => j.status === 'completed' && j.startedAt && j.completedAt
    );

    const averageProcessingTime = completedJobsWithTimes.length > 0
      ? completedJobsWithTimes.reduce((sum, job) => {
          const duration = job.completedAt!.getTime() - job.startedAt!.getTime();
          return sum + duration;
        }, 0) / completedJobsWithTimes.length
      : 0;

    const lastHourJobs = allJobs.filter(
      j => j.completedAt && j.completedAt.getTime() > Date.now() - 3600000
    );

    const queuedJobs = Array.from(this.queues.values()).flat();
    const oldestJob = queuedJobs.length > 0
      ? Math.min(...queuedJobs.map(j => j.createdAt.getTime()))
      : Date.now();

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      averageProcessingTime,
      throughputPerHour: lastHourJobs.length,
      errorRate: totalJobs > 0 ? failedJobs / totalJobs : 0,
      resourceUtilization: {
        cpu: this.getCPUUsage(),
        memory: this.getMemoryUsage(),
        disk: 0, // TODO: Implement disk usage monitoring
        network: 0, // TODO: Implement network usage monitoring
      },
      queueHealth: {
        backlogSize: queuedJobs.length,
        oldestJobAge: Date.now() - oldestJob,
        averageWaitTime: this.calculateAverageWaitTime(),
      },
    };
  }

  /**
   * Start the job processing loop
   */
  private startProcessing(): void {
    if (this.isProcessing) {return;}

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processNextJob();
    }, 1000); // Check for new jobs every second

    logger.info('Batch processing service started');
  }

  /**
   * Stop the job processing loop
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.isProcessing = false;
    logger.info('Batch processing service stopped');
  }

  /**
   * Process the next job in the queue
   */
  private async processNextJob(): Promise<void> {
    const runningJobs = Array.from(this.jobs.values()).filter(
      j => j.status === 'running'
    ).length;

    if (runningJobs >= this.maxConcurrentJobs) {
      return; // Too many jobs running
    }

    // Find highest priority job
    const priorities: JobPriority[] = ['critical', 'high', 'normal', 'low'];
    let nextJob: BatchJob | undefined;

    for (const priority of priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        nextJob = queue.shift();
        break;
      }
    }

    if (!nextJob) {
      return; // No jobs to process
    }

    try {
      await this.executeJob(nextJob);
    } catch (error) {
      logger.error(`Failed to execute job ${nextJob.id}:`, error);
      nextJob.status = 'failed';
      nextJob.updatedAt = new Date();
      nextJob.errors?.push({
        id: uuidv4(),
        timestamp: new Date(),
        level: 'critical',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
        retryable: false,
      });
      this.emit('jobFailed', nextJob);
    }
  }

  /**
   * Execute a specific job
   */
  private async executeJob(job: BatchJob): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date();
    job.updatedAt = new Date();

    logger.info(`Starting job execution: ${job.id} (${job.type})`);
    this.emit('jobStarted', job);

    try {
      switch (job.type) {
        case 'bulk_document_analysis':
          await this.executeBulkDocumentAnalysis(job);
          break;
        case 'ioc_extraction_pipeline':
          await this.executeIOCExtractionPipeline(job);
          break;
        case 'duplicate_detection':
          await this.executeDuplicateDetection(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.updatedAt = new Date();
      job.progress.percentage = 100;

      logger.info(`Job completed: ${job.id}`);
      this.emit('jobCompleted', job);
    } catch (error) {
      throw error; // Re-throw to be handled by processNextJob
    }
  }

  /**
   * Execute bulk document analysis
   */
  private async executeBulkDocumentAnalysis(job: BatchJob): Promise<void> {
    const config = job.config.documents;
    if (!config?.sources) {
      throw new Error('No document sources configured');
    }

    const batchSize = config.concurrency || 3;
    let processedCount = 0;

    for (let i = 0; i < config.sources.length; i += batchSize) {
      if (job.status === 'cancelled' || job.status === 'paused') {
        break;
      }

      const batch = config.sources.slice(i, i + batchSize);
      const batchPromises = batch.map(source => this.processDocument(source, job));

      try {
        const results = await Promise.allSettled(batchPromises);
        
        results.forEach((result, index) => {
          processedCount++;
          if (result.status === 'fulfilled') {
            job.progress.completed++;
            job.results?.push(result.value);
          } else {
            job.progress.failed++;
            job.errors?.push({
              id: uuidv4(),
              timestamp: new Date(),
              level: 'error',
              message: result.reason?.message || 'Document processing failed',
              details: result.reason,
              sourceId: batch[index].location,
              retryable: true,
            });
          }
        });

        // Update progress
        job.progress.percentage = Math.round((processedCount / job.progress.total) * 100);
        job.updatedAt = new Date();
        this.emit('jobProgress', job);

      } catch (error) {
        logger.error(`Batch processing error:`, error);
      }
    }
  }

  /**
   * Process a single document
   */
  private async processDocument(source: DocumentSource, job: BatchJob): Promise<BatchJobResult> {
    const startTime = Date.now();

    try {
      // TODO: Implement actual document processing
      // This would integrate with the existing flow analysis services
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      const result: BatchJobResult = {
        id: uuidv4(),
        sourceId: source.location,
        status: 'success',
        processedAt: new Date(),
        processingTime: Date.now() - startTime,
        data: {
          flowData: {}, // TODO: Actual flow data
          iocs: [], // TODO: Extracted IOCs
          confidence: 0.85,
        },
        metadata: {
          filename: source.location.split('/').pop(),
          sourceUrl: source.location,
        },
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to process document ${source.location}: ${error}`);
    }
  }

  /**
   * Execute IOC extraction pipeline
   */
  private async executeIOCExtractionPipeline(job: BatchJob): Promise<void> {
    // TODO: Implement IOC extraction pipeline
    logger.info(`Executing IOC extraction pipeline for job ${job.id}`);
  }

  /**
   * Execute duplicate detection
   */
  private async executeDuplicateDetection(job: BatchJob): Promise<void> {
    // TODO: Implement duplicate detection
    logger.info(`Executing duplicate detection for job ${job.id}`);
  }

  /**
   * Utility methods
   */
  private async estimateDocumentCount(sources: DocumentSource[]): Promise<number> {
    // Simple estimation - in real implementation, this would check actual file counts
    return sources.length;
  }

  private convertToDocumentSources(documents: File[] | DocumentSource[]): DocumentSource[] {
    if (documents.length === 0) {return [];}
    
    const first = documents[0];
    if (first instanceof File) {
      return (documents as File[]).map(file => ({
        type: 'file' as const,
        location: file.name,
      }));
    } else {
      return documents as DocumentSource[];
    }
  }

  private getCPUUsage(): number {
    // TODO: Implement actual CPU usage monitoring
    return Math.random() * 100;
  }

  private getMemoryUsage(): number {
    // TODO: Implement actual memory usage monitoring
    return Math.random() * 100;
  }

  private calculateAverageWaitTime(): number {
    const queuedJobs = Array.from(this.queues.values()).flat();
    if (queuedJobs.length === 0) {return 0;}

    const totalWaitTime = queuedJobs.reduce((sum, job) => {
      return sum + (Date.now() - job.createdAt.getTime());
    }, 0);

    return totalWaitTime / queuedJobs.length;
  }
}

export const batchProcessingService = BatchProcessingService.getInstance();