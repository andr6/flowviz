export interface ThreatActor {
  id: string;
  organizationId: string;
  
  // Basic information
  name: string;
  aliases: string[];
  description: string;
  type: ThreatActorType;
  sophistication: ThreatActorSophistication;
  
  // Attribution and classification
  attribution: Attribution;
  confidence: number; // 0-1
  status: 'active' | 'inactive' | 'unknown' | 'deprecated';
  
  // Geopolitical context
  origin: GeopoliticalOrigin;
  targets: Target[];
  motivations: Motivation[];
  
  // Technical profile
  capabilities: TechnicalCapability[];
  resources: ResourceLevel;
  infrastructure: Infrastructure;
  
  // TTPs (Tactics, Techniques, Procedures)
  tactics: string[]; // MITRE ATT&CK tactics
  techniques: TechniqueUsage[];
  tools: ToolUsage[];
  malwareFamilies: MalwareFamilyUsage[];
  
  // Activity patterns
  activityPatterns: ActivityPattern[];
  timeline: ThreatActorEvent[];
  campaigns: string[]; // campaign IDs
  operations: string[]; // operation IDs
  
  // Intelligence and evidence
  indicators: ActorIndicator[];
  reportedBy: IntelligenceSource[];
  reports: ThreatReport[];
  evidence: Evidence[];
  
  // Relationships
  affiliations: ActorAffiliation[];
  relationships: ActorRelationship[];
  
  // Tracking and metrics
  firstSeen: Date;
  lastSeen: Date;
  activityScore: number; // 0-1
  threatScore: number; // 0-1
  
  // Metadata
  tags: string[];
  customFields: Record<string, any>;
  
  // Lifecycle
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export type ThreatActorType =
  | 'nation_state'
  | 'criminal_group'
  | 'terrorist_organization'
  | 'hacktivist'
  | 'insider_threat'
  | 'script_kiddie'
  | 'cyber_mercenary'
  | 'unknown';

export type ThreatActorSophistication =
  | 'none'
  | 'minimal'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'innovator'
  | 'strategic';

export interface Attribution {
  level: AttributionLevel;
  methods: AttributionMethod[];
  evidence: AttributionEvidence[];
  confidence: number; // 0-1
  lastAssessment: Date;
  assessedBy: string;
  reasoning: string;
  alternatives: AlternativeAttribution[];
}

export type AttributionLevel =
  | 'no_attribution'
  | 'weak_indicators'
  | 'moderate_confidence'
  | 'high_confidence'
  | 'confirmed';

export type AttributionMethod =
  | 'technical_analysis'
  | 'infrastructure_analysis'
  | 'behavioral_analysis'
  | 'linguistic_analysis'
  | 'temporal_analysis'
  | 'geopolitical_analysis'
  | 'human_intelligence'
  | 'signals_intelligence'
  | 'open_source_intelligence';

export interface AttributionEvidence {
  type: AttributionMethod;
  description: string;
  strength: 'weak' | 'moderate' | 'strong';
  source: string;
  timestamp: Date;
  details: Record<string, any>;
}

export interface AlternativeAttribution {
  actor: string;
  confidence: number;
  reasoning: string;
  evidence: string[];
}

export interface GeopoliticalOrigin {
  primaryCountry?: string;
  additionalCountries: string[];
  regions: string[];
  confidence: number;
  evidenceBasis: string[];
}

export interface Target {
  type: TargetType;
  sectors: string[];
  countries: string[];
  organizations: string[];
  technologies: string[];
  motivations: string[];
  frequency: TargetFrequency;
  firstObserved: Date;
  lastObserved: Date;
  confidence: number;
}

export type TargetType =
  | 'government'
  | 'military'
  | 'critical_infrastructure'
  | 'financial'
  | 'healthcare'
  | 'education'
  | 'technology'
  | 'telecommunications'
  | 'energy'
  | 'media'
  | 'civil_society'
  | 'individuals';

export type TargetFrequency =
  | 'rare'
  | 'occasional'
  | 'regular'
  | 'frequent'
  | 'primary_focus';

export interface Motivation {
  type: MotivationType;
  description: string;
  priority: 'primary' | 'secondary' | 'tertiary';
  confidence: number;
  evidence: string[];
}

export type MotivationType =
  | 'espionage'
  | 'financial_gain'
  | 'disruption'
  | 'destruction'
  | 'reputation_damage'
  | 'political_influence'
  | 'ideological'
  | 'personal_vendetta'
  | 'testing_capabilities'
  | 'unknown';

export interface TechnicalCapability {
  category: CapabilityCategory;
  level: CapabilityLevel;
  techniques: string[];
  tools: string[];
  examples: string[];
  confidence: number;
  evidence: string[];
}

export type CapabilityCategory =
  | 'reconnaissance'
  | 'initial_access'
  | 'execution'
  | 'persistence'
  | 'privilege_escalation'
  | 'defense_evasion'
  | 'credential_access'
  | 'discovery'
  | 'lateral_movement'
  | 'collection'
  | 'command_and_control'
  | 'exfiltration'
  | 'impact'
  | 'malware_development'
  | 'infrastructure_management'
  | 'social_engineering'
  | 'physical_access';

export type CapabilityLevel =
  | 'basic'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export type ResourceLevel =
  | 'individual'
  | 'small_group'
  | 'organized_group'
  | 'organization'
  | 'government';

export interface Infrastructure {
  hosting: HostingInfrastructure;
  command_control: CommandControlInfrastructure;
  operational_security: OperationalSecurity;
  patterns: InfrastructurePattern[];
}

export interface HostingInfrastructure {
  providers: string[];
  countries: string[];
  patterns: string[];
  reuse: InfrastructureReuse;
}

export interface CommandControlInfrastructure {
  protocols: string[];
  domains: DomainPattern[];
  ips: IPPattern[];
  certificates: CertificatePattern[];
  communication_patterns: CommunicationPattern[];
}

export interface OperationalSecurity {
  level: 'poor' | 'basic' | 'good' | 'excellent';
  tradecraft: string[];
  mistakes: string[];
  improvements: string[];
}

export interface InfrastructurePattern {
  type: 'domain' | 'ip' | 'certificate' | 'hosting';
  pattern: string;
  description: string;
  confidence: number;
  examples: string[];
}

export interface InfrastructureReuse {
  frequency: 'never' | 'rare' | 'occasional' | 'frequent' | 'always';
  patterns: string[];
  timeline: number; // days between reuse
}

export interface DomainPattern {
  pattern: string;
  type: 'typosquatting' | 'subdomain_generation' | 'legitimate_service' | 'custom';
  examples: string[];
  confidence: number;
}

export interface IPPattern {
  ranges: string[];
  countries: string[];
  asns: string[];
  providers: string[];
  type: 'bulletproof' | 'compromised' | 'cloud' | 'residential' | 'datacenter';
}

export interface CertificatePattern {
  issuers: string[];
  subjects: string[];
  validity_periods: string[];
  types: string[];
}

export interface CommunicationPattern {
  frequency: string;
  timing: string[];
  protocols: string[];
  encryption: string[];
  beaconing: BeaconingPattern[];
}

export interface BeaconingPattern {
  interval: number; // seconds
  jitter: number; // percentage
  protocol: string;
  pattern: string;
  confidence: number;
}

export interface TechniqueUsage {
  techniqueId: string; // MITRE ATT&CK ID
  name: string;
  frequency: UsageFrequency;
  sophistication: 'basic' | 'intermediate' | 'advanced';
  variants: string[];
  firstObserved: Date;
  lastObserved: Date;
  campaigns: string[];
  confidence: number;
  evidence: string[];
}

export interface ToolUsage {
  name: string;
  type: ToolType;
  category: string;
  frequency: UsageFrequency;
  versions: string[];
  modifications: string[];
  firstObserved: Date;
  lastObserved: Date;
  campaigns: string[];
  confidence: number;
  evidence: string[];
}

export type ToolType =
  | 'commercial'
  | 'open_source'
  | 'custom'
  | 'living_off_the_land'
  | 'stolen'
  | 'leaked';

export interface MalwareFamilyUsage {
  family: string;
  variants: string[];
  frequency: UsageFrequency;
  role: MalwareRole;
  platforms: string[];
  firstObserved: Date;
  lastObserved: Date;
  campaigns: string[];
  confidence: number;
  evidence: string[];
}

export type MalwareRole =
  | 'dropper'
  | 'loader'
  | 'backdoor'
  | 'trojan'
  | 'ransomware'
  | 'spyware'
  | 'wiper'
  | 'rootkit'
  | 'bot'
  | 'tool';

export type UsageFrequency =
  | 'one_time'
  | 'rare'
  | 'occasional'
  | 'regular'
  | 'frequent'
  | 'signature';

export interface ActivityPattern {
  type: ActivityPatternType;
  description: string;
  pattern: string;
  confidence: number;
  evidence: string[];
  timeline: ActivityTimeline;
  geography: ActivityGeography;
}

export type ActivityPatternType =
  | 'temporal'
  | 'geographic'
  | 'targeting'
  | 'technical'
  | 'operational'
  | 'behavioral';

export interface ActivityTimeline {
  timezone: string;
  workingHours: string[];
  workingDays: string[];
  seasons: string[];
  holidays: boolean;
  patterns: string[];
}

export interface ActivityGeography {
  sourceCountries: string[];
  targetCountries: string[];
  infrastructure: string[];
  patterns: string[];
}

export interface ThreatActorEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: Date;
  confidence: number;
  sources: string[];
  campaigns: string[];
  impact: EventImpact;
  tags: string[];
  evidence: string[];
}

