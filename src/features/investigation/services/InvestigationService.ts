import { EventEmitter } from 'events';
import { logger } from '../../../shared/utils/logger.js';

export interface Investigation {
  id: string;
  organizationId: string;
  
  // Basic information
  title: string;
  description: string;
  hypothesis: string;
  status: InvestigationStatus;
  priority: 1 | 2 | 3 | 4 | 5; // 1 = highest
  
  // Classification
  category: InvestigationCategory;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidentiality: 'public' | 'internal' | 'confidential' | 'restricted';
  
  // MITRE ATT&CK mapping
  techniques: string[];
  tactics: string[];
  killChain: KillChainPhase[];
  
  // Timeline
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  lastActivity?: string;
  resolvedAt?: string;
  closedAt?: string;
  
  // Assignment and collaboration
  leadInvestigator?: string;
  team?: string;
  collaborators: InvestigationCollaborator[];
  
  // Workspace and artifacts
  workspace: InvestigationWorkspace;
  timeline: TimelineEvent[];
  evidence: Evidence[];
  indicators: InvestigationIndicator[];
  hypotheses: Hypothesis[];
  findings: Finding[];
  
  // Related entities
  linkedCases: string[];
  linkedAlerts: string[];
  linkedHunts: string[];
  linkedIncidents: string[];
  
  // Analytics and metrics
  analytics: InvestigationAnalytics;
  
  // Metadata
  tags: string[];
  customFields: Record<string, any>;
  
  // Compliance and legal
  legalHold: boolean;
  retentionPolicy?: RetentionPolicy;
  accessLog: AccessLogEntry[];
}

export type InvestigationStatus =
  | 'draft'
  | 'active'
  | 'on_hold'
  | 'escalated'
  | 'resolved'
  | 'closed'
  | 'archived';

export type InvestigationCategory =
  | 'security_incident'
  | 'data_breach'
  | 'fraud_investigation'
  | 'insider_threat'
  | 'malware_analysis'
  | 'forensic_analysis'
  | 'compliance_investigation'
  | 'threat_research'
  | 'vulnerability_assessment'
  | 'other';

export interface KillChainPhase {
  phase: string;
  techniques: string[];
  evidence: string[];
  timestamp?: Date;
  confidence: number; // 0-1
}

export interface InvestigationCollaborator {
  userId: string;
  role: CollaboratorRole;
  permissions: CollaboratorPermission[];
  addedAt: Date;
  addedBy: string;
  lastAccess?: Date;
  contributions: number;
  expertise: string[];
  notificationSettings: CollaboratorNotificationSettings;
}

export type CollaboratorRole =
  | 'lead_investigator'
  | 'investigator'
  | 'analyst'
  | 'subject_matter_expert'
  | 'observer'
  | 'external_consultant';

export interface CollaboratorPermission {
  action: 'view' | 'edit' | 'comment' | 'export' | 'share' | 'close';
  scope: 'all' | 'workspace' | 'evidence' | 'timeline' | 'findings';
}

export interface CollaboratorNotificationSettings {
  enabled: boolean;
  events: NotificationEvent[];
  frequency: 'immediate' | 'hourly' | 'daily';
  channels: NotificationChannel[];
}

export type NotificationEvent =
  | 'new_evidence'
  | 'hypothesis_updated'
  | 'finding_added'
  | 'status_changed'
  | 'comment_added'
  | 'assigned_to_me'
  | 'deadline_approaching';

export type NotificationChannel = 'email' | 'slack' | 'teams' | 'dashboard' | 'webhook';

export interface InvestigationWorkspace {
  id: string;
  layout: WorkspaceLayout;
  widgets: WorkspaceWidget[];
  views: WorkspaceView[];
  bookmarks: WorkspaceBookmark[];
  notes: WorkspaceNote[];
  queries: SavedQuery[];
  visualizations: WorkspaceVisualization[];
  collaborationSettings: CollaborationSettings;
}

export interface WorkspaceLayout {
  type: 'grid' | 'free-form' | 'tabbed';
  columns: number;
  rows: number;
  responsiveBreakpoints: Record<string, number>;
}

export interface WorkspaceWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  configuration: WidgetConfiguration;
  dataSource?: string;
  refreshInterval?: number; // seconds
  isVisible: boolean;
  permissions: WidgetPermission[];
}

export type WidgetType =
  | 'timeline'
  | 'evidence_list'
  | 'indicator_map'
  | 'attack_flow'
  | 'network_graph'
  | 'text_editor'
  | 'file_viewer'
  | 'query_results'
  | 'chart'
  | 'metrics_dashboard'
  | 'collaboration_panel'
  | 'task_list'
  | 'calendar'
  | 'map'
  | 'custom';

