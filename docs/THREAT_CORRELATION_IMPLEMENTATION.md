# Advanced Threat Correlation Engine - Implementation Guide

## Overview

The Advanced Threat Correlation Engine automatically correlates IOCs across multiple attack flows to identify coordinated attack campaigns. This feature enables SOC teams to detect patterns that span multiple incidents.

## Implementation Status

### ✅ Completed

1. **Database Schema** (`scripts/migrations/create_threat_correlation_tables.sql`)
   - `threat_correlations` table - stores correlation relationships
   - `campaigns` table - represents detected campaigns
   - `campaign_flows` - junction table linking campaigns to flows
   - `campaign_indicators` - tracks IOCs per campaign
   - `campaign_ttps` - tracks MITRE techniques per campaign
   - `campaign_timeline` - audit trail of campaign events
   - `correlation_analytics` - metrics and analytics
   - Views, indexes, triggers, and functions included

2. **TypeScript Types** (`src/features/threat-correlation/types/index.ts`)
   - Complete type definitions for all entities
   - IOC types, Correlation types, Campaign types
   - Graph and timeline types
   - API request/response types
   - 200+ lines of comprehensive type safety

3. **Core Service** (`src/features/threat-correlation/services/ThreatCorrelationEngine.ts`)
   - Main correlation engine class
   - Flow relationship analysis
   - Campaign detection logic
   - Threat graph building
   - Timeline generation
   - Report export functionality

## Architecture

```
src/features/threat-correlation/
├── types/
│   └── index.ts                    # TypeScript type definitions
├── services/
│   ├── ThreatCorrelationEngine.ts  # Core correlation engine
│   ├── IOCMatcher.ts               # IOC matching algorithms
│   ├── TTPAnalyzer.ts              # TTP pattern recognition
│   └── CampaignDetector.ts         # Campaign detection logic
├── components/
│   ├── CampaignDetectionDashboard.tsx
│   ├── ThreatGraphVisualization.tsx
│   ├── CorrelationMatrix.tsx
│   └── CampaignTimelineView.tsx
└── utils/
    ├── iocMatching.ts              # IOC matching utilities
    ├── ttpSimilarity.ts            # TTP similarity calculations
    └── graphClustering.ts          # Graph clustering algorithms
```

## Key Features

### 1. Cross-Flow IOC Matching
- Weighted scoring based on IOC type (hashes more valuable than IPs)
- Fuzzy matching for similar indicators
- Infrastructure overlap detection (domain families, IP subnets)
- Confidence scoring based on enrichment data

### 2. TTP Pattern Recognition
- MITRE ATT&CK technique similarity
- Tactic-level correlation
- Kill chain phase analysis
- Behavioral pattern matching

### 3. Infrastructure Overlap Detection
- Shared C2 infrastructure
- Domain family analysis
- IP subnet correlation
- Certificate fingerprint matching

### 4. Temporal Correlation
- Attack timing pattern analysis
- Configurable time windows
- Proximity scoring with decay
- Campaign lifecycle tracking

### 5. Campaign Management
- Automatic campaign creation
- Campaign merging for similar patterns
- Severity and confidence scoring
- Actor attribution suggestions
- Affected asset tracking

## Database Schema Highlights

### Threat Correlations Table
```sql
CREATE TABLE threat_correlations (
    id UUID PRIMARY KEY,
    flow_id_1 UUID NOT NULL,
    flow_id_2 UUID NOT NULL,
    correlation_score FLOAT CHECK (0 <= correlation_score <= 1),
    correlation_type VARCHAR(50),
    shared_indicators JSONB,
    detected_at TIMESTAMP
);
```

### Campaigns Table
```sql
CREATE TABLE campaigns (
    id UUID PRIMARY KEY,
    name VARCHAR(200),
    confidence_score FLOAT CHECK (0 <= confidence_score <= 1),
    status VARCHAR(50),  -- active, monitoring, resolved, archived
    severity VARCHAR(20), -- low, medium, high, critical
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    related_flows UUID[],
    shared_ttps TEXT[],
    suspected_actor VARCHAR(100)
);
```

## API Endpoints (To Be Added to server.ts)

### Correlation Analysis
```typescript
POST /api/correlation/analyze
Body: { flowIds?: string[], dateRange?: { start, end }, config?: {} }
Response: CorrelationResult

GET /api/correlation/:id
Response: ThreatCorrelation

GET /api/correlation/matrix
Query: flowIds[], minScore?
Response: CorrelationMatrix
```

### Campaign Management
```typescript
POST /api/campaigns
Body: { name, flowIds, severity, actor?, tags? }
Response: Campaign

GET /api/campaigns
Query: status?, severity?, actor?, tags?
Response: Campaign[]

GET /api/campaigns/:id
Response: Campaign

PUT /api/campaigns/:id
Body: Partial<Campaign>
Response: Campaign

DELETE /api/campaigns/:id
Response: { success: boolean }

POST /api/campaigns/:id/merge
Body: { targetCampaignId }
Response: Campaign

GET /api/campaigns/:id/timeline
Response: CampaignTimeline

GET /api/campaigns/:id/graph
Response: ThreatGraph

GET /api/campaigns/:id/report
Query: format? (json|pdf|html)
Response: CampaignReport
```