export type EventType =
  | 'first_appearance'
  | 'campaign_launch'
  | 'technique_adoption'
  | 'tool_usage'
  | 'infrastructure_change'
  | 'targeting_shift'
  | 'capability_evolution'
  | 'operational_pause'
  | 'rebranding'
  | 'attribution_update'
  | 'takedown'
  | 'arrest'
  | 'exposure';

export interface EventImpact {
  scope: 'single_target' | 'multiple_targets' | 'sector' | 'regional' | 'global';
  severity: 'minimal' | 'limited' | 'moderate' | 'significant' | 'severe';
  affected_entities: string[];
  economic_impact?: number;
  casualties?: number;
}

export interface ActorIndicator {
  id: string;
  type: 'technical' | 'behavioral' | 'contextual';
  indicator: string;
  category: string;
  confidence: number;
  strength: 'weak' | 'moderate' | 'strong';
  uniqueness: 'common' | 'uncommon' | 'rare' | 'unique';
  persistence: 'temporary' | 'recurring' | 'persistent';
  campaigns: string[];
  firstObserved: Date;
  lastObserved: Date;
  evidence: string[];
}

export interface IntelligenceSource {
  organization: string;
  type: SourceType;
  reliability: ReliabilityRating;
  access: string;
  timeliness: string;
  relevance: string;
  reports: string[];
}

