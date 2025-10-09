export interface Campaign {
  id: string;
  organizationId: string;
  
  // Basic information
  name: string;
  aliases: string[];
  description: string;
  status: CampaignStatus;
  
  // Attribution
  actors: CampaignActor[];
  confidence: number; // 0-1
  attribution_quality: AttributionQuality;
  
  // Timeline
  firstActivity: Date;
  lastActivity: Date;
  duration: number; // days
  phases: CampaignPhase[];
  timeline: CampaignEvent[];
  
  // Scope and targeting
  scope: CampaignScope;
  targets: CampaignTarget[];
  geography: CampaignGeography;
  victims: CampaignVictim[];
  
  // Technical details
  techniques: CampaignTechnique[];
  tools: CampaignTool[];
  malware: CampaignMalware[];
  infrastructure: CampaignInfrastructure;
  
  // Intelligence and analysis
  objectives: CampaignObjective[];
  motivations: string[];
  sophistication: CampaignSophistication;
  success_metrics: SuccessMetric[];
  
  // Indicators and evidence
  indicators: CampaignIndicator[];
  signatures: CampaignSignature[];
  evidence: CampaignEvidence[];
  
  // Relationships
  related_campaigns: RelatedCampaign[];
  parent_campaign?: string;
  child_campaigns: string[];
  
  // Impact assessment
  impact: CampaignImpact;
  affected_sectors: string[];
  affected_countries: string[];
  
  // Intelligence sources
  sources: CampaignSource[];
  reports: string[]; // report IDs
  
  // Metadata
  tags: string[];
  classification: string;
  customFields: Record<string, any>;
  
  // Lifecycle
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  analyzedBy: string[];
  
  // Tracking
  tracking_status: TrackingStatus;
  monitoring: MonitoringConfig;
}

export type CampaignStatus =
  | 'suspected'
  | 'confirmed'
  | 'active'
  | 'dormant'
  | 'concluded'
  | 'disrupted'
  | 'unknown';

export interface CampaignActor {
  actorId: string;
  name: string;
  role: ActorRole;
  confidence: number;
  evidence: string[];
  attribution_method: string[];
}

export type ActorRole =
  | 'primary_actor'
  | 'secondary_actor'
  | 'contractor'
  | 'affiliate'
  | 'infrastructure_provider'
  | 'tool_provider'
  | 'financier'
  | 'unknown';

export type AttributionQuality =
  | 'high_confidence'
  | 'moderate_confidence'
  | 'low_confidence'
  | 'speculative'
  | 'disputed';

export interface CampaignPhase {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  objectives: string[];
  techniques: string[];
  tools: string[];
  targets: string[];
  success_indicators: string[];
  outcomes: PhaseOutcome[];
}

export interface PhaseOutcome {
  type: 'success' | 'partial_success' | 'failure' | 'unknown';
  description: string;
  evidence: string[];
  impact: string;
}

export interface CampaignEvent {
  id: string;
  timestamp: Date;
  type: CampaignEventType;
  title: string;
  description: string;
  phase?: string;
  confidence: number;
  sources: string[];
  techniques: string[];
  targets: string[];
  indicators: string[];
  impact: EventImpact;
  evidence: string[];
  tags: string[];
}

export type CampaignEventType =
  | 'campaign_start'
  | 'initial_compromise'
  | 'reconnaissance'
  | 'phishing_campaign'
  | 'malware_deployment'
  | 'lateral_movement'
  | 'privilege_escalation'
  | 'data_collection'
  | 'exfiltration'
  | 'impact_phase'
  | 'infrastructure_change'
  | 'tactic_evolution'
  | 'target_expansion'
  | 'operational_pause'
  | 'disruption'
  | 'campaign_end'
  | 'attribution_update'
  | 'investigation_milestone';

export interface EventImpact {
  severity: 'minimal' | 'limited' | 'moderate' | 'significant' | 'severe';
  scope: 'single_entity' | 'multiple_entities' | 'sector' | 'regional' | 'global';
  type: ImpactType[];
  quantitative_metrics: QuantitativeMetric[];
  qualitative_assessment: string;
}

export type ImpactType =
  | 'data_theft'
  | 'data_destruction'
  | 'service_disruption'
  | 'financial_loss'
  | 'reputation_damage'
  | 'operational_impact'
  | 'strategic_advantage'
  | 'intelligence_gathering'
  | 'infrastructure_damage';

export interface QuantitativeMetric {
  metric: string;
  value: number;
  unit: string;
  confidence: number;
  source: string;
}

