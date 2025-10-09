# Advanced Threat Correlation Engine

> Automatically detect coordinated attack campaigns by correlating IOCs, TTPs, and infrastructure across multiple attack flows.

## 🎯 Overview

The Advanced Threat Correlation Engine analyzes relationships between attack flows to identify patterns that indicate coordinated campaigns. It uses multi-dimensional scoring to detect correlations based on:

- **IOC Overlap** - Shared indicators (IPs, domains, hashes, etc.)
- **TTP Similarity** - Common MITRE ATT&CK techniques
- **Infrastructure Overlap** - Shared C2 servers and domains
- **Temporal Proximity** - Attacks occurring in similar timeframes
- **Malware Family** - Same malware variants
- **Target Overlap** - Common targeted assets

## 📦 Components

```
threat-correlation/
├── types/              # TypeScript type definitions
├── services/           # Core correlation engine
├── utils/              # Matching and scoring algorithms
├── components/         # React UI components
├── api/                # REST API endpoints
└── integration/        # Integration hooks
```

## 🚀 Quick Start

### 1. Setup Database

```bash
psql -U postgres -d threatflow < scripts/migrations/create_threat_correlation_tables.sql
```

### 2. Install Dependencies

```bash
npm install reactflow date-fns
```

### 3. Configure Environment

```env
ENABLE_AUTO_CORRELATION=true
CORRELATION_MIN_SCORE=0.3
CORRELATION_CAMPAIGN_THRESHOLD=0.65
```

### 4. Integrate with Server

```typescript
// server.ts
import { setupCorrelationRoutes } from './features/threat-correlation/api/correlationRoutes';
import { setupPeriodicCorrelationJob } from './features/threat-correlation/integration/flowStorageHooks';

setupCorrelationRoutes(app, pool);
setupPeriodicCorrelationJob(pool, 60); // Every 60 minutes
```

### 5. Add to Navigation

```typescript
import { CampaignDetectionDashboard } from '@/features/threat-correlation/components';

<Route path="/campaigns" element={<CampaignDetectionDashboard />} />
```

## 💡 Usage Examples

### Analyze Correlations

```typescript
import { ThreatCorrelationEngine } from './services/ThreatCorrelationEngine';

const engine = new ThreatCorrelationEngine(pool);
const result = await engine.analyzeFlowRelationships();

console.log(`Found ${result.correlationsFound} correlations`);
```

### Create Campaign

```typescript
const response = await fetch('/api/campaigns', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'APT29 Espionage',
    flowIds: ['flow-1', 'flow-2'],
    severity: 'critical',
    suspectedActor: 'APT29',
  }),
});
```

### Generate Threat Graph

```typescript
const graph = await engine.buildThreatGraph(campaignId);

// graph.nodes: Array of campaigns, flows, IOCs, TTPs, actors
// graph.edges: Relationships between nodes
// graph.metadata: Statistics
```

### Export Report

```typescript
const report = await engine.exportCampaignReport(campaignId);

console.log(report.executiveSummary);
console.log(report.recommendations);
```

## 🎨 UI Components

### CampaignDetectionDashboard

Main dashboard showing all detected campaigns.

```tsx
<CampaignDetectionDashboard
  onCampaignClick={(campaign) => navigate(`/campaigns/${campaign.id}`)}
  onAnalyzeClick={() => triggerAnalysis()}
/>
```

### ThreatGraphVisualization

Interactive force-directed graph visualization.

```tsx
<ThreatGraphVisualization
  campaignId={campaignId}
  onNodeClick={(node) => showNodeDetails(node)}
/>
```

### CorrelationMatrix

Heatmap showing correlation scores between flows.

```tsx
<CorrelationMatrix
  flowIds={flowIds}
  minScore={0.3}
  onCellClick={(cell) => showCorrelation(cell)}
/>
```

### CampaignTimelineView

Chronological visualization of campaign events.

```tsx
<CampaignTimelineView
  campaignId={campaignId}
  onEventClick={(event) => showEventDetails(event)}
/>
```

## 🔌 API Endpoints

### Correlation Analysis
- `POST /api/correlation/analyze` - Trigger correlation analysis
- `GET /api/correlation/:id` - Get specific correlation
- `GET /api/correlation/matrix` - Get correlation matrix
- `GET /api/correlation/analytics` - Get analytics