export interface WidgetPosition {
  x: number;
  y: number;
  z?: number; // layer/z-index
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface WidgetConfiguration {
  [key: string]: any;
  theme?: string;
  autoRefresh?: boolean;
  showHeader?: boolean;
  allowFullscreen?: boolean;
  filters?: Record<string, any>;
}

export interface WidgetPermission {
  userId?: string;
  role?: string;
  actions: ('view' | 'edit' | 'move' | 'resize' | 'delete')[];
}

export interface WorkspaceView {
  id: string;
  name: string;
  description: string;
  layout: WorkspaceLayout;
  widgets: string[]; // widget IDs
  filters: ViewFilter[];
  isDefault: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

export interface ViewFilter {
  field: string;
  operator: 'equals' | 'contains' | 'between' | 'in' | 'greater_than' | 'less_than';
  value: any;
  isActive: boolean;
}

export interface WorkspaceBookmark {
  id: string;
  title: string;
  description: string;
  type: 'evidence' | 'timeline_event' | 'finding' | 'indicator' | 'query' | 'url';
  reference: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  category?: string;
  isPrivate: boolean;
}

export interface WorkspaceNote {
  id: string;
  title: string;
  content: string;
  type: 'markdown' | 'rich_text' | 'code' | 'diagram';
  attachments: string[];
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPrivate: boolean;
  linkedEntities: LinkedEntity[];
  comments: NoteComment[];
}

export interface LinkedEntity {
  type: 'evidence' | 'finding' | 'indicator' | 'hypothesis';
  id: string;
  context: string;
}

export interface NoteComment {
  id: string;
  content: string;
  author: string;
  timestamp: Date;
  isResolved: boolean;
  parentId?: string; // for threaded comments
}

export interface SavedQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  queryLanguage: string;
  dataSource: string;
  parameters: QueryParameter[];
  results?: QueryResult[];
  lastExecuted?: Date;
  executionCount: number;
  isShared: boolean;
  createdBy: string;
  createdAt: Date;
  tags: string[];
}

export interface QueryParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
  defaultValue?: any;
  description: string;
  required: boolean;
  validation?: string; // regex or validation expression
}

export interface QueryResult {
  id: string;
  data: Record<string, any>;
  timestamp: Date;
  relevanceScore?: number;
  annotations: ResultAnnotation[];
}

export interface ResultAnnotation {
  type: 'highlight' | 'note' | 'flag' | 'link';
  content: string;
  author: string;
  timestamp: Date;
  position?: { start: number; end: number };
}

export interface WorkspaceVisualization {
  id: string;
  name: string;
  type: 'graph' | 'chart' | 'map' | 'timeline' | 'tree' | 'matrix' | 'custom';
  configuration: VisualizationConfiguration;
  dataQuery: string;
  dataSource: string;
  isInteractive: boolean;
  exportFormats: ('png' | 'svg' | 'pdf' | 'json' | 'csv')[];
  createdBy: string;
  createdAt: Date;
  lastUpdated: Date;
  isPublic: boolean;
}

export interface VisualizationConfiguration {
  layout?: string;
  theme?: string;
  dimensions?: { width: number; height: number };
  axes?: Record<string, any>;
  series?: any[];
  colors?: string[];
  annotations?: any[];
  interactions?: string[];
  filters?: Record<string, any>;
  customOptions?: Record<string, any>;
}

export interface CollaborationSettings {
  realTimeSync: boolean;
  conflictResolution: 'manual' | 'last_writer_wins' | 'merge';
  versionControl: boolean;
  maxConcurrentUsers: number;
  sessionTimeout: number; // minutes
  presenceIndicators: boolean;
  commentingEnabled: boolean;
  suggestionsEnabled: boolean;
}

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  title: string;
  description: string;
  type: TimelineEventType;
  source: string;
  confidence: number; // 0-1
  
  // Event details
  duration?: number; // milliseconds
  location?: string;
  actors: EventActor[];
  artifacts: string[]; // artifact IDs
  
  // Relationships
  parentEvent?: string;
  childEvents: string[];
  relatedEvents: string[];
  
  // Analysis
  significance: 'low' | 'medium' | 'high' | 'critical';
  mitreMapping: MitreMapping;
  
  // Metadata
  tags: string[];
  customFields: Record<string, any>;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  
  // Collaboration
  comments: EventComment[];
  attachments: string[];
}

export type TimelineEventType =
  | 'initial_compromise'
  | 'lateral_movement'
  | 'privilege_escalation'
  | 'persistence'
  | 'defense_evasion'
  | 'credential_access'
  | 'discovery'
  | 'collection'
  | 'command_control'
  | 'exfiltration'
  | 'impact'
  | 'remediation'
  | 'investigation_activity'
  | 'communication'
  | 'other';