export interface CampaignScope {
  scale: CampaignScale;
  duration_category: DurationCategory;
  complexity: ComplexityLevel;
  coordination_level: CoordinationLevel;
  resource_requirements: ResourceRequirement[];
}

export type CampaignScale =
  | 'limited'
  | 'moderate'
  | 'extensive'
  | 'massive'
  | 'strategic';

export type DurationCategory =
  | 'short_term'    // < 1 month
  | 'medium_term'   // 1-6 months
  | 'long_term'     // 6-12 months
  | 'persistent'    // > 12 months
  | 'ongoing';

export type ComplexityLevel =
  | 'simple'
  | 'moderate'
  | 'complex'
  | 'highly_complex'
  | 'advanced_persistent';

export type CoordinationLevel =
  | 'individual'
  | 'small_group'
  | 'coordinated_group'
  | 'multi_group'
  | 'organizational'
  | 'state_sponsored';

export interface ResourceRequirement {
  type: ResourceType;
  level: 'low' | 'medium' | 'high' | 'very_high';
  description: string;
  evidence: string[];
}

export type ResourceType =
  | 'financial'
  | 'technical_expertise'
  | 'infrastructure'
  | 'time'
  | 'personnel'
  | 'access'
  | 'intelligence'
  | 'tools';

export interface CampaignTarget {
  id: string;
  type: TargetType;
  identifier: string;
  name?: string;
  sector: string[];
  geography: string[];
  size: TargetSize;
  value: TargetValue;
  vulnerability: TargetVulnerability;
  targeting_method: TargetingMethod[];
  first_targeted: Date;
  last_targeted: Date;
  success_rate: number; // 0-1
  compromise_indicators: string[];
  protection_level: ProtectionLevel;
}

export type TargetType =
  | 'government_agency'
  | 'military_organization'
  | 'critical_infrastructure'
  | 'financial_institution'
  | 'healthcare_organization'
  | 'educational_institution'
  | 'technology_company'
  | 'telecommunications'
  | 'energy_company'
  | 'manufacturing'
  | 'media_organization'
  | 'ngo'
  | 'individual'
  | 'supply_chain'
  | 'cloud_provider';

export type TargetSize =
  | 'individual'
  | 'small_organization'
  | 'medium_organization'
  | 'large_organization'
  | 'multinational'
  | 'government';

export type TargetValue =
  | 'low_value'
  | 'moderate_value'
  | 'high_value'
  | 'critical_value'
  | 'strategic_value';

export interface TargetVulnerability {
  technical: VulnerabilityLevel;
  human: VulnerabilityLevel;
  process: VulnerabilityLevel;
  physical: VulnerabilityLevel;
  specific_vulnerabilities: string[];
  exploitation_history: string[];
}

export type VulnerabilityLevel =
  | 'very_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high';

export type TargetingMethod =
  | 'mass_targeting'
  | 'sector_targeting'
  | 'geographic_targeting'
  | 'supply_chain_targeting'
  | 'spear_phishing'
  | 'watering_hole'
  | 'direct_access'
  | 'insider_recruitment'
  | 'third_party_compromise';

export type ProtectionLevel =
  | 'minimal'
  | 'basic'
  | 'standard'
  | 'enhanced'
  | 'military_grade';

export interface CampaignGeography {
  source_countries: GeographicEntity[];
  target_countries: GeographicEntity[];
  infrastructure_countries: GeographicEntity[];
  operational_regions: string[];
  geographic_patterns: GeographicPattern[];
}

export interface GeographicEntity {
  country: string;
  regions: string[];
  cities: string[];
  confidence: number;
  evidence: string[];
  role: GeographicRole[];
}

export type GeographicRole =
  | 'source'
  | 'target'
  | 'infrastructure'
  | 'command_control'
  | 'money_laundering'
  | 'safe_haven'
  | 'transit';

export interface GeographicPattern {
  pattern_type: 'timezone_preference' | 'regional_focus' | 'infrastructure_clustering' | 'targeting_bias';
  description: string;
  evidence: string[];
  confidence: number;
}

export interface CampaignVictim {
  id: string;
  target_id?: string;
  name?: string;
  type: TargetType;
  sector: string;
  country: string;
  compromise_date: Date;
  discovery_date?: Date;
  disclosure_date?: Date;
  status: VictimStatus;
  compromise_method: string[];
  data_compromised: DataType[];
  estimated_impact: ImpactEstimate;
  recovery_status: RecoveryStatus;
  lessons_learned: string[];
  public: boolean;
}

