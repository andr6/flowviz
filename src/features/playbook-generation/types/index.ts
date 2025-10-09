/**
 * Automated Playbook Generation - Type Definitions
 * Complete type safety for incident response playbook system
 */

// ============================================================================
// Core Enums
// ============================================================================

export type PlaybookSeverity = 'low' | 'medium' | 'high' | 'critical';

export type PlaybookStatus = 'draft' | 'review' | 'approved' | 'active' | 'archived' | 'deprecated';

export type PlaybookGenerationSource = 'flow' | 'campaign' | 'manual' | 'template';

export type PhaseName =
  | 'preparation'
  | 'detection'
  | 'analysis'
  | 'containment'
  | 'eradication'
  | 'recovery'
  | 'post_incident';

export type ActionType =
  | 'manual'
  | 'automated'
  | 'api_call'
  | 'script'
  | 'notification'
  | 'approval'
  | 'data_collection'
  | 'analysis'
  | 'documentation';

export type DetectionRuleType =
  | 'sigma'
  | 'yara'
  | 'snort'
  | 'suricata'
  | 'splunk_spl'
  | 'kql'
  | 'elastic_dsl'
  | 'custom';

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type SOARPlatform =
  | 'cortex_xsoar'
  | 'splunk_soar'
  | 'ibm_resilient'
  | 'servicenow'
  | 'demisto'
  | 'swimlane'
  | 'custom';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'out_of_sync';

export type ImplementationDifficulty = 'low' | 'medium' | 'high';
export type CostEstimate = 'low' | 'medium' | 'high';

// ============================================================================
// Playbook Interfaces
// ============================================================================

export interface PlaybookMetadata {
  name: string;
  severity: PlaybookSeverity;
  estimatedTime: number; // minutes
  requiredRoles: string[];
  tags?: string[];
}

export interface IncidentPlaybook {
  id: string;
  name: string;
  description?: string;
  flowId?: string;
  campaignId?: string;

  // Metadata
  severity: PlaybookSeverity;
  estimatedTimeMinutes: number;
  requiredRoles: string[];
  tags: string[];

  // Status
  status: PlaybookStatus;
  version: number;

  // Generation info
  generatedFrom: PlaybookGenerationSource;
  aiGenerated: boolean;
  generationConfidence?: number;

  // Phases and actions
  phases: PlaybookPhase[];
  detectionRules: DetectionRule[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  lastExecuted?: Date;

  // Ownership
  createdBy?: string;
  approvedBy?: string;

  // Execution stats
  executionCount: number;
  avgExecutionTimeMinutes?: number;
  successRate?: number;

  // SOAR integration
  soarPlatform?: SOARPlatform;
  soarPlaybookId?: string;
  soarSyncedAt?: Date;
}

export interface PlaybookPhase {
  id: string;
  playbookId: string;
  phaseName: PhaseName;
  phaseOrder: number;
  description?: string;

  // Timing
  estimatedDurationMinutes?: number;
  isParallel: boolean;
  dependencies?: string[]; // Phase IDs

  // Actions
  actions: Action[];

  // Status
  isAutomated: boolean;
  requiresApproval: boolean;

  createdAt: Date;
}

export interface Action {
  id: string;
  phaseId: string;
  playbookId: string;
  actionOrder: number;
  actionType: ActionType;

  // Content
  title: string;
  description?: string;
  instructions?: string;

  // Execution details
  command?: string;
  apiEndpoint?: string;
  scriptPath?: string;
  parameters?: Record<string, any>;

  // Requirements
  requiredTools?: string[];
  requiredPermissions?: string[];
  requiresApproval: boolean;

  // Timing
  estimatedDurationMinutes: number;
  timeoutMinutes?: number;

  // Success criteria
  successCriteria?: string;
  rollbackActionId?: string;

  // Metadata
  mitreTechniqueId?: string;
  d3fendTechniqueId?: string;

  createdAt: Date;
}

// ============================================================================
// Detection Rule Interfaces
// ============================================================================

export interface DetectionRule {
  id: string;
  playbookId: string;
  ruleName: string;
  description?: string;

  // Rule content
  ruleType: DetectionRuleType;
  ruleContent: string;
  ruleMetadata?: Record<string, any>;

  // MITRE mapping
  mitreTechniqueId?: string;
  mitreTactic?: string;

  // Effectiveness
  confidenceScore?: number;
  falsePositiveRate?: number;
  detectionCount: number;

  // Status
  isActive: boolean;
  tested: boolean;
  deployed: boolean;

  // Platforms
  applicablePlatforms?: string[];

