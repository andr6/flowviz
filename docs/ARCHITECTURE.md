# ThreatFlow Extensions Architecture

This document outlines the technical architecture for five high-priority ThreatFlow extensions.

## Table of Contents
1. [Automated Playbook Generator](#1-automated-playbook-generator)
2. [Threat Intelligence Enrichment Engine](#2-threat-intelligence-enrichment-engine)
3. [Attack Simulation Orchestrator](#3-attack-simulation-orchestrator)
4. [Threat Campaign Correlator](#4-threat-campaign-correlator)
5. [Executive Risk Dashboard](#5-executive-risk-dashboard)

---

## 1. Automated Playbook Generator

### Overview
Converts attack flow visualizations into actionable incident response playbooks with detection queries, containment procedures, and remediation steps.

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    ThreatFlow Core                          │
│  (Attack Flow Visualization + MITRE ATT&CK Mapping)        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Playbook Generation Pipeline                    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Technique  │→ │  Detection   │→ │   Playbook   │     │
│  │   Analyzer   │  │   Generator  │  │   Builder    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ D3FEND       │  │ Sigma Rule   │  │  Template    │     │
│  │ Mappings     │  │ Library      │  │  Engine      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Output Formats                            │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   PDF    │  │   DOCX   │  │   JSON   │  │  JIRA    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1.1 Technique Analyzer
**Purpose:** Extracts MITRE ATT&CK techniques from flow and maps to defensive controls

**Inputs:**
- Flow data (nodes + edges)
- MITRE ATT&CK technique IDs
- D3FEND mappings

**Outputs:**
- Prioritized technique list
- Defensive countermeasures per technique
- Risk scores

**Implementation:**
```typescript
interface TechniqueAnalysis {
  techniqueId: string;
  techniqueName: string;
  tactics: string[];
  riskScore: number; // 0-100
  defensiveCountermeasures: D3FENDControl[];
  dependencies: string[]; // Prerequisite techniques
  impactedAssets: string[];
}

class TechniqueAnalyzer {
  analyze(flow: FlowData): TechniqueAnalysis[];
  calculateRiskScore(technique: MitreTechnique): number;
  mapToD3FEND(techniqueId: string): D3FENDControl[];
  identifyDependencies(flow: FlowData): Map<string, string[]>;
}
```

#### 1.2 Detection Generator
**Purpose:** Creates platform-specific detection rules from techniques

**Rule Libraries:**
- Sigma (universal format)
- Elastic KQL
- Splunk SPL
- Microsoft Defender ATP KQL
- Chronicle YARA-L

**Implementation:**
```typescript
interface DetectionQuery {
  technique: string;
  format: 'Sigma' | 'KQL' | 'SPL' | 'YARA-L';
  query: string;
  platforms: string[];
  confidence: number;
  falsePositiveRate: 'low' | 'medium' | 'high';
  dataSource: string; // Windows Event Logs, Sysmon, etc.
}

class DetectionGenerator {
  async generateQueries(technique: MitreTechnique): Promise<DetectionQuery[]>;
  fetchSigmaRule(techniqueId: string): Promise<string>;
  convertSigmaToFormat(sigma: string, format: string): string;
  optimizeForEnvironment(query: DetectionQuery, env: Environment): DetectionQuery;
}
```

#### 1.3 Playbook Builder
**Purpose:** Assembles complete playbook with all sections

**Playbook Structure:**
1. **Executive Summary** - High-level overview
2. **Detection & Triage** - How to find the threat
3. **Containment** - Stop the spread
4. **Eradication** - Remove threat completely
5. **Recovery** - Restore services
6. **Post-Incident** - Lessons learned

**Implementation:**
```typescript
interface Playbook {
  metadata: PlaybookMetadata;
  executiveSummary: ExecutiveSummary;
  sections: PlaybookSection[];
  timeline: EstimatedTimeline;
  resources: RequiredResources;
}

interface PlaybookSection {
  phase: 'Detection' | 'Containment' | 'Eradication' | 'Recovery' | 'Post-Incident';
  steps: PlaybookStep[];
  estimatedDuration: string;
  requiredSkills: string[];
  tools: string[];
}

interface PlaybookStep {
  order: number;
  title: string;
  description: string;
  actions: Action[];
  successCriteria: string[];
  rollbackProcedure?: string;
  automation?: AutomationScript;
}

class PlaybookBuilder {
  build(analysis: TechniqueAnalysis[], queries: DetectionQuery[]): Playbook;
  generateExecutiveSummary(flow: FlowData): ExecutiveSummary;
  createDetectionSection(queries: DetectionQuery[]): PlaybookSection;
  createContainmentSection(techniques: TechniqueAnalysis[]): PlaybookSection;
  estimateTimeline(playbook: Playbook): EstimatedTimeline;
}
```

### Data Flow

```
1. User selects attack flow visualization
2. Extract techniques → TechniqueAnalyzer
3. For each technique:
   a. Fetch Sigma rules from repository
   b. Convert to target SIEM format
   c. Add to detection section
4. Map techniques to D3FEND controls
5. Generate containment/eradication steps
6. Assemble complete playbook
7. Export to PDF/DOCX/JSON
```

### Database Schema

```sql
-- Playbook templates
CREATE TABLE playbook_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  category VARCHAR(50), -- ransomware, phishing, etc.
  sections JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Generated playbooks
CREATE TABLE playbooks (
  id UUID PRIMARY KEY,
  flow_id UUID REFERENCES flows(id),
  template_id UUID REFERENCES playbook_templates(id),
  content JSONB,
  format VARCHAR(20), -- pdf, docx, json
  generated_by UUID REFERENCES users(id),
  created_at TIMESTAMP
);

-- Detection queries cache
CREATE TABLE detection_queries (
  id UUID PRIMARY KEY,
  technique_id VARCHAR(20), -- T1055
  format VARCHAR(20),
  query TEXT,
  confidence FLOAT,
  false_positive_rate VARCHAR(20),
  created_at TIMESTAMP,
  INDEX idx_technique (technique_id)
);
```

### API Endpoints

```typescript
// Generate playbook from flow
POST /api/playbooks/generate
Request: {
  flowId: string;
  options: {
    format: 'pdf' | 'docx' | 'json';
    includeDetectionQueries: boolean;
    includeAutomation: boolean;
    siemPlatform: 'elastic' | 'splunk' | 'sentinel';
  }
}
Response: {
  playbookId: string;
  downloadUrl: string;
  preview: PlaybookPreview;
}

// Get playbook by ID
GET /api/playbooks/:id

// List user playbooks
GET /api/playbooks?userId=xxx&limit=20

// Export playbook
GET /api/playbooks/:id/export?format=pdf
```

---

## 2. Threat Intelligence Enrichment Engine

### Overview
Real-time enrichment of extracted IOCs with reputation data, geolocation, and threat intelligence feeds.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    IOC Extraction                            │
│              (From ThreatFlow Analysis)                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Enrichment Orchestrator                         │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ VirusTotal│ │ AbuseIPDB│ │  Shodan  │ │  AlienVault│  │
│  │ Enricher  │ │ Enricher │ │ Enricher │ │  OTX       │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│        │              │              │              │        │
│        └──────────────┴──────────────┴──────────────┘        │
│                            │                                 │
│                            ▼                                 │
│                  ┌──────────────────┐                       │
│                  │   Aggregator     │                       │
│                  │  (Deduplicate +  │                       │
│                  │   Normalize)     │                       │
│                  └──────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                ML Confidence Scorer                          │
│   (Ensemble model: Random Forest + XGBoost + Rules)        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Enriched IOC Database                           │
│         (Redis cache + PostgreSQL persistent)               │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 2.1 Enricher Adapters
**Purpose:** Unified interface to multiple threat intel sources

**Implementation:**
```typescript
interface EnrichmentProvider {
  name: string;
  apiKey: string;
  rateLimit: number; // requests per minute
  cost: number; // per query
}

interface EnrichmentResult {
  provider: string;
  ioc: string;
  iocType: 'ip' | 'domain' | 'hash' | 'email' | 'url';
  data: Record<string, any>;
  timestamp: Date;
  confidence: number;
}

abstract class BaseEnricher {
  abstract enrich(ioc: string, type: string): Promise<EnrichmentResult>;
  protected async makeRequest(url: string): Promise<any>;
  protected handleRateLimit(): Promise<void>;
  protected normalizeResponse(raw: any): EnrichmentResult;
}

class VirusTotalEnricher extends BaseEnricher {
  async enrich(ioc: string, type: string): Promise<EnrichmentResult> {
    const response = await this.makeRequest(
      `https://www.virustotal.com/api/v3/${type}s/${ioc}`
    );
    return this.normalizeResponse(response);
  }
}

class AbuseIPDBEnricher extends BaseEnricher {
  async enrich(ioc: string, type: string): Promise<EnrichmentResult> {
    // Only works for IPs
    if (type !== 'ip') return null;

    const response = await this.makeRequest(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${ioc}`
    );
    return this.normalizeResponse(response);
  }
}
```

#### 2.2 Enrichment Orchestrator
**Purpose:** Coordinates parallel enrichment from multiple sources

**Features:**
- Parallel API calls with circuit breaker pattern
- Caching (Redis) to reduce API costs
- Fallback when providers are down
- Cost optimization (free tiers first)

**Implementation:**
```typescript
interface EnrichmentOptions {
  providers: string[]; // ['virustotal', 'abuseipdb']
  maxCostPerIOC: number; // in USD
  timeout: number; // milliseconds
  cacheFirst: boolean;
}

class EnrichmentOrchestrator {
  private enrichers: Map<string, BaseEnricher>;
  private cache: RedisCache;

  async enrichIOC(
    ioc: string,
    type: string,
    options: EnrichmentOptions
  ): Promise<AggregatedEnrichment> {
    // Check cache first
    const cached = await this.cache.get(`enrichment:${ioc}`);
    if (cached && options.cacheFirst) return cached;

    // Enrich from multiple providers in parallel
    const promises = options.providers.map(provider =>
      this.enrichers.get(provider)?.enrich(ioc, type)
        .catch(err => {
          console.error(`${provider} enrichment failed:`, err);
          return null;
        })
    );

    const results = await Promise.all(promises);
    const filtered = results.filter(r => r !== null);

    // Aggregate results
    const aggregated = this.aggregateResults(filtered);

    // Cache for 24 hours
    await this.cache.set(`enrichment:${ioc}`, aggregated, 86400);

    return aggregated;
  }

  private aggregateResults(results: EnrichmentResult[]): AggregatedEnrichment {
    return {
      ioc: results[0].ioc,
      type: results[0].iocType,
      reputation: this.calculateReputation(results),
      sources: results.map(r => r.provider),
      enrichmentData: this.mergeData(results),
      confidenceScore: this.calculateConfidence(results),
      lastUpdated: new Date()
    };
  }
}
```

#### 2.3 ML Confidence Scorer
**Purpose:** Predicts likelihood of true positive using ensemble ML

**Features:**
- Random Forest classifier
- XGBoost gradient boosting
- Rule-based heuristics
- Voting ensemble

**Training Data:**
- Historical IOC analysis (labeled by analysts)
- Community threat feeds
- False positive patterns

**Implementation:**
```typescript
interface ConfidenceFeatures {
  providerCount: number;
  consensusScore: number; // Agreement across providers
  reputationScore: number;
  ageOfIOC: number; // days since first seen
  prevalence: number; // how many sources report it
  contextualRelevance: number; // matches organization's tech stack
  historicalAccuracy: number; // past true positive rate
}

class MLConfidenceScorer {
  private model: EnsembleModel;

  async score(enrichment: AggregatedEnrichment): Promise<number> {
    const features = this.extractFeatures(enrichment);
    const predictions = await this.model.predict(features);
    return predictions.confidence; // 0.0 - 1.0
  }

  private extractFeatures(enrichment: AggregatedEnrichment): ConfidenceFeatures {
    return {
      providerCount: enrichment.sources.length,
      consensusScore: this.calculateConsensus(enrichment),
      reputationScore: enrichment.reputation,
      ageOfIOC: this.calculateAge(enrichment),
      prevalence: this.calculatePrevalence(enrichment),
      contextualRelevance: this.calculateRelevance(enrichment),
      historicalAccuracy: this.getHistoricalAccuracy(enrichment.type)
    };
  }
}
```

### Database Schema

```sql
-- IOC enrichment cache
CREATE TABLE ioc_enrichments (
  id UUID PRIMARY KEY,
  ioc VARCHAR(255) UNIQUE,
  ioc_type VARCHAR(20),
  enrichment_data JSONB,
  confidence_score FLOAT,
  reputation_score INT,
  sources TEXT[],
  first_seen TIMESTAMP,
  last_updated TIMESTAMP,
  INDEX idx_ioc (ioc),
  INDEX idx_confidence (confidence_score)
);

-- Provider API usage tracking
CREATE TABLE api_usage (
  id UUID PRIMARY KEY,
  provider VARCHAR(50),
  endpoint VARCHAR(100),
  requests_count INT,
  cost_usd DECIMAL(10,4),
  date DATE,
  INDEX idx_provider_date (provider, date)
);
```

---

## 3. Attack Simulation Orchestrator

### Overview
Converts attack flows into executable purple team exercises with real-time detection validation.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                Attack Flow Visualization                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            Technique-to-Test Mapper                          │
│   (Maps MITRE techniques to executable tests)               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│           Execution Framework Adapters                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Atomic Red  │  │   Caldera    │  │   Custom     │     │
│  │    Team      │  │  (MITRE)     │  │   Scripts    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Safety Validator                                │
│   (Prevents destructive operations)                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│           Simulation Engine                                  │
│   (Orchestrates execution with timing control)              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├──────────────────────┬──────────────────────┐
                  ▼                      ▼                      ▼
        ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
        │ Target Host  │      │ Target Host  │      │ Target Host  │
        │   (Linux)    │      │  (Windows)   │      │   (MacOS)    │
        └──────────────┘      └──────────────┘      └──────────────┘
                  │                      │                      │
                  └──────────────────────┴──────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│            Detection Validation Engine                       │
│   (Monitors SIEM/EDR for alerts during simulation)         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│             Gap Analysis Report                              │
│   (Shows detected vs. missed techniques)                    │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 3.1 Caldera Integration
**Purpose:** Execute adversary emulations using MITRE's Caldera platform

**Implementation:**
```typescript
interface CalderaOperation {
  id: string;
  name: string;
  adversary: string; // adversary profile
  facts: Record<string, string>; // discovered facts during operation
  agents: CalderaAgent[];
  state: 'pending' | 'running' | 'completed' | 'failed';
}

class CalderaClient {
  private baseUrl: string;
  private apiKey: string;

  async createOperation(
    adversaryProfile: string,
    agents: string[]
  ): Promise<CalderaOperation> {
    const response = await fetch(`${this.baseUrl}/api/v2/operations`, {
      method: 'POST',
      headers: {
        'KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `ThreatFlow-${Date.now()}`,
        adversary: { adversary_id: adversaryProfile },
        auto_close: false,
        state: 'running',
        agents: agents
      })
    });

    return response.json();
  }

  async getOperationStatus(operationId: string): Promise<CalderaOperation> {
    const response = await fetch(
      `${this.baseUrl}/api/v2/operations/${operationId}`,
      { headers: { 'KEY': this.apiKey } }
    );
    return response.json();
  }

  async stopOperation(operationId: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/v2/operations/${operationId}`, {
      method: 'PATCH',
      headers: {
        'KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ state: 'finished' })
    });
  }
}
```

#### 3.2 Detection Validation Engine
**Purpose:** Monitors security tools for alerts during simulation

**Implementation:**
```typescript
interface DetectionEvent {
  timestamp: Date;
  technique: string;
  source: 'SIEM' | 'EDR' | 'IDS' | 'Firewall';
  severity: 'low' | 'medium' | 'high' | 'critical';
  alertId: string;
  matched: boolean; // did it match expected technique?
}

class DetectionValidator {
  private siemClients: Map<string, SIEMClient>;
  private expectedTechniques: Set<string>;

  async startMonitoring(techniques: string[]): Promise<void> {
    this.expectedTechniques = new Set(techniques);

    // Subscribe to real-time alerts from SIEM
    for (const [name, client] of this.siemClients) {
      await client.subscribe(this.handleAlert.bind(this));
    }
  }

  private handleAlert(alert: RawAlert): void {
    const technique = this.extractTechniqueFromAlert(alert);

    if (this.expectedTechniques.has(technique)) {
      this.recordDetection({
        timestamp: new Date(),
        technique,
        source: alert.source,
        severity: alert.severity,
        alertId: alert.id,
        matched: true
      });
    }
  }

  async generateReport(): Promise<DetectionReport> {
    const detected = new Set<string>();
    const missed = new Set<string>();

    for (const technique of this.expectedTechniques) {
      if (this.wasDetected(technique)) {
        detected.add(technique);
      } else {
        missed.add(technique);
      }
    }

    return {
      totalTechniques: this.expectedTechniques.size,
      detected: Array.from(detected),
      missed: Array.from(missed),
      detectionRate: detected.size / this.expectedTechniques.size,
      timeToDetect: this.calculateAverageTimeToDetect()
    };
  }
}
```

### Database Schema

```sql
-- Simulation runs
CREATE TABLE simulation_runs (
  id UUID PRIMARY KEY,
  flow_id UUID REFERENCES flows(id),
  status VARCHAR(20),
  framework VARCHAR(50), -- 'caldera', 'atomic-red-team'
  target_hosts TEXT[],
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Simulation results
CREATE TABLE simulation_results (
  id UUID PRIMARY KEY,
  run_id UUID REFERENCES simulation_runs(id),
  technique_id VARCHAR(20),
  executed BOOLEAN,
  detected BOOLEAN,
  time_to_detect INT, -- seconds
  detection_source VARCHAR(50),
  error_message TEXT,
  INDEX idx_run (run_id)
);
```

---

## 4. Threat Campaign Correlator

### Overview
Uses ML to identify relationships across multiple threat incidents and attribute to campaigns.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│          Multiple ThreatFlow Visualizations                  │
│   (Historical incidents from database)                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Feature Extraction                              │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ IOC        │  │ TTP        │  │ Temporal   │           │
│  │ Extractor  │  │ Embedding  │  │ Features   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                Graph Builder (Neo4j)                         │
│   Nodes: Incidents, IOCs, TTPs, Infrastructure             │
│   Edges: Shares, Uses, Targets, Precedes                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            Clustering Engine                                 │
│   (DBSCAN + Community Detection Algorithms)                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            Campaign Identification                           │
│   (Groups of related incidents)                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│           Attribution Engine                                 │
│   (Links campaigns to known APT groups)                     │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 4.1 TTP Embedding Model
**Purpose:** Convert MITRE techniques into vector representations for similarity comparison

**Implementation:**
```typescript
class TTPEmbedder {
  private model: SentenceBertModel; // sentence-transformers

  async embed(techniques: string[]): Promise<number[][]> {
    // Convert technique IDs to descriptions
    const descriptions = techniques.map(id =>
      this.getTechniqueDescription(id)
    );

    // Generate embeddings
    const embeddings = await this.model.encode(descriptions);
    return embeddings;
  }

  cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (mag1 * mag2);
  }
}
```

#### 4.2 Graph Builder
**Purpose:** Creates knowledge graph of incidents and their relationships

**Implementation:**
```typescript
interface CampaignGraph {
  incidents: Incident[];
  relationships: Relationship[];
}

interface Relationship {
  from: string; // node ID
  to: string;
  type: 'SHARES_IOC' | 'USES_TTP' | 'TARGETS_SECTOR' | 'TEMPORAL_LINK';
  weight: number; // strength of relationship
}

class GraphBuilder {
  private neo4j: Neo4jDriver;

  async buildGraph(incidents: Incident[]): Promise<void> {
    const session = this.neo4j.session();

    try {
      // Create incident nodes
      for (const incident of incidents) {
        await session.run(`
          CREATE (i:Incident {
            id: $id,
            timestamp: $timestamp,
            sector: $sector,
            severity: $severity
          })
        `, incident);

        // Create IOC nodes and relationships
        for (const ioc of incident.iocs) {
          await session.run(`
            MERGE (ioc:IOC {value: $value, type: $type})
            WITH ioc
            MATCH (i:Incident {id: $incidentId})
            CREATE (i)-[:USES_IOC]->(ioc)
          `, { value: ioc.value, type: ioc.type, incidentId: incident.id });
        }

        // Create TTP nodes and relationships
        for (const ttp of incident.techniques) {
          await session.run(`
            MERGE (t:TTP {techniqueId: $techniqueId})
            WITH t
            MATCH (i:Incident {id: $incidentId})
            CREATE (i)-[:EMPLOYS_TTP]->(t)
          `, { techniqueId: ttp, incidentId: incident.id });
        }
      }

      // Create shared IOC relationships
      await session.run(`
        MATCH (i1:Incident)-[:USES_IOC]->(ioc:IOC)<-[:USES_IOC]-(i2:Incident)
        WHERE i1.id < i2.id
        CREATE (i1)-[r:SHARES_IOC {weight: 1.0}]->(i2)
      `);

    } finally {
      await session.close();
    }
  }

  async findCampaigns(): Promise<Campaign[]> {
    const session = this.neo4j.session();

    // Use Louvain community detection
    const result = await session.run(`
      CALL gds.louvain.stream('incidentGraph')
      YIELD nodeId, communityId
      RETURN gds.util.asNode(nodeId).id AS incidentId, communityId
      ORDER BY communityId
    `);

    // Group incidents by community
    const campaigns = new Map<number, string[]>();
    for (const record of result.records) {
      const communityId = record.get('communityId');
      const incidentId = record.get('incidentId');

      if (!campaigns.has(communityId)) {
        campaigns.set(communityId, []);
      }
      campaigns.get(communityId).push(incidentId);
    }

    return Array.from(campaigns.entries()).map(([id, incidents]) => ({
      id,
      incidents,
      size: incidents.length
    }));
  }
}
```

---

## 5. Executive Risk Dashboard

### Overview
Translates technical attack flows into business risk metrics for C-suite audiences.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              Attack Flow Data                                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              FAIR Model Calculator                           │
│   (Factor Analysis of Information Risk)                     │
│                                                              │
│   Risk = LEF × SLEF × CF × A × C × M                       │
│                                                              │
│   LEF  = Loss Event Frequency                               │
│   SLEF = Secondary Loss Event Frequency                     │
│   CF   = Contact Frequency                                  │
│   A    = Probability of Action                              │
│   C    = Capability of Actor                                │
│   M    = Magnitude of Loss                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│           Business Impact Analyzer                           │
│   Maps technical impacts to business processes             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│           Compliance Mapper                                  │
│   Identifies regulatory implications                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Report Generator                                │
│   Creates executive-friendly PDF/PowerPoint                 │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 5.1 FAIR Model Calculator
**Purpose:** Quantifies financial risk using industry-standard methodology

**Implementation:**
```typescript
interface FAIRRiskAssessment {
  annualLossExpectancy: number; // in USD
  singleLossExpectancy: number;
  annualRateOfOccurrence: number;
  confidenceInterval: [number, number]; // 5th-95th percentile
  components: {
    threatEventFrequency: number;
    vulnerabilityProbability: number;
    lossMagnitude: {
      primary: number;
      secondary: number;
    };
  };
}

class FAIRCalculator {
  async calculateRisk(flow: FlowData, org: Organization): Promise<FAIRRiskAssessment> {
    // Threat Event Frequency (TEF)
    const tef = this.estimateTEF(flow.techniques, org.industry);

    // Vulnerability (probability of successful exploit)
    const vulnerability = this.assessVulnerability(
      flow.techniques,
      org.securityPosture
    );

    // Loss Magnitude
    const lossMagnitude = this.calculateLossMagnitude(
      flow.impactedAssets,
      org
    );

    // Annual Loss Expectancy = TEF × Vulnerability × Loss Magnitude
    const ale = tef * vulnerability * lossMagnitude.total;

    // Monte Carlo simulation for confidence intervals
    const simulations = await this.runMonteCarloSimulation(
      tef,
      vulnerability,
      lossMagnitude,
      10000 // iterations
    );

    return {
      annualLossExpectancy: ale,
      singleLossExpectancy: lossMagnitude.total,
      annualRateOfOccurrence: tef * vulnerability,
      confidenceInterval: [
        this.percentile(simulations, 0.05),
        this.percentile(simulations, 0.95)
      ],
      components: {
        threatEventFrequency: tef,
        vulnerabilityProbability: vulnerability,
        lossMagnitude
      }
    };
  }

  private estimateTEF(techniques: string[], industry: string): number {
    // Use historical data or threat intel feeds
    // Returns: events per year
    return this.threatIntelDatabase.getAverageFrequency(techniques, industry);
  }

  private calculateLossMagnitude(
    assets: string[],
    org: Organization
  ): LossMagnitude {
    return {
      productivity: this.calculateProductivityLoss(assets, org),
      reputation: this.calculateReputationalDamage(assets, org),
      legal: this.calculateLegalCosts(assets, org),
      response: this.calculateResponseCosts(assets, org),
      total: 0 // sum of above
    };
  }
}
```

### API Endpoints Summary

```typescript
// Playbook Generation
POST /api/playbooks/generate
GET  /api/playbooks/:id
GET  /api/playbooks/:id/export

// IOC Enrichment
POST /api/iocs/enrich
GET  /api/iocs/:ioc/enrichment
POST /api/iocs/batch-enrich

// Attack Simulation
POST /api/simulations/start
GET  /api/simulations/:id/status
POST /api/simulations/:id/stop
GET  /api/simulations/:id/report

// Campaign Correlation
POST /api/campaigns/analyze
GET  /api/campaigns/:id
GET  /api/campaigns/:id/graph

// Executive Reporting
POST /api/reports/generate
GET  /api/reports/:id
GET  /api/reports/:id/download
```

---

## Technology Stack Summary

### Frontend
- React 18 + TypeScript
- Material-UI for UI components
- React Flow for visualizations
- D3.js for custom charts
- Recharts for dashboard metrics

### Backend
- Node.js + Express
- PostgreSQL (relational data)
- Neo4j (graph data for campaigns)
- Redis (caching + pub/sub)
- Bull (job queue for async tasks)

### ML/AI
- Python microservices
- scikit-learn (classical ML)
- sentence-transformers (embeddings)
- XGBoost (gradient boosting)
- TensorFlow Lite (edge deployment)

### External APIs
- VirusTotal API v3
- AbuseIPDB v2
- Shodan API
- AlienVault OTX
- MITRE ATT&CK Navigator
- Caldera REST API

### Infrastructure
- Docker + Docker Compose
- Kubernetes (production)
- GitHub Actions (CI/CD)
- AWS/Azure/GCP (cloud deployment)

---

## Security Considerations

1. **API Key Management**: Store in HashiCorp Vault or AWS Secrets Manager
2. **Rate Limiting**: Implement per-user and per-endpoint limits
3. **Input Validation**: Sanitize all user inputs
4. **RBAC**: Role-based access control for sensitive features
5. **Audit Logging**: Track all simulation executions
6. **Sandboxing**: Isolate attack simulations in secure environments
7. **Data Encryption**: Encrypt sensitive data at rest and in transit

---

## Next Steps

1. Review architecture with stakeholders
2. Prioritize features for MVP
3. Create detailed implementation plan
4. Build prototypes for validation
5. Define success metrics and KPIs
