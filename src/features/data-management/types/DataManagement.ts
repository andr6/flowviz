export interface DataLakeConfiguration {
  id: string;
  name: string;
  type: 'aws-s3' | 'azure-blob' | 'gcp-storage' | 'hdfs' | 'local';
  connectionConfig: {
    endpoint?: string;
    bucket?: string;
    container?: string;
    accessKey?: string;
    secretKey?: string;
    region?: string;
    accountName?: string;
    accountKey?: string;
    projectId?: string;
    serviceAccountKey?: string;
    namenode?: string;
    datanode?: string;
    path?: string;
  };
  encryption: {
    enabled: boolean;
    type: 'aes-256' | 'kms' | 'customer-managed';
    keyId?: string;
  };
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'snappy' | 'lz4' | 'zstd';
    level: number;
  };
  partitioning: {
    enabled: boolean;
    strategy: 'date' | 'tenant' | 'source' | 'size' | 'custom';
    pattern: string;
  };
  tags: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'error';
  lastHealthCheck?: Date;
  capacity: {
    allocated: number;
    used: number;
    available: number;
    unit: 'bytes' | 'kb' | 'mb' | 'gb' | 'tb' | 'pb';
  };
}

export interface DataSource {
  id: string;
  name: string;
  type: 'siem' | 'logs' | 'metrics' | 'events' | 'alerts' | 'flows' | 'threat-intel' | 'compliance';
  format: 'json' | 'csv' | 'parquet' | 'avro' | 'orc' | 'syslog' | 'cef' | 'leef';
  schema: DataSchema;
  ingestionConfig: IngestionConfiguration;
  transformations: DataTransformation[];
  metadata: {
    description: string;
    owner: string;
    classification: 'public' | 'internal' | 'confidential' | 'restricted';
    tags: string[];
    businessContext: string;
  };
  quality: DataQualityMetrics;
  lineage: DataLineage;
  retention: RetentionPolicy;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastIngested?: Date;
  status: 'active' | 'paused' | 'error' | 'archived';
}

export interface DataSchema {
  version: string;
  fields: SchemaField[];
  primaryKey?: string[];
  partitionKeys?: string[];
  sortKeys?: string[];
  evolving: boolean;
  compatibility: 'backward' | 'forward' | 'full' | 'none';
}

export interface SchemaField {
  name: string;
  type: 'string' | 'integer' | 'long' | 'double' | 'boolean' | 'timestamp' | 'date' | 'array' | 'object';
  nullable: boolean;
  description?: string;
  format?: string;
  constraints?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    enum?: any[];
  };
  pii: boolean;
  encrypted: boolean;
  indexed: boolean;
  nested?: SchemaField[];
}

export interface IngestionConfiguration {
  method: 'batch' | 'streaming' | 'real-time' | 'cdc';
  schedule?: {
    frequency: 'continuous' | 'hourly' | 'daily' | 'weekly' | 'monthly';
    cron?: string;
    timezone: string;
  };
  source: {
    type: 'file' | 'database' | 'api' | 'queue' | 'stream';
    connectionString?: string;
    query?: string;
    endpoint?: string;
    topic?: string;
    queue?: string;
    path?: string;
  };
  batchSize: number;
  parallelism: number;
  errorHandling: {
    strategy: 'fail-fast' | 'skip' | 'quarantine' | 'retry';
    maxRetries: number;
    retryDelay: number;
    deadLetterQueue?: string;
  };
  validation: {
    enabled: boolean;
    schemaValidation: boolean;
    customRules: ValidationRule[];
  };
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  severity: 'error' | 'warning' | 'info';
  action: 'reject' | 'flag' | 'correct' | 'notify';
}

export interface DataTransformation {
  id: string;
  name: string;
  type: 'filter' | 'map' | 'aggregate' | 'join' | 'enrich' | 'normalize' | 'anonymize';
  configuration: Record<string, any>;
  order: number;
  enabled: boolean;
  description: string;
}

export interface DataQualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  validity: number;
  uniqueness: number;
  timeliness: number;
  lastChecked: Date;
  issues: QualityIssue[];
}

export interface QualityIssue {
  id: string;
  type: 'missing-values' | 'invalid-format' | 'duplicates' | 'outliers' | 'inconsistency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRecords: number;
  detectedAt: Date;
  resolved: boolean;
  resolution?: string;
}

export interface DataLineage {
  upstream: DataLineageNode[];
  downstream: DataLineageNode[];
  transformations: LineageTransformation[];
  impact: ImpactAnalysis;
}

export interface DataLineageNode {
  id: string;
  name: string;
  type: 'source' | 'transformation' | 'destination';
  metadata: Record<string, any>;
}

