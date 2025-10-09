export interface PurpleTeamExercise {
  id: string;
  name: string;
  description: string;
  type: 'tabletop' | 'technical' | 'full-scale' | 'adversary-emulation';
  status: 'planning' | 'scheduled' | 'running' | 'completed' | 'cancelled' | 'paused';
  objectives: ExerciseObjective[];
  scenario: ExerciseScenario;
  participants: TeamParticipant[];
  timeline: ExerciseTimeline;
  infrastructure: InfrastructureRequirements;
  rules: EngagementRules;
  metrics: ExerciseMetrics;
  results: ExerciseResults;
  lessons: LessonsLearned[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ExerciseObjective {
  id: string;
  type: 'red-team' | 'blue-team' | 'purple-team' | 'organizational';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  success_criteria: string[];
  metrics: string[];
  responsible_team: 'red' | 'blue' | 'purple' | 'white' | 'all';
  status: 'pending' | 'in-progress' | 'achieved' | 'failed' | 'partially-achieved';
  evidence: Evidence[];
}

export interface ExerciseScenario {
  name: string;
  background: string;
  threat_actor: ThreatActorProfile;
  attack_vectors: AttackVector[];
  target_assets: TargetAsset[];
  business_context: string;
  constraints: string[];
  escalation_points: EscalationPoint[];
  injects: ScenarioInject[];
}

export interface ThreatActorProfile {
  name: string;
  type: 'nation-state' | 'cybercriminal' | 'hacktivist' | 'insider' | 'advanced-persistent-threat';
  sophistication: 'low' | 'medium' | 'high' | 'expert';
  motivation: string[];
  capabilities: string[];
  resources: string[];
  tactics: string[];
  techniques: string[];
  procedures: string[];
  indicators: string[];
  attribution: {
    confidence: number;
    sources: string[];
    aliases: string[];
  };
}

export interface AttackVector {
  id: string;
  name: string;
  category: 'initial-access' | 'execution' | 'persistence' | 'privilege-escalation' | 'defense-evasion' | 'credential-access' | 'discovery' | 'lateral-movement' | 'collection' | 'command-control' | 'exfiltration' | 'impact';
  mitre_technique: string;
  description: string;
  prerequisites: string[];
  tools: string[];
  detection_methods: string[];
  mitigation_strategies: string[];
  difficulty: 'low' | 'medium' | 'high' | 'expert';
  success_probability: number;
  impact_severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TargetAsset {
  id: string;
  name: string;
  type: 'server' | 'workstation' | 'network-device' | 'application' | 'database' | 'cloud-service' | 'iot-device' | 'mobile-device';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  owner: string;
  vulnerabilities: KnownVulnerability[];
  security_controls: SecurityControl[];
  access_requirements: string[];
  business_function: string;
  data_classification: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface KnownVulnerability {
  cve_id?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  exploitability: number;
  patch_available: boolean;
  patch_deployed: boolean;
  workarounds: string[];
}

export interface SecurityControl {
  id: string;
  name: string;
  type: 'preventive' | 'detective' | 'corrective' | 'deterrent' | 'compensating';
  category: 'technical' | 'administrative' | 'physical';
  effectiveness: number;
  coverage: string[];
  limitations: string[];
  bypass_methods: string[];
}

export interface EscalationPoint {
  trigger: string;
  condition: string;
  action: 'pause' | 'stop' | 'escalate' | 'notify' | 'continue';
  responsible: string[];
  timeline: number;
  communication: string;
}

export interface ScenarioInject {
  id: string;
  time: number; // minutes from start
  type: 'event' | 'intelligence' | 'distraction' | 'escalation';
  description: string;
  target: 'red-team' | 'blue-team' | 'both' | 'organization';
  delivery_method: 'email' | 'phone' | 'chat' | 'system' | 'physical';
  expected_response: string;
  success_criteria: string[];
}

export interface TeamParticipant {
  id: string;
  name: string;
  email: string;
  role: 'red-team-lead' | 'red-team-operator' | 'blue-team-lead' | 'blue-team-analyst' | 'purple-team-facilitator' | 'white-team-controller' | 'observer' | 'stakeholder';
  team: 'red' | 'blue' | 'purple' | 'white';
  skills: string[];
  responsibilities: string[];
  access_level: 'read-only' | 'operator' | 'admin' | 'controller';
  availability: {
    start_time: Date;
    end_time: Date;
    timezone: string;
  };
  contact: {
    primary: string;
    secondary?: string;
    emergency?: string;
  };
}

export interface ExerciseTimeline {
  planned_start: Date;
  planned_end: Date;
  actual_start?: Date;
  actual_end?: Date;
  phases: ExercisePhase[];
  milestones: Milestone[];
  checkpoints: Checkpoint[];
}

export interface ExercisePhase {
  id: string;
  name: string;
  description: string;
  start_time: Date;
  end_time: Date;
  objectives: string[];
  activities: PhaseActivity[];
  deliverables: string[];
  success_criteria: string[];
  status: 'pending' | 'active' | 'completed' | 'skipped';
}

export interface PhaseActivity {
  id: string;
  name: string;
  description: string;
  responsible: string;
  duration: number;
  dependencies: string[];
  status: 'pending' | 'active' | 'completed' | 'blocked';
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  target_time: Date;
  actual_time?: Date;
  criteria: string[];
  achieved: boolean;
  evidence: string[];
}

export interface Checkpoint {
  id: string;
  time: Date;
  type: 'status' | 'decision' | 'review' | 'break';
  agenda: string[];
  participants: string[];
  outcomes: string[];
  decisions: CheckpointDecision[];
}

export interface CheckpointDecision {
  decision: string;
  rationale: string;
  impact: string;
  decided_by: string;
  decided_at: Date;
}

export interface InfrastructureRequirements {
  environments: ExerciseEnvironment[];
  tools: ToolRequirement[];
  connectivity: ConnectivityRequirement[];
  monitoring: MonitoringRequirement[];
  data_protection: DataProtectionRequirement[];
}

export interface ExerciseEnvironment {
  id: string;
  name: string;
  type: 'production' | 'staging' | 'isolated' | 'virtualized' | 'cloud';
  purpose: string;
  specifications: Record<string, any>;
  access_controls: AccessControl[];
  monitoring: boolean;
  logging: boolean;
  backup_required: boolean;
  restoration_plan: string;
}

export interface ToolRequirement {
  name: string;
  type: 'attack' | 'defense' | 'monitoring' | 'communication' | 'analysis';
  version?: string;
  configuration: Record<string, any>;
  access_required: string[];
  installation_notes: string;
  alternatives: string[];
}

export interface ConnectivityRequirement {
  type: 'network' | 'internet' | 'vpn' | 'isolated';
  bandwidth: string;
  latency: string;
  restrictions: string[];
  monitoring: boolean;
}

export interface MonitoringRequirement {
  type: 'network' | 'host' | 'application' | 'security';
  scope: string[];
  retention: string;
  alerting: boolean;
  real_time: boolean;
}

export interface DataProtectionRequirement {
  classification: string;
  encryption: boolean;
  anonymization: boolean;
  retention: string;
  disposal: string;
  legal_requirements: string[];
}

export interface AccessControl {
  role: string;
  permissions: string[];
  restrictions: string[];
  duration: string;
  approval_required: boolean;
}

export interface EngagementRules {
  scope: ScopeDefinition;
  restrictions: Restriction[];
  escalation: EscalationRules;
  communication: CommunicationRules;
  documentation: DocumentationRules;
  legal: LegalConsiderations;
}

export interface ScopeDefinition {
  in_scope: string[];
  out_of_scope: string[];
  permitted_actions: string[];
  prohibited_actions: string[];
  time_restrictions: TimeRestriction[];
  geographic_restrictions: string[];
}

export interface TimeRestriction {
  day_of_week: string;
  start_time: string;
  end_time: string;
  timezone: string;
  exceptions: string[];
}

export interface Restriction {
  type: 'technical' | 'procedural' | 'legal' | 'business';
  description: string;
  rationale: string;
  enforcement: string;
  exceptions: string[];
}

export interface EscalationRules {
  triggers: EscalationTrigger[];
  procedures: EscalationProcedure[];
  contacts: EscalationContact[];
  decision_authority: DecisionAuthority[];
}

export interface EscalationTrigger {
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  auto_escalate: boolean;
  timeline: number;
  notification_method: string[];
}

export interface EscalationProcedure {
  level: number;
  description: string;
  responsible: string[];
  timeline: number;
  actions: string[];
}

export interface EscalationContact {
  level: number;
  name: string;
  role: string;
  contact: string;
  availability: string;
  backup: string;
}

export interface DecisionAuthority {
  scope: string;
  authority: string;
  delegation: string[];
  escalation_required: boolean;
}

export interface CommunicationRules {
  channels: CommunicationChannel[];
  protocols: CommunicationProtocol[];
  classification: CommunicationClassification[];
  restrictions: CommunicationRestriction[];
}

export interface CommunicationChannel {
  name: string;
  type: 'voice' | 'text' | 'video' | 'email' | 'chat' | 'secure';
  purpose: string;
  participants: string[];
  encryption: boolean;
  logging: boolean;
  retention: string;
}

export interface CommunicationProtocol {
  scenario: string;
  method: string;
  frequency: string;
  participants: string[];
  content_guidelines: string[];
}

export interface CommunicationClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  handling: string[];
  distribution: string[];
  marking: string;
}

export interface CommunicationRestriction {
  type: string;
  description: string;
  exceptions: string[];
  enforcement: string;
}

export interface DocumentationRules {
  requirements: DocumentationRequirement[];
  templates: DocumentTemplate[];
  retention: DocumentRetention[];
  access: DocumentAccess[];
}

export interface DocumentationRequirement {
  phase: string;
  documents: string[];
  format: string;
  detail_level: 'summary' | 'detailed' | 'comprehensive';
  deadline: string;
  responsible: string;
}

export interface DocumentTemplate {
  name: string;
  type: string;
  sections: string[];
  format: string;
  version: string;
}

export interface DocumentRetention {
  document_type: string;
  retention_period: string;
  storage_location: string;
  access_restrictions: string[];
  disposal_method: string;
}

export interface DocumentAccess {
  document_type: string;
  authorized_roles: string[];
  access_method: string;
  approval_required: boolean;
  audit_required: boolean;
}

export interface LegalConsiderations {
  agreements: LegalAgreement[];
  compliance: ComplianceRequirement[];
  liability: LiabilityConsideration[];
  privacy: PrivacyConsideration[];
}

export interface LegalAgreement {
  type: 'nda' | 'terms-of-engagement' | 'liability-waiver' | 'data-processing';
  parties: string[];
  effective_date: Date;
  expiry_date?: Date;
  jurisdiction: string;
  terms: string[];
}

export interface ComplianceRequirement {
  regulation: string;
  requirements: string[];
  verification: string[];
  reporting: string[];
}

export interface LiabilityConsideration {
  risk: string;
  mitigation: string[];
  insurance: boolean;
  acceptance: string;
}

export interface PrivacyConsideration {
  data_type: string;
  processing: string[];
  protection: string[];
  rights: string[];
}

export interface ExerciseMetrics {
  red_team: RedTeamMetrics;
  blue_team: BlueTeamMetrics;
  purple_team: PurpleTeamMetrics;
  organizational: OrganizationalMetrics;
}

export interface RedTeamMetrics {
  objectives_achieved: number;
  attack_vectors_successful: number;
  detection_evasion_rate: number;
  time_to_compromise: number;
  persistence_duration: number;
  lateral_movement_success: number;
  data_exfiltration_success: number;
  techniques_executed: string[];
  tools_effectiveness: ToolEffectiveness[];
}

export interface BlueTeamMetrics {
  detection_rate: number;
  mean_time_to_detection: number;
  mean_time_to_response: number;
  false_positive_rate: number;
  false_negative_rate: number;
  containment_effectiveness: number;
  eradication_success: number;
  recovery_time: number;
  lessons_identified: number;
}

export interface PurpleTeamMetrics {
  collaboration_score: number;
  knowledge_transfer: number;
  process_improvements: number;
  detection_gaps_identified: number;
  detection_gaps_closed: number;
  playbook_updates: number;
  tool_optimization: number;
}

export interface OrganizationalMetrics {
  business_impact: number;
  cost_of_exercise: number;
  roi_calculation: number;
  stakeholder_satisfaction: number;
  security_posture_improvement: number;
  awareness_increase: number;
  process_maturity_gain: number;
}

export interface ToolEffectiveness {
  tool_name: string;
  success_rate: number;
  detection_rate: number;
  ease_of_use: number;
  impact: number;
  recommendations: string[];
}

export interface ExerciseResults {
  overall_assessment: OverallAssessment;
  detailed_findings: DetailedFinding[];
  attack_timeline: AttackTimelineEvent[];
  detection_timeline: DetectionTimelineEvent[];
  response_timeline: ResponseTimelineEvent[];
  gaps_identified: SecurityGap[];
  improvements_recommended: Improvement[];
  metrics_achieved: MetricsAchieved;
}

export interface OverallAssessment {
  security_posture: 'excellent' | 'good' | 'fair' | 'poor';
  readiness_level: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  recommendations_count: number;
  priority_actions: string[];
  executive_summary: string;
}

export interface DetailedFinding {
  id: string;
  category: 'people' | 'process' | 'technology';
  type: 'vulnerability' | 'gap' | 'weakness' | 'strength';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  title: string;
  description: string;
  evidence: Evidence[];
  impact: string;
  likelihood: number;
  risk_score: number;
  affected_assets: string[];
  recommendations: Recommendation[];
  remediation_effort: 'low' | 'medium' | 'high';
  remediation_cost: 'low' | 'medium' | 'high';
  remediation_timeline: string;
}

export interface Evidence {
  type: 'screenshot' | 'log' | 'network-capture' | 'document' | 'observation';
  description: string;
  timestamp: Date;
  source: string;
  file_path?: string;
  metadata: Record<string, any>;
}

export interface Recommendation {
  id: string;
  type: 'technical' | 'procedural' | 'training' | 'policy';
  priority: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  description: string;
  implementation_steps: string[];
  success_criteria: string[];
  dependencies: string[];
  estimated_effort: string;
  estimated_cost: string;
  responsible_party: string;
  expected_outcome: string;
}

export interface AttackTimelineEvent {
  timestamp: Date;
  phase: string;
  technique: string;
  description: string;
  success: boolean;
  impact: string;
  evidence: string[];
  detected: boolean;
  detection_time?: Date;
}

export interface DetectionTimelineEvent {
  timestamp: Date;
  source: string;
  type: 'alert' | 'investigation' | 'observation';
  description: string;
  severity: string;
  accuracy: 'true-positive' | 'false-positive' | 'unknown';
  response_triggered: boolean;
  escalated: boolean;
}

export interface ResponseTimelineEvent {
  timestamp: Date;
  responder: string;
  action: string;
  description: string;
  effectiveness: number;
  duration: number;
  outcome: string;
  lessons: string[];
}

export interface SecurityGap {
  id: string;
  category: 'detection' | 'prevention' | 'response' | 'recovery';
  type: 'capability' | 'process' | 'technology' | 'knowledge';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  business_impact: string;
  technical_impact: string;
  exploitability: number;
  current_controls: string[];
  recommended_controls: string[];
  remediation_options: RemediationOption[];
}

export interface RemediationOption {
  approach: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  cost: 'low' | 'medium' | 'high';
  effectiveness: number;
  timeline: string;
  dependencies: string[];
  risks: string[];
}

export interface Improvement {
  id: string;
  category: 'detection' | 'response' | 'prevention' | 'process' | 'training';
  type: 'quick-win' | 'strategic' | 'tactical';
  title: string;
  description: string;
  rationale: string;
  implementation: Implementation;
  benefits: string[];
  risks: string[];
  success_metrics: string[];
}

export interface Implementation {
  phases: ImplementationPhase[];
  resources_required: ResourceRequirement[];
  timeline: string;
  dependencies: string[];
  risks: ImplementationRisk[];
  success_criteria: string[];
}

export interface ImplementationPhase {
  name: string;
  description: string;
  duration: string;
  activities: string[];
  deliverables: string[];
  dependencies: string[];
}

export interface ResourceRequirement {
  type: 'human' | 'technical' | 'financial';
  description: string;
  quantity: number;
  duration: string;
  cost: number;
  availability: string;
}

export interface ImplementationRisk {
  risk: string;
  probability: number;
  impact: string;
  mitigation: string[];
  contingency: string;
}

export interface MetricsAchieved {
  planned_metrics: Record<string, number>;
  actual_metrics: Record<string, number>;
  variance: Record<string, number>;
  analysis: string;
  factors: string[];
}

export interface LessonsLearned {
  id: string;
  category: 'tactical' | 'operational' | 'strategic';
  type: 'success' | 'failure' | 'improvement' | 'insight';
  title: string;
  description: string;
  context: string;
  impact: string;
  applicability: string[];
  actions: ActionItem[];
  sharing: SharingRecommendation;
}

export interface ActionItem {
  id: string;
  description: string;
  type: 'immediate' | 'short-term' | 'long-term';
  responsible: string;
  due_date: Date;
  status: 'open' | 'in-progress' | 'completed' | 'deferred';
  dependencies: string[];
  success_criteria: string[];
}

export interface SharingRecommendation {
  internal: string[];
  external: string[];
  format: string;
  classification: string;
  approval_required: boolean;
}

export interface AttackSimulation {
  id: string;
  name: string;
  description: string;
  framework: 'caldera' | 'atomic-red-team' | 'mordor' | 'infection-monkey' | 'custom';
  type: 'automated' | 'manual' | 'hybrid';
  status: 'planned' | 'running' | 'completed' | 'failed' | 'cancelled';
  scenarios: SimulationScenario[];
  targets: SimulationTarget[];
  configuration: SimulationConfiguration;
  execution: ExecutionPlan;
  results: SimulationResults;
  artifacts: SimulationArtifact[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  mitre_tactics: string[];
  mitre_techniques: string[];
  attack_flow: AttackFlowStep[];
  prerequisites: string[];
  expected_outcomes: string[];
  success_criteria: string[];
  detection_opportunities: DetectionOpportunity[];
}

export interface AttackFlowStep {
  step: number;
  technique: string;
  description: string;
  command?: string;
  payload?: string;
  expected_result: string;
  detection_methods: string[];
  mitigation_strategies: string[];
  dependencies: string[];
  optional: boolean;
}

export interface DetectionOpportunity {
  technique: string;
  data_source: string;
  detection_method: string;
  confidence: number;
  false_positive_rate: number;
  description: string;
  indicators: string[];
}

export interface SimulationTarget {
  id: string;
  name: string;
  type: 'host' | 'network' | 'application' | 'service' | 'user';
  operating_system?: string;
  ip_address?: string;
  hostname?: string;
  domain?: string;
  credentials?: TargetCredentials;
  security_tools: string[];
  vulnerabilities: string[];
  access_method: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

export interface TargetCredentials {
  username?: string;
  password?: string;
  private_key?: string;
  certificate?: string;
  token?: string;
  method: 'password' | 'key' | 'certificate' | 'token' | 'kerberos';
}

export interface SimulationConfiguration {
  framework_config: FrameworkConfiguration;
  timing: TimingConfiguration;
  stealth: StealthConfiguration;
  cleanup: CleanupConfiguration;
  monitoring: MonitoringConfiguration;
  safety: SafetyConfiguration;
}

export interface FrameworkConfiguration {
  framework: string;
  version: string;
  agents: AgentConfiguration[];
  c2_servers: C2ServerConfiguration[];
  payloads: PayloadConfiguration[];
  plugins: PluginConfiguration[];
}

export interface AgentConfiguration {
  id: string;
  type: 'caldera' | 'atomic' | 'custom';
  platform: 'windows' | 'linux' | 'macos' | 'cloud';
  capabilities: string[];
  stealth_level: 'low' | 'medium' | 'high';
  persistence: boolean;
  communication: CommunicationConfig;
}

export interface CommunicationConfig {
  protocol: 'http' | 'https' | 'dns' | 'smb' | 'custom';
  frequency: number;
  jitter: number;
  encryption: boolean;
  obfuscation: boolean;
}

export interface C2ServerConfiguration {
  id: string;
  type: 'caldera' | 'custom';
  address: string;
  port: number;
  protocol: string;
  authentication: AuthenticationConfig;
  logging: boolean;
  encryption: boolean;
}

export interface AuthenticationConfig {
  method: 'none' | 'password' | 'certificate' | 'token';
  credentials: Record<string, string>;
}

export interface PayloadConfiguration {
  id: string;
  name: string;
  type: 'executable' | 'script' | 'document' | 'web' | 'memory';
  platform: string[];
  obfuscation: boolean;
  encryption: boolean;
  persistence: boolean;
  cleanup: boolean;
}

export interface PluginConfiguration {
  name: string;
  version: string;
  enabled: boolean;
  configuration: Record<string, any>;
}

export interface TimingConfiguration {
  start_delay: number;
  step_delay: number;
  randomization: boolean;
  jitter_range: number;
  business_hours_only: boolean;
  timezone: string;
}

export interface StealthConfiguration {
  level: 'noisy' | 'normal' | 'stealthy' | 'covert';
  techniques: StealthTechnique[];
  avoid_detection: boolean;
  rate_limiting: boolean;
  traffic_shaping: boolean;
}

export interface StealthTechnique {
  name: string;
  description: string;
  enabled: boolean;
  parameters: Record<string, any>;
}

export interface CleanupConfiguration {
  auto_cleanup: boolean;
  cleanup_delay: number;
  preserve_logs: boolean;
  preserve_artifacts: boolean;
  restore_state: boolean;
  verification_required: boolean;
}

export interface MonitoringConfiguration {
  real_time: boolean;
  detailed_logging: boolean;
  performance_metrics: boolean;
  security_events: boolean;
  network_traffic: boolean;
  host_artifacts: boolean;
}

export interface SafetyConfiguration {
  production_mode: boolean;
  safe_mode: boolean;
  destructive_actions: boolean;
  data_modification: boolean;
  service_disruption: boolean;
  emergency_stop: EmergencyStopConfig;
}

export interface EmergencyStopConfig {
  enabled: boolean;
  triggers: string[];
  automatic: boolean;
  notification: string[];
  cleanup_on_stop: boolean;
}

export interface ExecutionPlan {
  phases: ExecutionPhase[];
  rollback_plan: RollbackPlan;
  contingencies: ContingencyPlan[];
  monitoring_plan: MonitoringPlan;
}

export interface ExecutionPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  techniques: string[];
  duration_estimate: number;
  success_criteria: string[];
  failure_criteria: string[];
  dependencies: string[];
  parallel_execution: boolean;
}

export interface RollbackPlan {
  triggers: string[];
  steps: RollbackStep[];
  verification: string[];
  notification: string[];
}

export interface RollbackStep {
  order: number;
  description: string;
  command?: string;
  verification: string;
  timeout: number;
}

export interface ContingencyPlan {
  scenario: string;
  triggers: string[];
  actions: string[];
  responsible: string[];
  escalation: string[];
}

export interface MonitoringPlan {
  metrics: string[];
  thresholds: Record<string, number>;
  alerting: AlertingConfig;
  reporting: ReportingConfig;
}

export interface AlertingConfig {
  enabled: boolean;
  channels: string[];
  severity_mapping: Record<string, string>;
  escalation_rules: string[];
}

export interface ReportingConfig {
  real_time: boolean;
  summary_frequency: string;
  detailed_report: boolean;
  stakeholder_updates: boolean;
}

export interface SimulationResults {
  overall_status: 'success' | 'partial' | 'failure';
  execution_summary: ExecutionSummary;
  technique_results: TechniqueResult[];
  detection_analysis: DetectionAnalysis;
  impact_assessment: ImpactAssessment;
  recommendations: SimulationRecommendation[];
  artifacts_generated: string[];
  lessons_learned: string[];
}

export interface ExecutionSummary {
  start_time: Date;
  end_time: Date;
  duration: number;
  techniques_attempted: number;
  techniques_successful: number;
  techniques_detected: number;
  techniques_blocked: number;
  objectives_achieved: number;
  targets_compromised: number;
}

export interface TechniqueResult {
  technique_id: string;
  technique_name: string;
  mitre_id: string;
  status: 'success' | 'failure' | 'blocked' | 'detected';
  execution_time: Date;
  duration: number;
  target: string;
  command_executed?: string;
  output?: string;
  error?: string;
  detection_events: DetectionEvent[];
  artifacts_created: string[];
  cleanup_status: 'completed' | 'partial' | 'failed' | 'not-required';
}

export interface DetectionEvent {
  timestamp: Date;
  source: string;
  type: 'alert' | 'log' | 'network' | 'host';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  indicators: string[];
  false_positive: boolean;
  confidence: number;
}

export interface DetectionAnalysis {
  overall_detection_rate: number;
  detection_by_technique: Record<string, number>;
  detection_by_source: Record<string, number>;
  mean_time_to_detection: number;
  false_positive_rate: number;
  coverage_gaps: string[];
  detection_opportunities: string[];
}

export interface ImpactAssessment {
  business_impact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  technical_impact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  data_affected: DataImpact;
  systems_affected: SystemImpact[];
  service_disruption: ServiceDisruption[];
  recovery_requirements: RecoveryRequirement[];
}

export interface DataImpact {
  data_accessed: boolean;
  data_modified: boolean;
  data_exfiltrated: boolean;
  data_types: string[];
  volume_affected: string;
  sensitivity_level: string;
}

export interface SystemImpact {
  system_name: string;
  impact_type: 'availability' | 'integrity' | 'confidentiality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration: string;
  recovery_time: string;
}

export interface ServiceDisruption {
  service_name: string;
  disruption_type: 'outage' | 'degradation' | 'unauthorized-access';
  duration: string;
  users_affected: number;
  business_function: string;
}

export interface RecoveryRequirement {
  system: string;
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_effort: string;
  dependencies: string[];
}

export interface SimulationRecommendation {
  id: string;
  category: 'detection' | 'prevention' | 'response' | 'recovery';
  type: 'technical' | 'procedural' | 'training';
  priority: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  title: string;
  description: string;
  rationale: string;
  implementation: ImplementationGuidance;
  expected_benefit: string;
  effort_required: 'low' | 'medium' | 'high';
  cost_estimate: string;
}

export interface ImplementationGuidance {
  steps: string[];
  timeline: string;
  resources: string[];
  dependencies: string[];
  risks: string[];
  success_metrics: string[];
}

export interface SimulationArtifact {
  id: string;
  type: 'log' | 'payload' | 'script' | 'report' | 'evidence';
  name: string;
  description: string;
  file_path: string;
  file_size: number;
  file_hash: string;
  created_at: Date;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  retention_period: string;
}

export interface DefensiveRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'detection' | 'prevention' | 'response' | 'recovery' | 'governance';
  subcategory: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  mitre_techniques: string[];
  attack_patterns: string[];
  threat_types: string[];
  implementation: DefensiveImplementation;
  effectiveness: EffectivenessAnalysis;
  cost_benefit: CostBenefitAnalysis;
  dependencies: Dependency[];
  alternatives: Alternative[];
  validation: ValidationCriteria;
  maintenance: MaintenanceRequirements;
  metrics: SuccessMetrics;
  timeline: ImplementationTimeline;
  stakeholders: Stakeholder[];
  risks: ImplementationRisk[];
  compliance: ComplianceMapping[];
  references: Reference[];
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'review' | 'approved' | 'implemented' | 'validated' | 'deprecated';
}

export interface DefensiveImplementation {
  approach: 'technical' | 'procedural' | 'hybrid';
  complexity: 'low' | 'medium' | 'high';
  technology_stack: TechnologyComponent[];
  configuration_changes: ConfigurationChange[];
  process_changes: ProcessChange[];
  training_requirements: TrainingRequirement[];
  integration_points: IntegrationPoint[];
}

export interface TechnologyComponent {
  type: 'software' | 'hardware' | 'cloud-service' | 'saas';
  name: string;
  version?: string;
  purpose: string;
  configuration: Record<string, any>;
  licensing: LicensingInfo;
  vendor: VendorInfo;
  support: SupportInfo;
}

export interface LicensingInfo {
  type: 'open-source' | 'commercial' | 'subscription' | 'enterprise';
  cost: string;
  terms: string[];
  restrictions: string[];
}

export interface VendorInfo {
  name: string;
  reputation: string;
  support_quality: string;
  market_position: string;
  alternatives: string[];
}

export interface SupportInfo {
  availability: string;
  response_time: string;
  escalation_path: string[];
  documentation_quality: string;
  community_support: boolean;
}

export interface ConfigurationChange {
  system: string;
  component: string;
  change_type: 'add' | 'modify' | 'remove';
  description: string;
  configuration: Record<string, any>;
  impact: string;
  rollback_procedure: string;
  testing_required: boolean;
}

export interface ProcessChange {
  process_name: string;
  change_type: 'new' | 'modify' | 'retire';
  description: string;
  steps: ProcessStep[];
  roles_affected: string[];
  approval_required: boolean;
  documentation_updates: string[];
}

export interface ProcessStep {
  order: number;
  description: string;
  responsible: string;
  inputs: string[];
  outputs: string[];
  tools: string[];
  duration: string;
  decision_points: DecisionPoint[];
}

export interface DecisionPoint {
  condition: string;
  options: DecisionOption[];
  escalation: string;
  documentation: boolean;
}

export interface DecisionOption {
  choice: string;
  next_step: string;
  requirements: string[];
  implications: string[];
}

export interface TrainingRequirement {
  audience: string[];
  type: 'awareness' | 'skills' | 'certification';
  content: string[];
  delivery_method: string[];
  duration: string;
  frequency: string;
  assessment: boolean;
  certification_required: boolean;
}

export interface IntegrationPoint {
  system: string;
  integration_type: 'api' | 'agent' | 'log-forwarding' | 'file-transfer' | 'database';
  direction: 'inbound' | 'outbound' | 'bidirectional';
  data_format: string;
  frequency: string;
  authentication: string;
  encryption: boolean;
  monitoring: boolean;
}

export interface EffectivenessAnalysis {
  coverage: CoverageAnalysis;
  performance: PerformanceAnalysis;
  accuracy: AccuracyAnalysis;
  scalability: ScalabilityAnalysis;
  maintainability: MaintainabilityAnalysis;
}

export interface CoverageAnalysis {
  attack_vectors: number;
  threat_types: number;
  asset_coverage: number;
  gap_analysis: string[];
  overlap_analysis: string[];
}

export interface PerformanceAnalysis {
  response_time: string;
  throughput: string;
  resource_utilization: string;
  bottlenecks: string[];
  optimization_opportunities: string[];
}

export interface AccuracyAnalysis {
  true_positive_rate: number;
  false_positive_rate: number;
  false_negative_rate: number;
  precision: number;
  recall: number;
  confidence_intervals: string[];
}

export interface ScalabilityAnalysis {
  horizontal_scaling: boolean;
  vertical_scaling: boolean;
  performance_degradation: string;
  capacity_limits: string[];
  scaling_triggers: string[];
}

export interface MaintainabilityAnalysis {
  update_frequency: string;
  update_complexity: string;
  skill_requirements: string[];
  automation_level: string;
  maintenance_overhead: string;
}

export interface CostBenefitAnalysis {
  implementation_cost: CostBreakdown;
  operational_cost: CostBreakdown;
  total_cost_ownership: string;
  benefits: BenefitAnalysis;
  roi_calculation: ROICalculation;
  payback_period: string;
}

export interface CostBreakdown {
  personnel: number;
  technology: number;
  training: number;
  operational: number;
  maintenance: number;
  total: number;
  currency: string;
  confidence: string;
}

export interface BenefitAnalysis {
  risk_reduction: RiskReduction;
  efficiency_gains: EfficiencyGain[];
  compliance_benefits: string[];
  intangible_benefits: string[];
  quantified_benefits: number;
}

export interface RiskReduction {
  threat_categories: Record<string, number>;
  overall_reduction: number;
  confidence_level: string;
  measurement_method: string;
  validation_approach: string;
}

export interface EfficiencyGain {
  process: string;
  time_saved: string;
  cost_saved: number;
  quality_improvement: string;
  automation_level: string;
}

export interface ROICalculation {
  method: string;
  assumptions: string[];
  sensitivity_analysis: string[];
  time_horizon: string;
  roi_percentage: number;
  break_even_point: string;
}

export interface Dependency {
  type: 'technology' | 'process' | 'skill' | 'legal' | 'business';
  name: string;
  description: string;
  criticality: 'mandatory' | 'important' | 'optional';
  availability: string;
  alternatives: string[];
  impact_if_missing: string;
}

export interface Alternative {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  cost_difference: number;
  complexity_difference: string;
  recommendation: string;
}

export interface ValidationCriteria {
  testing_approach: TestingApproach[];
  success_criteria: SuccessCriterion[];
  acceptance_criteria: AcceptanceCriterion[];
  rollback_triggers: string[];
}

export interface TestingApproach {
  phase: 'unit' | 'integration' | 'system' | 'acceptance' | 'production';
  method: string;
  scope: string[];
  duration: string;
  resources: string[];
  success_criteria: string[];
}

export interface SuccessCriterion {
  metric: string;
  target_value: number;
  measurement_method: string;
  frequency: string;
  baseline: number;
}

export interface AcceptanceCriterion {
  criterion: string;
  validation_method: string;
  responsible_party: string;
  documentation_required: boolean;
}

export interface MaintenanceRequirements {
  routine_maintenance: MaintenanceTask[];
  update_procedures: UpdateProcedure[];
  monitoring_requirements: MonitoringRequirement[];
  troubleshooting_guide: TroubleshootingGuide[];
}

export interface MaintenanceTask {
  task: string;
  frequency: string;
  duration: string;
  responsible: string;
  automation_possible: boolean;
  impact_if_skipped: string;
}

export interface UpdateProcedure {
  trigger: string;
  process: string[];
  testing_required: boolean;
  approval_required: boolean;
  rollback_plan: string;
  communication_plan: string;
}

export interface TroubleshootingGuide {
  symptom: string;
  possible_causes: string[];
  diagnostic_steps: string[];
  resolution_steps: string[];
  escalation_path: string[];
}

export interface SuccessMetrics {
  leading_indicators: Metric[];
  lagging_indicators: Metric[];
  business_metrics: Metric[];
  technical_metrics: Metric[];
}

export interface Metric {
  name: string;
  description: string;
  measurement_method: string;
  target_value: number;
  threshold_warning: number;
  threshold_critical: number;
  frequency: string;
  responsible: string;
}

export interface ImplementationTimeline {
  phases: TimelinePhase[];
  milestones: TimelineMilestone[];
  dependencies: TimelineDependency[];
  critical_path: string[];
  buffer_time: string;
}

export interface TimelinePhase {
  name: string;
  description: string;
  start_date: Date;
  end_date: Date;
  deliverables: string[];
  resources: string[];
  risks: string[];
}

export interface TimelineMilestone {
  name: string;
  date: Date;
  criteria: string[];
  stakeholders: string[];
  communication_plan: string;
}

export interface TimelineDependency {
  predecessor: string;
  successor: string;
  type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
  lag_time: string;
  relationship: string;
}

export interface Stakeholder {
  name: string;
  role: string;
  responsibility: string[];
  influence: 'low' | 'medium' | 'high';
  interest: 'low' | 'medium' | 'high';
  communication_preference: string[];
  decision_authority: string[];
}

export interface ComplianceMapping {
  framework: string;
  requirements: string[];
  controls: string[];
  evidence: string[];
  assessment_frequency: string;
}

export interface Reference {
  type: 'documentation' | 'standard' | 'research' | 'vendor' | 'community';
  title: string;
  url?: string;
  description: string;
  relevance: 'high' | 'medium' | 'low';
  last_updated: Date;
}

export interface RiskAssessment {
  id: string;
  name: string;
  description: string;
  scope: AssessmentScope;
  methodology: RiskMethodology;
  threats: ThreatAssessment[];
  vulnerabilities: VulnerabilityAssessment[];
  assets: AssetAssessment[];
  risk_calculations: RiskCalculation[];
  treatment_options: RiskTreatmentOption[];
  residual_risks: ResidualRisk[];
  monitoring_plan: RiskMonitoringPlan;
  review_schedule: ReviewSchedule;
  approvals: RiskApproval[];
  createdAt: Date;
  updatedAt: Date;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'active' | 'expired';
}

export interface AssessmentScope {
  business_units: string[];
  systems: string[];
  processes: string[];
  locations: string[];
  time_period: TimePeriod;
  exclusions: string[];
  assumptions: string[];
}

export interface TimePeriod {
  start_date: Date;
  end_date: Date;
  assessment_frequency: string;
  review_frequency: string;
}

export interface RiskMethodology {
  framework: 'iso27005' | 'nist-800-30' | 'octave' | 'fair' | 'custom';
  approach: 'quantitative' | 'qualitative' | 'hybrid';
  risk_scale: RiskScale;
  calculation_method: CalculationMethod;
  confidence_levels: ConfidenceLevel[];
}

export interface RiskScale {
  probability_scale: ScaleLevel[];
  impact_scale: ScaleLevel[];
  risk_matrix: RiskMatrix;
}

export interface ScaleLevel {
  level: number;
  label: string;
  description: string;
  quantitative_range?: QuantitativeRange;
}

export interface QuantitativeRange {
  min_value: number;
  max_value: number;
  unit: string;
  confidence: number;
}

export interface RiskMatrix {
  dimensions: number;
  risk_levels: RiskLevel[];
  acceptance_criteria: AcceptanceCriteria;
}

export interface RiskLevel {
  level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  color: string;
  action_required: string;
  approval_level: string;
  treatment_timeline: string;
}

export interface AcceptanceCriteria {
  acceptable_risk: string[];
  unacceptable_risk: string[];
  decision_authority: string;
  approval_process: string[];
}

export interface CalculationMethod {
  probability_calculation: string;
  impact_calculation: string;
  risk_calculation: string;
  aggregation_method: string;
  weighting_factors: WeightingFactor[];
}

export interface WeightingFactor {
  factor: string;
  weight: number;
  justification: string;
  sensitivity_analysis: string;
}

export interface ConfidenceLevel {
  assessment_type: string;
  confidence_percentage: number;
  confidence_interval: string;
  factors_affecting: string[];
}

export interface ThreatAssessment {
  id: string;
  threat_source: ThreatSource;
  threat_events: ThreatEvent[];
  threat_scenarios: ThreatScenario[];
  likelihood_assessment: LikelihoodAssessment;
  capability_assessment: CapabilityAssessment;
  intent_assessment: IntentAssessment;
  targeting_assessment: TargetingAssessment;
}

export interface ThreatSource {
  category: 'human' | 'natural' | 'environmental' | 'technical';
  type: string;
  characteristics: ThreatCharacteristic[];
  motivation: string[];
  capabilities: ThreatCapability[];
  resources: ThreatResource[];
  constraints: string[];
}

export interface ThreatCharacteristic {
  attribute: string;
  value: string;
  confidence: number;
  evidence: string[];
}

export interface ThreatCapability {
  domain: string;
  level: 'low' | 'medium' | 'high' | 'expert';
  description: string;
  evidence: string[];
  trends: string;
}

export interface ThreatResource {
  type: 'financial' | 'technical' | 'human' | 'information' | 'access';
  availability: 'limited' | 'moderate' | 'extensive';
  description: string;
  impact_on_capability: string;
}

export interface ThreatEvent {
  id: string;
  name: string;
  description: string;
  mitre_techniques: string[];
  attack_vectors: string[];
  prerequisites: string[];
  indicators: ThreatIndicator[];
  consequences: string[];
}

export interface ThreatIndicator {
  type: 'ioc' | 'ttp' | 'behavioral' | 'contextual';
  indicator: string;
  confidence: number;
  source: string;
  reliability: string;
}

export interface ThreatScenario {
  id: string;
  name: string;
  description: string;
  attack_path: AttackPathStep[];
  assumptions: string[];
  success_conditions: string[];
  detection_opportunities: string[];
  impact_potential: ImpactPotential;
}

export interface AttackPathStep {
  step: number;
  technique: string;
  description: string;
  prerequisites: string[];
  success_probability: number;
  detection_probability: number;
  impact: string;
}

export interface ImpactPotential {
  confidentiality: ImpactLevel;
  integrity: ImpactLevel;
  availability: ImpactLevel;
  business_impact: BusinessImpactLevel[];
}

export interface ImpactLevel {
  level: 'none' | 'low' | 'medium' | 'high';
  description: string;
  quantitative_estimate?: QuantitativeEstimate;
}

export interface BusinessImpactLevel {
  category: 'financial' | 'operational' | 'reputational' | 'legal' | 'strategic';
  impact: 'none' | 'low' | 'medium' | 'high';
  description: string;
  quantitative_estimate?: QuantitativeEstimate;
}

export interface QuantitativeEstimate {
  min_value: number;
  max_value: number;
  most_likely: number;
  unit: string;
  confidence: number;
  methodology: string;
}

export interface LikelihoodAssessment {
  overall_likelihood: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  factors: LikelihoodFactor[];
  historical_data: HistoricalData[];
  expert_judgment: ExpertJudgment[];
  quantitative_analysis?: QuantitativeAnalysis;
}

export interface LikelihoodFactor {
  factor: string;
  contribution: 'negative' | 'neutral' | 'positive';
  weight: number;
  description: string;
  evidence: string[];
}

export interface HistoricalData {
  time_period: string;
  incident_count: number;
  incident_types: string[];
  trend_analysis: string;
  applicability: string;
}

export interface ExpertJudgment {
  expert: string;
  expertise_area: string;
  assessment: string;
  confidence: number;
  rationale: string;
}

export interface QuantitativeAnalysis {
  method: string;
  data_sources: string[];
  assumptions: string[];
  calculations: Record<string, number>;
  sensitivity_analysis: string[];
}

export interface CapabilityAssessment {
  technical_capability: CapabilityLevel;
  operational_capability: CapabilityLevel;
  resource_capability: CapabilityLevel;
  overall_capability: CapabilityLevel;
  capability_trends: string[];
}

export interface CapabilityLevel {
  level: 'low' | 'medium' | 'high' | 'expert';
  evidence: string[];
  limitations: string[];
  development_potential: string;
}

export interface IntentAssessment {
  targeting_intent: IntentLevel;
  persistence_intent: IntentLevel;
  disruption_intent: IntentLevel;
  financial_intent: IntentLevel;
  overall_intent: IntentLevel;
  intent_indicators: string[];
}

export interface IntentLevel {
  level: 'low' | 'medium' | 'high';
  evidence: string[];
  confidence: number;
  time_horizon: string;
}

export interface TargetingAssessment {
  targeting_likelihood: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  targeting_factors: TargetingFactor[];
  attractiveness_analysis: AttractivenessAnalysis;
  historical_targeting: HistoricalTargeting[];
}

export interface TargetingFactor {
  factor: string;
  relevance: 'high' | 'medium' | 'low';
  impact_on_targeting: 'increases' | 'decreases' | 'neutral';
  description: string;
}

export interface AttractivenessAnalysis {
  value_proposition: string;
  access_difficulty: string;
  detection_risk: string;
  success_probability: string;
  alternative_targets: string[];
}

export interface HistoricalTargeting {
  time_period: string;
  similar_targets: string[];
  attack_patterns: string[];
  success_rate: number;
  lessons_learned: string[];
}

export interface VulnerabilityAssessment {
  id: string;
  vulnerability_sources: VulnerabilitySource[];
  technical_vulnerabilities: TechnicalVulnerability[];
  operational_vulnerabilities: OperationalVulnerability[];
  human_vulnerabilities: HumanVulnerability[];
  physical_vulnerabilities: PhysicalVulnerability[];
  aggregated_assessment: AggregatedVulnerabilityAssessment;
}

export interface VulnerabilitySource {
  source_type: 'automated-scan' | 'manual-assessment' | 'penetration-test' | 'code-review' | 'configuration-review';
  tool_or_method: string;
  scope: string[];
  execution_date: Date;
  credibility: 'high' | 'medium' | 'low';
  limitations: string[];
}

export interface TechnicalVulnerability {
  id: string;
  cve_id?: string;
  cvss_score?: number;
  category: 'network' | 'system' | 'application' | 'database' | 'cloud';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affected_assets: string[];
  exploitability: ExploitabilityAssessment;
  patch_availability: PatchInformation;
  workarounds: string[];
  business_context: string;
}

export interface ExploitabilityAssessment {
  ease_of_exploitation: 'trivial' | 'easy' | 'moderate' | 'difficult';
  exploit_availability: boolean;
  attack_complexity: 'low' | 'medium' | 'high';
  required_privileges: 'none' | 'low' | 'high';
  user_interaction: boolean;
  remote_exploitation: boolean;
}

export interface PatchInformation {
  patch_available: boolean;
  patch_date?: Date;
  patch_complexity: 'low' | 'medium' | 'high';
  testing_required: boolean;
  business_impact: string;
  deployment_timeline: string;
}

export interface OperationalVulnerability {
  id: string;
  category: 'process' | 'procedure' | 'policy' | 'governance' | 'compliance';
  description: string;
  business_process: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  exploitability: OperationalExploitability;
  affected_functions: string[];
  remediation_options: string[];
}

export interface OperationalExploitability {
  access_required: string;
  knowledge_required: string;
  time_to_exploit: string;
  detection_likelihood: 'high' | 'medium' | 'low';
  impact_scope: string;
}

export interface HumanVulnerability {
  id: string;
  category: 'awareness' | 'training' | 'behavior' | 'social-engineering' | 'insider-threat';
  description: string;
  affected_roles: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  exploitability: HumanExploitability;
  mitigation_strategies: string[];
  training_gaps: string[];
}

export interface HumanExploitability {
  attack_vectors: string[];
  success_probability: number;
  detection_difficulty: 'high' | 'medium' | 'low';
  impact_potential: string;
  recovery_difficulty: string;
}

export interface PhysicalVulnerability {
  id: string;
  category: 'access-control' | 'surveillance' | 'environmental' | 'equipment' | 'location';
  description: string;
  location: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  exploitability: PhysicalExploitability;
  current_controls: string[];
  recommended_controls: string[];
}

export interface PhysicalExploitability {
  access_difficulty: 'trivial' | 'easy' | 'moderate' | 'difficult';
  tools_required: string[];
  time_required: string;
  detection_risk: 'high' | 'medium' | 'low';
  insider_knowledge: boolean;
}

export interface AggregatedVulnerabilityAssessment {
  overall_vulnerability_level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  critical_vulnerabilities: number;
  high_vulnerabilities: number;
  medium_vulnerabilities: number;
  low_vulnerabilities: number;
  vulnerability_trends: VulnerabilityTrend[];
  priority_vulnerabilities: string[];
  systemic_issues: string[];
}

export interface VulnerabilityTrend {
  time_period: string;
  vulnerability_count: number;
  severity_distribution: Record<string, number>;
  trend_direction: 'improving' | 'stable' | 'degrading';
  contributing_factors: string[];
}

export interface AssetAssessment {
  id: string;
  asset_inventory: AssetInventoryItem[];
  criticality_analysis: CriticalityAnalysis;
  dependency_analysis: DependencyAnalysis;
  value_assessment: ValueAssessment;
  exposure_analysis: ExposureAnalysis;
}

export interface AssetInventoryItem {
  id: string;
  name: string;
  type: 'hardware' | 'software' | 'data' | 'service' | 'people' | 'facility';
  category: string;
  owner: string;
  custodian: string;
  location: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  business_function: string;
  technical_specifications: Record<string, any>;
  lifecycle_stage: 'development' | 'production' | 'maintenance' | 'retirement';
}

export interface CriticalityAnalysis {
  business_criticality: CriticalityLevel;
  operational_criticality: CriticalityLevel;
  security_criticality: CriticalityLevel;
  overall_criticality: CriticalityLevel;
  criticality_factors: CriticalityFactor[];
}

export interface CriticalityLevel {
  level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  justification: string;
  impact_of_loss: string;
  recovery_requirements: string;
}

export interface CriticalityFactor {
  factor: string;
  weight: number;
  value: number;
  justification: string;
}

export interface DependencyAnalysis {
  upstream_dependencies: Dependency[];
  downstream_dependencies: Dependency[];
  circular_dependencies: string[];
  single_points_of_failure: string[];
  dependency_resilience: ResilienceAssessment;
}

export interface ResilienceAssessment {
  redundancy_level: 'none' | 'partial' | 'full';
  failover_capability: boolean;
  recovery_time: string;
  alternate_sources: string[];
  risk_mitigation: string[];
}

export interface ValueAssessment {
  financial_value: FinancialValue;
  strategic_value: StrategicValue;
  operational_value: OperationalValue;
  reputational_value: ReputationalValue;
  total_value_score: number;
}

export interface FinancialValue {
  replacement_cost: number;
  revenue_impact: number;
  cost_of_downtime: number;
  regulatory_fines: number;
  total_financial_exposure: number;
}

export interface StrategicValue {
  competitive_advantage: boolean;
  intellectual_property: boolean;
  market_position: string;
  future_value: string;
  strategic_importance: 'low' | 'medium' | 'high';
}

export interface OperationalValue {
  process_enablement: string[];
  efficiency_contribution: string;
  service_delivery: string;
  customer_impact: string;
  operational_importance: 'low' | 'medium' | 'high';
}

export interface ReputationalValue {
  brand_impact: string;
  customer_trust: string;
  regulatory_standing: string;
  market_confidence: string;
  reputational_importance: 'low' | 'medium' | 'high';
}

export interface ExposureAnalysis {
  threat_exposure: ThreatExposure[];
  attack_surface: AttackSurface;
  vulnerability_exposure: VulnerabilityExposure[];
  overall_exposure_level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
}

export interface ThreatExposure {
  threat_type: string;
  exposure_level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  exposure_factors: string[];
  mitigation_factors: string[];
  net_exposure: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
}

export interface AttackSurface {
  network_exposure: NetworkExposure;
  application_exposure: ApplicationExposure;
  physical_exposure: PhysicalExposure;
  human_exposure: HumanExposure;
  total_attack_surface_score: number;
}

export interface NetworkExposure {
  internet_facing_services: number;
  open_ports: number;
  network_segmentation: 'none' | 'basic' | 'advanced';
  remote_access_points: number;
  wireless_exposure: string;
}

export interface ApplicationExposure {
  web_applications: number;
  api_endpoints: number;
  mobile_applications: number;
  third_party_integrations: number;
  application_security_posture: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface PhysicalExposure {
  facility_security: 'poor' | 'fair' | 'good' | 'excellent';
  access_controls: 'basic' | 'standard' | 'advanced';
  monitoring_coverage: 'limited' | 'partial' | 'comprehensive';
  environmental_risks: string[];
}

export interface HumanExposure {
  user_privilege_levels: Record<string, number>;
  training_coverage: number;
  awareness_level: 'low' | 'medium' | 'high';
  social_engineering_susceptibility: 'low' | 'medium' | 'high';
}

export interface VulnerabilityExposure {
  vulnerability_category: string;
  exposed_assets: number;
  exploitation_likelihood: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  potential_impact: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  current_controls: string[];
}

export interface RiskCalculation {
  id: string;
  threat_id: string;
  vulnerability_id: string;
  asset_id: string;
  risk_scenario: RiskScenario;
  likelihood_score: number;
  impact_score: number;
  inherent_risk_score: number;
  current_controls: ControlAssessment[];
  residual_risk_score: number;
  risk_level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  risk_owner: string;
  calculation_method: string;
  confidence_level: number;
  last_updated: Date;
}

export interface RiskScenario {
  scenario_name: string;
  description: string;
  attack_path: string[];
  success_conditions: string[];
  impact_description: string;
  business_context: string;
}

export interface ControlAssessment {
  control_id: string;
  control_name: string;
  control_type: 'preventive' | 'detective' | 'corrective' | 'deterrent';
  effectiveness: number;
  implementation_status: 'not-implemented' | 'planned' | 'partially-implemented' | 'implemented' | 'optimized';
  testing_status: 'not-tested' | 'planned' | 'in-progress' | 'passed' | 'failed';
  last_tested: Date;
  deficiencies: string[];
  recommendations: string[];
}

export interface RiskTreatmentOption {
  id: string;
  risk_id: string;
  treatment_strategy: 'accept' | 'mitigate' | 'transfer' | 'avoid';
  description: string;
  proposed_controls: ProposedControl[];
  cost_estimate: CostEstimate;
  implementation_timeline: string;
  effectiveness_estimate: number;
  residual_risk_estimate: number;
  business_justification: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'deferred';
  approved_by?: string;
  approved_date?: Date;
}

export interface ProposedControl {
  control_name: string;
  control_type: 'preventive' | 'detective' | 'corrective' | 'deterrent';
  description: string;
  implementation_requirements: string[];
  operational_requirements: string[];
  effectiveness_rating: number;
  cost_component: number;
}

export interface CostEstimate {
  initial_cost: number;
  annual_cost: number;
  total_cost_3_years: number;
  cost_breakdown: CostComponent[];
  currency: string;
  confidence_level: string;
}

export interface CostComponent {
  category: 'personnel' | 'technology' | 'training' | 'consulting' | 'other';
  description: string;
  amount: number;
  frequency: 'one-time' | 'monthly' | 'quarterly' | 'annually';
}

export interface ResidualRisk {
  id: string;
  original_risk_id: string;
  treatment_applied: string[];
  residual_likelihood: number;
  residual_impact: number;
  residual_risk_score: number;
  residual_risk_level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  acceptability: 'acceptable' | 'tolerable' | 'unacceptable';
  additional_treatment_required: boolean;
  monitoring_requirements: string[];
  review_frequency: string;
}

export interface RiskMonitoringPlan {
  monitoring_objectives: string[];
  key_risk_indicators: KeyRiskIndicator[];
  monitoring_activities: MonitoringActivity[];
  reporting_requirements: ReportingRequirement[];
  escalation_procedures: EscalationProcedure[];
}

export interface KeyRiskIndicator {
  indicator_name: string;
  description: string;
  measurement_method: string;
  threshold_green: number;
  threshold_amber: number;
  threshold_red: number;
  frequency: string;
  responsible_party: string;
  data_source: string;
}

export interface MonitoringActivity {
  activity_name: string;
  description: string;
  frequency: string;
  responsible_party: string;
  methodology: string;
  deliverables: string[];
  success_criteria: string[];
}

export interface ReportingRequirement {
  report_type: 'dashboard' | 'summary' | 'detailed' | 'exception' | 'trend';
  audience: string[];
  frequency: string;
  content_requirements: string[];
  format: string;
  distribution_method: string;
}

export interface ReviewSchedule {
  regular_review_frequency: string;
  review_triggers: string[];
  review_scope: string[];
  review_participants: string[];
  review_deliverables: string[];
  approval_requirements: string[];
}

export interface RiskApproval {
  approver_name: string;
  approver_role: string;
  approval_scope: string[];
  approval_date: Date;
  approval_conditions: string[];
  review_date: Date;
}

export interface SecurityPostureAssessment {
  id: string;
  assessment_name: string;
  assessment_date: Date;
  scope: PostureScope;
  methodology: PostureMethodology;
  domains: SecurityDomain[];
  overall_score: number;
  maturity_level: MaturityLevel;
  benchmarking: BenchmarkingResults;
  gap_analysis: GapAnalysisResults;
  improvement_roadmap: ImprovementRoadmap;
  compliance_status: ComplianceStatus[];
  risk_exposure: RiskExposureAssessment;
  recommendations: PostureRecommendation[];
  next_assessment: Date;
}

export interface PostureScope {
  organizational_units: string[];
  technology_domains: string[];
  business_processes: string[];
  geographic_locations: string[];
  assessment_period: string;
  exclusions: string[];
}

export interface PostureMethodology {
  framework: string[];
  assessment_approach: 'self-assessment' | 'independent' | 'hybrid';
  data_collection_methods: string[];
  validation_techniques: string[];
  scoring_methodology: string;
  confidence_level: string;
}

export interface SecurityDomain {
  domain_name: string;
  description: string;
  controls: DomainControl[];
  domain_score: number;
  maturity_level: 'initial' | 'managed' | 'defined' | 'quantitatively-managed' | 'optimizing';
  strengths: string[];
  weaknesses: string[];
  priorities: string[];
}

export interface DomainControl {
  control_id: string;
  control_name: string;
  control_objective: string;
  implementation_status: 'not-implemented' | 'partially-implemented' | 'implemented' | 'optimized';
  effectiveness_score: number;
  evidence: ControlEvidence[];
  gaps: string[];
  recommendations: string[];
}

export interface ControlEvidence {
  evidence_type: 'documentation' | 'technical' | 'observation' | 'interview';
  description: string;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  source: string;
  date_collected: Date;
}

export interface MaturityLevel {
  overall_maturity: 'initial' | 'managed' | 'defined' | 'quantitatively-managed' | 'optimizing';
  domain_maturity: Record<string, string>;
  maturity_progression: MaturityProgression[];
  next_level_requirements: string[];
}

export interface MaturityProgression {
  from_level: string;
  to_level: string;
  requirements: string[];
  estimated_effort: string;
  estimated_timeline: string;
  dependencies: string[];
}

export interface BenchmarkingResults {
  industry_comparison: IndustryComparison;
  peer_comparison: PeerComparison;
  best_practices: BestPractice[];
  performance_gaps: string[];
}

export interface IndustryComparison {
  industry: string;
  industry_average: number;
  percentile_ranking: number;
  top_quartile_threshold: number;
  comparison_notes: string[];
}

export interface PeerComparison {
  peer_group: string;
  peer_average: number;
  relative_position: 'below-average' | 'average' | 'above-average' | 'leading';
  peer_insights: string[];
}

export interface BestPractice {
  practice_name: string;
  description: string;
  applicability: string;
  implementation_complexity: 'low' | 'medium' | 'high';
  expected_benefit: string;
  reference_sources: string[];
}

export interface GapAnalysisResults {
  critical_gaps: CriticalGap[];
  strategic_gaps: StrategicGap[];
  operational_gaps: OperationalGap[];
  technology_gaps: TechnologyGap[];
  gap_prioritization: GapPrioritization[];
}

export interface CriticalGap {
  gap_name: string;
  description: string;
  business_impact: 'low' | 'medium' | 'high' | 'critical';
  risk_exposure: 'low' | 'medium' | 'high' | 'critical';
  remediation_urgency: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  remediation_complexity: 'low' | 'medium' | 'high';
  estimated_cost: string;
}

export interface StrategicGap {
  gap_area: string;
  current_state: string;
  target_state: string;
  strategic_impact: string;
  transformation_requirements: string[];
  success_factors: string[];
}

export interface OperationalGap {
  process_area: string;
  efficiency_gap: string;
  effectiveness_gap: string;
  automation_opportunities: string[];
  skill_gaps: string[];
  improvement_potential: string;
}

export interface TechnologyGap {
  technology_domain: string;
  current_capabilities: string[];
  missing_capabilities: string[];
  obsolescence_risks: string[];
  modernization_needs: string[];
  integration_requirements: string[];
}

export interface GapPrioritization {
  gap_id: string;
  priority_score: number;
  business_value: number;
  implementation_difficulty: number;
  resource_requirements: string;
  timeline_estimate: string;
  dependencies: string[];
}

export interface ImprovementRoadmap {
  strategic_objectives: StrategicObjective[];
  improvement_initiatives: ImprovementInitiative[];
  timeline: RoadmapTimeline;
  resource_requirements: RoadmapResource[];
  success_metrics: RoadmapMetric[];
  risk_factors: RoadmapRisk[];
}

export interface StrategicObjective {
  objective_name: string;
  description: string;
  target_date: Date;
  success_criteria: string[];
  business_alignment: string;
  stakeholder_impact: string[];
}

export interface ImprovementInitiative {
  initiative_name: string;
  description: string;
  category: 'strategic' | 'tactical' | 'operational';
  priority: 'critical' | 'high' | 'medium' | 'low';
  scope: string[];
  deliverables: string[];
  timeline: InitiativeTimeline;
  resources: InitiativeResource[];
  dependencies: string[];
  risks: string[];
  success_metrics: string[];
}

export interface InitiativeTimeline {
  start_date: Date;
  end_date: Date;
  milestones: InitiativeMilestone[];
  critical_path: string[];
}

export interface InitiativeMilestone {
  milestone_name: string;
  target_date: Date;
  deliverables: string[];
  success_criteria: string[];
  stakeholders: string[];
}

export interface InitiativeResource {
  resource_type: 'personnel' | 'technology' | 'consulting' | 'training' | 'other';
  description: string;
  quantity: number;
  cost: number;
  allocation_period: string;
}

export interface RoadmapTimeline {
  phases: RoadmapPhase[];
  dependencies: RoadmapDependency[];
  critical_milestones: RoadmapMilestone[];
}

export interface RoadmapPhase {
  phase_name: string;
  duration: string;
  objectives: string[];
  initiatives: string[];
  deliverables: string[];
  success_criteria: string[];
}

export interface RoadmapDependency {
  predecessor: string;
  successor: string;
  dependency_type: string;
  impact: string;
  mitigation: string[];
}

export interface RoadmapMilestone {
  milestone_name: string;
  target_date: Date;
  significance: string;
  stakeholders: string[];
  communication_plan: string;
}

export interface RoadmapResource {
  resource_category: string;
  total_investment: number;
  annual_breakdown: AnnualResourceBreakdown[];
  funding_sources: string[];
  approval_requirements: string[];
}

export interface AnnualResourceBreakdown {
  year: number;
  amount: number;
  allocation: ResourceAllocation[];
}

export interface ResourceAllocation {
  category: string;
  percentage: number;
  justification: string;
}

export interface RoadmapMetric {
  metric_name: string;
  baseline_value: number;
  target_value: number;
  measurement_method: string;
  reporting_frequency: string;
  responsible_party: string;
}

export interface RoadmapRisk {
  risk_name: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  description: string;
  mitigation_strategies: string[];
  contingency_plans: string[];
  monitoring_indicators: string[];
}

export interface ComplianceStatus {
  framework: string;
  version: string;
  compliance_percentage: number;
  status: 'compliant' | 'non-compliant' | 'partially-compliant';
  last_assessment: Date;
  next_assessment: Date;
  critical_findings: number;
  findings_by_severity: Record<string, number>;
  remediation_timeline: string;
  certification_status?: CertificationStatus;
}

export interface CertificationStatus {
  certified: boolean;
  certification_body: string;
  certificate_number?: string;
  issue_date?: Date;
  expiry_date?: Date;
  scope: string[];
  conditions: string[];
}

export interface RiskExposureAssessment {
  overall_risk_level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  risk_categories: RiskCategoryExposure[];
  risk_trends: RiskTrend[];
  risk_appetite_alignment: RiskAppetiteAlignment;
  emerging_risks: EmergingRisk[];
}

export interface RiskCategoryExposure {
  category: string;
  risk_level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  risk_count: number;
  trending: 'improving' | 'stable' | 'degrading';
  key_risks: string[];
}

export interface RiskTrend {
  time_period: string;
  risk_level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  risk_count: number;
  notable_changes: string[];
}

export interface RiskAppetiteAlignment {
  within_appetite: boolean;
  variance: string;
  action_required: boolean;
  recommendations: string[];
}

export interface EmergingRisk {
  risk_name: string;
  description: string;
  likelihood: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  potential_impact: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
  time_horizon: 'immediate' | 'short-term' | 'medium-term' | 'long-term';
  monitoring_required: boolean;
  preparedness_actions: string[];
}

export interface PostureRecommendation {
  id: string;
  category: 'strategic' | 'operational' | 'tactical';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  business_justification: string;
  implementation_approach: string;
  resource_requirements: string;
  timeline: string;
  expected_benefits: string[];
  risks: string[];
  dependencies: string[];
  success_metrics: string[];
}

export interface AdvancedSecurityDashboard {
  purple_team_metrics: PurpleTeamDashboardMetrics;
  simulation_metrics: SimulationDashboardMetrics;
  defense_metrics: DefenseDashboardMetrics;
  risk_metrics: RiskDashboardMetrics;
  compliance_metrics: ComplianceDashboardMetrics;
  framework_integration: FrameworkIntegrationMetrics;
}

export interface PurpleTeamDashboardMetrics {
  active_exercises: number;
  completed_exercises: number;
  exercise_success_rate: number;
  detection_improvement: number;
  response_improvement: number;
  collaboration_score: number;
  recent_exercises: ExerciseOverview[];
  upcoming_exercises: ExerciseOverview[];
}

export interface ExerciseOverview {
  id: string;
  name: string;
  type: string;
  status: string;
  start_date: Date;
  end_date?: Date;
  participants: number;
  objectives_achieved: number;
  total_objectives: number;
}

export interface SimulationDashboardMetrics {
  total_simulations: number;
  successful_simulations: number;
  detection_rate: number;
  mean_time_to_detection: number;
  techniques_tested: number;
  techniques_successful: number;
  recent_simulations: SimulationOverview[];
  framework_usage: FrameworkUsage[];
}

export interface SimulationOverview {
  id: string;
  name: string;
  framework: string;
  status: string;
  execution_date: Date;
  techniques_count: number;
  success_rate: number;
  detection_rate: number;
}

export interface FrameworkUsage {
  framework: string;
  usage_count: number;
  success_rate: number;
  detection_rate: number;
  last_used: Date;
}

export interface DefenseDashboardMetrics {
  total_recommendations: number;
  implemented_recommendations: number;
  pending_recommendations: number;
  high_priority_recommendations: number;
  average_implementation_time: number;
  defense_effectiveness: number;
  recent_implementations: RecommendationOverview[];
  category_breakdown: CategoryBreakdown[];
}

export interface RecommendationOverview {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  implementation_date?: Date;
  effectiveness_score?: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  implemented: number;
  pending: number;
  effectiveness: number;
}

export interface RiskDashboardMetrics {
  total_risks: number;
  critical_risks: number;
  high_risks: number;
  risk_trend: 'improving' | 'stable' | 'degrading';
  overall_risk_score: number;
  risk_appetite_status: 'within' | 'approaching' | 'exceeded';
  recent_assessments: AssessmentOverview[];
  risk_categories: RiskCategoryMetrics[];
}

export interface AssessmentOverview {
  id: string;
  name: string;
  type: string;
  completion_date: Date;
  risk_level: string;
  findings_count: number;
}

export interface RiskCategoryMetrics {
  category: string;
  risk_count: number;
  average_score: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface ComplianceDashboardMetrics {
  frameworks_assessed: number;
  average_compliance: number;
  certifications_held: number;
  upcoming_audits: number;
  critical_gaps: number;
  remediation_progress: number;
  recent_assessments: ComplianceAssessmentOverview[];
  framework_status: FrameworkStatusOverview[];
}

export interface ComplianceAssessmentOverview {
  framework: string;
  assessment_date: Date;
  compliance_percentage: number;
  status: string;
  critical_findings: number;
}

export interface FrameworkStatusOverview {
  framework: string;
  compliance_percentage: number;
  last_assessment: Date;
  next_assessment: Date;
  status: string;
}

export interface FrameworkIntegrationMetrics {
  integrated_frameworks: IntegratedFramework[];
  api_health: APIHealthMetrics[];
  data_sync_status: DataSyncStatus[];
  automation_level: number;
  error_rate: number;
  last_sync: Date;
}

export interface IntegratedFramework {
  name: string;
  type: 'attack-simulation' | 'threat-intelligence' | 'vulnerability-management' | 'compliance';
  version: string;
  status: 'active' | 'inactive' | 'error';
  last_activity: Date;
  success_rate: number;
}

export interface APIHealthMetrics {
  framework: string;
  endpoint: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time: number;
  error_rate: number;
  last_check: Date;
}

export interface DataSyncStatus {
  framework: string;
  data_type: string;
  last_sync: Date;
  records_synced: number;
  sync_status: 'success' | 'partial' | 'failed';
  next_sync: Date;
}