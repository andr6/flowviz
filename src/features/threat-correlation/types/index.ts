/**
 * Threat Correlation Engine - Type Definitions
 * Types for advanced threat correlation and campaign detection
 */

// ============================================================================
// IOC Types
// ============================================================================

export type IOCType =
  | 'ip'
  | 'domain'
  | 'url'
  | 'hash'
  | 'email'
  | 'cve'
  | 'registry_key'
  | 'file_path'
  | 'mutex';

export interface IOC {
  type: IOCType;
  value: string;
  confidence?: number;
  firstSeen?: Date;
  lastSeen?: Date;
  source?: string;
  enrichment?: Record<string, any>;
}

// ============================================================================
// Correlation Types
// ============================================================================

export type CorrelationType =
  | 'ioc_overlap'
  | 'ttp_similarity'
  | 'infrastructure_shared'
  | 'temporal_proximity'
  | 'target_overlap'
  | 'malware_family';

export interface ThreatCorrelation {
  id: string;
  flowId1: string;
  flowId2: string;
  correlationScore: number; // 0.0 to 1.0
  correlationType: CorrelationType;
  sharedIndicators: IOC[];
  metadata?: Record<string, any>;
  detectedAt: Date;
  updatedAt: Date;
}

export interface CorrelationResult {
  correlations: ThreatCorrelation[];
  totalFlowsAnalyzed: number;
  correlationsFound: number;
  averageScore: number;
  topCorrelations: ThreatCorrelation[];
  analysisTimestamp: Date;
}

// ============================================================================
// Campaign Types
// ============================================================================

export type CampaignStatus = 'active' | 'monitoring' | 'resolved' | 'archived';
export type CampaignSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  confidenceScore: number; // 0.0 to 1.0
  status: CampaignStatus;
  severity: CampaignSeverity;
  firstSeen: Date;
  lastSeen: Date;
  relatedFlows: string[];
  sharedTtps: string[];
  sharedIocs: IOC[];
  suspectedActor?: string;
  suspectedActorConfidence?: number;
  indicatorsCount: number;
  affectedAssets: string[];
  mitigationStatus: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  tags: string[];
}

export interface CampaignFlow {
  campaignId: string;
  flowId: string;
  addedAt: Date;
  relevanceScore: number;
  notes?: string;
}

export interface CampaignIndicator {
  id: string;
  campaignId: string;
  indicatorType: IOCType;
  indicatorValue: string;
  firstSeen: Date;
  lastSeen: Date;
  occurrenceCount: number;
  confidence: number;
  sourceFlows: string[];
  enrichmentData?: Record<string, any>;
}

export interface CampaignTTP {
  id: string;
  campaignId: string;
  techniqueId: string; // e.g., "T1566"
  techniqueName: string;
  tactic: string;
  occurrenceCount: number;
  firstSeen: Date;
  lastSeen: Date;
  sourceFlows: string[];
}

export type CampaignEventType =
  | 'campaign_detected'
  | 'new_flow_added'
  | 'new_indicator_found'
  | 'actor_attributed'
  | 'mitigation_applied'
  | 'status_changed'
  | 'severity_escalated'
  | 'campaign_merged';

export interface CampaignTimelineEvent {
  id: string;
  campaignId: string;
  eventType: CampaignEventType;
  eventTimestamp: Date;
  description: string;
  metadata?: Record<string, any>;
  createdBy?: string;
}

// ============================================================================
// Analysis & Detection Types
// ============================================================================

export interface CorrelationScore {
  iocOverlap: number;
  ttpSimilarity: number;
  infrastructureShared: number;
  temporalProximity: number;
  targetOverlap: number;
  malwareFamily: number;
  overall: number;
}

export interface FlowPair {
  flow1Id: string;
  flow2Id: string;
  flow1Data: any;
  flow2Data: any;
}

export interface CorrelationAnalysis {
  flowPair: FlowPair;
  scores: CorrelationScore;
  sharedIOCs: IOC[];
  sharedTTPs: string[];
  sharedInfrastructure: string[];
  temporalDistance: number; // hours
  recommendation: 'create_campaign' | 'add_to_existing' | 'no_action';
  suggestedCampaign?: string;
}

export interface CampaignDetectionResult {
  campaignsDetected: Campaign[];
  newCampaigns: Campaign[];
  updatedCampaigns: Campaign[];
  totalFlowsAnalyzed: number;
  detectionTimestamp: Date;
}

// ============================================================================
// Threat Graph Types
// ============================================================================

export interface ThreatGraphNode {
  id: string;
  type: 'flow' | 'ioc' | 'ttp' | 'actor' | 'campaign';
  label: string;
  data: any;
  metadata?: Record<string, any>;
  size?: number;
  color?: string;
}

