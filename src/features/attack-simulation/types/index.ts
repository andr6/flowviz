/**
 * Attack Simulation & Purple Teaming - Type Definitions
 * Complete type safety for automated attack simulation and validation
 */

// ============================================================================
// Core Enums
// ============================================================================

export type SimulationPlatform =
  | 'picus'
  | 'atomic_red_team'
  | 'caldera'
  | 'attackiq'
  | 'custom';

export type ExecutionMode =
  | 'safe'        // Safe mode - no actual execution
  | 'simulation'  // Simulation mode - contained execution
  | 'live'        // Live mode - actual execution in production
  | 'validation'; // Validation mode - test detection only

export type SimulationStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type JobStatus =
  | 'pending'
  | 'initializing'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ValidationResultStatus =
  | 'success'   // Technique executed successfully
  | 'blocked'   // Technique was blocked/prevented
  | 'detected'  // Technique was detected but not prevented
  | 'failed'    // Technique execution failed
  | 'skipped'   // Technique was skipped
  | 'timeout';  // Technique execution timed out

export type GapType =
  | 'detection'
  | 'prevention'
  | 'visibility'
  | 'response'
  | 'coverage';

export type GapSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info';

export type GapStatus =
  | 'open'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'accepted'
  | 'false_positive';

export type ControlType =
  | 'preventive'
  | 'detective'
  | 'corrective'
  | 'deterrent';

export type ControlStatus =
  | 'effective'
  | 'partially_effective'
  | 'ineffective'
  | 'not_tested'
  | 'bypassed';

export type RemediationCategory =
  | 'technical'
  | 'process'
  | 'people'
  | 'policy';

export type RemediationStatus =
  | 'pending'
  | 'approved'
  | 'in_progress'
  | 'testing'
  | 'completed'
  | 'rejected'
  | 'deferred';

export type TemplateType =
  | 'technique_set'
  | 'full_scenario'
  | 'apt_emulation'
  | 'compliance_test';

// ============================================================================
// Technique Definition
// ============================================================================

export interface SimulationTechnique {
  id: string;
  name: string;
  tactic?: string;
  subTechniqueId?: string;
  description?: string;
  platforms?: string[];
  dataSource?: string[];
  defensesBypassed?: string[];
  permissionsRequired?: string[];
}

// ============================================================================
// Simulation Plan
// ============================================================================

export interface SimulationPlan {
  id: string;
  name: string;
  description?: string;

  // Source
  flowId?: string;
  campaignId?: string;
  playbookId?: string;
  sourceType: 'flow' | 'campaign' | 'playbook' | 'manual' | 'template';

  // Configuration
  targetEnvironment: string;
  executionMode: ExecutionMode;
  platform: SimulationPlatform;

  // Techniques
  techniques: SimulationTechnique[];
  techniqueCount: number;

  // Schedule
  scheduledStart?: Date;
  scheduledEnd?: Date;
  recurrence?: string;

  // Plan data
  planData: Record<string, any>;

  // Status
  status: SimulationStatus;

  // Metadata
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

// ============================================================================
// Simulation Job (Execution)
// ============================================================================

export interface SimulationJob {
  id: string;
  planId: string;

  // Execution details
  jobNumber: number;
  executionMode: ExecutionMode;
  targetEnvironment: string;
  platform: SimulationPlatform;
  platformJobId?: string;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;

  // Status
  status: JobStatus;
  progressPercentage: number;

  // Results summary
  totalTechniques: number;
  techniquesExecuted: number;
  techniquesSuccessful: number;
  techniquesFailed: number;
  techniquesBlocked: number;

  // Scores
  detectionScore?: number;
  preventionScore?: number;
  overallScore?: number;

  // Data
  jobData: Record<string, any>;
  executionLog: ExecutionLogEntry[];

  // Error handling
  errorMessage?: string;
  errorDetails?: Record<string, any>;

  // Metadata
  executedBy?: string;
  createdAt: Date;
}

export interface ExecutionLogEntry {
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  techniqueId?: string;
  data?: Record<string, any>;
}

// ============================================================================
// Validation Result
// ============================================================================

export interface ValidationResult {
  id: string;
  jobId: string;

  // Technique details
  techniqueId: string;
  techniqueName: string;
  tactic?: string;
  subTechniqueId?: string;

  // Execution
  executionOrder: number;
  executedAt: Date;
  durationSeconds?: number;

  // Result
  resultStatus: ValidationResultStatus;
  wasDetected: boolean;
  wasPrevented: boolean;
  detectionTimeSeconds?: number;

  // Detection details
  detectedBy: string[];
  detectionRulesTriggered: string[];
  alertsGenerated: number;

  // Prevention details
  preventedBy: string[];
  preventionMechanism?: string;

  // Evidence
  evidence: Record<string, any>;
  artifacts: Artifact[];
  screenshots: string[];