export interface LineageTransformation {
  id: string;
  name: string;
  type: string;
  input: string[];
  output: string[];
  logic: string;
}

export interface ImpactAnalysis {
  upstreamDependencies: number;
  downstreamConsumers: number;
  criticalityScore: number;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
}

export interface RetentionPolicy {
  id: string;
  name: string;
  dataClassification: string[];
  retentionPeriod: {
    value: number;
    unit: 'days' | 'months' | 'years';
  };
  archivalPolicy: {
    enabled: boolean;
    archiveAfter: {
      value: number;
      unit: 'days' | 'months' | 'years';
    };
    archiveLocation: string;
    compressionLevel: number;
  };
  deletionPolicy: {
    enabled: boolean;
    softDelete: boolean;
    purgeAfter: {
      value: number;
      unit: 'days' | 'months' | 'years';
    };
    approval: {
      required: boolean;
      approvers: string[];
    };
  };
  legalHold: {
    enabled: boolean;
    holdUntil?: Date;
    reason?: string;
    contact?: string;
  };
  compliance: {
    regulations: string[];
    auditTrail: boolean;
    encryption: boolean;
    anonymization: boolean;
  };
  exceptions: PolicyException[];
  createdAt: Date;
  updatedAt: Date;
  lastApplied?: Date;
  status: 'active' | 'inactive' | 'suspended';
}

export interface PolicyException {
  id: string;
  reason: string;
  approvedBy: string;
  approvedAt: Date;
  expiresAt?: Date;
  dataScope: string[];
}

export interface HistoricalAnalysis {
  id: string;
  name: string;
  description: string;
  timeRange: {
    start: Date;
    end: Date;
    granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  dataSource: string[];
  analysisType: 'trend' | 'pattern' | 'anomaly' | 'correlation' | 'forecasting' | 'seasonality';
  metrics: AnalysisMetric[];
  dimensions: AnalysisDimension[];
  filters: AnalysisFilter[];
  algorithms: {
    statistical: StatisticalMethod[];
    machineLearning: MLMethod[];
    timeSeries: TimeSeriesMethod[];
  };
  results: AnalysisResult[];
  insights: AnalysisInsight[];
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  executedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  performance: {
    executionTime: number;
    dataProcessed: number;
    memoryUsed: number;
    cpuUsage: number;
  };
}

export interface AnalysisMetric {
  name: string;
  field: string;
  aggregation: 'sum' | 'avg' | 'count' | 'max' | 'min' | 'percentile' | 'stdev';
  weight: number;
}

export interface AnalysisDimension {
  name: string;
  field: string;
  type: 'categorical' | 'numerical' | 'temporal' | 'geographical';
  granularity?: string;
}

export interface AnalysisFilter {
  field: string;
  operator: 'equals' | 'not-equals' | 'greater-than' | 'less-than' | 'contains' | 'in' | 'between';
  value: any;
}

export interface StatisticalMethod {
  name: string;
  type: 'descriptive' | 'inferential' | 'regression' | 'classification';
  parameters: Record<string, any>;
}

export interface MLMethod {
  name: string;
  type: 'supervised' | 'unsupervised' | 'reinforcement';
  algorithm: string;
  parameters: Record<string, any>;
  features: string[];
  target?: string;
}

export interface TimeSeriesMethod {
  name: string;
  type: 'arima' | 'seasonal-decomposition' | 'exponential-smoothing' | 'lstm' | 'prophet';
  parameters: Record<string, any>;
  seasonality: boolean;
  trend: boolean;
}

export interface AnalysisResult {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'model' | 'prediction';
  data: any;
  visualization?: {
    type: string;
    configuration: Record<string, any>;
  };
  metadata: {
    title: string;
    description: string;
    significance: number;
    reliability: number;
  };
}

export interface AnalysisInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'pattern' | 'correlation' | 'prediction';
  title: string;
  description: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  evidence: string[];
  actionable: boolean;
  recommendations: string[];
  impact: {
    business: string;
    technical: string;
    security: string;
  };
}

