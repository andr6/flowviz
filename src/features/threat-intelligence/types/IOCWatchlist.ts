export interface IOCWatchlist {
  id: string;
  organizationId: string;
  
  // Basic information
  name: string;
  description: string;
  purpose: WatchlistPurpose;
  status: WatchlistStatus;
  
  // Configuration
  priority: WatchlistPriority;
  sensitivity: SensitivityLevel;
  retention_period: number; // days
  auto_update: boolean;
  
  // IOC management
  indicators: WatchlistIndicator[];
  total_indicators: number;
  active_indicators: number;
  expired_indicators: number;
  
  // Sources and feeds
  sources: WatchlistSource[];
  feed_integrations: FeedIntegration[];
  manual_additions: number;
  
  // Monitoring and alerting
  monitoring: MonitoringConfiguration;
  alerting: AlertingConfiguration;
  notifications: NotificationConfiguration;
  
  // Statistics and metrics
  metrics: WatchlistMetrics;
  match_history: WatchlistMatch[];
  
  // Sharing and collaboration
  sharing: SharingConfiguration;
  access_control: AccessControl;
  
  // Lifecycle
  created_by: string;
  created_at: Date;
  updated_at: Date;
  last_match: Date;
  
  // Metadata
  tags: string[];
  categories: string[];
  custom_fields: Record<string, any>;
}

export type WatchlistPurpose =
  | 'threat_detection'
  | 'incident_response'
  | 'threat_hunting'
  | 'attribution'
  | 'research'
  | 'compliance'
  | 'forensics'
  | 'monitoring'
  | 'early_warning';

export type WatchlistStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'archived'
  | 'under_review';

export type WatchlistPriority =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'informational';

export type SensitivityLevel =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'classified';

export interface WatchlistIndicator {
  id: string;
  watchlist_id: string;
  
  // Indicator details
  type: IOCType;
  value: string;
  normalized_value: string;
  hash: string; // for deduplication
  
  // Metadata
  description?: string;
  context: IndicatorContext;
  confidence: number; // 0-1
  severity: IOCSeverity;
  
  // Attribution
  threat_actors: string[];
  campaigns: string[];
  malware_families: string[];
  
  // Temporal information
  first_seen: Date;
  last_seen: Date;
  added_at: Date;
  expires_at?: Date;
  
  // Source information
  source: IndicatorSource;
  feed_id?: string;
  original_source?: string;
  
  // Status and lifecycle
  status: IndicatorStatus;
  false_positive: boolean;
  verified: boolean;
  verified_by?: string;
  verified_at?: Date;
  
  // Monitoring
  watch_priority: WatchlistPriority;
  match_count: number;
  last_match: Date;
  suppressed: boolean;
  suppression_reason?: string;
  
  // Enrichment
  enrichment: IndicatorEnrichment;
  threat_intelligence: ThreatIntelligenceData;
  
  // Relationships
  related_indicators: string[];
  parent_indicator?: string;
  child_indicators: string[];
  
  // Tags and classification
  tags: string[];
  categories: string[];
  kill_chain_phases: string[];
  mitre_techniques: string[];
  
  // Custom fields
  custom_fields: Record<string, any>;
}

export type IOCType =
  | 'ip_address'
  | 'domain'
  | 'url'
  | 'file_hash_md5'
  | 'file_hash_sha1'
  | 'file_hash_sha256'
  | 'file_hash_sha512'
  | 'file_hash_ssdeep'
  | 'file_name'
  | 'file_path'
  | 'email_address'
  | 'email_subject'
  | 'registry_key'
  | 'registry_value'
  | 'process_name'
  | 'service_name'
  | 'user_account'
  | 'certificate_hash'
  | 'certificate_subject'
  | 'mutex'
  | 'user_agent'
  | 'http_header'
  | 'cryptocurrency_address'
  | 'phone_number'
  | 'ssid'
  | 'mac_address'
  | 'imei'
  | 'credit_card'
  | 'bank_account'
  | 'passport_number'
  | 'social_security_number'
  | 'driver_license'
  | 'custom';

export interface IndicatorContext {
  campaign?: string;
  incident?: string;
  malware_family?: string;
  threat_actor?: string;
  attack_phase?: string;
  target_sector?: string[];
  target_geography?: string[];
  discovery_method?: string;
  analysis_notes?: string;
  relationships?: string[];
}

