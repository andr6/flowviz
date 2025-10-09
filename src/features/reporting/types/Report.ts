export interface Report {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  type: ReportType;
  category: ReportCategory;
  format: ReportFormat[];
  
  // Generation settings
  template: ReportTemplate;
  parameters: ReportParameters;
  schedule?: ReportSchedule;
  
  // Access and distribution
  recipients: ReportRecipient[];
  accessLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPeriod: number; // days
  
  // Status and metadata
  status: ReportStatus;
  lastGenerated?: string;
  nextScheduled?: string;
  generationCount: number;
  
  // Audit trail
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Compliance
  complianceStandards: ComplianceStandard[];
  regulatoryRequirements: string[];
  auditTrail: ReportAuditEntry[];
}

export type ReportType = 
  | 'operational'
  | 'compliance'
  | 'executive'
  | 'technical'
  | 'incident'
  | 'threat_intelligence'
  | 'performance'
  | 'risk_assessment'
  | 'audit'
  | 'forensic'
  | 'custom';

export type ReportCategory = 
  | 'soc_metrics'
  | 'threat_landscape'
  | 'incident_response'
  | 'vulnerability_management'
  | 'compliance_posture'
  | 'risk_metrics'
  | 'security_awareness'
  | 'asset_inventory'
  | 'user_activity'
  | 'network_security'
  | 'endpoint_security'
  | 'email_security'
  | 'cloud_security'
  | 'third_party_risk'
  | 'business_continuity';

export type ReportFormat = 'pdf' | 'html' | 'excel' | 'csv' | 'json' | 'pptx' | 'docx';

export type ReportStatus = 'draft' | 'active' | 'generating' | 'completed' | 'failed' | 'archived';

export interface ReportTemplate {
  id: string;
  name: string;
  version: string;
  sections: ReportSection[];
  styling: ReportStyling;
  watermark?: string;
  headerFooter: HeaderFooterConfig;
}

export interface ReportSection {
  id: string;
  name: string;
  type: SectionType;
  order: number;
  isRequired: boolean;
  configuration: SectionConfiguration;
  dataSource: DataSourceConfig;
  visualization: VisualizationConfig;
}

export type SectionType = 
  | 'title_page'
  | 'executive_summary'
  | 'table_of_contents'
  | 'metrics_dashboard'
  | 'chart'
  | 'table'
  | 'text'
  | 'image'
  | 'timeline'
  | 'threat_map'
  | 'compliance_matrix'
  | 'recommendations'
  | 'appendix';

export interface SectionConfiguration {
  title?: string;
  subtitle?: string;
  description?: string;
  showTimestamp?: boolean;
  showPageNumbers?: boolean;
  customProperties: Record<string, any>;
}

export interface DataSourceConfig {
  type: 'database' | 'api' | 'file' | 'siem' | 'custom';
  connection: string;
  query: string;
  parameters: Record<string, any>;
  refreshInterval?: number; // minutes
  cacheEnabled?: boolean;
}

export interface VisualizationConfig {
  type: 'bar_chart' | 'line_chart' | 'pie_chart' | 'area_chart' | 'heatmap' | 'gauge' | 'table' | 'metric_card' | 'timeline' | 'network_graph';
  properties: {
    title?: string;
    xAxis?: string;
    yAxis?: string;
    colors?: string[];
    showLegend?: boolean;
    showDataLabels?: boolean;
    customOptions?: Record<string, any>;
  };
}

export interface ReportStyling {
  theme: 'corporate' | 'security' | 'minimal' | 'custom';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: number;
  logoUrl?: string;
  backgroundImage?: string;
  customCss?: string;
}

export interface HeaderFooterConfig {
  header: {
    enabled: boolean;
    content: string;
    height: number;
  };
  footer: {
    enabled: boolean;
    content: string;
    height: number;
    showPageNumbers: boolean;
    showGenerationDate: boolean;
  };
}

export interface ReportParameters {
  dateRange: {
    type: 'relative' | 'absolute';
    start?: string;
    end?: string;
    period?: 'last_24h' | 'last_7d' | 'last_30d' | 'last_90d' | 'last_year' | 'ytd' | 'custom';
  };
  filters: ReportFilter[];
  groupBy?: string[];
  aggregations: ReportAggregation[];
  includeSummary: boolean;
  includeDetails: boolean;
  includeRecommendations: boolean;
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'in' | 'between' | 'gt' | 'lt';
  value: any;
  label?: string;
}