  // Analysis
  confidenceScore?: number;
  falsePositive: boolean;
  notes?: string;

  // Result data
  resultData: Record<string, any>;

  createdAt: Date;
}

export interface Artifact {
  id: string;
  type: 'log' | 'screenshot' | 'file' | 'pcap' | 'memory_dump';
  name: string;
  description?: string;
  url?: string;
  data?: any;
  collectedAt: Date;
}

// ============================================================================
// Control Coverage
// ============================================================================

export interface ControlCoverage {
  id: string;
  jobId?: string;
  organizationId?: string;

  // Control information
  controlId: string;
  controlName: string;
  controlType: ControlType;
  controlFamily?: string;

  // Coverage
  mitreTechniquesCovered: string[];
  coveragePercentage: number;

  // Effectiveness
  effectivenessScore: number;
  testsPassed: number;
  testsFailed: number;

  // Status
  status: ControlStatus;

  // Compliance mapping
  nistControls: string[];
  cisControls: string[];
  isoControls: string[];

  // Data
  coverageData: Record<string, any>;

  // Metadata
  assessedAt: Date;
  nextAssessment?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Gap Analysis
// ============================================================================

export interface GapAnalysis {
  id: string;
  jobId: string;

  // Gap identification
  gapType: GapType;
  severity: GapSeverity;

  // Technique/control affected
  techniqueId?: string;
  techniqueName?: string;
  controlId?: string;
  controlName?: string;

  // Gap details
  title: string;
  description: string;
  impactDescription?: string;
  riskScore?: number;

  // Evidence
  evidence: Record<string, any>;
  affectedAssets: string[];

  // Status
  status: GapStatus;

  // Resolution
  assignedTo?: string;
  dueDate?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;

  // Data
  gapData: Record<string, any>;

  // Metadata
  identifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Remediation Recommendation
// ============================================================================

export interface RemediationRecommendation {
  id: string;
  gapId?: string;
  jobId?: string;

  // Recommendation details
  title: string;
  description: string;
  category: RemediationCategory;

  // Implementation
  implementationSteps: ImplementationStep[];
  estimatedEffortHours?: number;
  estimatedCost: 'low' | 'medium' | 'high' | 'very_high';
  complexity: 'low' | 'medium' | 'high';

  // Priority
  priority: number;
  riskReduction?: number;

  // Requirements
  requiredTools: string[];
  requiredSkills: string[];
  requiredResources: string[];

  // Dependencies
  prerequisites: string[];
  dependencies: string[];

  // Tracking
  status: RemediationStatus;
  assignedTo?: string;
  dueDate?: Date;

  // Completion
  implementedAt?: Date;
  implementedBy?: string;
  validationNotes?: string;
  effectivenessRating?: number;

