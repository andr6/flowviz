export interface ThreatFeed {
  id: string;
  name: string;
  provider: 'misp' | 'otx' | 'virustotal' | 'crowdstrike' | 'mandiant' | 'custom';
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lastSync?: string;
  totalIndicators: number;
  newIndicators24h: number;
  confidence: 'low' | 'medium' | 'high';
  tags: string[];
  config: ThreatFeedConfig;
  metrics: ThreatFeedMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface ThreatFeedConfig {
  apiKey?: string;
  baseUrl?: string;
  syncInterval: number; // minutes
  indicatorTypes: ThreatIndicatorType[];
  confidenceThreshold: number;
  autoEnrich: boolean;
  customFields?: Record<string, any>;
}

export interface ThreatFeedMetrics {
  totalQueries: number;
  successfulQueries: number;
  errorRate: number;
  avgResponseTime: number;
  lastErrorMessage?: string;
  uptime: number; // percentage
}

export type ThreatIndicatorType = 
  | 'ip-addr' 
  | 'domain-name' 
  | 'url' 
  | 'file-hash-md5' 
  | 'file-hash-sha1' 
  | 'file-hash-sha256' 
  | 'email-addr' 
  | 'registry-key' 
  | 'file-path' 
  | 'process-name' 
  | 'mutex' 
  | 'user-account';

export interface ThreatIndicator {
  id: string;
  feedId: string;
  type: ThreatIndicatorType;
  value: string;
  confidence: number;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  malwareFamily?: string;
  threatType?: string;
  description?: string;
  references: string[];
  firstSeen: string;
  lastSeen: string;
  tlp: 'white' | 'green' | 'amber' | 'red'; // Traffic Light Protocol
  source: string;
  context: ThreatContext;
  enrichment?: ThreatEnrichment;
}

export interface ThreatContext {
  campaign?: string;
  actor?: string;
  country?: string;
  sector?: string[];
  techniques?: string[]; // MITRE ATT&CK technique IDs
  kill_chain_phases?: string[];
  attributes?: Record<string, any>;
}

export interface ThreatEnrichment {
  geolocation?: {
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  reputation?: {
    score: number;
    verdict: 'benign' | 'suspicious' | 'malicious';
    engines: Record<string, string>;
  };
  whois?: {
    registrar: string;
    registrationDate: string;
    expirationDate: string;
    registrant: string;
  };
  dns?: {
    a_records: string[];
    mx_records: string[];
    ns_records: string[];
  };
}

export interface ThreatIntelligenceQuery {
  indicators: string[];
  types?: ThreatIndicatorType[];
  feeds?: string[];
  confidence_min?: number;
  limit?: number;
  include_context?: boolean;
  include_enrichment?: boolean;
}

export interface ThreatIntelligenceResult {
  query: ThreatIntelligenceQuery;
  matches: ThreatIndicatorMatch[];
  totalMatches: number;
  queryTime: number;
  executedAt: string;
}

export interface ThreatIndicatorMatch {
  indicator: ThreatIndicator;
  matchType: 'exact' | 'substring' | 'pattern';
  relevanceScore: number;
  feedName: string;
}