export interface BackupConfiguration {
  id: string;
  name: string;
  description: string;
  scope: {
    dataSources: string[];
    databases: string[];
    configurations: string[];
    includeMetadata: boolean;
    includeUserData: boolean;
  };
  schedule: {
    frequency: 'continuous' | 'hourly' | 'daily' | 'weekly' | 'monthly';
    time?: string;
    timezone: string;
    retentionPolicy: {
      daily: number;
      weekly: number;
      monthly: number;
      yearly: number;
    };
  };
  destination: {
    type: 'local' | 's3' | 'azure-blob' | 'gcp-storage' | 'tape' | 'hybrid';
    configuration: Record<string, any>;
    encryption: {
      enabled: boolean;
      algorithm: string;
      keyManagement: 'local' | 'kms' | 'hsm';
    };
    compression: {
      enabled: boolean;
      algorithm: string;
      level: number;
    };
  };
  verification: {
    enabled: boolean;
    checksumValidation: boolean;
    restoreTest: boolean;
    testFrequency: 'weekly' | 'monthly' | 'quarterly';
  };
  alerts: {
    onSuccess: boolean;
    onFailure: boolean;
    onSizeThreshold: boolean;
    onTimeThreshold: boolean;
    recipients: string[];
    channels: ('email' | 'slack' | 'webhook')[];
  };
  performance: {
    parallelStreams: number;
    bandwidth: number;
    deduplication: boolean;
    incrementalBackup: boolean;
  };
  compliance: {
    regulations: string[];
    auditTrail: boolean;
    immutableBackups: boolean;
    geographicReplication: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  lastBackup?: Date;
  nextBackup?: Date;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
}

export interface BackupJob {
  id: string;
  configurationId: string;
  type: 'full' | 'incremental' | 'differential';
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  statistics: {
    filesProcessed: number;
    bytesTransferred: number;
    compressionRatio: number;
    transferRate: number;
    errors: number;
    warnings: number;
  };
  metadata: {
    sourceSize: number;
    backupSize: number;
    checksum: string;
    verification: boolean;
    location: string;
  };
  logs: BackupLog[];
  error?: string;
}

export interface BackupLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  details?: Record<string, any>;
}

export interface DisasterRecoveryPlan {
  id: string;
  name: string;
  description: string;
  scope: {
    systems: string[];
    applications: string[];
    dataSources: string[];
    dependencies: string[];
  };
  objectives: {
    rto: number; // Recovery Time Objective in minutes
    rpo: number; // Recovery Point Objective in minutes
    mttr: number; // Mean Time To Recovery in minutes
    availabilityTarget: number; // Percentage
  };
  procedures: RecoveryProcedure[];
  roles: RecoveryRole[];
  communication: CommunicationPlan;
  testing: {
    frequency: 'monthly' | 'quarterly' | 'annually';
    lastTest?: Date;
    nextTest?: Date;
    testResults: TestResult[];
  };
  resources: {
    infrastructure: InfrastructureResource[];
    personnel: PersonnelResource[];
    vendors: VendorResource[];
  };
  triggers: DisasterTrigger[];
  escalation: EscalationMatrix;
  createdAt: Date;
  updatedAt: Date;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  version: string;
  status: 'draft' | 'approved' | 'active' | 'testing' | 'retired';
}

export interface RecoveryProcedure {
  id: string;
  name: string;
  description: string;
  order: number;
  type: 'manual' | 'automated' | 'hybrid';
  estimatedTime: number;
  dependencies: string[];
  instructions: ProcedureStep[];
  automation: {
    script?: string;
    playbook?: string;
    api?: string;
  };
  verification: VerificationStep[];
  rollback: RollbackStep[];
}

export interface ProcedureStep {
  order: number;
  action: string;
  details: string;
  responsible: string;
  estimatedTime: number;
  critical: boolean;
  automation?: {
    command?: string;
    parameters?: Record<string, any>;
  };
}

export interface VerificationStep {
  order: number;
  check: string;
  expected: string;
  method: 'manual' | 'automated';
  command?: string;
}

export interface RollbackStep {
  order: number;
  action: string;
  condition: string;
  responsible: string;
}

export interface RecoveryRole {
  name: string;
  description: string;
  responsibilities: string[];
  primary: string;
  backup: string[];
  contact: {
    phone: string;
    email: string;
    emergency: string;
  };
  skills: string[];
  availability: {
    hours: string;
    timezone: string;
    restrictions: string[];
  };
}

export interface CommunicationPlan {
  stakeholders: Stakeholder[];
  templates: CommunicationTemplate[];
  channels: CommunicationChannel[];
  escalationTimeouts: number[];
}

export interface Stakeholder {
  name: string;
  role: string;
  level: 'operational' | 'tactical' | 'strategic';
  contact: {
    primary: string;
    secondary: string;
    emergency: string;
  };
  notificationPreference: ('email' | 'sms' | 'phone' | 'slack')[];
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  type: 'initial' | 'update' | 'resolution' | 'escalation';
  subject: string;
  body: string;
  audience: string[];
}