  // Data
  recommendationData: Record<string, any>;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ImplementationStep {
  order: number;
  title: string;
  description: string;
  estimatedHours?: number;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

// ============================================================================
// Platform Integration
// ============================================================================

export interface PlatformIntegration {
  id: string;

  // Platform details
  platform: SimulationPlatform;
  name: string;
  description?: string;

  // Configuration
  apiUrl?: string;
  apiKeyEncrypted?: string;
  username?: string;
  additionalConfig: Record<string, any>;

  // Status
  status: 'active' | 'inactive' | 'error' | 'testing';
  lastConnected?: Date;
  lastSync?: Date;
  connectionError?: string;

  // Capabilities
  supportsSafeMode: boolean;
  supportsScheduling: boolean;
  supportsLiveExecution: boolean;
  maxConcurrentJobs: number;

  // Usage
  jobsExecuted: number;
  lastJobAt?: Date;

  // Metadata
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Simulation Template
// ============================================================================

export interface SimulationTemplate {
  id: string;

  // Template details
  name: string;
  description?: string;
  category?: string;

  // Template data
  templateType: TemplateType;
  techniques: SimulationTechnique[];
  configuration: Record<string, any>;

  // Usage
  usageCount: number;
  avgExecutionTime?: number;
  avgSuccessRate?: number;

  // Metadata
  isPublic: boolean;
  tags: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateSimulationPlanRequest {
  name: string;
  description?: string;
  flowId?: string;
  campaignId?: string;
  playbookId?: string;
  sourceType: 'flow' | 'campaign' | 'playbook' | 'manual' | 'template';
  targetEnvironment: string;
  executionMode: ExecutionMode;
  platform: SimulationPlatform;
  techniques: SimulationTechnique[];
  scheduledStart?: Date;
  scheduledEnd?: Date;
  recurrence?: string;
}

export interface ExecuteSimulationRequest {
  planId: string;
  executionMode?: ExecutionMode;
  targetEnvironment?: string;
  executedBy: string;
}

export interface SimulationProgressUpdate {
  jobId: string;
  status: JobStatus;
  progressPercentage: number;
  techniquesExecuted: number;
  currentTechnique?: string;
  message?: string;
}

export interface ConvertFlowToSimulationRequest {
  flowId: string;
  targetEnvironment: string;
  executionMode: ExecutionMode;
  platform: SimulationPlatform;
}

export interface ConvertFlowToSimulationResponse {
  plan: SimulationPlan;
  warnings?: string[];
  suggestions?: string[];
}

export interface PicusValidationRequest {
  flowId: string;
  mode: 'safe' | 'live';
  targetEnvironment?: string;
}

export interface PicusValidationResponse {
  validationId: string;
  status: string;
  techniques: SimulationTechnique[];
  estimatedDuration: number;
}

export interface GapAnalysisRequest {
  jobId: string;
  includeRecommendations?: boolean;
}

export interface GapAnalysisResponse {
  gaps: GapAnalysis[];
  recommendations?: RemediationRecommendation[];
  summary: {
    totalGaps: number;
    criticalGaps: number;
    highGaps: number;
    mediumGaps: number;
    lowGaps: number;
    avgRiskScore: number;
  };
}

// ============================================================================
// Defensive Coverage Types
// ============================================================================

export interface DefensiveCoverage {
  techniques: TechniqueCoverage[];
  controlsMapped: ControlMapping[];
  overallCoverage: number;
  gaps: CoverageGap[];
}

export interface TechniqueCoverage {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  controlsCovering: string[];
  coverageLevel: 'full' | 'partial' | 'none';
  detectionCapability: number;
  preventionCapability: number;
}

export interface ControlMapping {
  controlId: string;
  controlName: string;
  techniquesCovered: string[];
  effectiveness: number;
}

export interface CoverageGap {
  techniqueId: string;
  techniqueName: string;
  gapType: 'detection' | 'prevention' | 'both';
  recommendedControls: string[];
}

// ============================================================================
// Scoring & Metrics
// ============================================================================

export interface SimulationScores {
  detectionScore: number;
  preventionScore: number;
  overallScore: number;
  techniqueBreakdown: TechniqueScore[];
}

export interface TechniqueScore {
  techniqueId: string;
  techniqueName: string;
  detected: boolean;
  prevented: boolean;
  detectionTime?: number;
  score: number;
}

export interface ControlEffectiveness {
  controlId: string;
  controlName: string;
  effectivenessScore: number;
  techniquesTested: number;
  techniquesPassed: number;
  techniquesFailed: number;
}

// ============================================================================
// Search & Filter Types
// ============================================================================

export interface SimulationSearchFilters {
  status?: SimulationStatus[];
  platform?: SimulationPlatform[];
  executionMode?: ExecutionMode[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  targetEnvironment?: string;
  searchQuery?: string;
}

export interface GapSearchFilters {
  gapType?: GapType[];
  severity?: GapSeverity[];
  status?: GapStatus[];
  assignedTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface SimulationAnalytics {
  totalSimulations: number;
  completedSimulations: number;
  failedSimulations: number;
  avgDetectionScore: number;
  avgPreventionScore: number;
  avgOverallScore: number;
  techniqueBreakdown: TechniqueAnalytics[];
  platformBreakdown: PlatformAnalytics[];
  trendData: TrendDataPoint[];
}

export interface TechniqueAnalytics {
  techniqueId: string;
  techniqueName: string;
  timesExecuted: number;
  timesDetected: number;
  timesPrevented: number;
  detectionRate: number;
  preventionRate: number;
}

export interface PlatformAnalytics {
  platform: SimulationPlatform;
  totalJobs: number;
  avgScore: number;
  avgDuration: number;
}

export interface TrendDataPoint {
  date: string;
  detectionScore: number;
  preventionScore: number;
  overallScore: number;
  jobsExecuted: number;
}

// ============================================================================
// UI Component Props
// ============================================================================

export interface SimulationOrchestratorProps {
  onSimulationComplete?: (job: SimulationJob) => void;
  onSimulationError?: (error: Error) => void;
  initialPlanId?: string;
}

export interface ValidationResultsViewerProps {
  jobId: string;
  onTechniqueClick?: (technique: ValidationResult) => void;
  showFilters?: boolean;
}

export interface ControlGapAnalysisProps {
  jobId: string;
  onGapClick?: (gap: GapAnalysis) => void;
  onRecommendationClick?: (recommendation: RemediationRecommendation) => void;
}

export interface RemediationPlannerProps {
  gapId?: string;
  jobId?: string;
  onRecommendationSave?: (recommendation: RemediationRecommendation) => void;
}

export interface PurpleTeamWorkspaceProps {
  onSimulationCreate?: (plan: SimulationPlan) => void;
  onAnalysisComplete?: (analysis: GapAnalysisResponse) => void;
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
