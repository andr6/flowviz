# Phase 2: Threat Intelligence Enrichment Engine - Progress Report

**Started:** October 13, 2025
**Status:** 🔄 **In Progress** (20% Complete)

---

## Executive Summary

Building a comprehensive IOC (Indicator of Compromise) enrichment system with multiple threat intelligence providers, ML-powered confidence scoring, and intelligent aggregation.

### What's Complete ✅

1. **Base Provider Architecture** (306 lines)
   - Abstract base class for all providers
   - Built-in rate limiting (per-second & daily)
   - Automatic retry logic with exponential backoff
   - Timeout handling
   - Event-driven architecture
   - Statistics tracking

2. **VirusTotal Provider** (319 lines)
   - Complete API v3 integration
   - Supports: IP, Domain, URL, Hash enrichment
   - Reputation scoring (0-100 scale)
   - Verdict classification (benign/suspicious/malicious/unknown)
   - Confidence calculation based on scan coverage
   - Related indicator extraction
   - Quota monitoring

### What's Next 🚧

| Component | Status | Priority | Est. Lines |
|-----------|--------|----------|------------|
| AbuseIPDB Provider | Pending | High | ~250 |
| Shodan Provider | Pending | High | ~280 |
| AlienVault OTX Provider | Pending | Medium | ~300 |
| Aggregation Engine | Pending | High | ~400 |
| ML Confidence Scorer | Pending | High | ~350 |
| Database Schema | Pending | High | ~200 |
| API Endpoints | Pending | High | ~500 |
| React UI Components | Pending | Medium | ~600 |
| Documentation | Pending | Medium | ~400 |

---

## Architecture Overview

### Provider Pattern

```
BaseProvider (Abstract)
├── VirusTotal Provider ✅
├── AbuseIPDB Provider 🚧
├── Shodan Provider 🚧
├── AlienVault OTX Provider 🚧
└── Custom Providers (Extensible)
```

### Data Flow

```
IOC Input
    ↓
Multi-Provider Orchestrator
    ├→ VirusTotal API
    ├→ AbuseIPDB API
    ├→ Shodan API
    └→ AlienVault OTX API
    ↓
Raw Results
    ↓
Aggregation Engine
    ├→ Normalize data formats
    ├→ Resolve conflicts
    └→ Calculate consensus
    ↓
ML Confidence Scorer
    ├→ Ensemble model
    ├→ Historical accuracy
    └→ Source reliability
    ↓
Enriched IOC
    ├→ Database Cache
    ├→ API Response
    └→ UI Display
```

---

## Completed Components - Technical Details

### 1. BaseProvider Class

**File:** `src/features/ioc-enrichment/providers/BaseProvider.ts`

**Key Features:**
- **Rate Limiting:**
  - Per-second limits
  - Daily quotas
  - Automatic blocking when exceeded
  - Reset time tracking

- **Retry Logic:**
  - Configurable retry attempts
  - Exponential backoff (2^n seconds)
  - Last error tracking

- **Timeout Handling:**
  - Configurable timeout per provider
  - Promise.race() implementation
  - Graceful failure

- **Event System:**
  - `enrichmentSuccess`
  - `enrichmentError`
  - `providerSuccess`
  - `providerError`

**Configuration Interface:**
```typescript
interface ProviderConfig {
  apiKey?: string;
  apiUrl?: string;
  enabled: boolean;
  rateLimit: {
    requestsPerSecond: number;
    requestsPerDay: number;
  };
  timeout: number;
  retryAttempts: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}
```

**Usage Example:**
```typescript
const provider = new VirusTotalProvider({
  apiKey: process.env.VIRUSTOTAL_API_KEY!,
  enabled: true,
  rateLimit: {
    requestsPerSecond: 4,
    requestsPerDay: 500
  },
  timeout: 30000,
  retryAttempts: 2
});

const result = await provider.enrich({
  ioc: '8.8.8.8',
  iocType: 'ip'
});
```

---

### 2. VirusTotal Provider

**File:** `src/features/ioc-enrichment/providers/VirusTotalProvider.ts`

**API Integration:**
- VirusTotal API v3
- Supports Free & Premium tiers
- Automatic rate limit detection

**Supported IOC Types:**
- ✅ IP Addresses
- ✅ Domains
- ✅ URLs (base64-encoded IDs)
- ✅ File Hashes (MD5, SHA1, SHA256)

**Enrichment Data:**
```typescript
{
  reputation: {
    score: 85,              // 0-100 (higher = worse)
    verdict: 'malicious',   // benign/suspicious/malicious/unknown
    confidence: 0.92        // 0-1 based on scan coverage
  },
  metadata: {
    lastAnalysisDate: '2025-10-13T12:00:00Z',
    lastAnalysisStats: {
      malicious: 45,
      suspicious: 5,
      undetected: 20,
      harmless: 0
    },
    country: 'US',
    asn: 15169,
    asOwner: 'Google LLC'
  },
  relatedIndicators: [
    { type: 'domain', value: 'example.com', relationship: 'resolves_to' }
  ],
  tags: ['malware', 'trojan', 'backdoor'],
  references: ['https://www.virustotal.com/gui/ip-address/8.8.8.8']
}
```