export type IOCSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'informational';

export interface IndicatorSource {
  type: SourceType;
  name: string;
  reliability: SourceReliability;
  added_by: string;
  import_method: ImportMethod;
  original_format?: string;
  reference_url?: string;
  report_id?: string;
}

export type SourceType =
  | 'threat_feed'
  | 'manual_input'
  | 'incident_analysis'
  | 'threat_hunt'
  | 'malware_analysis'
  | 'open_source'
  | 'commercial_feed'
  | 'government_feed'
  | 'partner_sharing'
  | 'automated_extraction'
  | 'api_import';

export type SourceReliability =
  | 'verified'
  | 'high'
  | 'medium'
  | 'low'
  | 'unverified'
  | 'disputed';

export type ImportMethod =
  | 'manual'
  | 'api'
  | 'file_upload'
  | 'email'
  | 'feed_sync'
  | 'automated_extraction';

export type IndicatorStatus =
  | 'active'
  | 'inactive'
  | 'expired'
  | 'false_positive'
  | 'whitelisted'
  | 'under_review'
  | 'deprecated';

export interface IndicatorEnrichment {
  geolocation?: GeolocationData;
  whois?: WhoisData;
  dns?: DNSData;
  reputation?: ReputationData;
  threat_categories?: string[];
  malware_families?: string[];
  sandbox_analysis?: SandboxAnalysis[];
  passive_dns?: PassiveDNSData[];
  ssl_certificates?: SSLCertificateData[];
  last_enriched: Date;
  enrichment_sources: string[];
}

export interface GeolocationData {
  country: string;
  country_code: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  isp: string;
  organization: string;
  as_number: number;
  as_name: string;
  timezone: string;
  accuracy_radius?: number;
  source: string;
}

export interface WhoisData {
  registrar: string;
  registrant_name?: string;
  registrant_organization?: string;
  registrant_email?: string;
  admin_email?: string;
  tech_email?: string;
  creation_date?: Date;
  expiration_date?: Date;
  updated_date?: Date;
  name_servers?: string[];
  status?: string[];
  privacy_protected: boolean;
  source: string;
}

export interface DNSData {
  a_records: string[];
  aaaa_records: string[];
  mx_records: MXRecord[];
  ns_records: string[];
  cname_records: string[];
  txt_records: string[];
  soa_record?: SOARecord;
  last_resolved: Date;
  resolution_source: string;
}

export interface MXRecord {
  hostname: string;
  priority: number;
}

export interface SOARecord {
  primary_ns: string;
  admin_email: string;
  serial: number;
  refresh: number;
  retry: number;
  expire: number;
  minimum_ttl: number;
}

export interface ReputationData {
  overall_score: number; // 0-100
  verdict: 'benign' | 'suspicious' | 'malicious' | 'unknown';
  engines: ReputationEngine[];
  categories: string[];
  first_seen?: Date;
  last_seen?: Date;
  detection_rate?: number;
  source: string;
}

export interface ReputationEngine {
  name: string;
  verdict: string;
  score?: number;
  categories?: string[];
  last_updated: Date;
}

export interface SandboxAnalysis {
  sandbox: string;
  analysis_id: string;
  verdict: 'benign' | 'suspicious' | 'malicious';
  score: number;
  behaviors: string[];
  network_activity: NetworkActivity[];
  file_activity: FileActivity[];
  registry_activity: RegistryActivity[];
  process_activity: ProcessActivity[];
  analysis_date: Date;
  report_url?: string;
}

export interface NetworkActivity {
  protocol: string;
  destination: string;
  port: number;
  direction: 'inbound' | 'outbound';
  bytes_transferred: number;
  suspicious: boolean;
}

export interface FileActivity {
  action: 'create' | 'modify' | 'delete' | 'read' | 'execute';
  path: string;
  hash?: string;
  size?: number;
  suspicious: boolean;
}

export interface RegistryActivity {
  action: 'create' | 'modify' | 'delete' | 'read';
  key: string;
  value?: string;
  data?: string;
  suspicious: boolean;
}

export interface ProcessActivity {
  action: 'create' | 'terminate' | 'inject' | 'modify';
  process_name: string;
  pid?: number;
  command_line?: string;
  parent_process?: string;
  suspicious: boolean;
}

