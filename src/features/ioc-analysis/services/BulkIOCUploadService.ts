import { IOC, IOCType } from '../types/IOC';
import { IOCExtractorService } from './IOCExtractorService';
import { IOCConfidenceScoringService } from './IOCConfidenceScoring';
import { FalsePositiveLearningService } from './FalsePositiveLearningService';
import { logger } from '../../../shared/utils/logger';

export interface BulkUploadJob {
  id: string;
  name: string;
  description?: string;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  skippedItems: number;
  duplicateItems: number;
  userId: string;
  settings: BulkUploadSettings;
  results: BulkUploadResult;
  errors: BulkUploadError[];
  metadata: {
    fileName?: string;
    fileSize?: number;
    fileType: UploadFileType;
    estimatedTime?: number;
    actualTime?: number;
  };
}

export type JobStatus = 
  | 'pending'
  | 'validating'
  | 'processing'
  | 'enriching'
  | 'analyzing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export type UploadFileType = 'csv' | 'json' | 'txt' | 'xml' | 'stix' | 'misp';

export interface BulkUploadSettings {
  enableDuplicateDetection: boolean;
  duplicateCheckFields: ('value' | 'type' | 'context')[];
  enableConfidenceScoring: boolean;
  enableEnrichment: boolean;
  enableFalsePositivePrediction: boolean;
  batchSize: number;
  maxConcurrency: number;
  timeoutPerItem: number; // ms
  retryFailedItems: boolean;
  maxRetries: number;
  skipInvalidItems: boolean;
  defaultTags: string[];
  defaultSource: string;
  priorityQueue: 'fifo' | 'confidence' | 'type';
  enableNotifications: boolean;
  notificationThresholds: {
    errorRate: number; // 0-1
    completionPercentage: number; // 0-100
  };
}

export interface BulkUploadResult {
  processedIOCs: ProcessedIOC[];
  summary: {
    totalProcessed: number;
    byType: Record<IOCType, number>;
    byConfidence: Record<string, number>;
    byThreatLevel: Record<string, number>;
    duplicatesFound: number;
    falsePositivesPredicted: number;
    averageProcessingTime: number;
    enrichmentCoverage: number;
  };
  statistics: {
    topIOCTypes: { type: IOCType; count: number; percentage: number }[];
    confidenceDistribution: { range: string; count: number }[];
    errorsByType: Record<string, number>;
    processingTimePercentiles: {
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };
  qualityMetrics: {
    dataQualityScore: number; // 0-100
    completenessScore: number; // 0-100
    consistencyScore: number; // 0-100
    validationIssues: ValidationIssue[];
  };
}

export interface ProcessedIOC {
  originalData: RawIOCData;
  parsedIOC: IOC;
  confidence?: any; // ConfidenceScore
  enrichmentResults?: any[]; // EnrichmentResult[]
  falsePositivePrediction?: {
    probability: number;
    confidence: number;
    reasoning: string[];
  };
  processingTime: number;
  errors?: string[];
  warnings?: string[];
  status: 'success' | 'failed' | 'skipped' | 'duplicate';
  metadata: {
    lineNumber?: number;
    originalIndex: number;
    duplicateOf?: string;
    validationFlags: string[];
  };
}

export interface RawIOCData {
  value: string;
  type?: string;
  confidence?: string;
  description?: string;
  context?: string;
  tags?: string | string[];
  source?: string;
  firstSeen?: string | Date;
  lastSeen?: string | Date;
  tlp?: string;
  malicious?: string | boolean;
  [key: string]: any; // Allow custom fields
}

export interface BulkUploadError {
  id: string;
  type: ErrorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string;
  lineNumber?: number;
  itemIndex: number;
  rawData?: RawIOCData;
  timestamp: Date;
  retryable: boolean;
  retryCount: number;
}

export type ErrorType = 
  | 'parsing_error'
  | 'validation_error'
  | 'type_detection_error'
  | 'enrichment_error'
  | 'timeout_error'
  | 'rate_limit_error'
  | 'network_error'
  | 'quota_exceeded'
  | 'permission_error';

export interface ValidationIssue {
  type: 'warning' | 'error';
  field: string;
  message: string;
  affectedItems: number;
  examples: string[];
}

export interface BulkUploadProgress {
  jobId: string;
  status: JobStatus;
  progress: number; // 0-100
  currentPhase: string;
  itemsProcessed: number;
  itemsTotal: number;
  estimatedTimeRemaining?: number;
  currentItem?: string;
  throughput: number; // items per second
  errorRate: number; // 0-1
  lastUpdate: Date;
}

export interface FileParseResult {
  data: RawIOCData[];
  metadata: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    detectedFormat: UploadFileType;
    encoding: string;
    delimiter?: string;
    headers?: string[];
  };
  errors: {
    line: number;
    error: string;
    data?: any;
  }[];
  warnings: {
    line: number;
    warning: string;
    data?: any;
  }[];
}