export type VictimStatus =
  | 'suspected'
  | 'confirmed'
  | 'ongoing'
  | 'contained'
  | 'recovered'
  | 'unknown';

export type DataType =
  | 'personal_data'
  | 'financial_data'
  | 'health_records'
  | 'intellectual_property'
  | 'government_data'
  | 'military_data'
  | 'infrastructure_data'
  | 'communications'
  | 'credentials'
  | 'source_code'
  | 'business_intelligence'
  | 'research_data';

export interface ImpactEstimate {
  financial_loss?: number;
  currency?: string;
  affected_individuals?: number;
  downtime_hours?: number;
  data_volume?: string;
  confidence: number;
  source: string;
}

export type RecoveryStatus =
  | 'not_started'
  | 'in_progress'
  | 'partially_recovered'
  | 'fully_recovered'
  | 'unrecoverable'
  | 'unknown';

export interface CampaignTechnique {
  techniqueId: string; // MITRE ATT&CK ID
  name: string;
  category: string;
  frequency: UsageFrequency;
  effectiveness: EffectivenessRating;
  phases: string[];
  targets: string[];
  variants: TechniqueVariant[];
  first_observed: Date;
  last_observed: Date;
  evolution: TechniqueEvolution[];
  countermeasures: Countermeasure[];
  evidence: string[];
}

export type UsageFrequency =
  | 'rare'
  | 'occasional'
  | 'frequent'
  | 'signature'
  | 'exclusive';

export type EffectivenessRating =
  | 'ineffective'
  | 'limited'
  | 'moderate'
  | 'effective'
  | 'highly_effective';

export interface TechniqueVariant {
  name: string;
  description: string;
  targets: string[];
  effectiveness: EffectivenessRating;
  detection_difficulty: DetectionDifficulty;
  evidence: string[];
}

export type DetectionDifficulty =
  | 'easy'
  | 'moderate'
  | 'difficult'
  | 'very_difficult'
  | 'nearly_impossible';

export interface TechniqueEvolution {
  timestamp: Date;
  change_type: 'introduction' | 'modification' | 'abandonment' | 'refinement';
  description: string;
  reason: string;
  impact: string;
  evidence: string[];
}

export interface Countermeasure {
  type: 'detection' | 'prevention' | 'mitigation' | 'response';
  name: string;
  description: string;
  effectiveness: EffectivenessRating;
  implementation_difficulty: 'easy' | 'moderate' | 'difficult';
  cost: 'low' | 'medium' | 'high';
  references: string[];
}

export interface CampaignTool {
  name: string;
  type: ToolType;
  category: ToolCategory;
  purpose: string[];
  platforms: string[];
  usage_frequency: UsageFrequency;
  effectiveness: EffectivenessRating;
  customization: CustomizationLevel;
  acquisition_method: AcquisitionMethod;
  first_observed: Date;
  last_observed: Date;
  versions: ToolVersion[];
  evidence: string[];
}

export type ToolType =
  | 'commercial'
  | 'open_source'
  | 'custom_developed'
  | 'living_off_the_land'
  | 'stolen'
  | 'leaked'
  | 'dual_use';

export type ToolCategory =
  | 'reconnaissance'
  | 'weaponization'
  | 'delivery'
  | 'exploitation'
  | 'installation'
  | 'command_control'
  | 'actions_on_objectives'
  | 'exfiltration'
  | 'impact'
  | 'utilities'
  | 'defense_evasion';

export type CustomizationLevel =
  | 'none'
  | 'minimal'
  | 'moderate'
  | 'extensive'
  | 'complete_rewrite';

export type AcquisitionMethod =
  | 'purchase'
  | 'download'
  | 'theft'
  | 'development'
  | 'modification'
  | 'acquisition_unknown';

export interface ToolVersion {
  version: string;
  release_date?: Date;
  changes: string[];
  capabilities: string[];
  evidence: string[];
}

export interface CampaignMalware {
  family: string;
  variants: MalwareVariant[];
  purpose: MalwarePurpose[];
  platforms: string[];
  capabilities: MalwareCapability[];
  persistence_methods: string[];
  communication_protocols: string[];
  evasion_techniques: string[];
  first_observed: Date;
  last_observed: Date;
  evolution: MalwareEvolution[];
  attribution_indicators: string[];
  evidence: string[];
}

export interface MalwareVariant {
  name: string;
  hash: string;
  size: number;
  compilation_date?: Date;
  capabilities: string[];
  unique_features: string[];
  analysis_reports: string[];
}