export interface PassiveDNSData {
  first_seen: Date;
  last_seen: Date;
  hostname: string;
  ip_address: string;
  record_type: string;
  source: string;
  count: number;
}

export interface SSLCertificateData {
  fingerprint: string;
  subject: string;
  issuer: string;
  serial_number: string;
  valid_from: Date;
  valid_to: Date;
  algorithm: string;
  key_size: number;
  is_valid: boolean;
  is_self_signed: boolean;
  source: string;
}

export interface ThreatIntelligenceData {
  threat_types: string[];
  malware_families: string[];
  campaigns: string[];
  threat_actors: string[];
  attack_techniques: string[];
  kill_chain_phases: string[];
  first_reported: Date;
  last_reported: Date;
  reporting_sources: string[];
  confidence_score: number;
  context_summary: string;
}

export interface WatchlistSource {
  id: string;
  name: string;
  type: SourceType;
  reliability: SourceReliability;
  enabled: boolean;
  last_sync?: Date;
  sync_frequency?: number; // hours
  indicators_contributed: number;
  quality_score: number; // 0-1
  configuration: SourceConfiguration;
}

export interface SourceConfiguration {
  api_endpoint?: string;
  api_key?: string;
  username?: string;
  password?: string;
  certificate?: string;
  filters?: SourceFilter[];
  transformation_rules?: TransformationRule[];
  quality_checks?: QualityCheck[];
  rate_limit?: RateLimit;
}

export interface SourceFilter {
  field: string;
  operator: 'equals' | 'contains' | 'regex' | 'in' | 'not_in';
  value: any;
  enabled: boolean;
}

export interface TransformationRule {
  field: string;
  transformation: 'normalize' | 'uppercase' | 'lowercase' | 'regex_replace' | 'custom';
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface QualityCheck {
  name: string;
  description: string;
  rule: string;
  action: 'reject' | 'flag' | 'modify';
  enabled: boolean;
}

export interface RateLimit {
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  burst_limit: number;
}

export interface FeedIntegration {
  feed_id: string;
  feed_name: string;
  feed_type: string;
  enabled: boolean;
  auto_import: boolean;
  import_filters: ImportFilter[];
  quality_threshold: number;
  last_import?: Date;
  imported_indicators: number;
  failed_imports: number;
  error_rate: number;
}

export interface ImportFilter {
  ioc_type?: IOCType[];
  confidence_min?: number;
  severity?: IOCSeverity[];
  tags_include?: string[];
  tags_exclude?: string[];
  source_reliability_min?: SourceReliability;
  max_age_days?: number;
  custom_filters?: Record<string, any>;
}

export interface MonitoringConfiguration {
  enabled: boolean;
  real_time: boolean;
  monitoring_sources: MonitoringSource[];
  detection_methods: DetectionMethod[];
  correlation_rules: CorrelationRule[];
  false_positive_suppression: boolean;
  context_enrichment: boolean;
}

export interface MonitoringSource {
  type: 'siem' | 'network' | 'endpoint' | 'email' | 'web' | 'dns' | 'cloud' | 'custom';
  name: string;
  enabled: boolean;
  query_template?: string;
  polling_interval?: number; // minutes
  batch_size?: number;
  filters?: Record<string, any>;
}

export interface DetectionMethod {
  name: string;
  type: 'exact_match' | 'substring' | 'regex' | 'fuzzy' | 'behavioral' | 'ml_based';
  configuration: Record<string, any>;
  accuracy: number; // 0-1
  performance_impact: 'low' | 'medium' | 'high';
  enabled: boolean;
}

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: CorrelationAction;
  priority: number;
  enabled: boolean;
  last_triggered?: Date;
  trigger_count: number;
}

export interface CorrelationAction {
  type: 'alert' | 'escalate' | 'auto_investigate' | 'enrich' | 'block' | 'custom';
  parameters: Record<string, any>;
  notification: boolean;
  automation: boolean;
}

export interface AlertingConfiguration {
  enabled: boolean;
  alert_levels: AlertLevel[];
  escalation_rules: AlertEscalationRule[];
  suppression_rules: AlertSuppressionRule[];
  aggregation: AlertAggregation;
  rate_limiting: AlertRateLimit;
}