  createdAt: Date;
  updatedAt: Date;
}

export interface DetectionRuleTemplate {
  templateName: string;
  ruleType: DetectionRuleType;
  generateRule: (technique: MITRETechnique, context: any) => string;
}

// ============================================================================
// Execution Interfaces
// ============================================================================

export interface PlaybookExecution {
  id: string;
  playbookId: string;

  // Context
  incidentId?: string;
  campaignId?: string;
  flowId?: string;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  durationMinutes?: number;

  // Status
  status: ExecutionStatus;
  success?: boolean;
  completionPercentage: number;
  actionsCompleted: number;
  actionsFailed: number;

  // People
  executedBy?: string;
  approvedBy?: string[];

  // Data
  executionLog: ExecutionLogEntry[];
  artifactsCollected: Artifact[];
  notes?: string;

  // Lessons learned
  whatWorkedWell?: string;
  whatNeedsImprovement?: string;
  recommendations?: string;

  createdAt: Date;
}

export interface ExecutionLogEntry {
  timestamp: Date;
  actionId: string;
  actionTitle: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  message: string;
  duration?: number;
  output?: any;
  error?: string;
}

export interface Artifact {
  id: string;
  type: 'log' | 'screenshot' | 'file' | 'data' | 'evidence';
  name: string;
  description?: string;
  content?: any;
  url?: string;
  collectedAt: Date;
  collectedBy?: string;
}

// ============================================================================
// Template Interfaces
// ============================================================================

export interface PlaybookTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;

  // Template data (same structure as IncidentPlaybook)
  templateData: Partial<IncidentPlaybook>;

  // Usage stats
  usageCount: number;
  avgRating?: number;

  // Metadata
  isPublic: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface PlaybookTemplateCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  templateCount: number;
}

// ============================================================================
// SOAR Integration Interfaces
// ============================================================================

export interface SOARIntegration {
  id: string;
  playbookId: string;
  platform: SOARPlatform;
  platformPlaybookId: string;
  platformUrl?: string;

  // Sync status
  syncStatus: SyncStatus;
  lastSyncedAt?: Date;
  syncError?: string;

  // Configuration
  integrationConfig: SOARConfig;

  createdAt: Date;
  updatedAt: Date;
}

export interface SOARConfig {
  apiUrl: string;
  apiKey?: string;
  username?: string;
  autoSync?: boolean;
  bidirectionalSync?: boolean;
  importExecutions?: boolean;
  customFields?: Record<string, any>;
}

export interface SOARExportFormat {
  platform: SOARPlatform;
  format: 'json' | 'yaml' | 'xml';
  content: string;
}

// ============================================================================
// MITRE D3FEND Interfaces
// ============================================================================

export interface D3FENDMapping {
  id: string;

  // ATT&CK technique
  attackTechniqueId: string;
  attackTechniqueName: string;
  attackTactic: string;

  // D3FEND countermeasure
  d3fendTechniqueId: string;
  d3fendTechniqueName: string;
  d3fendCategory: string;

  // Effectiveness
  effectivenessScore: number;
  implementationDifficulty: ImplementationDifficulty;
  costEstimate: CostEstimate;

  // Details
  description?: string;
  implementationNotes?: string;
  requiredTools?: string[];

  createdAt: Date;
}

export interface DefensiveAction {
  d3fendTechniqueId: string;
  d3fendTechniqueName: string;
  category: string;
  description: string;
  implementationSteps: string[];
  requiredTools: string[];
  effectiveness: number;
  difficulty: ImplementationDifficulty;
  cost: CostEstimate;
}

export interface MITRETechnique {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  description?: string;
  detectionMethods?: string[];
  mitigations?: string[];
}

// ============================================================================
// Generation Interfaces
// ============================================================================

export interface PlaybookGenerationRequest {
  source: PlaybookGenerationSource;
  sourceId?: string; // flowId or campaignId
  name: string;
  severity: PlaybookSeverity;
  includeDetectionRules?: boolean;
  includeAutomation?: boolean;
  customizePhases?: PhaseName[];
  requiredRoles?: string[];
  tags?: string[];
  templateId?: string;
}

export interface PlaybookGenerationResponse {
  playbook: IncidentPlaybook;
  generationTime: number;
  confidence: number;
  warnings?: string[];
  suggestions?: string[];
}