export type MalwarePurpose =
  | 'initial_access'
  | 'persistence'
  | 'privilege_escalation'
  | 'defense_evasion'
  | 'credential_access'
  | 'discovery'
  | 'lateral_movement'
  | 'collection'
  | 'command_control'
  | 'exfiltration'
  | 'impact';

export interface MalwareCapability {
  name: string;
  description: string;
  category: string;
  sophistication: 'basic' | 'intermediate' | 'advanced' | 'expert';
  evidence: string[];
}

export interface MalwareEvolution {
  timestamp: Date;
  version: string;
  changes: string[];
  new_capabilities: string[];
  removed_capabilities: string[];
  analysis: string;
  evidence: string[];
}

export interface CampaignInfrastructure {
  command_control: CommandControlInfrastructure;
  delivery: DeliveryInfrastructure;
  hosting: HostingInfrastructure;
  payment: PaymentInfrastructure;
  communication: CommunicationInfrastructure;
  patterns: InfrastructurePattern[];
  operational_security: OperationalSecurity;
}

export interface CommandControlInfrastructure {
  domains: string[];
  ip_addresses: string[];
  protocols: string[];
  ports: number[];
  encryption: string[];
  communication_patterns: CommunicationPattern[];
  redundancy: RedundancyLevel;
  geographic_distribution: string[];
}

export interface DeliveryInfrastructure {
  email_providers: string[];
  domains: string[];
  hosting_providers: string[];
  cdn_services: string[];
  url_shorteners: string[];
  social_media_accounts: string[];
  messaging_platforms: string[];
}

export interface HostingInfrastructure {
  providers: string[];
  countries: string[];
  payment_methods: string[];
  registration_patterns: string[];
  bulletproof_hosting: boolean;
  cloud_services: string[];
  compromised_sites: string[];
}

export interface PaymentInfrastructure {
  methods: string[];
  currencies: string[];
  wallets: string[];
  financial_institutions: string[];
  money_laundering: string[];
  transaction_patterns: string[];
}

export interface CommunicationInfrastructure {
  platforms: string[];
  encrypted_channels: string[];
  dead_drops: string[];
  covert_channels: string[];
  backup_methods: string[];
  operational_language: string[];
}

export interface CommunicationPattern {
  protocol: string;
  frequency: string;
  timing: string[];
  volume: string;
  encryption: string;
  obfuscation: string[];
  beaconing: BeaconingPattern[];
}

export interface BeaconingPattern {
  interval: number; // seconds
  jitter: number; // percentage
  protocol: string;
  pattern: string;
  confidence: number;
}

export type RedundancyLevel =
  | 'single_point'
  | 'limited_backup'
  | 'moderate_redundancy'
  | 'high_redundancy'
  | 'distributed_resilience';

export interface InfrastructurePattern {
  type: 'domain' | 'ip' | 'hosting' | 'certificate' | 'payment';
  pattern: string;
  description: string;
  confidence: number;
  examples: string[];
  timeline: string;
}

export interface OperationalSecurity {
  level: 'poor' | 'basic' | 'good' | 'excellent';
  practices: string[];
  mistakes: OpSecMistake[];
  improvements: string[];
  assessment: string;
}

export interface OpSecMistake {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  discovery_method: string;
  evidence: string[];
  lessons: string[];
}

export interface CampaignObjective {
  type: ObjectiveType;
  description: string;
  priority: 'primary' | 'secondary' | 'tertiary';
  status: ObjectiveStatus;
  success_criteria: string[];
  progress: number; // 0-1
  evidence: string[];
  timeline: ObjectiveTimeline;
}

export type ObjectiveType =
  | 'intelligence_collection'
  | 'data_theft'
  | 'financial_gain'
  | 'disruption'
  | 'destruction'
  | 'influence_operations'
  | 'strategic_advantage'
  | 'proof_of_concept'
  | 'capability_development'
  | 'access_maintenance';

export type ObjectiveStatus =
  | 'planned'
  | 'in_progress'
  | 'achieved'
  | 'partially_achieved'
  | 'failed'
  | 'abandoned'
  | 'unknown';

export interface ObjectiveTimeline {
  planned_start?: Date;
  actual_start?: Date;
  planned_completion?: Date;
  actual_completion?: Date;
  milestones: Milestone[];
}

export interface Milestone {
  name: string;
  description: string;
  planned_date?: Date;
  actual_date?: Date;
  status: 'pending' | 'completed' | 'missed' | 'cancelled';
  evidence: string[];
}