export interface EventActor {
  type: 'user' | 'process' | 'service' | 'system' | 'external' | 'unknown';
  identifier: string;
  name?: string;
  role?: string;
  attributes: Record<string, any>;
}

export interface MitreMapping {
  tactics: string[];
  techniques: string[];
  subTechniques: string[];
  dataSource: string[];
  platforms: string[];
}

export interface EventComment {
  id: string;
  content: string;
  author: string;
  timestamp: Date;
  type: 'analysis' | 'question' | 'correction' | 'suggestion';
  isPrivate: boolean;
  reactions: CommentReaction[];
}

export interface CommentReaction {
  emoji: string;
  users: string[];
  timestamp: Date;
}

export interface Evidence {
  id: string;
  name: string;
  description: string;
  type: EvidenceType;
  source: string;
  collectedBy: string;
  collectedAt: Date;
  
  // File information
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  hash: EvidenceHash;
  
  // Chain of custody
  custody: CustodyRecord[];
  integrity: IntegrityCheck[];
  
  // Analysis
  analysisResults: AnalysisResult[];
  tags: string[];
  relevanceScore: number; // 0-1
  
  // Relationships
  relatedEvidence: string[];
  linkedTimeline: string[];
  linkedFindings: string[];
  
  // Metadata
  metadata: Record<string, any>;
  isPreserved: boolean;
  preservationMethod?: string;
  legalHold: boolean;
  
  // Access control
  accessLevel: 'public' | 'restricted' | 'confidential' | 'secret';
  permissions: EvidencePermission[];
}

export type EvidenceType =
  | 'disk_image'
  | 'memory_dump'
  | 'network_capture'
  | 'log_file'
  | 'document'
  | 'executable'
  | 'database_backup'
  | 'email'
  | 'chat_log'
  | 'screenshot'
  | 'video'
  | 'audio'
  | 'mobile_backup'
  | 'cloud_data'
  | 'registry_hive'
  | 'configuration_file'
  | 'other';

export interface EvidenceHash {
  md5?: string;
  sha1?: string;
  sha256: string;
  sha512?: string;
  ssdeep?: string; // fuzzy hash
}

export interface CustodyRecord {
  timestamp: Date;
  action: 'collected' | 'transferred' | 'analyzed' | 'copied' | 'accessed' | 'exported';
  userId: string;
  location: string;
  method: string;
  notes?: string;
  witness?: string;
  digitalSignature?: string;
}

export interface IntegrityCheck {
  timestamp: Date;
  method: 'hash_verification' | 'digital_signature' | 'timestamp_verification';
  result: 'verified' | 'failed' | 'warning';
  details: string;
  performedBy: string;
  tools: string[];
}

export interface AnalysisResult {
  id: string;
  type: 'malware_scan' | 'hash_lookup' | 'metadata_extraction' | 'text_analysis' | 'image_analysis' | 'custom';
  tool: string;
  version: string;
  timestamp: Date;
  result: any;
  confidence: number; // 0-1
  analyst: string;
  notes?: string;
}