export interface ThreatGraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface ThreatGraph {
  nodes: ThreatGraphNode[];
  edges: ThreatGraphEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    campaignCount: number;
    flowCount: number;
    generatedAt: Date;
  };
}

// ============================================================================
// Timeline Types
// ============================================================================

export interface TimelineEntry {
  timestamp: Date;
  type: 'flow_detection' | 'ioc_discovered' | 'ttp_observed' | 'campaign_event';
  title: string;
  description: string;
  flowId?: string;
  campaignId?: string;
  severity?: CampaignSeverity;
  metadata?: Record<string, any>;
}

export interface CampaignTimeline {
  campaignId: string;
  campaignName: string;
  entries: TimelineEntry[];
  dateRange: {
    start: Date;
    end: Date;
  };
  totalEvents: number;
}

// ============================================================================
// Report Types
// ============================================================================

export interface CampaignReport {
  campaign: Campaign;
  executiveSummary: string;
  detailedAnalysis: {
    attackVector: string;
    targetedAssets: string[];
    observedTechniques: CampaignTTP[];
    indicators: CampaignIndicator[];
    timeline: TimelineEntry[];
  };
  threatIntelligence: {
    attributedActor?: string;
    actorMotivation?: string;
    similarCampaigns: string[];
    externalReferences: string[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  generatedAt: Date;
  generatedBy?: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface CorrelationAnalytics {
  id: string;
  analysisDate: Date;
  totalFlowsAnalyzed: number;
  correlationsFound: number;
  campaignsDetected: number;
  avgCorrelationScore: number;
  topCorrelationTypes: Array<{
    type: CorrelationType;
    count: number;
    avgScore: number;
  }>;
  topSharedIndicators: Array<{
    indicator: string;
    type: IOCType;
    occurrences: number;
  }>;
  metrics: Record<string, any>;
}

// ============================================================================
// Service Configuration Types
// ============================================================================

export interface CorrelationEngineConfig {
  minCorrelationScore: number; // Minimum score to consider correlation
  iocMatchWeight: number; // Weight for IOC matching (0-1)
  ttpMatchWeight: number; // Weight for TTP matching (0-1)
  temporalWeight: number; // Weight for temporal proximity (0-1)
  infrastructureWeight: number; // Weight for infrastructure overlap (0-1)
  campaignDetectionThreshold: number; // Minimum score to create campaign
  maxTemporalDistance: number; // Max hours between flows to correlate
  autoMergeSimilarCampaigns: boolean;
  campaignMergeThreshold: number; // Similarity threshold for auto-merge
}

// ============================================================================
// Search & Filter Types
// ============================================================================

export interface CampaignSearchFilters {
  status?: CampaignStatus[];
  severity?: CampaignSeverity[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  minConfidence?: number;
  actor?: string;
  tags?: string[];
  hasActiveThreats?: boolean;
  minFlowCount?: number;
  searchQuery?: string;
}

export interface CorrelationSearchFilters {
  correlationTypes?: CorrelationType[];
  minScore?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  flowIds?: string[];
}

// ============================================================================
// Matrix & Visualization Types
// ============================================================================

export interface CorrelationMatrixCell {
  flowId1: string;
  flowId2: string;
  score: number;
  type: CorrelationType;
  hasCorrelation: boolean;
}

export interface CorrelationMatrix {
  flows: Array<{
    id: string;
    name: string;
    timestamp: Date;
  }>;
  matrix: CorrelationMatrixCell[][];
  statistics: {
    totalFlows: number;
    totalCorrelations: number;
    avgScore: number;
    highestScore: number;
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface AnalyzeCorrelationsRequest {
  flowIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  config?: Partial<CorrelationEngineConfig>;
}

export interface AnalyzeCorrelationsResponse {
  result: CorrelationResult;
  detectedCampaigns: Campaign[];
  executionTime: number;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  flowIds: string[];
  severity: CampaignSeverity;
  suspectedActor?: string;
  tags?: string[];
}

export interface CreateCampaignResponse {
  campaign: Campaign;
  indicators: CampaignIndicator[];
  ttps: CampaignTTP[];
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  status?: CampaignStatus;
  severity?: CampaignSeverity;
  suspectedActor?: string;
  tags?: string[];
  mitigationStatus?: Record<string, any>;
}

export interface MergeCampaignsRequest {
  sourceCampaignId: string;
  targetCampaignId: string;
  reason?: string;
}

export interface GetCampaignReportRequest {
  campaignId: string;
  includeFlowDetails?: boolean;
  includeEnrichment?: boolean;
  format?: 'json' | 'pdf' | 'html';
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

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sort?: SortOptions;
}

// ============================================================================
// Export all types
// ============================================================================

export type * from './index';
