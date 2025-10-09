// IOC/IOA Types and Interfaces

export interface IOCBase {
  id: string;
  type: IOCType;
  value: string;
  confidence: 'low' | 'medium' | 'high';
  source: IOCSource;
  sourceLocation?: string; // Where in the source it was found
  context?: string; // Surrounding context
  firstSeen: Date;
  lastSeen: Date;
  tags: string[];
  description?: string;
  malicious?: boolean;
  tlp?: 'WHITE' | 'GREEN' | 'AMBER' | 'RED';
}

export type IOCType = 
  // Network IOCs
  | 'ipv4'
  | 'ipv6' 
  | 'domain'
  | 'url'
  | 'email'
  | 'user-agent'
  | 'asn'
  
  // File IOCs
  | 'md5'
  | 'sha1'
  | 'sha256'
  | 'sha512'
  | 'ssdeep'
  | 'imphash'
  | 'pehash'
  | 'filename'
  | 'filepath'
  | 'mutex'
  | 'service'
  
  // Registry IOCs
  | 'registry-key'
  | 'registry-value'
  
  // Process IOCs
  | 'process-name'
  | 'command-line'
  | 'pid'
  
  // Certificate IOCs
  | 'certificate-serial'
  | 'certificate-thumbprint'
  
  // YARA Rules
  | 'yara-rule'
  
  // CVEs and Vulnerabilities
  | 'cve'
  | 'vulnerability'
  
  // Custom/Other
  | 'bitcoin-address'
  | 'monero-address'
  | 'credit-card'
  | 'phone-number'
  | 'custom';

export type IOCSource = 'text' | 'image' | 'metadata' | 'extracted';

export interface NetworkIOC extends IOCBase {
  type: 'ipv4' | 'ipv6' | 'domain' | 'url' | 'email' | 'user-agent' | 'asn';
  port?: number;
  protocol?: string;
  geolocation?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  whoisData?: any;
  dnsRecords?: string[];
}

export interface FileIOC extends IOCBase {
  type: 'md5' | 'sha1' | 'sha256' | 'sha512' | 'ssdeep' | 'filename' | 'filepath';
  fileSize?: number;
  fileType?: string;
  compilationTime?: Date;
  imphash?: string;
  pehash?: string;
  entropy?: number;
}

export interface RegistryIOC extends IOCBase {
  type: 'registry-key' | 'registry-value';
  hive?: string;
  dataType?: string;
  data?: string;
}

export interface ProcessIOC extends IOCBase {
  type: 'process-name' | 'command-line' | 'pid';
  parentProcess?: string;
  arguments?: string[];
  workingDirectory?: string;
}

export interface VulnerabilityIOC extends IOCBase {
  type: 'cve' | 'vulnerability';
  cvssScore?: number;
  cvssVector?: string;
  cweId?: string;
  exploitAvailable?: boolean;
  patchAvailable?: boolean;
  affectedSoftware?: string[];
}

export type IOC = NetworkIOC | FileIOC | RegistryIOC | ProcessIOC | VulnerabilityIOC | IOCBase;

// IOA (Indicators of Attack) - Behavioral patterns
export interface IOA {
  id: string;
  name: string;
  description: string;
  category: IOACategory;
  confidence: 'low' | 'medium' | 'high';
  source: IOCSource;
  sourceLocation?: string;
  context?: string;
  mitreAttackId?: string;
  mitreTactic?: string;
  mitreTechnique?: string;
  signatures: IOASignature[];
  relatedIOCs: string[]; // IOC IDs
  firstObserved: Date;
  lastObserved: Date;
  tags: string[];
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
}

export type IOACategory = 
  | 'initial-access'
  | 'execution'
  | 'persistence'
  | 'privilege-escalation'
  | 'defense-evasion'
  | 'credential-access'
  | 'discovery'
  | 'lateral-movement'
  | 'collection'
  | 'command-and-control'
  | 'exfiltration'
  | 'impact';

export interface IOASignature {
  type: 'regex' | 'yara' | 'behavioral' | 'network' | 'file' | 'process';
  pattern: string;
  description: string;
  confidence: number; // 0.0 to 1.0
}

// Combined analysis result
export interface IOCIOAAnalysisResult {
  iocs: IOC[];
  ioas: IOA[];
  summary: {
    totalIOCs: number;
    totalIOAs: number;
    iocsByType: Record<IOCType, number>;
    ioasByCategory: Record<IOACategory, number>;
    confidenceDistribution: Record<string, number>;
    sourceDistribution: Record<IOCSource, number>;
    tlpDistribution?: Record<string, number>;
    severityDistribution: Record<string, number>;
  };
  relationships: IOCIOARelationship[];
  timeline: TimelineEvent[];
  reportMetadata: {
    analysisDate: Date;
    version: string;
    tools: string[];
    sources: string[];
    totalProcessingTime: number; // ms
  };
}

export interface IOCIOARelationship {
  id: string;
  sourceId: string;
  targetId: string;
  sourceType: 'ioc' | 'ioa';
  targetType: 'ioc' | 'ioa';
  relationshipType: RelationshipType;
  confidence: number;
  description?: string;
}

export type RelationshipType = 
  | 'uses'
  | 'indicates'
  | 'communicates-with'
  | 'downloads-from'
  | 'creates'
  | 'modifies'
  | 'deletes'
  | 'executes'
  | 'connects-to'
  | 'related-to'
  | 'part-of'
  | 'derived-from';

export interface TimelineEvent {
  timestamp: Date;
  iocId?: string;
  ioaId?: string;
  event: string;
  description: string;
  source: IOCSource;
}

// Export formats
export interface IOCExportFormat {
  format: 'json' | 'csv' | 'stix' | 'misp' | 'opencti' | 'yara' | 'suricata';
  includeIOCs: boolean;
  includeIOAs: boolean;
  includeRelationships: boolean;
  includeTimeline: boolean;
  tlpLevel?: 'WHITE' | 'GREEN' | 'AMBER' | 'RED';
  confidenceThreshold?: 'low' | 'medium' | 'high';
  customFields?: Record<string, any>;
}

// Configuration for extraction
export interface IOCExtractionConfig {
  enabledExtractors: {
    text: boolean;
    image: boolean;
    metadata: boolean;
  };
  confidence: {
    textRegexMatch: number;
    imageOCR: number;
    aiExtracted: number;
    contextualMatch: number;
  };
  filters: {
    minConfidence: 'low' | 'medium' | 'high';
    excludePrivateIPs: boolean;
    excludePrivateDomains: boolean;
    includeObfuscated: boolean;
    validateHashes: boolean;
  };
  customPatterns: {
    name: string;
    pattern: RegExp;
    type: IOCType;
    description: string;
  }[];
}