export type CampaignSophistication =
  | 'basic'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'nation_state_level';

export interface SuccessMetric {
  metric: string;
  target_value: number;
  actual_value?: number;
  unit: string;
  measurement_method: string;
  confidence: number;
  source: string;
}

export interface CampaignIndicator {
  id: string;
  type: IndicatorType;
  value: string;
  category: string;
  confidence: number;
  uniqueness: IndicatorUniqueness;
  persistence: IndicatorPersistence;
  first_observed: Date;
  last_observed: Date;
  phases: string[];
  evidence: string[];
  false_positive_rate?: number;
}

export type IndicatorType =
  | 'file_hash'
  | 'ip_address'
  | 'domain'
  | 'url'
  | 'email'
  | 'registry_key'
  | 'file_path'
  | 'process_name'
  | 'service_name'
  | 'user_agent'
  | 'certificate'
  | 'mutex'
  | 'yara_rule'
  | 'network_signature'
  | 'behavioral_pattern';

export type IndicatorUniqueness =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'unique'
  | 'signature';

export type IndicatorPersistence =
  | 'single_use'
  | 'short_term'
  | 'medium_term'
  | 'long_term'
  | 'persistent';

export interface CampaignSignature {
  id: string;
  name: string;
  type: SignatureType;
  pattern: string;
  description: string;
  confidence: number;
  false_positive_rate: number;
  platforms: string[];
  phases: string[];
  evidence: string[];
  detection_rules: DetectionRule[];
}

export type SignatureType =
  | 'network_signature'
  | 'host_signature'
  | 'behavioral_signature'
  | 'code_signature'
  | 'infrastructure_signature'
  | 'temporal_signature'
  | 'linguistic_signature';

export interface DetectionRule {
  format: 'snort' | 'suricata' | 'yara' | 'sigma' | 'custom';
  rule: string;
  confidence: number;
  last_updated: Date;
  author: string;
  references: string[];
}

export interface CampaignEvidence {
  id: string;
  type: EvidenceType;
  description: string;
  source: string;
  reliability: ReliabilityRating;
  classification: string;
  relevance: number; // 0-1
  confidence: number; // 0-1
  timestamp: Date;
  details: Record<string, any>;
  references: string[];
  analysis: string;
}

export type EvidenceType =
  | 'malware_sample'
  | 'network_traffic'
  | 'log_data'
  | 'forensic_artifact'
  | 'victim_report'
  | 'intelligence_report'
  | 'open_source_intelligence'
  | 'financial_record'
  | 'infrastructure_data'
  | 'communication_intercept'
  | 'physical_evidence'
  | 'leaked_document';

export type ReliabilityRating =
  | 'A' // Completely reliable
  | 'B' // Usually reliable
  | 'C' // Fairly reliable
  | 'D' // Not usually reliable
  | 'E' // Unreliable
  | 'F'; // Reliability cannot be judged

export interface RelatedCampaign {
  campaignId: string;
  name: string;
  relationship: CampaignRelationship;
  confidence: number;
  evidence: string[];
  description: string;
  timeline_overlap: TimelineOverlap;
}

export type CampaignRelationship =
  | 'successor'
  | 'predecessor'
  | 'parallel'
  | 'sub_campaign'
  | 'parent_campaign'
  | 'merger'
  | 'split'
  | 'evolution'
  | 'false_flag'
  | 'copycat'
  | 'collaboration';

export interface TimelineOverlap {
  start_overlap?: Date;
  end_overlap?: Date;
  overlap_percentage: number;
  overlap_description: string;
}

export interface CampaignImpact {
  overall_severity: 'minimal' | 'limited' | 'moderate' | 'significant' | 'severe' | 'catastrophic';
  scope: 'local' | 'regional' | 'national' | 'international' | 'global';
  domains: ImpactDomain[];
  quantitative_metrics: ImpactMetric[];
  qualitative_assessment: string;
  long_term_effects: string[];
  recovery_timeline: string;
}

export interface ImpactDomain {
  domain: 'economic' | 'social' | 'political' | 'security' | 'technological' | 'environmental';
  severity: 'minimal' | 'limited' | 'moderate' | 'significant' | 'severe';
  description: string;
  metrics: string[];
  evidence: string[];
}

export interface ImpactMetric {
  name: string;
  value: number;
  unit: string;
  category: 'financial' | 'operational' | 'reputational' | 'strategic' | 'humanitarian';
  confidence: number;
  source: string;
  methodology: string;
}