export interface EvidencePermission {
  userId?: string;
  role?: string;
  actions: ('view' | 'download' | 'analyze' | 'export' | 'modify_metadata')[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export interface InvestigationIndicator {
  id: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email' | 'phone' | 'filename' | 'registry' | 'certificate' | 'yara_rule' | 'custom';
  value: string;
  description: string;
  context: string;
  
  // Intelligence
  threatIntelligence?: ThreatIntelligence;
  
  // Discovery
  discoveredAt: Date;
  discoveredBy: string;
  discoveryMethod: string;
  confidence: number; // 0-1
  
  // Relationships
  relatedIndicators: string[];
  evidence: string[];
  timelineEvents: string[];
  
  // Actions
  actions: IndicatorAction[];
  
  // Status
  status: 'active' | 'expired' | 'false_positive' | 'whitelisted';
  expiresAt?: Date;
  
  // Enrichment
  enrichmentData: EnrichmentData[];
  
  // Metadata
  tags: string[];
  customFields: Record<string, any>;
  
  // Sharing and export
  sharingLevel: 'internal' | 'trusted_partners' | 'public';
  exportFormats: ('stix' | 'misp' | 'openioc' | 'yara' | 'snort' | 'json')[];
}

export interface ThreatIntelligence {
  reputation: 'benign' | 'suspicious' | 'malicious';
  sources: ThreatIntelSource[];
  firstSeen?: Date;
  lastSeen?: Date;
  campaigns: string[];
  malwareFamilies: string[];
  threatActors: string[];
  techniques: string[];
  confidence: number; // 0-1
  reports: ThreatReport[];
}

export interface ThreatIntelSource {
  name: string;
  reliability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; // Admiralty Scale
  lastUpdated: Date;
  confidence: number;
  subscription: boolean;
}

export interface ThreatReport {
  id: string;
  title: string;
  url?: string;
  publishedAt: Date;
  source: string;
  summary: string;
  relevanceScore: number;
}

export interface IndicatorAction {
  type: 'block' | 'monitor' | 'alert' | 'enrich' | 'hunt' | 'share';
  system: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  result?: string;
  performedBy: string;
  automationRule?: string;
}

export interface EnrichmentData {
  source: string;
  type: 'geolocation' | 'whois' | 'dns' | 'certificate' | 'malware_analysis' | 'reputation' | 'passive_dns' | 'custom';
  data: Record<string, any>;
  timestamp: Date;
  confidence: number;
  cost?: number; // API cost if applicable
  ttl?: number; // cache time to live
}

export interface Hypothesis {
  id: string;
  title: string;
  description: string;
  statement: string;
  confidence: number; // 0-1
  status: HypothesisStatus;
  
  // Evidence
  supportingEvidence: string[]; // evidence IDs
  contradictingEvidence: string[];
  missingEvidence: string[];
  
  // Analysis
  assumptions: string[];
  alternatives: string[];
  testCriteria: TestCriterion[];
  
  // Timeline
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  testedAt?: Date;
  
  // Collaboration
  assignedTo?: string;
  reviews: HypothesisReview[];
  comments: HypothesisComment[];
  
  // Relationships
  parentHypothesis?: string;
  childHypotheses: string[];
  relatedHypotheses: string[];
  
  // Metadata
  tags: string[];
  priority: 1 | 2 | 3 | 4 | 5;
  complexity: 'low' | 'medium' | 'high';
}

export type HypothesisStatus =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'testing'
  | 'confirmed'
  | 'refuted'
  | 'inconclusive'
  | 'deprecated';

export interface TestCriterion {
  id: string;
  description: string;
  type: 'evidence_exists' | 'timeline_matches' | 'indicator_present' | 'behavior_observed' | 'custom';
  parameters: Record<string, any>;
  weight: number; // importance weight 0-1
  result?: 'pass' | 'fail' | 'inconclusive';
  notes?: string;
}

export interface HypothesisReview {
  id: string;
  reviewer: string;
  timestamp: Date;
  decision: 'approve' | 'reject' | 'request_changes';
  comments: string;
  suggestions: string[];
  confidenceAdjustment?: number; // -1 to 1
}

export interface HypothesisComment {
  id: string;
  content: string;
  author: string;
  timestamp: Date;
  type: 'general' | 'methodology' | 'evidence' | 'analysis';
  isPrivate: boolean;
  attachments: string[];
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  category: FindingCategory;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  
  // Classification
  type: FindingType;
  impact: ImpactAssessment;
  likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  
  // Evidence and support
  evidence: string[]; // evidence IDs
  indicators: string[]; // indicator IDs
  timelineEvents: string[]; // timeline event IDs
  hypotheses: string[]; // hypothesis IDs that led to this finding
  
  // MITRE ATT&CK mapping
  tactics: string[];
  techniques: string[];
  subTechniques: string[];
  
  // Recommendations
  recommendations: Recommendation[];
  mitigations: Mitigation[];
  
  // Status and tracking
  status: FindingStatus;
  assignedTo?: string;
  dueDate?: Date;
  resolvedAt?: Date;
  resolution?: string;
  
  // Timeline
  discoveredAt: Date;
  discoveredBy: string;
  lastUpdated: Date;
  
  // Collaboration
  reviews: FindingReview[];
  comments: FindingComment[];
  
  // Relationships
  relatedFindings: string[];
  parentFinding?: string;
  childFindings: string[];
  
  // Compliance and reporting
  complianceMapping: ComplianceMapping[];
  reportingRequirements: ReportingRequirement[];
  
  // Metadata
  tags: string[];
  customFields: Record<string, any>;
  
  // Export and sharing
  exportFormats: ('pdf' | 'json' | 'stix' | 'csv')[];
  sharingRestrictions: string[];
}

export type FindingCategory =
  | 'malicious_activity'
  | 'suspicious_behavior'
  | 'policy_violation'
  | 'vulnerability'
  | 'misconfiguration'
  | 'anomaly'
  | 'intelligence_match'
  | 'compliance_issue'
  | 'data_exposure'
  | 'unauthorized_access';

export type FindingType =
  | 'confirmed_incident'
  | 'potential_threat'
  | 'false_positive'
  | 'benign_anomaly'
  | 'policy_violation'
  | 'technical_issue'
  | 'process_improvement'
  | 'intelligence_discovery';

export interface ImpactAssessment {
  scope: 'single_system' | 'department' | 'organization' | 'external';
  affectedSystems: string[];
  affectedUsers: number;
  dataTypes: string[];
  businessFunctions: string[];
  financialImpact?: {
    currency: string;
    amount: number;
    category: 'direct_loss' | 'recovery_cost' | 'opportunity_cost' | 'regulatory_fine';
  };
  reputationalImpact: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';
  operationalImpact: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: 'immediate' | 'short_term' | 'long_term';
  priority: 1 | 2 | 3 | 4 | 5;
  effort: 'low' | 'medium' | 'high';
  cost: 'low' | 'medium' | 'high';
  implementationSteps: string[];
  timeline: string;
  owner?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
  dependencies: string[];
  metrics: string[];
}

export interface Mitigation {
  id: string;
  technique: string; // MITRE technique ID
  name: string;
  description: string;
  effectiveness: 'low' | 'medium' | 'high';
  implementationComplexity: 'low' | 'medium' | 'high';
  cost: 'low' | 'medium' | 'high';
  coverage: string[]; // sub-techniques covered
  references: string[];
  status: 'not_implemented' | 'partially_implemented' | 'implemented' | 'not_applicable';
}

export type FindingStatus =
  | 'new'
  | 'assigned'
  | 'investigating'
  | 'confirmed'
  | 'false_positive'
  | 'resolved'
  | 'closed';

export interface FindingReview {
  id: string;
  reviewer: string;
  timestamp: Date;
  type: 'technical' | 'legal' | 'business' | 'compliance';
  decision: 'approve' | 'reject' | 'request_changes';
  comments: string;
  confidenceAdjustment?: number;
  severityAdjustment?: string;
}

export interface FindingComment {
  id: string;
  content: string;
  author: string;
  timestamp: Date;
  type: 'analysis' | 'clarification' | 'update' | 'recommendation';
  attachments: string[];
  isPrivate: boolean;
  references: string[];
}

export interface ComplianceMapping {
  framework: string; // NIST, ISO 27001, PCI DSS, etc.
  control: string;
  requirement: string;
  status: 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_applicable';
  evidence: string[];
  gaps: string[];
  remediationDate?: Date;
}

export interface ReportingRequirement {
  authority: string; // regulatory body, law enforcement, etc.
  framework: string;
  timeline: string;
  mandatory: boolean;
  contacts: string[];
  templateRequired: boolean;
  status: 'not_required' | 'pending' | 'submitted' | 'acknowledged';
  submittedAt?: Date;
  reference?: string;
}

export interface InvestigationAnalytics {
  // Collaboration metrics
  activeCollaborators: number;
  totalContributions: number;
  lastActivity: Date;
  collaborationScore: number; // 0-1
  
  // Progress metrics
  completionPercentage: number;
  milestonesCompleted: number;
  totalMilestones: number;
  daysActive: number;
  estimatedCompletionDate?: Date;
  
  // Content metrics
  evidenceCount: number;
  indicatorCount: number;
  findingCount: number;
  hypothesesCount: number;
  timelineEventCount: number;
  
  // Quality metrics
  averageConfidence: number;
  verifiedEvidence: number;
  falsePositiveRate: number;
  hypothesesAccuracy: number;
  
  // Performance metrics
  avgResponseTime: number; // hours
  queryExecutionTime: number; // average milliseconds
  workspaceLoadTime: number; // milliseconds
  
  // Trends
  activityTrend: ActivityTrendPoint[];
  confidenceTrend: ConfidenceTrendPoint[];
  progressTrend: ProgressTrendPoint[];
}

export interface ActivityTrendPoint {
  date: Date;
  contributions: number;
  activeUsers: number;
  newEvidence: number;
  newFindings: number;
}

export interface ConfidenceTrendPoint {
  date: Date;
  averageConfidence: number;
  hypothesesConfidence: number;
  findingsConfidence: number;
}

export interface ProgressTrendPoint {
  date: Date;
  completionPercentage: number;
  milestonesCompleted: number;
  blockers: number;
}

export interface RetentionPolicy {
  retentionPeriod: number; // days
  archiveAfter: number; // days
  deleteAfter?: number; // days
  legalHoldOverride: boolean;
  automaticDeletion: boolean;
  backupRetention: number; // days
  complianceRequirements: string[];
}

export interface AccessLogEntry {
  timestamp: Date;
  userId: string;
  action: 'view' | 'edit' | 'export' | 'share' | 'delete' | 'comment';
  resource: string;
  resourceType: 'investigation' | 'evidence' | 'finding' | 'workspace';
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  success: boolean;
  details?: string;
}

export interface InvestigationMetrics {
  totalInvestigations: number;
  activeInvestigations: number;
  completedInvestigations: number;
  
  avgInvestigationDuration: number; // days
  avgTimeToFirstFinding: number; // hours
  avgCollaborators: number;
  
  investigationsByCategory: Record<InvestigationCategory, number>;
  investigationsByStatus: Record<InvestigationStatus, number>;
  investigationsBySeverity: Record<string, number>;
  
  totalEvidence: number;
  totalFindings: number;
  totalIndicators: number;
  
  topInvestigators: Array<{
    userId: string;
    investigationCount: number;
    avgDuration: number;
    successRate: number;
  }>;
  
  trendsOverTime: Array<{
    period: string;
    newInvestigations: number;
    completedInvestigations: number;
    avgDuration: number;
    successRate: number;
  }>;
  
  workspaceUsage: {
    avgWidgetsPerWorkspace: number;
    mostUsedWidgetTypes: string[];
    avgSessionDuration: number;
    concurrentUsers: number;
  };
}

export class InvestigationService extends EventEmitter {
  private isInitialized = false;
  private activeInvestigations: Map<string, Investigation> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) {return;}

    try {
      logger.info('Initializing Investigation Service...');
      
      // Load existing investigations
      await this.loadInvestigationsFromDatabase();
      
      // Initialize workspace templates
      await this.initializeWorkspaceTemplates();
      
      this.isInitialized = true;
      logger.info('✅ Investigation Service initialized');
      
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Investigation Service:', error);
      throw error;
    }
  }