export type SourceType =
  | 'government'
  | 'private_security'
  | 'academic'
  | 'media'
  | 'open_source'
  | 'commercial'
  | 'underground'
  | 'victim_reports';

export type ReliabilityRating =
  | 'A' // Completely reliable
  | 'B' // Usually reliable
  | 'C' // Fairly reliable
  | 'D' // Not usually reliable
  | 'E' // Unreliable
  | 'F'; // Reliability cannot be judged

export interface ThreatReport {
  id: string;
  title: string;
  summary: string;
  publishedDate: Date;
  author: string;
  organization: string;
  url?: string;
  type: ReportType;
  classification: string;
  relevance: number; // 0-1
  quality: number; // 0-1
  keyFindings: string[];
  recommendations: string[];
  indicators: string[];
  techniques: string[];
  campaigns: string[];
}

export type ReportType =
  | 'threat_assessment'
  | 'technical_analysis'
  | 'incident_report'
  | 'campaign_analysis'
  | 'actor_profile'
  | 'strategic_assessment'
  | 'tactical_bulletin'
  | 'warning'
  | 'advisory';

export interface Evidence {
  id: string;
  type: EvidenceType;
  description: string;
  source: string;
  reliability: ReliabilityRating;
  timestamp: Date;
  relevance: number;
  confidence: number;
  details: Record<string, any>;
  references: string[];
}

