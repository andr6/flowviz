export interface BatchJob {
  id: string;
  type: BatchJobType;
  status: BatchJobStatus;
  priority: JobPriority;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  metadata: {
    userId?: string;
    tags: string[];
    description: string;
    estimatedDuration?: number;
  };
  config: BatchJobConfig;
  results?: BatchJobResult[];
  errors?: BatchJobError[];
}

export type BatchJobType = 
  | 'bulk_document_analysis'
  | 'scheduled_feed_analysis'
  | 'ioc_extraction_pipeline'
  | 'duplicate_detection'
  | 'automated_enrichment'
  | 'batch_export';

export type BatchJobStatus = 
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

export interface BatchJobConfig {
  // Document processing options
  documents?: {
    sources: DocumentSource[];
    formats: string[];
    maxFileSize: number;
    concurrency: number;
    aiProvider: 'claude' | 'openai' | 'ollama' | 'openrouter';
    analysisDepth: 'fast' | 'standard' | 'comprehensive';
  };
  
  // Scheduling options
  schedule?: {
    cron: string;
    timezone: string;
    enabled: boolean;
    retryPolicy: RetryPolicy;
  };
  
  // Output options
  output?: {
    format: 'json' | 'stix' | 'misp' | 'csv' | 'pdf';
    destination: 'database' | 's3' | 'webhook' | 'email';
    notifications: NotificationConfig[];
  };
  
  // Processing options
  processing?: {
    enableDuplicateDetection: boolean;
    enableIOCExtraction: boolean;
    enableEnrichment: boolean;
    confidenceThreshold: number;
    batchSize: number;
  };
}

export interface DocumentSource {
  type: 'file' | 'url' | 'feed' | 's3' | 'ftp';
  location: string;
  credentials?: {
    username?: string;
    password?: string;
    apiKey?: string;
    accessKey?: string;
    secretKey?: string;
  };
  filters?: {
    extensions: string[];
    dateRange?: { start: Date; end: Date };
    sizeRange?: { min: number; max: number };
  };
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryableErrors: string[];
}

export interface NotificationConfig {
  type: 'email' | 'webhook' | 'slack' | 'teams';
  destination: string;
  events: BatchJobStatus[];
  template?: string;
}

export interface BatchJobResult {
  id: string;
  sourceId: string;
  status: 'success' | 'failed' | 'skipped';
  processedAt: Date;
  processingTime: number;
  data?: {
    flowData?: any;
    iocs?: string[];
    confidence?: number;
    duplicateOf?: string;
  };
  error?: string;
  metadata: {
    fileSize?: number;
    filename?: string;
    sourceUrl?: string;
  };
}

export interface BatchJobError {
  id: string;
  timestamp: Date;
  level: 'warning' | 'error' | 'critical';
  message: string;
  details?: any;
  sourceId?: string;
  retryable: boolean;
}

export interface BatchJobQueue {
  id: string;
  name: string;
  concurrency: number;
  priority: JobPriority;
  status: 'active' | 'paused' | 'stopped';
  jobs: {
    queued: number;
    running: number;
    completed: number;
    failed: number;
  };
  workers: WorkerInfo[];
}

export interface WorkerInfo {
  id: string;
  status: 'idle' | 'busy' | 'error';
  currentJob?: string;
  startedAt: Date;
  lastHeartbeat: Date;
  processedJobs: number;
  averageProcessingTime: number;
}

export interface DuplicateDetectionConfig {
  enabled: boolean;
  threshold: number;
  algorithm: 'cosine' | 'jaccard' | 'levenshtein' | 'hash';
  fields: string[];
  mergeStrategy: 'keep_first' | 'keep_latest' | 'merge_all' | 'manual_review';
}

export interface IOCExtractionConfig {
  enabled: boolean;
  types: IOCType[];
  confidence: number;
  enrichment: {
    virustotal: boolean;
    shodan: boolean;
    abuseipdb: boolean;
    urlvoid: boolean;
  };
  storage: {
    database: boolean;
    misp: boolean;
    stix: boolean;
  };
}

export type IOCType = 
  | 'ip_address'
  | 'domain'
  | 'url'
  | 'file_hash'
  | 'email'
  | 'cve'
  | 'registry_key'
  | 'file_path'
  | 'user_agent'
  | 'certificate';

export interface BatchMetrics {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  throughputPerHour: number;
  errorRate: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  queueHealth: {
    backlogSize: number;
    oldestJobAge: number;
    averageWaitTime: number;
  };
}