  // ==========================================
  // INVESTIGATION MANAGEMENT
  // ==========================================

  async createInvestigation(data: {
    title: string;
    description: string;
    hypothesis: string;
    organizationId: string;
    category: InvestigationCategory;
    severity: Investigation['severity'];
    createdBy: string;
    leadInvestigator?: string;
    team?: string;
    priority?: number;
    linkedEntities?: {
      cases?: string[];
      alerts?: string[];
      hunts?: string[];
    };
  }): Promise<Investigation> {
    try {
      const investigation: Investigation = {
        id: this.generateInvestigationId(),
        organizationId: data.organizationId,
        title: data.title,
        description: data.description,
        hypothesis: data.hypothesis,
        status: 'draft',
        priority: data.priority || 3,
        category: data.category,
        severity: data.severity,
        confidentiality: 'internal',
        techniques: [],
        tactics: [],
        killChain: [],
        createdBy: data.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        leadInvestigator: data.leadInvestigator,
        team: data.team,
        collaborators: [],
        workspace: this.createDefaultWorkspace(),
        timeline: [],
        evidence: [],
        indicators: [],
        hypotheses: [],
        findings: [],
        linkedCases: data.linkedEntities?.cases || [],
        linkedAlerts: data.linkedEntities?.alerts || [],
        linkedHunts: data.linkedEntities?.hunts || [],
        linkedIncidents: [],
        analytics: this.initializeAnalytics(),
        tags: [],
        customFields: {},
        legalHold: false,
        accessLog: []
      };

      // Add creator as lead investigator if not specified
      if (!investigation.leadInvestigator) {
        investigation.leadInvestigator = data.createdBy;
      }

      // Add lead investigator as collaborator
      if (investigation.leadInvestigator) {
        investigation.collaborators.push({
          userId: investigation.leadInvestigator,
          role: 'lead_investigator',
          permissions: [
            { action: 'view', scope: 'all' },
            { action: 'edit', scope: 'all' },
            { action: 'share', scope: 'all' },
            { action: 'close', scope: 'all' }
          ],
          addedAt: new Date(),
          addedBy: data.createdBy,
          contributions: 0,
          expertise: [],
          notificationSettings: {
            enabled: true,
            events: ['new_evidence', 'finding_added', 'status_changed'],
            frequency: 'immediate',
            channels: ['email', 'dashboard']
          }
        });
      }

      // Save to database
      await this.saveInvestigationToDatabase(investigation);
      
      // Log access
      this.logAccess(investigation.id, data.createdBy, 'edit', 'investigation', 'Investigation created');

      logger.info(`Investigation created: ${investigation.title} (${investigation.id})`);
      this.emit('investigation_created', investigation);
      
      return investigation;
    } catch (error) {
      logger.error('Failed to create investigation:', error);
      throw error;
    }
  }