export interface ReportAggregation {
  field: string;
  function: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  label?: string;
}

export interface ReportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  time: string; // HH:mm
  timezone: string;
  endDate?: string;
}

export interface ReportRecipient {
  type: 'user' | 'role' | 'email' | 'webhook' | 'slack' | 'teams';
  identifier: string;
  deliveryFormat: ReportFormat[];
  notifications: {
    onGeneration: boolean;
    onFailure: boolean;
    onSchedule: boolean;
  };
}

export interface ComplianceStandard {
  framework: 'SOC2' | 'ISO27001' | 'NIST' | 'GDPR' | 'HIPAA' | 'PCI-DSS' | 'SOX' | 'FISMA' | 'CIS' | 'Custom';
  version: string;
  controls: ComplianceControl[];
  mappings: ControlMapping[];
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  testProcedures: string[];
  evidenceRequirements: string[];
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
}

export interface ControlMapping {
  controlId: string;
  dataSource: string;
  query: string;
  expectedResult: any;
  toleranceThreshold?: number;
  automatedTest: boolean;
}

export interface ReportAuditEntry {
  timestamp: string;
  action: 'created' | 'modified' | 'generated' | 'accessed' | 'shared' | 'deleted';
  userId: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface GeneratedReport {
  id: string;
  reportId: string;
  generationId: string;
  format: ReportFormat;
  fileSize: number;
  filePath: string;
  downloadUrl: string;
  
  // Generation metadata
  generatedAt: string;
  generatedBy: string;
  generationTimeMs: number;
  dataTimestamp: string;
  
  // Content summary
  pageCount?: number;
  sectionCount: number;
  chartCount: number;
  tableCount: number;
  
  // Status and validation
  status: 'generating' | 'completed' | 'failed' | 'expired';
  validationResults: ValidationResult[];
  errorMessage?: string;
  
  // Security and access
  accessLog: ReportAccessEntry[];
  expiresAt?: string;
  downloadCount: number;
  passwordProtected: boolean;
  
  // Compliance
  digitalSignature?: string;
  auditHash: string;
  retentionPolicy: string;
}

export interface ValidationResult {
  rule: string;
  passed: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ReportAccessEntry {
  timestamp: string;
  userId: string;
  action: 'view' | 'download' | 'share';
  ipAddress: string;
  userAgent: string;
}

export interface ReportDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  refreshInterval: number;
  accessLevel: string[];
  createdBy: string;
  createdAt: string;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'status' | 'timeline';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  dataSource: DataSourceConfig;
  visualization: VisualizationConfig;
  refreshInterval?: number;
  alertThresholds?: AlertThreshold[];
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gridSize: number;
  responsive: boolean;
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq';
  value: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface ReportMetrics {
  totalReports: number;
  activeReports: number;
  scheduledReports: number;
  generationsToday: number;
  generationsThisWeek: number;
  generationsThisMonth: number;
  avgGenerationTime: number;
  successRate: number;
  mostPopularReports: Array<{
    reportId: string;
    name: string;
    generationCount: number;
    lastGenerated: string;
  }>;
  complianceStatusByFramework: Record<string, {
    totalControls: number;
    passedControls: number;
    failedControls: number;
    compliancePercentage: number;
  }>;
  reportsByCategory: Record<ReportCategory, number>;
  userActivitySummary: Array<{
    userId: string;
    reportsGenerated: number;
    reportsAccessed: number;
    lastActivity: string;
  }>;
}

export interface ReportingSettings {
  organizationId: string;
  defaultRetentionPeriod: number;
  maxFileSize: number;
  allowedFormats: ReportFormat[];
  watermarkEnabled: boolean;
  digitalSignaturesEnabled: boolean;
  passwordProtectionRequired: boolean;
  auditLoggingEnabled: boolean;
  complianceFrameworks: string[];
  schedulingLimits: {
    maxScheduledReports: number;
    maxRecipientsPerReport: number;
    minGenerationInterval: number;
  };
  notifications: {
    emailEnabled: boolean;
    slackEnabled: boolean;
    webhookEnabled: boolean;
    smsEnabled: boolean;
  };
  dataGovernance: {
    dataClassificationRequired: boolean;
    approvalWorkflowEnabled: boolean;
    accessLoggingRequired: boolean;
    encryptionRequired: boolean;
  };
}