export interface AlertLevel {
  level: 'info' | 'warning' | 'critical';
  conditions: AlertCondition[];
  actions: AlertAction[];
  priority: number;
}

export interface AlertCondition {
  field: string;
  operator: string;
  value: any;
  logical_operator?: 'AND' | 'OR';
}

export interface AlertAction {
  type: 'email' | 'sms' | 'webhook' | 'ticket' | 'dashboard' | 'siem';
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface AlertEscalationRule {
  trigger_condition: string;
  delay_minutes: number;
  escalation_level: number;
  recipients: string[];
  actions: string[];
}

export interface AlertSuppressionRule {
  condition: string;
  duration_minutes: number;
  reason: string;
  enabled: boolean;
}

export interface AlertAggregation {
  enabled: boolean;
  time_window_minutes: number;
  max_alerts_per_window: number;
  grouping_fields: string[];
}

export interface AlertRateLimit {
  enabled: boolean;
  max_alerts_per_minute: number;
  max_alerts_per_hour: number;
  burst_limit: number;
}

export interface NotificationConfiguration {
  channels: NotificationChannel[];
  templates: NotificationTemplate[];
  recipients: NotificationRecipient[];
  schedules: NotificationSchedule[];
  preferences: NotificationPreferences;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'teams' | 'pagerduty' | 'webhook' | 'sms';
  name: string;
  configuration: Record<string, any>;
  enabled: boolean;
  priority: number;
  failure_fallback?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'match_alert' | 'summary_report' | 'status_update' | 'error_notification';
  format: 'text' | 'html' | 'json' | 'custom';
  template: string;
  variables: string[];
  enabled: boolean;
}

export interface NotificationRecipient {
  id: string;
  type: 'user' | 'group' | 'role' | 'external';
  identifier: string;
  contact_methods: ContactMethod[];
  notification_levels: string[];
  time_zones?: string;
  on_call_schedule?: string;
}

export interface ContactMethod {
  type: 'email' | 'phone' | 'slack' | 'teams';
  address: string;
  priority: number;
  verified: boolean;
}

export interface NotificationSchedule {
  name: string;
  recipients: string[];
  days_of_week: number[];
  hours_of_day: number[];
  timezone: string;
  active: boolean;
}

export interface NotificationPreferences {
  digest_frequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
  batch_similar: boolean;
  quiet_hours: QuietHours;
  priority_override: boolean;
  max_frequency: FrequencyLimit;
}

export interface QuietHours {
  enabled: boolean;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  timezone: string;
  emergency_override: boolean;
}

export interface FrequencyLimit {
  max_per_hour: number;
  max_per_day: number;
  burst_allowance: number;
}

export interface WatchlistMetrics {
  total_indicators: number;
  active_indicators: number;
  expired_indicators: number;
  false_positives: number;
  
  // Match statistics
  total_matches: number;
  matches_last_24h: number;
  matches_last_7d: number;
  matches_last_30d: number;
  unique_matches: number;
  
  // Quality metrics
  false_positive_rate: number;
  confidence_distribution: Record<string, number>;
  source_reliability_distribution: Record<SourceReliability, number>;
  
  // Performance metrics
  avg_enrichment_time: number;
  avg_detection_time: number;
  monitoring_coverage: number; // percentage
  
  // Trending data
  indicator_growth_rate: number;
  match_trend: TrendData[];
  top_matching_indicators: TopIndicator[];
  source_performance: SourcePerformance[];
}

export interface TrendData {
  timestamp: Date;
  count: number;
  category?: string;
}

export interface TopIndicator {
  indicator_id: string;
  value: string;
  type: IOCType;
  match_count: number;
  confidence: number;
  last_match: Date;
}

export interface SourcePerformance {
  source_id: string;
  source_name: string;
  indicators_provided: number;
  match_rate: number;
  false_positive_rate: number;
  quality_score: number;
  reliability_score: number;
}

export interface WatchlistMatch {
  id: string;
  watchlist_id: string;
  indicator_id: string;
  
  // Match details
  matched_value: string;
  match_type: MatchType;
  confidence: number;
  context: MatchContext;
  
  // Source information
  detection_source: string;
  detection_method: string;
  source_event_id?: string;
  
  // Temporal information
  detected_at: Date;
  event_timestamp: Date;
  processing_time: number; // milliseconds
  