**Special Features:**
- **Reputation Scoring:** Weighted calculation using detection rate
- **Verdict Logic:**
  - `malicious`: 5+ detections
  - `suspicious`: 1-4 malicious or 3+ suspicious
  - `benign`: Scanned by 10+ engines, 0 malicious
  - `unknown`: Insufficient data

- **Confidence Calculation:**
  - Based on number of scanning engines
  - Max confidence at 70+ engines
  - Formula: `min(totalEngines / 70, 1)`

- **Quota Monitoring:**
  ```typescript
  const quota = await provider.getQuota();
  // { daily: { allowed: 500, used: 247 }, monthly: { ... } }
  ```

**Error Handling:**
- 404: IOC not found
- 429: Rate limit exceeded
- 401: Invalid API key
- Automatic retries with backoff

---

## Next Steps (Detailed)

### 3. AbuseIPDB Provider (Priority: High)

**Purpose:** IP reputation and abuse reporting database

**API:** https://www.abuseipdb.com/api/v2

**Supported IOC Types:**
- IP addresses only

**Key Metrics:**
- Abuse Confidence Score (0-100)
- Total reports
- Recent report count
- Country, ISP, usage type
- Is whitelisted
- Last reported date

**Implementation Plan:**
```typescript
class AbuseIPDBProvider extends BaseProvider {
  async enrichIOC(request: EnrichmentRequest): Promise<EnrichmentResponse> {
    // 1. Validate IP format
    // 2. Call /check endpoint
    // 3. Parse abuseConfidenceScore
    // 4. Normalize to reputation format
    // 5. Return enrichment data
  }
}
```

**Rate Limits (Free Tier):**
- 1,000 requests/day
- No per-second limit documented

---

### 4. Shodan Provider (Priority: High)

**Purpose:** Internet-connected device search engine and port scanner

**API:** https://api.shodan.io

**Supported IOC Types:**
- IP addresses
- Domains (via DNS)

**Key Metrics:**
- Open ports and services
- Vulnerabilities (CVEs)
- OS detection
- Organization/ISP
- Geolocation
- Hostnames
- SSL certificates

**Implementation Plan:**
```typescript
class ShodanProvider extends BaseProvider {
  async enrichIOC(request: EnrichmentRequest): Promise<EnrichmentResponse> {
    // 1. Call /shodan/host/{ip}
    // 2. Extract ports, services, vulns
    // 3. Build technical analysis data
    // 4. Calculate risk score based on vulns
    // 5. Return enrichment data
  }
}
```

**Rate Limits:**
- Free: 1 query/second
- Developer: 20 queries/second

---

### 5. Aggregation Engine (Priority: High)

**Purpose:** Combine results from multiple providers into single enriched IOC

**Features:**
- **Normalization:** Convert provider-specific formats to common schema
- **Conflict Resolution:** Handle disagreements between providers
- **Consensus Calculation:** Weighted voting for verdicts
- **Confidence Aggregation:** Combine confidence scores
- **Related Indicator Merging:** Deduplicate and merge relationships

**Algorithm:**
```
1. Collect all provider results
2. For each data field:
   a. If all agree → use value
   b. If disagree → weighted vote (provider reliability)
   c. If missing from some → use available data
3. Calculate consensus reputation:
   - weightedScore = Σ(providerScore × reliability)
   - consensus = weightedScore / totalWeight
4. Determine final verdict based on thresholds
5. Calculate aggregate confidence
```

**Implementation Sketch:**
```typescript
class AggregationEngine {
  aggregate(results: EnrichmentResponse[]): AggregatedIOC {
    const verdicts = this.collectVerdicts(results);
    const consensus = this.calculateConsensus(verdicts);
    const relatedIndicators = this.mergeRelatedIndicators(results);

    return {
      consensus,
      providerResults: results,
      relatedIndicators,
      metadata: this.mergeMetadata(results)
    };
  }
}
```

---

### 6. ML Confidence Scorer (Priority: High)

**Purpose:** Machine learning-based confidence scoring using historical accuracy

**Features:**
- **Ensemble Model:** Combine multiple algorithms
- **Provider Reliability Tracking:** Learn from historical accuracy
- **Temporal Patterns:** Factor in data freshness
- **Anomaly Detection:** Flag unusual patterns

**ML Models:**
1. **Random Forest:** Classification (benign/suspicious/malicious)
2. **Logistic Regression:** Confidence probability
3. **Isolation Forest:** Anomaly detection

**Features for Training:**
- Provider reputation score
- Number of detections
- Recency of data
- Provider historical accuracy
- IOC type
- Related indicator count
- Geographic patterns

**Implementation Approach:**
```typescript
class MLConfidenceScorer {
  private models: {
    classifier: RandomForestClassifier;
    confidence: LogisticRegression;
    anomaly: IsolationForest;
  };

  async score(enrichedIOC: AggregatedIOC): Promise<MLScore> {
    const features = this.extractFeatures(enrichedIOC);

    const classification = await this.models.classifier.predict(features);
    const confidenceProb = await this.models.confidence.predict(features);
    const isAnomaly = await this.models.anomaly.predict(features);

    return {
      verdict: classification,
      confidence: confidenceProb,
      anomaly: isAnomaly,
      explainability: this.explainPrediction(features, classification)
    };
  }
}
```

