export type IOCType = 
  | 'ip_address'
  | 'domain'
  | 'url'
  | 'file_hash'
  | 'email'
  | 'cve'
  | 'registry_key'
  | 'file_path'
  | 'user_agent'
  | 'certificate'
  | 'mutex'
  | 'process_name'
  | 'yara_rule';

export type ThreatLevel = 'benign' | 'suspicious' | 'malicious' | 'critical' | 'unknown';
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'verified';
export type EnrichmentProvider = 
  | 'virustotal'
  | 'shodan'
  | 'abuseipdb'
  | 'urlvoid'
  | 'hybrid_analysis'
  | 'misp'
  | 'otx'
  | 'threatfox'
  | 'malwarebazaar'
  | 'urlhaus'
  | 'circl_hashlookup'
  | 'greynoise'
  | 'censys'
  | 'passivetotal';

export interface IOC {
  id: string;
  value: string;
  type: IOCType;
  firstSeen: Date;
  lastSeen: Date;
  source: string;
  context?: string;
  confidence: ConfidenceLevel;
  tags: string[];
  metadata: {
    extractedFrom?: string;
    campaign?: string;
    family?: string;
    actor?: string;
  };
}

export interface EnrichmentResult {
  iocId: string;
  provider: EnrichmentProvider;
  timestamp: Date;
  success: boolean;
  error?: string;
  data: EnrichmentData;
  cached: boolean;
  cacheTtl?: number;
}

export interface EnrichmentData {
  threatLevel: ThreatLevel;
  confidence: ConfidenceLevel;
  score: number; // 0-100
  reputation: {
    malicious: number;
    suspicious: number;
    harmless: number;
    undetected: number;
  };
  attributes: Record<string, any>;
  relationships: IOCRelationship[];
  timeline: TimelineEvent[];
  geolocation?: GeolocationData;
  whois?: WhoisData;
  certificates?: CertificateData[];
  detections: DetectionResult[];
  sandbox?: SandboxResult;
}

export interface IOCRelationship {
  id: string;
  sourceIOC: string;
  targetIOC: string;
  targetType: IOCType;
  relationType: RelationType;
  confidence: ConfidenceLevel;
  firstSeen: Date;
  lastSeen: Date;
  source: string;
  context?: string;
}

export type RelationType = 
  | 'communicates_with'
  | 'downloads_from'
  | 'resolves_to'
  | 'drops'
  | 'contacts'
  | 'hosted_on'
  | 'similar_to'
  | 'part_of_campaign'
  | 'attributed_to'
  | 'uses_infrastructure';

export interface TimelineEvent {
  timestamp: Date;
  event: string;
  source: string;
  details?: Record<string, any>;
}

export interface GeolocationData {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  asn: string;
  org: string;
  isp: string;
}

export interface WhoisData {
  domain: string;
  registrar: string;
  createdDate: Date;
  updatedDate: Date;
  expiresDate: Date;
  nameservers: string[];
  contacts: {
    registrant?: ContactInfo;
    admin?: ContactInfo;
    tech?: ContactInfo;
  };
}