export class BulkIOCUploadService {
  private static instance: BulkIOCUploadService;
  private jobs: Map<string, BulkUploadJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private readonly MAX_CONCURRENT_JOBS = 3;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_ITEMS_PER_JOB = 10000;
  
  // Service dependencies
  private extractorService: IOCExtractorService;
  private confidenceService: IOCConfidenceScoringService;
  private learningService: FalsePositiveLearningService;

  static getInstance(): BulkIOCUploadService {
    if (!BulkIOCUploadService.instance) {
      BulkIOCUploadService.instance = new BulkIOCUploadService();
    }
    return BulkIOCUploadService.instance;
  }

  constructor() {
    this.extractorService = IOCExtractorService.getInstance();
    this.confidenceService = IOCConfidenceScoringService.getInstance();
    this.learningService = FalsePositiveLearningService.getInstance();
    this.loadJobs();
  }

  /**
   * Create a new bulk upload job
   */
  async createJob(
    name: string,
    file: File,
    settings: Partial<BulkUploadSettings> = {},
    userId: string,
    description?: string
  ): Promise<string> {
    // Validate file
    this.validateFile(file);
    
    // Check concurrent job limit
    if (this.activeJobs.size >= this.MAX_CONCURRENT_JOBS) {
      throw new Error('Maximum concurrent jobs reached. Please wait for existing jobs to complete.');
    }

    const jobId = this.generateJobId();
    const defaultSettings = this.getDefaultSettings();
    const jobSettings = { ...defaultSettings, ...settings };

    // Parse file to get initial data
    const parseResult = await this.parseFile(file);
    
    if (parseResult.data.length > this.MAX_ITEMS_PER_JOB) {
      throw new Error(`File contains ${parseResult.data.length} items. Maximum allowed is ${this.MAX_ITEMS_PER_JOB}.`);
    }

    const job: BulkUploadJob = {
      id: jobId,
      name,
      description,
      status: 'pending',
      createdAt: new Date(),
      totalItems: parseResult.data.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      skippedItems: 0,
      duplicateItems: 0,
      userId,
      settings: jobSettings,
      results: this.initializeResults(),
      errors: [],
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: parseResult.metadata.detectedFormat,
        estimatedTime: this.estimateProcessingTime(parseResult.data.length, jobSettings),
      }
    };

    this.jobs.set(jobId, job);
    this.saveJobs();

    // Start processing asynchronously
    this.processJobAsync(jobId, parseResult.data);