---

### 7. Database Schema (Priority: High)

**Tables:**

```sql
-- Enrichment results cache
CREATE TABLE ioc_enrichments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ioc_value VARCHAR(2048) NOT NULL,
    ioc_type VARCHAR(50) NOT NULL,

    -- Aggregated results
    reputation_score INTEGER, -- 0-100
    verdict VARCHAR(50), -- benign/suspicious/malicious/unknown
    confidence FLOAT, -- 0-1

    -- Provider results (JSONB)
    provider_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    related_indicators JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- ML scoring
    ml_verdict VARCHAR(50),
    ml_confidence FLOAT,
    ml_features JSONB,

    -- Timestamps
    enriched_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    last_updated TIMESTAMP DEFAULT NOW(),

    -- Indexing
    UNIQUE(ioc_value, ioc_type),
    INDEX idx_ioc_verdict (verdict),
    INDEX idx_ioc_score (reputation_score DESC),
    INDEX idx_enriched_at (enriched_at DESC),
    INDEX idx_expires_at (expires_at)
);

-- Provider statistics
CREATE TABLE enrichment_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(100) UNIQUE NOT NULL,

    -- Statistics
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    avg_response_time FLOAT, -- milliseconds

    -- Rate limiting
    daily_requests INTEGER DEFAULT 0,
    daily_limit INTEGER,
    last_reset TIMESTAMP DEFAULT NOW(),

    -- Reliability tracking (for ML)
    accuracy_score FLOAT DEFAULT 0.5, -- 0-1
    false_positive_rate FLOAT,
    false_negative_rate FLOAT,

    -- Configuration
    enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}'::jsonb,

    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enrichment jobs (for bulk processing)
CREATE TABLE enrichment_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ioc_ids UUID[] NOT NULL,
    provider_names VARCHAR(100)[] NOT NULL,

    status VARCHAR(50) DEFAULT 'queued', -- queued/running/completed/failed
    priority VARCHAR(20) DEFAULT 'normal',

    progress JSONB DEFAULT '{"total": 0, "completed": 0, "failed": 0}'::jsonb,
    results JSONB DEFAULT '[]'::jsonb,
    errors JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    INDEX idx_job_status (status),
    INDEX idx_job_created (created_at DESC)
);
```

---

### 8. API Endpoints (Priority: High)

**Endpoints to Implement:**

```
POST   /api/ioc/enrich          - Enrich single IOC
POST   /api/ioc/enrich/bulk     - Enrich multiple IOCs
GET    /api/ioc/enrichment/:id  - Get cached enrichment
DELETE /api/ioc/enrichment/:id  - Clear cache
GET    /api/ioc/jobs/:id        - Get job status
POST   /api/ioc/jobs/:id/cancel - Cancel job
GET    /api/providers           - List providers
GET    /api/providers/:name     - Get provider stats
POST   /api/providers/:name/test - Test provider connection
```

---

### 9. React UI Components (Priority: Medium)

**Components to Build:**

1. **IOCEnrichmentPanel** - Main enrichment interface
2. **ProviderStatusGrid** - Show all provider statuses
3. **EnrichmentResultsCard** - Display enrichment data
4. **ReputationScoreGauge** - Visual reputation score
5. **RelatedIndicatorsGraph** - Network graph of relationships
6. **ProviderComparisonTable** - Compare provider results
7. **EnrichmentHistoryTimeline** - Show enrichment history

---

## Timeline Estimate

| Phase | Duration | Components |
|-------|----------|------------|
| **Phase 2.1** | 2 days | Complete all provider adapters |
| **Phase 2.2** | 1 day | Aggregation engine |
| **Phase 2.3** | 2 days | ML confidence scorer |
| **Phase 2.4** | 1 day | Database schema + migration |
| **Phase 2.5** | 2 days | API endpoints |
| **Phase 2.6** | 2 days | React UI components |
| **Phase 2.7** | 1 day | Testing + documentation |
| **Total** | **11 days** | Full Phase 2 completion |

---

## Current Statistics

| Metric | Count |
|--------|-------|
| **Files Created** | 2 |
| **Lines of Code** | 625 |
| **Providers Complete** | 1/4 (25%) |
| **Overall Progress** | 20% |

---

## Next Immediate Action

**Recommended:** Complete the remaining 3 provider adapters before moving to aggregation. This ensures we have all data sources available for testing the aggregation logic.

**Command to continue:**
```bash
# I can create the remaining providers:
# 1. AbuseIPDBProvider.ts (~250 lines)
# 2. ShodanProvider.ts (~280 lines)
# 3. AlienVaultOTXProvider.ts (~300 lines)
```

---

**Status:** Ready to continue with remaining provider implementations.
**Blocking Issues:** None
**Dependencies:** API keys needed for testing (can use mock data initially)