export interface ContactInfo {
  name: string;
  organization?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface CertificateData {
  serialNumber: string;
  issuer: string;
  subject: string;
  validFrom: Date;
  validTo: Date;
  fingerprint: string;
  algorithm: string;
}

export interface DetectionResult {
  engine: string;
  category: string;
  result: string;
  version: string;
  update: Date;
}

export interface SandboxResult {
  provider: string;
  analysisId: string;
  verdict: string;
  score: number;
  behaviors: BehaviorIndicator[];
  network: NetworkActivity[];
  files: FileActivity[];
  registry: RegistryActivity[];
  mitreTactics: string[];
  mitreAttacks: string[];
}

export interface BehaviorIndicator {
  id: string;
  severity: number;
  confidence: number;
  description: string;
  category: string;
  tactics: string[];
  techniques: string[];
}

export interface NetworkActivity {
  protocol: string;
  source: string;
  destination: string;
  port: number;
  direction: 'inbound' | 'outbound';
  bytes: number;
  packets: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface FileActivity {
  path: string;
  action: 'created' | 'modified' | 'deleted' | 'accessed';
  hash: string;
  size: number;
  timestamp: Date;
}

export interface RegistryActivity {
  key: string;
  value: string;
  action: 'created' | 'modified' | 'deleted';
  data?: string;
  timestamp: Date;
}

export interface EnrichmentConfig {
  providers: {
    [K in EnrichmentProvider]?: ProviderConfig;
  };
  caching: {
    enabled: boolean;
    ttl: number; // seconds
    maxSize: number; // number of cached results
    cleanupInterval: number; // seconds
  };
  rateLimiting: {
    [K in EnrichmentProvider]?: {
      requestsPerMinute: number;
      requestsPerDay: number;
      backoffMultiplier: number;
    };
  };
  scoring: {
    weights: {
      reputation: number;
      detections: number;
      relationships: number;
      timeline: number;
      sandbox: number;
    };
    thresholds: {
      suspicious: number;
      malicious: number;
      critical: number;
    };
  };
}

export interface ProviderConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  timeout: number;
  retries: number;
  priority: number; // 1-10, higher is more priority
  supportedTypes: IOCType[];
}

export interface EnrichmentJob {
  id: string;
  iocs: string[];
  providers: EnrichmentProvider[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
  };
  results: EnrichmentResult[];
  errors: EnrichmentError[];
  userId?: string;
  tags: string[];
}

export interface EnrichmentError {
  iocId: string;
  provider: EnrichmentProvider;
  error: string;
  timestamp: Date;
  retryable: boolean;
  retryCount: number;
}

export interface EnrichmentSummary {
  iocId: string;
  overallScore: number;
  threatLevel: ThreatLevel;
  confidence: ConfidenceLevel;
  providerCount: number;
  lastEnriched: Date;
  keyFindings: string[];
  recommendations: string[];
  riskFactors: RiskFactor[];
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  mitigation?: string;
}

export interface EnrichmentStats {
  totalIOCs: number;
  enrichedIOCs: number;
  enrichmentRate: number;
  providerStats: {
    [K in EnrichmentProvider]?: {
      requests: number;
      successes: number;
      failures: number;
      averageResponseTime: number;
      lastUsed: Date;
    };
  };
  threatDistribution: {
    benign: number;
    suspicious: number;
    malicious: number;
    critical: number;
    unknown: number;
  };
  topThreatTypes: {
    type: IOCType;
    count: number;
    maliciousPercentage: number;
  }[];
  recentActivity: {
    date: Date;
    enrichments: number;
    newThreats: number;
  }[];
}

export interface EnrichmentRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  createdBy: string;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface RuleCondition {
  field: string; // e.g., 'ioc.type', 'enrichment.score', 'provider.virustotal.reputation'
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
  value: string | number | boolean;
}

export interface RuleAction {
  type: 'set_threat_level' | 'add_tag' | 'create_alert' | 'block_ioc' | 'notify_team';
  parameters: Record<string, any>;
}

export interface ThreatContext {
  campaigns: CampaignInfo[];
  actors: ActorInfo[];
  families: MalwareFamilyInfo[];
  techniques: AttackTechnique[];
  attribution: Attribution[];
}

export interface CampaignInfo {
  name: string;
  aliases: string[];
  firstSeen: Date;
  lastSeen: Date;
  targets: string[];
  geography: string[];
  description: string;
  confidence: ConfidenceLevel;
}

export interface ActorInfo {
  name: string;
  aliases: string[];
  type: 'nation_state' | 'cybercriminal' | 'hacktivist' | 'insider';
  country: string;
  motivations: string[];
  capabilities: string[];
  description: string;
  confidence: ConfidenceLevel;
}

export interface MalwareFamilyInfo {
  name: string;
  aliases: string[];
  type: string;
  platforms: string[];
  capabilities: string[];
  description: string;
  yara_rules?: string[];
}

export interface AttackTechnique {
  techniqueId: string; // MITRE ATT&CK ID
  technique: string;
  tactic: string;
  description: string;
  platforms: string[];
  dataSource: string[];
  mitigations: string[];
}

export interface Attribution {
  actor: string;
  campaign?: string;
  confidence: ConfidenceLevel;
  evidence: string[];
  timeline: Date[];
  source: string;
}