export interface CommunicationChannel {
  type: 'email' | 'sms' | 'phone' | 'slack' | 'teams' | 'webhook';
  configuration: Record<string, any>;
  priority: number;
  failover: string[];
}

export interface TestResult {
  id: string;
  testDate: Date;
  type: 'tabletop' | 'walkthrough' | 'simulation' | 'full-test';
  objectives: string[];
  scenarios: TestScenario[];
  participants: string[];
  duration: number;
  results: {
    rtoAchieved: number;
    rpoAchieved: number;
    successRate: number;
    issues: TestIssue[];
    improvements: string[];
  };
  summary: string;
  nextActions: ActionItem[];
}

export interface TestScenario {
  name: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'catastrophic';
  likelihood: 'low' | 'medium' | 'high';
  systems: string[];
  procedures: string[];
}

export interface TestIssue {
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  procedure: string;
  resolution: string;
  responsible: string;
  dueDate: Date;
}

export interface ActionItem {
  description: string;
  responsible: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'completed' | 'cancelled';
}

export interface InfrastructureResource {
  type: 'compute' | 'storage' | 'network' | 'database';
  name: string;
  specification: Record<string, any>;
  location: string;
  availability: 'immediate' | 'minutes' | 'hours' | 'days';
  capacity: string;
  cost: number;
}

export interface PersonnelResource {
  role: string;
  skillLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  availability: string;
  location: string;
  contact: string;
}

export interface VendorResource {
  name: string;
  service: string;
  sla: {
    responseTime: number;
    resolutionTime: number;
    availability: number;
  };
  contact: {
    primary: string;
    emergency: string;
    escalation: string;
  };
  contract: {
    number: string;
    expiryDate: Date;
    supportLevel: string;
  };
}

export interface DisasterTrigger {
  name: string;
  type: 'automatic' | 'manual';
  conditions: TriggerCondition[];
  actions: TriggerAction[];
  enabled: boolean;
}

export interface TriggerCondition {
  metric: string;
  operator: 'greater-than' | 'less-than' | 'equals' | 'not-equals';
  threshold: number;
  duration: number;
}

export interface TriggerAction {
  type: 'alert' | 'procedure' | 'notification' | 'escalation';
  configuration: Record<string, any>;
  order: number;
}

export interface EscalationMatrix {
  levels: EscalationLevel[];
  autoEscalation: boolean;
  escalationTimeout: number;
}

export interface EscalationLevel {
  level: number;
  name: string;
  contacts: string[];
  methods: ('email' | 'sms' | 'phone')[];
  timeout: number;
}

export interface TenantConfiguration {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: 'enterprise' | 'government' | 'mssp' | 'saas';
  status: 'active' | 'suspended' | 'inactive' | 'provisioning';
  subscription: {
    plan: string;
    startDate: Date;
    endDate?: Date;
    features: string[];
    limits: ResourceLimits;
    billing: BillingConfiguration;
  };
  isolation: {
    level: 'logical' | 'physical' | 'hybrid';
    database: 'shared' | 'dedicated' | 'schema-isolated';
    storage: 'shared' | 'dedicated' | 'encrypted';
    compute: 'shared' | 'dedicated' | 'containerized';
  };
  customization: {
    branding: BrandingConfiguration;
    theme: ThemeConfiguration;
    features: FeatureConfiguration;
    integrations: IntegrationConfiguration[];
  };
  compliance: {
    regulations: string[];
    certifications: string[];
    dataResidency: string[];
    auditLog: boolean;
  };
  security: {
    sso: SSOConfiguration;
    mfa: MFAConfiguration;
    rbac: RBACConfiguration;
    encryption: EncryptionConfiguration;
  };
  monitoring: {
    usage: UsageMetrics;
    performance: PerformanceMetrics;
    health: HealthMetrics;
  };
  contacts: {
    primary: ContactInfo;
    technical: ContactInfo;
    billing: ContactInfo;
    security: ContactInfo;
  };
  createdAt: Date;
  updatedAt: Date;
  lastAccessed?: Date;
  provisionedBy: string;
}

export interface ResourceLimits {
  users: number;
  storage: number;
  dataIngestion: number;
  apiCalls: number;
  reports: number;
  retentionPeriod: number;
  backupStorage: number;
  concurrentSessions: number;
}

export interface BillingConfiguration {
  model: 'fixed' | 'usage-based' | 'tiered' | 'hybrid';
  currency: string;
  cycle: 'monthly' | 'quarterly' | 'annually';
  autoRenewal: boolean;
  overage: {
    allowed: boolean;
    rate: number;
    limit: number;
  };
}

export interface BrandingConfiguration {
  logo: string;
  favicon: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
  customCss?: string;
}