export type EvidenceType =
  | 'malware_sample'
  | 'network_traffic'
  | 'domain_registration'
  | 'certificate'
  | 'code_similarity'
  | 'linguistic_analysis'
  | 'operational_pattern'
  | 'infrastructure_overlap'
  | 'victim_testimony'
  | 'leaked_communication'
  | 'financial_transaction'
  | 'physical_evidence';

export interface ActorAffiliation {
  actorId: string;
  type: AffiliationType;
  relationship: string;
  confidence: number;
  timeframe: {
    start: Date;
    end?: Date;
  };
  evidence: string[];
  description: string;
}

export type AffiliationType =
  | 'member'
  | 'leader'
  | 'contractor'
  | 'affiliate'
  | 'client'
  | 'supplier'
  | 'competitor'
  | 'successor'
  | 'splinter_group';

export interface ActorRelationship {
  relatedActorId: string;
  type: RelationshipType;
  description: string;
  confidence: number;
  evidence: string[];
  timeline: {
    start: Date;
    end?: Date;
  };
  nature: RelationshipNature;
}

export type RelationshipType =
  | 'cooperation'
  | 'coordination'
  | 'competition'
  | 'conflict'
  | 'mentorship'
  | 'succession'
  | 'merger'
  | 'split'
  | 'impersonation'
  | 'false_flag';

export type RelationshipNature =
  | 'confirmed'
  | 'suspected'
  | 'possible'
  | 'disputed'
  | 'historical';

export interface ThreatActorMetrics {
  totalActors: number;
  activeActors: number;
  topActorsByThreatScore: ThreatActor[];
  recentActivity: ThreatActorEvent[];
  attributionDistribution: Record<AttributionLevel, number>;
  motivationDistribution: Record<MotivationType, number>;
  typeDistribution: Record<ThreatActorType, number>;
  geographicDistribution: Record<string, number>;
  trendAnalysis: ThreatActorTrend[];
}

export interface ThreatActorTrend {
  period: string;
  newActors: number;
  activeActors: number;
  newCampaigns: number;
  topTechniques: string[];
  emergingThreats: string[];
}

export interface ActorSearchQuery {
  name?: string;
  aliases?: string[];
  type?: ThreatActorType[];
  sophistication?: ThreatActorSophistication[];
  origin?: string[];
  targets?: string[];
  motivations?: MotivationType[];
  techniques?: string[];
  tools?: string[];
  malware?: string[];
  confidence_min?: number;
  threat_score_min?: number;
  activity_since?: Date;
  tags?: string[];
  limit?: number;
  offset?: number;
  sort_by?: 'name' | 'threat_score' | 'activity_score' | 'last_seen' | 'confidence';
  sort_order?: 'asc' | 'desc';
}

export interface ActorSearchResult {
  actors: ThreatActor[];
  totalCount: number;
  facets: SearchFacets;
  queryTime: number;
}

export interface SearchFacets {
  types: Record<ThreatActorType, number>;
  sophistication: Record<ThreatActorSophistication, number>;
  origins: Record<string, number>;
  motivations: Record<MotivationType, number>;
  techniques: Record<string, number>;
  campaigns: Record<string, number>;
}

export interface AttributionAnalysis {
  actorId: string;
  indicators: AttributionIndicator[];
  confidence: number;
  reasoning: string;
  alternatives: AlternativeAttribution[];
  evidence_strength: EvidenceStrength;
  recommendation: AttributionRecommendation;
}

export interface AttributionIndicator {
  type: AttributionMethod;
  strength: 'weak' | 'moderate' | 'strong';
  description: string;
  confidence: number;
  weight: number;
  evidence: string[];
}

export interface EvidenceStrength {
  technical: number;
  behavioral: number;
  contextual: number;
  overall: number;
}

export interface AttributionRecommendation {
  action: 'no_attribution' | 'tentative_attribution' | 'confident_attribution' | 'further_analysis';
  reasoning: string;
  next_steps: string[];
  timeline: string;
}