  async getInvestigation(investigationId: string, userId: string): Promise<Investigation | null> {
    try {
      // Check cache first
      if (this.activeInvestigations.has(investigationId)) {
        const investigation = this.activeInvestigations.get(investigationId)!;
        
        // Verify access permissions
        if (this.hasAccess(investigation, userId, 'view')) {
          this.logAccess(investigationId, userId, 'view', 'investigation');
          return investigation;
        } else {
          throw new Error('Access denied');
        }
      }

      // Load from database
      const investigation = await this.loadInvestigationFromDatabase(investigationId);
      
      if (investigation && this.hasAccess(investigation, userId, 'view')) {
        this.activeInvestigations.set(investigationId, investigation);
        this.logAccess(investigationId, userId, 'view', 'investigation');
        return investigation;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get investigation:', error);
      throw error;
    }
  }

  async updateInvestigationStatus(investigationId: string, status: InvestigationStatus, userId: string): Promise<Investigation> {
    try {
      const investigation = await this.getInvestigation(investigationId, userId);
      if (!investigation) {
        throw new Error(`Investigation not found: ${investigationId}`);
      }

      if (!this.hasAccess(investigation, userId, 'edit')) {
        throw new Error('Access denied');
      }

      const oldStatus = investigation.status;
      investigation.status = status;
      investigation.updatedAt = new Date().toISOString();

      // Set timestamps based on status
      switch (status) {
        case 'active':
          if (!investigation.startedAt) {
            investigation.startedAt = new Date().toISOString();
          }
          break;
        case 'resolved':
          investigation.resolvedAt = new Date().toISOString();
          break;
        case 'closed':
          investigation.closedAt = new Date().toISOString();
          break;
      }

      await this.saveInvestigationToDatabase(investigation);
      this.logAccess(investigationId, userId, 'edit', 'investigation', `Status changed from ${oldStatus} to ${status}`);

      logger.info(`Investigation status updated: ${investigationId} -> ${status}`);
      this.emit('investigation_status_changed', { investigation, oldStatus, newStatus: status, userId });

      return investigation;
    } catch (error) {
      logger.error('Failed to update investigation status:', error);
      throw error;
    }
  }

  // ==========================================
  // COLLABORATION MANAGEMENT
  // ==========================================

  async addCollaborator(investigationId: string, collaboratorData: {
    userId: string;
    role: CollaboratorRole;
    permissions: CollaboratorPermission[];
    expertise?: string[];
  }, addedBy: string): Promise<void> {
    try {
      const investigation = await this.getInvestigation(investigationId, addedBy);
      if (!investigation) {
        throw new Error(`Investigation not found: ${investigationId}`);
      }

      if (!this.hasAccess(investigation, addedBy, 'share')) {
        throw new Error('Access denied');
      }

      // Check if user is already a collaborator
      const existingCollaborator = investigation.collaborators.find(c => c.userId === collaboratorData.userId);
      if (existingCollaborator) {
        throw new Error('User is already a collaborator');
      }

      const collaborator: InvestigationCollaborator = {
        userId: collaboratorData.userId,
        role: collaboratorData.role,
        permissions: collaboratorData.permissions,
        addedAt: new Date(),
        addedBy,
        contributions: 0,
        expertise: collaboratorData.expertise || [],
        notificationSettings: {
          enabled: true,
          events: ['new_evidence', 'finding_added', 'assigned_to_me'],
          frequency: 'daily',
          channels: ['email']
        }
      };

      investigation.collaborators.push(collaborator);
      investigation.updatedAt = new Date().toISOString();

      await this.saveInvestigationToDatabase(investigation);
      this.logAccess(investigationId, addedBy, 'share', 'investigation', `Added collaborator: ${collaboratorData.userId}`);

      logger.info(`Collaborator added: ${collaboratorData.userId} -> ${investigationId}`);
      this.emit('collaborator_added', { investigation, collaborator, addedBy });
    } catch (error) {
      logger.error('Failed to add collaborator:', error);
      throw error;
    }
  }

  // ==========================================
  // EVIDENCE MANAGEMENT
  // ==========================================

  async addEvidence(investigationId: string, evidenceData: {
    name: string;
    description: string;
    type: EvidenceType;
    source: string;
    filePath?: string;
    hash: EvidenceHash;
    metadata?: Record<string, any>;
  }, userId: string): Promise<Evidence> {
    try {
      const investigation = await this.getInvestigation(investigationId, userId);
      if (!investigation) {
        throw new Error(`Investigation not found: ${investigationId}`);
      }

      if (!this.hasAccess(investigation, userId, 'edit')) {
        throw new Error('Access denied');
      }

      const evidence: Evidence = {
        id: this.generateEvidenceId(),
        name: evidenceData.name,
        description: evidenceData.description,
        type: evidenceData.type,
        source: evidenceData.source,
        collectedBy: userId,
        collectedAt: new Date(),
        filePath: evidenceData.filePath,
        hash: evidenceData.hash,
        custody: [{
          timestamp: new Date(),
          action: 'collected',
          userId,
          location: 'Investigation Workspace',
          method: 'Digital Collection',
          notes: 'Evidence added to investigation'
        }],
        integrity: [],
        analysisResults: [],
        tags: [],
        relevanceScore: 0.5,
        relatedEvidence: [],
        linkedTimeline: [],
        linkedFindings: [],
        metadata: evidenceData.metadata || {},
        isPreserved: true,
        legalHold: investigation.legalHold,
        accessLevel: 'restricted',
        permissions: []
      };

      investigation.evidence.push(evidence);
      investigation.analytics.evidenceCount++;
      investigation.updatedAt = new Date().toISOString();

      await this.saveInvestigationToDatabase(investigation);
      this.logAccess(investigationId, userId, 'edit', 'evidence', `Added evidence: ${evidence.name}`);

      logger.info(`Evidence added: ${evidence.name} -> ${investigationId}`);
      this.emit('evidence_added', { investigation, evidence, userId });

      return evidence;
    } catch (error) {
      logger.error('Failed to add evidence:', error);
      throw error;
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private generateInvestigationId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEvidenceId(): string {
    return `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createDefaultWorkspace(): InvestigationWorkspace {
    return {
      id: `ws_${Date.now()}`,
      layout: {
        type: 'grid',
        columns: 12,
        rows: 8,
        responsiveBreakpoints: {
          xs: 480,
          sm: 768,
          md: 1024,
          lg: 1200,
          xl: 1400
        }
      },
      widgets: [
        {
          id: 'timeline_widget',
          type: 'timeline',
          title: 'Investigation Timeline',
          position: { x: 0, y: 0 },
          size: { width: 8, height: 4 },
          configuration: { autoRefresh: true, showHeader: true },
          isVisible: true,
          permissions: []
        },
        {
          id: 'evidence_widget',
          type: 'evidence_list',
          title: 'Evidence Collection',
          position: { x: 8, y: 0 },
          size: { width: 4, height: 4 },
          configuration: { groupBy: 'type', sortBy: 'collectedAt' },
          isVisible: true,
          permissions: []
        },
        {
          id: 'collaboration_widget',
          type: 'collaboration_panel',
          title: 'Team Collaboration',
          position: { x: 0, y: 4 },
          size: { width: 6, height: 4 },
          configuration: { showPresence: true, enableComments: true },
          isVisible: true,
          permissions: []
        },
        {
          id: 'findings_widget',
          type: 'text_editor',
          title: 'Key Findings',
          position: { x: 6, y: 4 },
          size: { width: 6, height: 4 },
          configuration: { format: 'markdown', autosave: true },
          isVisible: true,
          permissions: []
        }
      ],
      views: [],
      bookmarks: [],
      notes: [],
      queries: [],
      visualizations: [],
      collaborationSettings: {
        realTimeSync: true,
        conflictResolution: 'manual',
        versionControl: true,
        maxConcurrentUsers: 10,
        sessionTimeout: 60,
        presenceIndicators: true,
        commentingEnabled: true,
        suggestionsEnabled: true
      }
    };
  }

  private initializeAnalytics(): InvestigationAnalytics {
    return {
      activeCollaborators: 0,
      totalContributions: 0,
      lastActivity: new Date(),
      collaborationScore: 0,
      completionPercentage: 0,
      milestonesCompleted: 0,
      totalMilestones: 0,
      daysActive: 0,
      evidenceCount: 0,
      indicatorCount: 0,
      findingCount: 0,
      hypothesesCount: 0,
      timelineEventCount: 0,
      averageConfidence: 0,
      verifiedEvidence: 0,
      falsePositiveRate: 0,
      hypothesesAccuracy: 0,
      avgResponseTime: 0,
      queryExecutionTime: 0,
      workspaceLoadTime: 0,
      activityTrend: [],
      confidenceTrend: [],
      progressTrend: []
    };
  }

  private hasAccess(investigation: Investigation, userId: string, action: string): boolean {
    // System admin has full access
    if (userId === 'system' || userId === investigation.createdBy) {
      return true;
    }

    // Check collaborator permissions
    const collaborator = investigation.collaborators.find(c => c.userId === userId);
    if (collaborator) {
      return collaborator.permissions.some(p => 
        p.actions.includes(action as any) && (p.scope === 'all' || p.scope === action)
      );
    }

    return false;
  }

  private logAccess(investigationId: string, userId: string, action: string, resourceType: string, details?: string): void {
    // Implementation would log to database
    logger.info(`Access logged: ${userId} ${action} ${resourceType} ${investigationId} - ${details || ''}`);
  }

  // ==========================================
  // DATABASE OPERATIONS (MOCK)
  // ==========================================

  private async saveInvestigationToDatabase(investigation: Investigation): Promise<void> {
    // Database save implementation would go here
  }

  private async loadInvestigationFromDatabase(investigationId: string): Promise<Investigation | null> {
    // Database load implementation would go here
    return null;
  }

  private async loadInvestigationsFromDatabase(): Promise<void> {
    // Load existing investigations from database
  }

  private async initializeWorkspaceTemplates(): Promise<void> {
    // Initialize default workspace templates
  }
}

export const investigationService = new InvestigationService();