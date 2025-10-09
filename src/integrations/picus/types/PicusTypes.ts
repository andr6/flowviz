export interface PicusConfig {
  baseUrl: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
}

export interface PicusAuthToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface PicusThreat {
  id: string;
  name: string;
  description?: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitre_attack_techniques: string[];
  threat_actor?: string;
  malware_family?: string;
  tags: string[];
  created_date: string;
  updated_date: string;
  iocs: PicusIOC[];
  ioas: PicusIOA[];
  simulation_status: 'ready' | 'running' | 'completed' | 'failed';
}

export interface PicusIOC {
  id: string;
  type: PicusIOCType;
  value: string;
  context?: string;
  confidence: number;
  source?: string;
  first_seen?: string;
  last_seen?: string;
  tags: string[];
}

export interface PicusIOA {
  id: string;
  type: PicusIOAType;
  description: string;
  behavior_pattern: string;
  detection_logic?: string;
  mitre_technique: string;
  confidence: number;
  tags: string[];
}

export type PicusIOCType = 
  | 'ip_address'
  | 'domain'
  | 'url'
  | 'file_hash_md5'
  | 'file_hash_sha1'
  | 'file_hash_sha256'
  | 'file_path'
  | 'registry_key'
  | 'email_address'
  | 'mutex'
  | 'service_name'
  | 'process_name';

export type PicusIOAType = 
  | 'network_connection'
  | 'file_creation'
  | 'registry_modification'
  | 'process_execution'
  | 'service_installation'
  | 'persistence_mechanism'
  | 'privilege_escalation'
  | 'defense_evasion'
  | 'credential_access'
  | 'discovery'
  | 'lateral_movement'
  | 'collection'
  | 'command_control'
  | 'exfiltration'
  | 'impact';

export interface PicusAction {
  id: string;
  name: string;
  description?: string;
  action_type: PicusActionType;
  threat_id?: string;
  scenario_id?: string;
  target_agents: string[];
  parameters: PicusActionParameters;
  schedule?: PicusActionSchedule;
  status: PicusActionStatus;
  created_date: string;
  execution_history: PicusActionExecution[];
}

export type PicusActionType = 
  | 'threat_simulation'
  | 'vulnerability_validation'
  | 'security_control_test'
  | 'endpoint_test'
  | 'network_test'
  | 'email_test'
  | 'web_test'
  | 'data_exfiltration_test';

export interface PicusActionParameters {
  simulation_mode?: 'safe' | 'live';
  target_environment?: 'production' | 'staging' | 'test';
  notification_settings?: {
    on_completion: boolean;
    on_failure: boolean;
    recipients: string[];
  };
  custom_parameters?: Record<string, any>;
}

export interface PicusActionSchedule {
  type: 'immediate' | 'scheduled' | 'recurring';
  start_time?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  days_of_week?: number[];
  end_date?: string;
}

export type PicusActionStatus = 
  | 'created'
  | 'scheduled'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

export interface PicusActionExecution {
  execution_id: string;
  started_at: string;
  completed_at?: string;
  status: PicusActionStatus;
  results: PicusExecutionResults;
  logs: PicusExecutionLog[];
  metrics: PicusExecutionMetrics;
}

export interface PicusExecutionResults {
  success_rate: number;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  blocked_tests: number;
  bypassed_controls: PicusBypassedControl[];
  detected_threats: PicusDetectedThreat[];
  recommendations: PicusRecommendation[];
}

export interface PicusBypassedControl {
  control_name: string;
  control_type: string;
  bypass_technique: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  remediation_steps: string[];
}

export interface PicusDetectedThreat {
  threat_name: string;
  detection_time: string;
  detection_method: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitre_technique: string;
  affected_assets: string[];
}

export interface PicusRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  implementation_effort: 'low' | 'medium' | 'high';
  security_impact: 'low' | 'medium' | 'high' | 'critical';
  steps: string[];
  references: string[];
}

export interface PicusExecutionLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  details?: any;
}

export interface PicusExecutionMetrics {
  execution_time_seconds: number;
  agents_involved: number;
  data_transferred_mb: number;
  cpu_usage_percent: number;
  memory_usage_mb: number;
  network_latency_ms: number;
}

export interface PicusAgent {
  id: string;
  name: string;
  ip_address: string;
  operating_system: string;
  version: string;
  status: 'online' | 'offline' | 'error';
  capabilities: string[];
  last_seen: string;
  location?: string;
  tags: string[];
}

export interface PicusScenario {
  id: string;
  name: string;
  description: string;
  category: string;
  mitre_tactics: string[];
  mitre_techniques: string[];
  threat_actors: string[];
  complexity_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimated_duration_minutes: number;
  prerequisites: string[];
  tags: string[];
}

export interface PicusAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
  rate_limit?: {
    remaining: number;
    reset_at: string;
  };
}

export interface PicusListParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  filter?: Record<string, any>;
  search?: string;
}

export interface PicusCreateThreatRequest {
  name: string;
  description?: string;
  category: string;
  severity: PicusThreat['severity'];
  mitre_attack_techniques: string[];
  threat_actor?: string;
  malware_family?: string;
  tags?: string[];
  iocs: Omit<PicusIOC, 'id'>[];
  ioas: Omit<PicusIOA, 'id'>[];
}

export interface PicusCreateActionRequest {
  name: string;
  description?: string;
  action_type: PicusActionType;
  threat_id?: string;
  scenario_id?: string;
  target_agents: string[];
  parameters: PicusActionParameters;
  schedule?: PicusActionSchedule;
}

export interface PicusEnrichmentResult {
  source: 'picus';
  threat_validation: {
    is_validated: boolean;
    validation_score: number;
    validation_date: string;
    simulation_results?: PicusExecutionResults;
  };
  recommended_actions: PicusRecommendation[];
  similar_threats: Array<{
    threat_id: string;
    name: string;
    similarity_score: number;
    common_iocs: number;
    common_techniques: string[];
  }>;
  security_controls_bypassed: PicusBypassedControl[];
  detection_coverage: {
    total_techniques: number;
    covered_techniques: number;
    coverage_percentage: number;
    gaps: Array<{
      technique: string;
      description: string;
      risk_level: string;
    }>;
  };
}

export interface PicusIntegrationConfig {
  enabled: boolean;
  baseUrl: string;
  authentication: {
    method: 'token' | 'oauth';
    credentials: {
      token?: string;
      clientId?: string;
      clientSecret?: string;
    };
  };
  defaultSettings: {
    simulationMode: 'safe' | 'live';
    autoCreateActions: boolean;
    autoScheduleValidation: boolean;
    notificationSettings: {
      onSuccess: boolean;
      onFailure: boolean;
      recipients: string[];
    };
  };
  rateLimiting: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoffSeconds: number;
  };
}