export interface ThemeConfiguration {
  mode: 'light' | 'dark' | 'auto';
  customization: {
    layout: string;
    navigation: string;
    dashboard: string;
  };
}

export interface FeatureConfiguration {
  enabled: string[];
  disabled: string[];
  beta: string[];
  custom: Record<string, any>;
}

export interface IntegrationConfiguration {
  type: string;
  name: string;
  enabled: boolean;
  configuration: Record<string, any>;
  credentials: Record<string, string>;
}

export interface SSOConfiguration {
  enabled: boolean;
  provider: 'saml' | 'oidc' | 'oauth2' | 'ldap';
  configuration: Record<string, any>;
  attributeMapping: Record<string, string>;
}

export interface MFAConfiguration {
  enabled: boolean;
  methods: ('totp' | 'sms' | 'email' | 'hardware')[];
  required: boolean;
  grace: number;
}

export interface RBACConfiguration {
  enabled: boolean;
  roles: Role[];
  permissions: Permission[];
  inheritance: boolean;
  dynamic: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  inherited?: string[];
  conditions?: Record<string, any>;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  scope: 'global' | 'tenant' | 'user' | 'resource';
}

export interface EncryptionConfiguration {
  atRest: {
    enabled: boolean;
    algorithm: string;
    keyManagement: 'tenant' | 'shared' | 'customer';
  };
  inTransit: {
    enabled: boolean;
    protocol: string;
    cipherSuites: string[];
  };
  fields: {
    pii: boolean;
    sensitive: boolean;
    custom: string[];
  };
}

export interface UsageMetrics {
  users: {
    active: number;
    total: number;
    sessions: number;
  };
  storage: {
    used: number;
    allocated: number;
    growth: number;
  };
  api: {
    calls: number;
    rate: number;
    errors: number;
  };
  features: Record<string, number>;
}

export interface PerformanceMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requests: number;
    data: number;
  };
  availability: number;
  errors: {
    rate: number;
    types: Record<string, number>;
  };
}

export interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, string>;
  dependencies: Record<string, string>;
  resources: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  alerts: number;
}

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
  role: string;
  timezone: string;
}

export interface DataManagementDashboard {
  summary: {
    totalStorage: number;
    activeDataSources: number;
    backupStatus: string;
    tenants: number;
  };
  storage: {
    utilization: number;
    growth: StorageGrowth[];
    distribution: StorageDistribution[];
    performance: StoragePerformance;
  };
  quality: {
    overallScore: number;
    trends: QualityTrend[];
    issues: QualityIssue[];
    improvements: string[];
  };
  retention: {
    policies: number;
    compliance: number;
    scheduled: ScheduledAction[];
    violations: RetentionViolation[];
  };
  backup: {
    status: BackupStatus;
    schedule: BackupSchedule[];
    recovery: RecoveryMetrics;
    alerts: BackupAlert[];
  };
  tenancy: {
    utilization: TenantUtilization[];
    performance: TenantPerformance[];
    issues: TenantIssue[];
    growth: TenantGrowth[];
  };
}

export interface StorageGrowth {
  date: string;
  size: number;
  growth: number;
}

export interface StorageDistribution {
  source: string;
  size: number;
  percentage: number;
}

export interface StoragePerformance {
  readThroughput: number;
  writeThroughput: number;
  latency: number;
  iops: number;
}

export interface QualityTrend {
  date: string;
  score: number;
  completeness: number;
  accuracy: number;
  consistency: number;
}

export interface ScheduledAction {
  type: 'archive' | 'delete' | 'backup';
  source: string;
  scheduledDate: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface RetentionViolation {
  source: string;
  policy: string;
  violation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
}

export interface BackupStatus {
  overall: 'healthy' | 'warning' | 'critical';
  successful: number;
  failed: number;
  running: number;
  lastBackup: Date;
}

export interface BackupSchedule {
  name: string;
  nextRun: Date;
  frequency: string;
  size: number;
  status: string;
}

export interface RecoveryMetrics {
  rtoActual: number;
  rpoActual: number;
  successRate: number;
  lastTest: Date;
}

export interface BackupAlert {
  type: 'failure' | 'warning' | 'size' | 'time';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface TenantUtilization {
  tenantId: string;
  name: string;
  storage: number;
  users: number;
  api: number;
  limit: number;
}

export interface TenantPerformance {
  tenantId: string;
  name: string;
  responseTime: number;
  throughput: number;
  availability: number;
  errors: number;
}

export interface TenantIssue {
  tenantId: string;
  name: string;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface TenantGrowth {
  date: string;
  active: number;
  new: number;
  churned: number;
}