### Campaign Analytics
```typescript
GET /api/campaigns/:id/indicators
Response: CampaignIndicator[]

GET /api/campaigns/:id/ttps
Response: CampaignTTP[]

GET /api/campaigns/:id/flows
Response: Flow[]

GET /api/correlation/analytics
Query: dateRange?
Response: CorrelationAnalytics
```

## UI Components

### 1. Campaign Detection Dashboard
- Overview of active campaigns
- Detection statistics
- Recent correlations
- Quick actions (analyze, create campaign)
- Filters (severity, status, date range)

### 2. Threat Graph Visualization
- Interactive force-directed graph
- Campaign as central node
- Connected flows, IOCs, TTPs
- Color-coded by severity/type
- Zoom, pan, filter capabilities
- Node details on click

### 3. Correlation Matrix
- Heatmap showing correlation scores
- Flow vs Flow matrix
- Click to view details
- Sort by score, date, type
- Export as CSV/PNG

### 4. Campaign Timeline View
- Chronological event visualization
- Flow detections
- IOC discoveries
- TTP observations
- Campaign milestones
- Interactive timeline scrubbing

## Configuration

### Engine Configuration
```typescript
{
  minCorrelationScore: 0.3,        // Minimum to consider correlation
  iocMatchWeight: 0.35,            // Weight for IOC matching
  ttpMatchWeight: 0.30,            // Weight for TTP matching
  temporalWeight: 0.15,            // Weight for time proximity
  infrastructureWeight: 0.20,      // Weight for infra overlap
  campaignDetectionThreshold: 0.65, // Threshold for campaign
  maxTemporalDistance: 168,        // Max hours (7 days)
  autoMergeSimilarCampaigns: true,
  campaignMergeThreshold: 0.85
}
```

## Integration Points

### With Existing Features

1. **Flow Storage Service**
   - Hook into save flow events
   - Trigger correlation analysis on new flows
   - Auto-assign flows to campaigns

2. **IOC Extraction**
   - Use extracted IOCs for correlation
   - Enrich IOCs with threat intel
   - Track IOC evolution

3. **MITRE ATT&CK Integration**
   - Use technique IDs for TTP correlation
   - Map to defensive countermeasures
   - Generate coverage reports

4. **Threat Intelligence Feeds**
   - Enrich campaigns with external data
   - Actor attribution from TI feeds
   - Indicator reputation scoring

## Usage Example

```typescript
import { ThreatCorrelationEngine } from '@/features/threat-correlation';
import { pool } from '@/shared/services/database';

// Initialize engine
const engine = new ThreatCorrelationEngine(pool, {
  minCorrelationScore: 0.4,
  campaignDetectionThreshold: 0.7
});

// Analyze correlations
const result = await engine.analyzeFlowRelationships();
console.log(`Found ${result.correlationsFound} correlations`);

// Detect campaigns
const campaigns = await engine.detectCampaigns();
console.log(`Detected ${campaigns.newCampaigns.length} new campaigns`);

// Build threat graph
const graph = await engine.buildThreatGraph(campaignId);

// Generate report
const report = await engine.exportCampaignReport(campaignId);
```

## Next Steps

1. ✅ Database schema created
2. ✅ TypeScript types defined
3. ✅ Core service implemented
4. 🔄 Complete IOC matching algorithms
5. 🔄 Implement TTP pattern recognition
6. ⏳ Create React UI components
7. ⏳ Add API endpoints to server.ts
8. ⏳ Integrate with flow storage
9. ⏳ Add scheduled correlation jobs
10. ⏳ Implement real-time notifications

## Performance Considerations

- Indexes on all foreign keys and query columns
- JSONB indexes for metadata fields
- Materialized views for analytics
- Batch processing for large correlation jobs
- Caching for frequently accessed campaigns
- Pagination for large result sets

## Security Considerations

- RBAC for campaign access
- Audit logging for all operations
- Data retention policies
- Sensitive IOC handling
- Export restrictions for classified data

## Testing Strategy

1. Unit tests for matching algorithms
2. Integration tests for database operations
3. E2E tests for campaign detection
4. Performance tests with large datasets
5. UI component tests with React Testing Library

## Documentation

- API documentation with Swagger/OpenAPI
- User guide for SOC analysts
- Admin guide for configuration
- Developer guide for extensions
- Architecture decision records (ADRs)

---

**Status**: Core implementation complete (3/11 tasks)
**Next Priority**: UI components and API endpoints
**Estimated Time**: 2-3 days for full implementation