    return jobId;
  }

  /**
   * Get job status and progress
   */
  getJobProgress(jobId: string): BulkUploadProgress | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const progress = job.totalItems > 0 ? (job.processedItems / job.totalItems) * 100 : 0;
    const errorRate = job.processedItems > 0 ? job.failedItems / job.processedItems : 0;
    const elapsedTime = job.startedAt ? Date.now() - job.startedAt.getTime() : 0;
    const throughput = elapsedTime > 0 ? (job.processedItems / (elapsedTime / 1000)) : 0;
    
    let estimatedTimeRemaining: number | undefined;
    if (throughput > 0 && job.totalItems > job.processedItems) {
      estimatedTimeRemaining = (job.totalItems - job.processedItems) / throughput;
    }

    return {
      jobId,
      status: job.status,
      progress,
      currentPhase: this.getCurrentPhase(job.status),
      itemsProcessed: job.processedItems,
      itemsTotal: job.totalItems,
      estimatedTimeRemaining,
      throughput,
      errorRate,
      lastUpdate: new Date(),
    };
  }

  /**
   * Get job details
   */
  getJob(jobId: string): BulkUploadJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs for a user
   */
  getUserJobs(userId: string): BulkUploadJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return false; // Already finished
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    this.activeJobs.delete(jobId);
    this.saveJobs();

    return true;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'failed') return false;

    // Reset job state
    job.status = 'pending';
    job.startedAt = undefined;
    job.completedAt = undefined;
    job.processedItems = 0;
    job.successfulItems = 0;
    job.failedItems = 0;
    job.skippedItems = 0;
    job.duplicateItems = 0;
    job.errors = [];
    job.results = this.initializeResults();

    this.saveJobs();

    // Get original data and restart processing
    // Note: In a real implementation, you'd need to store the original parsed data
    // For now, we'll just mark it as pending
    logger.info(`Job ${jobId} queued for retry`);

    return true;
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    // Can't delete running jobs
    if (['processing', 'enriching', 'analyzing'].includes(job.status)) {
      throw new Error('Cannot delete running job. Cancel it first.');
    }

    this.jobs.delete(jobId);
    this.activeJobs.delete(jobId);
    this.saveJobs();

    return true;
  }

  // Private methods

  private async processJobAsync(jobId: string, rawData: RawIOCData[]): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      this.activeJobs.add(jobId);
      job.status = 'validating';
      job.startedAt = new Date();
      this.saveJobs();

      // Phase 1: Validation and parsing
      const validatedData = await this.validateAndParseData(job, rawData);
      
      // Phase 2: Duplicate detection
      job.status = 'processing';
      const deduplicatedData = await this.detectDuplicates(job, validatedData);
      
      // Phase 3: IOC processing
      const processedIOCs = await this.processIOCs(job, deduplicatedData);
      
      // Phase 4: Enrichment (if enabled)
      if (job.settings.enableEnrichment) {
        job.status = 'enriching';
        await this.enrichIOCs(job, processedIOCs);
      }
      
      // Phase 5: Analysis (confidence scoring, false positive prediction)
      if (job.settings.enableConfidenceScoring || job.settings.enableFalsePositivePrediction) {
        job.status = 'analyzing';
        await this.analyzeIOCs(job, processedIOCs);
      }

      // Phase 6: Finalization
      job.results.processedIOCs = processedIOCs;
      this.calculateJobSummary(job);
      this.calculateStatistics(job);
      this.calculateQualityMetrics(job);

      job.status = 'completed';
      job.completedAt = new Date();
      job.metadata.actualTime = job.completedAt.getTime() - (job.startedAt?.getTime() || 0);

      logger.info(`Bulk upload job ${jobId} completed successfully`, {
        totalItems: job.totalItems,
        successful: job.successfulItems,
        failed: job.failedItems,
        processingTime: job.metadata.actualTime
      });

    } catch (error) {
      logger.error(`Bulk upload job ${jobId} failed`, error);
      job.status = 'failed';
      job.completedAt = new Date();
      
      if (error instanceof Error) {
        job.errors.push({
          id: this.generateErrorId(),
          type: 'processing_error',
          severity: 'critical',
          message: error.message,
          details: error.stack,
          itemIndex: -1,
          timestamp: new Date(),
          retryable: true,
          retryCount: 0
        });
      }
    } finally {
      this.activeJobs.delete(jobId);
      this.saveJobs();
    }
  }

  private validateFile(file: File): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size ${file.size} exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`);
    }

    const allowedTypes = ['.csv', '.json', '.txt', '.xml'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      throw new Error(`File type ${fileExtension} not supported. Allowed types: ${allowedTypes.join(', ')}`);
    }
  }

  private async parseFile(file: File): Promise<FileParseResult> {
    const text = await file.text();
    const fileType = this.detectFileType(file.name, text);
    
    switch (fileType) {
      case 'csv':
        return this.parseCSV(text);
      case 'json':
        return this.parseJSON(text);
      case 'txt':
        return this.parseTXT(text);
      case 'xml':
        return this.parseXML(text);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private detectFileType(fileName: string, content: string): UploadFileType {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.') + 1);
    
    // Check by extension first
    if (['csv', 'json', 'txt', 'xml'].includes(extension)) {
      return extension as UploadFileType;
    }
    
    // Detect by content
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
    if (trimmed.startsWith('<')) {
      return 'xml';
    }
    if (trimmed.includes(',') && trimmed.includes('\n')) {
      return 'csv';
    }
    
    return 'txt';
  }

  private parseCSV(content: string): FileParseResult {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Detect delimiter
    const delimiter = this.detectCSVDelimiter(lines[0]);
    
    // Parse headers
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/['"]/g, ''));
    
    const data: RawIOCData[] = [];
    const errors: any[] = [];
    const warnings: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = this.parseCSVLine(line, delimiter);
        
        if (values.length !== headers.length) {
          warnings.push({
            line: i + 1,
            warning: `Column count mismatch. Expected ${headers.length}, got ${values.length}`,
            data: line
          });
        }

        const rowData: RawIOCData = { value: '' };
        headers.forEach((header, index) => {
          if (values[index] !== undefined) {
            rowData[header.toLowerCase()] = values[index];
          }
        });

        // Ensure we have a value field
        if (!rowData.value && !rowData.ioc && !rowData.indicator) {
          errors.push({
            line: i + 1,
            error: 'No IOC value found in required columns (value, ioc, indicator)',
            data: line
          });
          continue;
        }

        // Normalize value field
        rowData.value = rowData.value || rowData.ioc || rowData.indicator || '';
        
        data.push(rowData);
      } catch (error) {
        errors.push({
          line: i + 1,
          error: error instanceof Error ? error.message : 'Unknown parsing error',
          data: line
        });
      }
    }

    return {
      data,
      metadata: {
        totalRows: lines.length - 1,
        validRows: data.length,
        invalidRows: errors.length,
        detectedFormat: 'csv',
        encoding: 'utf-8',
        delimiter,
        headers
      },
      errors,
      warnings
    };
  }

  private parseJSON(content: string): FileParseResult {
    try {
      const parsed = JSON.parse(content);
      let data: RawIOCData[] = [];
      
      if (Array.isArray(parsed)) {
        data = parsed.map((item, index) => {
          if (typeof item === 'string') {
            return { value: item };
          } else if (typeof item === 'object' && item !== null) {
            return item as RawIOCData;
          } else {
            throw new Error(`Invalid item at index ${index}: must be string or object`);
          }
        });
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Single object
        data = [parsed as RawIOCData];
      } else {
        throw new Error('JSON must contain an array of IOCs or a single IOC object');
      }

      return {
        data,
        metadata: {
          totalRows: data.length,
          validRows: data.length,
          invalidRows: 0,
          detectedFormat: 'json',
          encoding: 'utf-8'
        },
        errors: [],
        warnings: []
      };
    } catch (error) {
      throw new Error(`JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseTXT(content: string): FileParseResult {
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));

    const data: RawIOCData[] = lines.map(line => ({ value: line }));

    return {
      data,
      metadata: {
        totalRows: lines.length,
        validRows: data.length,
        invalidRows: 0,
        detectedFormat: 'txt',
        encoding: 'utf-8'
      },
      errors: [],
      warnings: []
    };
  }

  private parseXML(content: string): FileParseResult {
    // Simple XML parsing - could be enhanced with proper XML parser
    const data: RawIOCData[] = [];
    const errors: any[] = [];
    
    try {
      // Extract IOC values from XML - this is a simplified implementation
      const iocMatches = content.match(/<ioc[^>]*>(.*?)<\/ioc>/gi) || [];
      const indicatorMatches = content.match(/<indicator[^>]*>(.*?)<\/indicator>/gi) || [];
      
      [...iocMatches, ...indicatorMatches].forEach((match, index) => {
        const value = match.replace(/<[^>]*>/g, '').trim();
        if (value) {
          data.push({ value });
        } else {
          errors.push({
            line: index + 1,
            error: 'Empty IOC value',
            data: match
          });
        }
      });

      return {
        data,
        metadata: {
          totalRows: iocMatches.length + indicatorMatches.length,
          validRows: data.length,
          invalidRows: errors.length,
          detectedFormat: 'xml',
          encoding: 'utf-8'
        },
        errors,
        warnings: []
      };
    } catch (error) {
      throw new Error(`XML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private detectCSVDelimiter(line: string): string {
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let bestDelimiter = ',';
    
    for (const delimiter of delimiters) {
      const count = line.split(delimiter).length - 1;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values.map(v => v.replace(/^["']|["']$/g, ''));
  }

  private async validateAndParseData(job: BulkUploadJob, rawData: RawIOCData[]): Promise<RawIOCData[]> {
    const validData: RawIOCData[] = [];
    
    for (let i = 0; i < rawData.length; i++) {
      const item = rawData[i];
      
      try {
        // Validate required fields
        if (!item.value || typeof item.value !== 'string' || !item.value.trim()) {
          throw new Error('IOC value is required and must be a non-empty string');
        }

        // Normalize and validate
        const normalized = this.normalizeRawData(item);
        validData.push(normalized);
        
      } catch (error) {
        job.errors.push({
          id: this.generateErrorId(),
          type: 'validation_error',
          severity: 'medium',
          message: error instanceof Error ? error.message : 'Validation failed',
          itemIndex: i,
          rawData: item,
          timestamp: new Date(),
          retryable: false,
          retryCount: 0
        });
        
        if (!job.settings.skipInvalidItems) {
          throw new Error(`Validation failed for item ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        job.skippedItems++;
      }
    }
    
    return validData;
  }

  private normalizeRawData(data: RawIOCData): RawIOCData {
    const normalized: RawIOCData = {
      value: data.value.trim(),
      type: data.type?.toLowerCase(),
      confidence: data.confidence,
      description: data.description,
      context: data.context,
      tags: this.normalizeTags(data.tags),
      source: data.source,
      firstSeen: this.normalizeDate(data.firstSeen),
      lastSeen: this.normalizeDate(data.lastSeen),
      tlp: data.tlp?.toUpperCase(),
      malicious: this.normalizeBoolean(data.malicious),
    };

    return normalized;
  }

  private normalizeTags(tags: string | string[] | undefined): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      return tags.split(/[,;|]/).map(tag => tag.trim()).filter(Boolean);
    }
    return [];
  }

  private normalizeDate(date: string | Date | undefined): Date | undefined {
    if (!date) return undefined;
    if (date instanceof Date) return date;
    
    try {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  }

  private normalizeBoolean(value: string | boolean | undefined): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (['true', '1', 'yes', 'malicious'].includes(lower)) return true;
      if (['false', '0', 'no', 'benign'].includes(lower)) return false;
    }
    return undefined;
  }

  private async detectDuplicates(job: BulkUploadJob, data: RawIOCData[]): Promise<RawIOCData[]> {
    if (!job.settings.enableDuplicateDetection) {
      return data;
    }

    const seen = new Set<string>();
    const deduplicated: RawIOCData[] = [];
    
    for (const item of data) {
      const key = this.createDuplicateKey(item, job.settings.duplicateCheckFields);
      
      if (seen.has(key)) {
        job.duplicateItems++;
      } else {
        seen.add(key);
        deduplicated.push(item);
      }
    }
    
    return deduplicated;
  }

  private createDuplicateKey(data: RawIOCData, fields: ('value' | 'type' | 'context')[]): string {
    return fields.map(field => data[field] || '').join('|');
  }

  private async processIOCs(job: BulkUploadJob, data: RawIOCData[]): Promise<ProcessedIOC[]> {
    const processed: ProcessedIOC[] = [];
    const batchSize = job.settings.batchSize;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, Math.min(i + batchSize, data.length));
      const batchResults = await this.processBatch(job, batch, i);
      processed.push(...batchResults);
      
      // Update progress
      job.processedItems = Math.min(i + batchSize, data.length);
      if (job.processedItems % 100 === 0) {
        this.saveJobs(); // Periodic save
      }
    }
    
    return processed;
  }

  private async processBatch(job: BulkUploadJob, batch: RawIOCData[], startIndex: number): Promise<ProcessedIOC[]> {
    const promises = batch.map(async (item, batchIndex) => {
      const originalIndex = startIndex + batchIndex;
      const startTime = Date.now();
      
      try {
        // Extract and parse IOC
        const extractedIOCs = await this.extractorService.extractIOCs(item.value, {
          confidence: { textRegexMatch: 0.8, imageOCR: 0.6, aiExtracted: 0.9, contextualMatch: 0.7 },
          enabledExtractors: { text: true, image: false, metadata: true },
          filters: { minConfidence: 'medium', excludePrivateIPs: true, excludePrivateDomains: true, includeObfuscated: false, validateHashes: true },
          customPatterns: []
        });

        if (extractedIOCs.length === 0) {
          throw new Error('No valid IOCs extracted from input');
        }

        // Use the first extracted IOC or create one from raw data
        const parsedIOC: IOC = extractedIOCs[0] || {
          id: this.generateIOCId(),
          type: (item.type as IOCType) || 'custom',
          value: item.value,
          confidence: 'medium',
          source: 'extracted',
          sourceLocation: item.source,
          context: item.context,
          firstSeen: item.firstSeen || new Date(),
          lastSeen: item.lastSeen || new Date(),
          tags: [...(item.tags || []), ...(job.settings.defaultTags || [])],
          description: item.description,
          malicious: item.malicious,
          tlp: item.tlp as any,
        };

        const processingTime = Date.now() - startTime;
        
        const processedIOC: ProcessedIOC = {
          originalData: item,
          parsedIOC,
          processingTime,
          status: 'success',
          metadata: {
            originalIndex,
            validationFlags: []
          }
        };

        job.successfulItems++;
        return processedIOC;
        
      } catch (error) {
        const processingTime = Date.now() - startTime;
        
        job.errors.push({
          id: this.generateErrorId(),
          type: 'parsing_error',
          severity: 'medium',
          message: error instanceof Error ? error.message : 'Processing failed',
          itemIndex: originalIndex,
          rawData: item,
          timestamp: new Date(),
          retryable: true,
          retryCount: 0
        });

        job.failedItems++;
        
        return {
          originalData: item,
          parsedIOC: null as any,
          processingTime,
          status: 'failed' as const,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          metadata: {
            originalIndex,
            validationFlags: ['processing_failed']
          }
        };
      }
    });

    return Promise.all(promises);
  }

  private async enrichIOCs(job: BulkUploadJob, processedIOCs: ProcessedIOC[]): Promise<void> {
    // Enrichment would be implemented here using the existing enrichment service
    // For now, we'll just add placeholder logic
    logger.info(`Enriching ${processedIOCs.length} IOCs for job ${job.id}`);
  }

  private async analyzeIOCs(job: BulkUploadJob, processedIOCs: ProcessedIOC[]): Promise<void> {
    for (const processedIOC of processedIOCs) {
      if (processedIOC.status !== 'success') continue;
      
      try {
        // Confidence scoring
        if (job.settings.enableConfidenceScoring) {
          const confidenceScore = await this.confidenceService.calculateConfidenceScore(
            processedIOC.parsedIOC,
            [] // Would pass enrichment results here
          );
          processedIOC.confidence = confidenceScore;
        }

        // False positive prediction
        if (job.settings.enableFalsePositivePrediction) {
          const prediction = await this.learningService.predictFalsePositive(
            processedIOC.parsedIOC,
            processedIOC.confidence
          );
          processedIOC.falsePositivePrediction = prediction;
        }
        
      } catch (error) {
        processedIOC.warnings = processedIOC.warnings || [];
        processedIOC.warnings.push(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private calculateJobSummary(job: BulkUploadJob): void {
    const processedIOCs = job.results.processedIOCs;
    const successful = processedIOCs.filter(p => p.status === 'success');
    
    // By type
    const byType = successful.reduce((acc, p) => {
      const type = p.parsedIOC.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<IOCType, number>);

    // By confidence
    const byConfidence = successful.reduce((acc, p) => {
      const level = p.confidence?.level || 'unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Processing times
    const processingTimes = processedIOCs.map(p => p.processingTime);
    const avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length || 0;

    job.results.summary = {
      totalProcessed: processedIOCs.length,
      byType,
      byConfidence,
      byThreatLevel: {}, // Would calculate from enrichment data
      duplicatesFound: job.duplicateItems,
      falsePositivesPredicted: successful.filter(p => 
        p.falsePositivePrediction && p.falsePositivePrediction.probability > 0.7
      ).length,
      averageProcessingTime: avgProcessingTime,
      enrichmentCoverage: 0 // Would calculate from enrichment results
    };
  }

  private calculateStatistics(job: BulkUploadJob): void {
    const processedIOCs = job.results.processedIOCs;
    const processingTimes = processedIOCs.map(p => p.processingTime).sort((a, b) => a - b);
    
    job.results.statistics = {
      topIOCTypes: Object.entries(job.results.summary.byType)
        .map(([type, count]) => ({
          type: type as IOCType,
          count,
          percentage: (count / job.results.summary.totalProcessed) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      
      confidenceDistribution: Object.entries(job.results.summary.byConfidence)
        .map(([range, count]) => ({ range, count })),
      
      errorsByType: job.errors.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      
      processingTimePercentiles: {
        p50: this.percentile(processingTimes, 0.5),
        p75: this.percentile(processingTimes, 0.75),
        p90: this.percentile(processingTimes, 0.9),
        p95: this.percentile(processingTimes, 0.95),
        p99: this.percentile(processingTimes, 0.99),
      }
    };
  }

  private calculateQualityMetrics(job: BulkUploadJob): void {
    const total = job.totalItems;
    const successful = job.successfulItems;
    const failed = job.failedItems;
    
    const dataQualityScore = total > 0 ? (successful / total) * 100 : 0;
    const completenessScore = total > 0 ? ((successful + job.skippedItems) / total) * 100 : 0;
    const consistencyScore = 100 - (job.duplicateItems / Math.max(1, total)) * 100;
    
    job.results.qualityMetrics = {
      dataQualityScore,
      completenessScore,
      consistencyScore,
      validationIssues: [] // Would be populated during validation
    };
  }

  // Utility methods
  private getDefaultSettings(): BulkUploadSettings {
    return {
      enableDuplicateDetection: true,
      duplicateCheckFields: ['value', 'type'],
      enableConfidenceScoring: true,
      enableEnrichment: false,
      enableFalsePositivePrediction: true,
      batchSize: 100,
      maxConcurrency: 5,
      timeoutPerItem: 10000,
      retryFailedItems: true,
      maxRetries: 3,
      skipInvalidItems: true,
      defaultTags: [],
      defaultSource: 'bulk_upload',
      priorityQueue: 'fifo',
      enableNotifications: true,
      notificationThresholds: {
        errorRate: 0.1,
        completionPercentage: 100
      }
    };
  }

  private initializeResults(): BulkUploadResult {
    return {
      processedIOCs: [],
      summary: {
        totalProcessed: 0,
        byType: {} as Record<IOCType, number>,
        byConfidence: {},
        byThreatLevel: {},
        duplicatesFound: 0,
        falsePositivesPredicted: 0,
        averageProcessingTime: 0,
        enrichmentCoverage: 0
      },
      statistics: {
        topIOCTypes: [],
        confidenceDistribution: [],
        errorsByType: {},
        processingTimePercentiles: {
          p50: 0, p75: 0, p90: 0, p95: 0, p99: 0
        }
      },
      qualityMetrics: {
        dataQualityScore: 0,
        completenessScore: 0,
        consistencyScore: 0,
        validationIssues: []
      }
    };
  }

  private estimateProcessingTime(itemCount: number, settings: BulkUploadSettings): number {
    const baseTimePerItem = 100; // ms
    const enrichmentTime = settings.enableEnrichment ? 500 : 0;
    const analysisTime = settings.enableConfidenceScoring ? 50 : 0;
    
    const totalTimePerItem = baseTimePerItem + enrichmentTime + analysisTime;
    return (itemCount * totalTimePerItem) / settings.maxConcurrency;
  }

  private getCurrentPhase(status: JobStatus): string {
    const phases = {
      pending: 'Queued',
      validating: 'Validating data',
      processing: 'Processing IOCs',
      enriching: 'Enriching with threat intelligence',
      analyzing: 'Analyzing confidence and patterns',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled',
      paused: 'Paused'
    };
    
    return phases[status] || status;
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const index = Math.ceil(arr.length * p) - 1;
    return arr[Math.max(0, Math.min(index, arr.length - 1))];
  }

  private generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIOCId(): string {
    return `ioc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveJobs(): void {
    try {
      const data = {
        jobs: Array.from(this.jobs.entries()),
        activeJobs: Array.from(this.activeJobs)
      };
      localStorage.setItem('threatflow_bulk_jobs', JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to save bulk upload jobs', error);
    }
  }

  private loadJobs(): void {
    try {
      const stored = localStorage.getItem('threatflow_bulk_jobs');
      if (stored) {
        const data = JSON.parse(stored);
        this.jobs = new Map(data.jobs || []);
        this.activeJobs = new Set(data.activeJobs || []);
      }
    } catch (error) {
      logger.error('Failed to load bulk upload jobs', error);
    }
  }
}