export interface GenerationContext {
  attackFlow?: any;
  campaign?: any;
  techniques: MITRETechnique[];
  iocs?: any[];
  affectedAssets?: string[];
  threatActor?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreatePlaybookRequest {
  name: string;
  description?: string;
  flowId?: string;
  campaignId?: string;
  severity: PlaybookSeverity;
  estimatedTimeMinutes?: number;
  requiredRoles?: string[];
  tags?: string[];
  phases?: Partial<PlaybookPhase>[];
}

export interface UpdatePlaybookRequest {
  name?: string;
  description?: string;
  severity?: PlaybookSeverity;
  status?: PlaybookStatus;
  estimatedTimeMinutes?: number;
  requiredRoles?: string[];
  tags?: string[];
}

export interface ExecutePlaybookRequest {
  incidentId?: string;
  campaignId?: string;
  flowId?: string;
  executedBy: string;
  notes?: string;
  skipActions?: string[]; // Action IDs to skip
}

export interface AddPhaseRequest {
  phaseName: PhaseName;
  phaseOrder?: number;
  description?: string;
  estimatedDurationMinutes?: number;
  isParallel?: boolean;
}

export interface AddActionRequest {
  phaseId: string;
  actionType: ActionType;
  title: string;
  description?: string;
  instructions?: string;
  command?: string;
  apiEndpoint?: string;
  scriptPath?: string;
  parameters?: Record<string, any>;
  estimatedDurationMinutes?: number;
  requiresApproval?: boolean;
}

export interface AddDetectionRuleRequest {
  playbookId: string;
  ruleName: string;
  ruleType: DetectionRuleType;
  ruleContent: string;
  mitreTechniqueId?: string;
  applicablePlatforms?: string[];
}

export interface GenerateDetectionRulesRequest {
  techniques: string[]; // MITRE technique IDs
  ruleTypes: DetectionRuleType[];
  platforms?: string[];
}

export interface TestDetectionRuleRequest {
  ruleType: DetectionRuleType;
  ruleContent: string;
  testData?: any[];
}

export interface DeployDetectionRuleRequest {
  ruleId: string;
  targetPlatforms: string[];
  enableImmediately?: boolean;
}

// ============================================================================
// Search & Filter Types
// ============================================================================

export interface PlaybookSearchFilters {
  status?: PlaybookStatus[];
  severity?: PlaybookSeverity[];
  tags?: string[];
  createdBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasSOARIntegration?: boolean;
  minSuccessRate?: number;
  searchQuery?: string;
}

export interface PlaybookSortOptions {
  field:
    | 'name'
    | 'severity'
    | 'createdAt'
    | 'executionCount'
    | 'successRate'
    | 'lastExecuted';
  direction: 'asc' | 'desc';
}

// ============================================================================
// Analytics & Metrics Types
// ============================================================================

export interface PlaybookMetrics {
  totalPlaybooks: number;
  activePlaybooks: number;
  totalExecutions: number;
  avgSuccessRate: number;
  avgExecutionTime: number;
  topPlaybooks: Array<{
    playbookId: string;
    name: string;
    executionCount: number;
    successRate: number;
  }>;
  executionTrend: Array<{
    date: string;
    count: number;
    successCount: number;
  }>;
}

export interface PhaseMetrics {
  phaseName: PhaseName;
  avgDuration: number;
  successRate: number;
  automationRate: number;
  mostCommonActions: string[];
}

export interface DetectionRuleMetrics {
  totalRules: number;
  activeRules: number;
  deployedRules: number;
  avgConfidenceScore: number;
  detectionCount: number;
  topRules: Array<{
    ruleId: string;
    ruleName: string;
    detectionCount: number;
    falsePositiveRate: number;
  }>;
}

// ============================================================================
// UI Component Props
// ============================================================================

export interface PlaybookGeneratorWizardProps {
  onComplete: (playbook: IncidentPlaybook) => void;
  onCancel: () => void;
  initialSource?: PlaybookGenerationSource;
  initialSourceId?: string;
}

export interface PlaybookEditorProps {
  playbookId: string;
  onSave: (playbook: IncidentPlaybook) => void;
  onCancel: () => void;
  readonly?: boolean;
}

export interface SOARIntegrationPanelProps {
  playbookId: string;
  onSync: (integration: SOARIntegration) => void;
  onDisconnect: () => void;
}

export interface PlaybookTemplateLibraryProps {
  onSelectTemplate: (template: PlaybookTemplate) => void;
  onCreateFromTemplate: (templateId: string) => void;
  category?: string;
}

export interface PlaybookExecutionViewerProps {
  executionId: string;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  realTimeUpdates?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface APIError {
  error: string;
  message: string;
  details?: ValidationError[];
}

// ============================================================================
// Export all types
// ============================================================================

export type * from './index';