export interface CampaignSource {
  organization: string;
  type: SourceType;
  reliability: ReliabilityRating;
  access_level: AccessLevel;
  contribution: SourceContribution;
  reports: string[];
  contact_info?: ContactInfo;
}

export type SourceType =
  | 'government_agency'
  | 'private_security'
  | 'academic_institution'
  | 'victim_organization'
  | 'industry_partner'
  | 'international_organization'
  | 'law_enforcement'
  | 'media'
  | 'open_source'
  | 'anonymous';

export type AccessLevel =
  | 'public'
  | 'restricted'
  | 'confidential'
  | 'secret'
  | 'top_secret';

export interface SourceContribution {
  intelligence_types: string[];
  data_quality: 'poor' | 'fair' | 'good' | 'excellent';
  timeliness: 'real_time' | 'near_real_time' | 'daily' | 'weekly' | 'historical';
  coverage: 'limited' | 'moderate' | 'comprehensive';
  exclusive_insights: string[];
}

export interface ContactInfo {
  primary_contact: string;
  email?: string;
  secure_channels: string[];
  availability: string;
  response_time: string;
}

export type TrackingStatus =
  | 'active_monitoring'
  | 'periodic_review'
  | 'archived'
  | 'closed'
  | 'merged'
  | 'deprecated';

export interface MonitoringConfig {
  priority: 'low' | 'medium' | 'high' | 'critical';
  frequency: MonitoringFrequency;
  indicators: string[];
  alerts: AlertConfig[];
  automated_analysis: boolean;
  escalation_rules: EscalationRule[];
}

export type MonitoringFrequency =
  | 'real_time'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly';

export interface AlertConfig {
  trigger: string;
  condition: string;
  recipients: string[];
  severity: 'info' | 'warning' | 'critical';
  format: 'email' | 'sms' | 'dashboard' | 'api';
}

export interface EscalationRule {
  condition: string;
  delay: number; // minutes
  escalation_level: number;
  recipients: string[];
  actions: string[];
}

export interface CampaignSearchQuery {
  name?: string;
  aliases?: string[];
  status?: CampaignStatus[];
  actors?: string[];
  techniques?: string[];
  targets?: string[];
  sectors?: string[];
  countries?: string[];
  date_range?: {
    start?: Date;
    end?: Date;
  };
  confidence_min?: number;
  impact_min?: string;
  sophistication?: CampaignSophistication[];
  tags?: string[];
  indicators?: string[];
  limit?: number;
  offset?: number;
  sort_by?: 'name' | 'first_activity' | 'last_activity' | 'impact' | 'confidence';
  sort_order?: 'asc' | 'desc';
}

export interface CampaignSearchResult {
  campaigns: Campaign[];
  totalCount: number;
  facets: CampaignSearchFacets;
  queryTime: number;
}

export interface CampaignSearchFacets {
  status: Record<CampaignStatus, number>;
  actors: Record<string, number>;
  techniques: Record<string, number>;
  sectors: Record<string, number>;
  countries: Record<string, number>;
  sophistication: Record<CampaignSophistication, number>;
  impact: Record<string, number>;
}

export interface CampaignAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  recentCampaigns: number;
  avgDuration: number;
  mostTargetedSectors: Array<{ sector: string; count: number }>;
  mostUsedTechniques: Array<{ technique: string; count: number }>;
  geographicDistribution: Record<string, number>;
  sophisticationTrends: Array<{ period: string; level: CampaignSophistication; count: number }>;
  impactAssessment: {
    high_impact: number;
    medium_impact: number;
    low_impact: number;
  };
  attributionQuality: Record<AttributionQuality, number>;
  actorInvolvement: Array<{ actor: string; campaigns: number; impact_score: number }>;
}

export interface CampaignTimeline {
  campaignId: string;
  events: CampaignEvent[];
  phases: CampaignPhase[];
  milestones: Milestone[];
  related_events: RelatedEvent[];
  visualization_config: TimelineVisualizationConfig;
}

export interface RelatedEvent {
  event_id: string;
  campaign_id: string;
  campaign_name: string;
  relationship: 'concurrent' | 'prerequisite' | 'consequence' | 'related';
  confidence: number;
  description: string;
}

export interface TimelineVisualizationConfig {
  granularity: 'day' | 'week' | 'month' | 'quarter' | 'year';
  show_related: boolean;
  highlight_phases: boolean;
  color_scheme: string;
  interactive: boolean;
  export_formats: string[];
}