### Campaign Management
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns` - List campaigns (with filters)
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Archive campaign
- `POST /api/campaigns/:id/merge` - Merge campaigns

### Campaign Data
- `GET /api/campaigns/:id/timeline` - Get timeline
- `GET /api/campaigns/:id/graph` - Get threat graph
- `GET /api/campaigns/:id/report` - Export report
- `GET /api/campaigns/:id/indicators` - Get IOCs
- `GET /api/campaigns/:id/ttps` - Get TTPs
- `GET /api/campaigns/:id/flows` - Get flows

## ⚙️ Configuration

```typescript
const engine = new ThreatCorrelationEngine(pool, {
  minCorrelationScore: 0.3,          // Minimum score to consider
  iocMatchWeight: 0.35,              // IOC weight (35%)
  ttpMatchWeight: 0.30,              // TTP weight (30%)
  temporalWeight: 0.15,              // Temporal weight (15%)
  infrastructureWeight: 0.20,        // Infrastructure weight (20%)
  campaignDetectionThreshold: 0.65,  // Campaign threshold
  maxTemporalDistance: 168,          // 7 days in hours
  autoMergeSimilarCampaigns: true,
  campaignMergeThreshold: 0.85,
});
```

## 🔗 Integration

### Automatic on Flow Save

```typescript
import { triggerCorrelationOnFlowSave } from './integration/flowStorageHooks';

// In your flow save handler
await saveFlow(flow);
await triggerCorrelationOnFlowSave(flow.id, pool);
```

### Periodic Background Job

```typescript
import { setupPeriodicCorrelationJob } from './integration/flowStorageHooks';

// Run every 60 minutes
const job = setupPeriodicCorrelationJob(pool, 60);

// Cleanup on shutdown
process.on('SIGTERM', () => clearInterval(job));
```

### Batch Analysis

```typescript
import { batchAnalyzeAllFlows } from './integration/flowStorageHooks';

// One-time batch analysis of all flows
await batchAnalyzeAllFlows(pool, 100);
```

## 📊 Database Schema

### Main Tables
- `threat_correlations` - Correlation relationships
- `campaigns` - Detected campaigns
- `campaign_flows` - Campaign-flow associations
- `campaign_indicators` - IOCs per campaign
- `campaign_ttps` - MITRE techniques per campaign
- `campaign_timeline` - Campaign events
- `correlation_analytics` - Analytics metrics

### Views
- `active_campaigns_summary` - Active campaign statistics
- `high_confidence_correlations` - High-confidence correlations
- `campaign_indicator_summary` - IOC summaries

## 🧪 Testing

```typescript
// Unit test example
import { calculateJaccardSimilarity } from './utils/iocMatching';

test('calculates Jaccard similarity', () => {
  const set1 = new Set(['a', 'b', 'c']);
  const set2 = new Set(['b', 'c', 'd']);
  expect(calculateJaccardSimilarity(set1, set2)).toBe(0.5);
});

// Integration test example
test('detects correlations', async () => {
  const engine = new ThreatCorrelationEngine(testPool);
  const result = await engine.analyzeFlowRelationships(['flow1', 'flow2']);
  expect(result.correlationsFound).toBeGreaterThan(0);
});
```

## 📈 Performance

- **20+ database indexes** for optimal queries
- **Batch processing** (100 flows at a time)
- **Background jobs** for heavy analysis
- **Efficient algorithms** (optimized for scale)

Expected performance:
- Correlation analysis: ~2-5s for 100 flows
- Campaign detection: ~1-3s
- Graph generation: ~500ms for 50 nodes

## 🔒 Security

- Parameterized queries (SQL injection prevention)
- Input validation on all endpoints
- RBAC-ready authentication hooks
- Rate limiting support
- Audit logging via campaign timeline
- Data retention policies

## 📚 Documentation

- [Complete Implementation Guide](../../../docs/COMPLETE_IMPLEMENTATION_GUIDE.md)
- [Architecture Overview](../../../docs/THREAT_CORRELATION_IMPLEMENTATION.md)
- [API Documentation](./api/README.md)
- [Type Definitions](./types/index.ts)

## 🐛 Troubleshooting

### Correlations Not Found
- Check `ENABLE_AUTO_CORRELATION=true` in `.env`
- Verify minimum flow threshold (default: 5)
- Lower `minCorrelationScore` threshold

### Campaigns Not Detected
- Lower `campaignDetectionThreshold` (try 0.5)
- Ensure flows have overlapping IOCs/TTPs
- Check logs for detection events

### Graph Not Rendering
- Verify `reactflow` is installed
- Check browser console for errors
- Ensure campaign has related flows

## 🚢 Production Checklist

- [ ] Database migration completed
- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Server routes integrated
- [ ] Flow storage hooks added
- [ ] Navigation updated
- [ ] Authentication configured
- [ ] Rate limiting enabled
- [ ] Monitoring setup
- [ ] Backup strategy

## 🎓 Learn More

- [MITRE ATT&CK](https://attack.mitre.org)
- [STIX 2.1](https://docs.oasis-open.org/cti/stix/v2.1/)
- [React Flow](https://reactflow.dev)

## 📝 License

Part of ThreatFlow platform - see main LICENSE

---

**Version:** 1.0.0
**Status:** Production Ready
**Last Updated:** 2025-10-07