  // Classification
  severity: IOCSeverity;
  status: MatchStatus;
  false_positive: boolean;
  verified: boolean;
  
  // Analysis
  threat_assessment: ThreatAssessment;
  recommended_actions: RecommendedAction[];
  analyst_notes?: string;
  
  // Relationships
  related_matches: string[];
  incident_id?: string;
  investigation_id?: string;
  
  // Response
  response_actions: ResponseAction[];
  escalated: boolean;
  escalation_reason?: string;
  
  // Metadata
  tags: string[];
  custom_fields: Record<string, any>;
}

export type MatchType =
  | 'exact'
  | 'substring'
  | 'fuzzy'
  | 'regex'
  | 'wildcard'
  | 'behavioral'
  | 'contextual';

export interface MatchContext {
  source_system: string;
  event_type: string;
  user?: string;
  host?: string;
  process?: string;
  network_connection?: NetworkConnection;
  file_operation?: FileOperation;
  registry_operation?: RegistryOperation;
  additional_data: Record<string, any>;
}

export interface NetworkConnection {
  source_ip: string;
  source_port: number;
  destination_ip: string;
  destination_port: number;
  protocol: string;
  direction: 'inbound' | 'outbound';
  bytes_transferred: number;
  duration: number;
}

export interface FileOperation {
  operation: 'create' | 'read' | 'write' | 'delete' | 'execute' | 'rename';
  file_path: string;
  file_name: string;
  file_hash?: string;
  file_size?: number;
  file_type?: string;
  process_name?: string;
}

export interface RegistryOperation {
  operation: 'create' | 'read' | 'write' | 'delete';
  key_path: string;
  value_name?: string;
  value_data?: string;
  value_type?: string;
  process_name?: string;
}

export type MatchStatus =
  | 'new'
  | 'investigating'
  | 'confirmed_threat'
  | 'false_positive'
  | 'resolved'
  | 'suppressed';

export interface ThreatAssessment {
  risk_score: number; // 0-100
  confidence: number; // 0-1
  potential_impact: ImpactLevel;
  threat_category: string[];
  mitre_techniques: string[];
  kill_chain_phase: string;
  urgency: UrgencyLevel;
  assessment_method: string;
  last_updated: Date;
}

export type ImpactLevel =
  | 'minimal'
  | 'limited'
  | 'moderate'
  | 'significant'
  | 'severe'
  | 'critical';

export type UrgencyLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'emergency';

export interface RecommendedAction {
  action: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'investigation' | 'containment' | 'mitigation' | 'monitoring' | 'notification';
  automation_available: boolean;
  estimated_effort: EffortLevel;
  dependencies: string[];
}

export type EffortLevel =
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'extensive';

export interface ResponseAction {
  action_id: string;
  action_type: string;
  description: string;
  executed_by: string;
  executed_at: Date;
  status: ActionStatus;
  result?: string;
  automation_used: boolean;
  duration?: number; // seconds
  cost?: number;
}

export type ActionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'skipped';

export interface SharingConfiguration {
  enabled: boolean;
  sharing_levels: SharingLevel[];
  external_partners: SharingPartner[];
  export_formats: ExportFormat[];
  sharing_agreements: SharingAgreement[];
  attribution_requirements: AttributionRequirement[];
}

export interface SharingLevel {
  level: 'internal' | 'partners' | 'community' | 'public';
  indicators_included: IOCType[];
  anonymization: AnonymizationLevel;
  restrictions: string[];
  approval_required: boolean;
}

export type AnonymizationLevel =
  | 'none'
  | 'basic'
  | 'moderate'
  | 'high'
  | 'complete';

export interface SharingPartner {
  partner_id: string;
  name: string;
  type: 'government' | 'private' | 'academic' | 'ngo' | 'isac';
  trust_level: TrustLevel;
  sharing_agreement: string;
  data_classification: string[];
  contact_info: ContactInfo;
  last_shared?: Date;
  indicators_shared: number;
  reciprocity_score: number;
}

export type TrustLevel =
  | 'untrusted'
  | 'limited'
  | 'trusted'
  | 'highly_trusted'
  | 'verified_partner';

export interface ContactInfo {
  primary_contact: string;
  email: string;
  phone?: string;
  secure_channels?: string[];
  availability: string;
}

export interface ExportFormat {
  format: 'stix' | 'misp' | 'openioc' | 'csv' | 'json' | 'yara' | 'snort' | 'custom';
  version?: string;
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface SharingAgreement {
  agreement_id: string;
  name: string;
  type: 'bilateral' | 'multilateral' | 'community';
  participants: string[];
  data_classification: string[];
  sharing_scope: SharingScope;
  retention_policy: RetentionPolicy;
  attribution_policy: AttributionPolicy;
  signed_date: Date;
  expiration_date?: Date;
  status: 'active' | 'expired' | 'suspended' | 'terminated';
}

export interface SharingScope {
  indicator_types: IOCType[];
  threat_categories: string[];
  geographic_scope: string[];
  sector_scope: string[];
  time_restrictions?: TimeRestriction[];
}

export interface TimeRestriction {
  start_time?: string;
  end_time?: string;
  days_of_week?: number[];
  timezone: string;
}

export interface RetentionPolicy {
  retention_period_days: number;
  automatic_deletion: boolean;
  deletion_method: string;
  exceptions: string[];
  compliance_frameworks: string[];
}

export interface AttributionPolicy {
  attribution_required: boolean;
  attribution_format: string;
  source_identification: 'full' | 'partial' | 'anonymous';
  contact_information: boolean;
  usage_restrictions: string[];
}

export interface AttributionRequirement {
  level: 'none' | 'minimal' | 'standard' | 'detailed';
  format: string;
  mandatory_fields: string[];
  optional_fields: string[];
}

export interface AccessControl {
  access_model: 'rbac' | 'abac' | 'mac' | 'dac';
  roles: AccessRole[];
  permissions: AccessPermission[];
  audit_logging: boolean;
  session_management: SessionManagement;
  multi_factor_auth: boolean;
}

export interface AccessRole {
  role_id: string;
  name: string;
  description: string;
  permissions: string[];
  hierarchy_level: number;
  inheritance: boolean;
  default_role: boolean;
}

export interface AccessPermission {
  permission_id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: string[];
  restrictions?: string[];
}

export interface SessionManagement {
  session_timeout: number; // minutes
  concurrent_sessions: number;
  ip_restrictions: string[];
  device_restrictions: boolean;
  geographical_restrictions: string[];
}

// Search and Query Interfaces
export interface WatchlistSearchQuery {
  name?: string;
  purpose?: WatchlistPurpose[];
  status?: WatchlistStatus[];
  priority?: WatchlistPriority[];
  tags?: string[];
  created_by?: string;
  date_range?: {
    start?: Date;
    end?: Date;
  };
  indicators_min?: number;
  matches_min?: number;
  limit?: number;
  offset?: number;
  sort_by?: 'name' | 'created_at' | 'indicators' | 'matches' | 'priority';
  sort_order?: 'asc' | 'desc';
}

export interface IOCSearchQuery {
  value?: string;
  type?: IOCType[];
  severity?: IOCSeverity[];
  confidence_min?: number;
  status?: IndicatorStatus[];
  threat_actors?: string[];
  campaigns?: string[];
  malware_families?: string[];
  tags?: string[];
  sources?: string[];
  date_range?: {
    start?: Date;
    end?: Date;
  };
  has_matches?: boolean;
  false_positive?: boolean;
  verified?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'value' | 'confidence' | 'severity' | 'added_at' | 'match_count';
  sort_order?: 'asc' | 'desc';
}

export interface WatchlistSearchResult {
  watchlists: IOCWatchlist[];
  total_count: number;
  facets: WatchlistSearchFacets;
  query_time: number;
}

export interface IOCSearchResult {
  indicators: WatchlistIndicator[];
  total_count: number;
  facets: IOCSearchFacets;
  query_time: number;
}

export interface WatchlistSearchFacets {
  purpose: Record<WatchlistPurpose, number>;
  status: Record<WatchlistStatus, number>;
  priority: Record<WatchlistPriority, number>;
  tags: Record<string, number>;
  created_by: Record<string, number>;
}

export interface IOCSearchFacets {
  type: Record<IOCType, number>;
  severity: Record<IOCSeverity, number>;
  status: Record<IndicatorStatus, number>;
  sources: Record<string, number>;
  threat_actors: Record<string, number>;
  campaigns: Record<string, number>;
  tags: Record<string, number>;
}