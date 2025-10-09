# Threat Correlation Engine - Quick Reference

## 🚀 15-Minute Setup

```bash
# 1. Database (2 min)
psql -U postgres -d threatflow < scripts/migrations/create_threat_correlation_tables.sql

# 2. Dependencies (1 min)
npm install reactflow date-fns

# 3. Environment (1 min)
echo "ENABLE_AUTO_CORRELATION=true" >> .env

# 4. Server integration (5 min)
# Add to server.ts:
import { setupCorrelationRoutes } from './features/threat-correlation/api/correlationRoutes';
setupCorrelationRoutes(app, pool);

# 5. Build (2 min)
npm run build

# 6. Start (1 min)
npm run dev:full

# 7. Verify (1 min)
curl http://localhost:3001/api/correlation/health
```

## 📁 File Locations

```
Database:          scripts/migrations/create_threat_correlation_tables.sql
Types:             src/features/threat-correlation/types/index.ts
Core Service:      src/features/threat-correlation/services/ThreatCorrelationEngine.ts
API Routes:        src/features/threat-correlation/api/correlationRoutes.ts
Components:        src/features/threat-correlation/components/
Integration:       src/features/threat-correlation/integration/flowStorageHooks.ts
Documentation:     docs/COMPLETE_IMPLEMENTATION_GUIDE.md
```

## 🎯 Common Tasks

### Trigger Correlation Analysis
```bash
curl -X POST http://localhost:3001/api/correlation/analyze
```

### Create Campaign
```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Campaign","flowIds":["flow-1"],"severity":"high"}'
```

### List Campaigns
```bash
curl http://localhost:3001/api/campaigns?status=active
```

### Get Campaign Details
```bash
curl http://localhost:3001/api/campaigns/{id}
```

### Get Correlation Matrix
```bash
curl http://localhost:3001/api/correlation/matrix?minScore=0.5
```

### Get Threat Graph
```bash
curl http://localhost:3001/api/campaigns/{id}/graph
```

## 💻 Code Snippets

### Use Correlation Engine
```typescript
import { ThreatCorrelationEngine } from '@/features/threat-correlation';
import { pool } from '@/shared/services/database';

const engine = new ThreatCorrelationEngine(pool);
const result = await engine.analyzeFlowRelationships();
console.log(`Found ${result.correlationsFound} correlations`);
```

### Use Dashboard Component
```typescript
import { CampaignDetectionDashboard } from '@/features/threat-correlation/components';

<CampaignDetectionDashboard
  onCampaignClick={(c) => navigate(`/campaigns/${c.id}`)}
/>
```

### Auto-Trigger on Flow Save
```typescript
import { triggerCorrelationOnFlowSave } from '@/features/threat-correlation/integration/flowStorageHooks';

await saveFlow(flow);
await triggerCorrelationOnFlowSave(flow.id, pool);
```

### Setup Periodic Job
```typescript
import { setupPeriodicCorrelationJob } from '@/features/threat-correlation/integration/flowStorageHooks';

const job = setupPeriodicCorrelationJob(pool, 60); // Every 60 min
```

## 🔍 SQL Queries

### Check Correlations
```sql
SELECT COUNT(*) FROM threat_correlations;
SELECT AVG(correlation_score) FROM threat_correlations;
```

### View Active Campaigns
```sql
SELECT * FROM active_campaigns_summary;
```

### High Confidence Correlations
```sql
SELECT * FROM high_confidence_correlations LIMIT 10;
```

### Campaign Statistics
```sql
SELECT
  status,
  COUNT(*) as count,
  AVG(confidence_score) as avg_confidence
FROM campaigns
GROUP BY status;
```

## 🎨 Component Examples

### Dashboard
```tsx
<CampaignDetectionDashboard
  onCampaignClick={(campaign) => console.log(campaign)}
  onAnalyzeClick={() => console.log('Analyzing...')}
/>
```

### Graph Visualization
```tsx
<ThreatGraphVisualization
  campaignId="campaign-id"
  onNodeClick={(node) => console.log(node)}
/>
```

### Correlation Matrix
```tsx
<CorrelationMatrix
  flowIds={['flow-1', 'flow-2']}
  minScore={0.3}
  onCellClick={(cell) => console.log(cell)}
/>
```

### Timeline
```tsx
<CampaignTimelineView
  campaignId="campaign-id"
  onEventClick={(event) => console.log(event)}
/>
```

## ⚙️ Configuration

### Engine Config
```typescript
{
  minCorrelationScore: 0.3,
  iocMatchWeight: 0.35,
  ttpMatchWeight: 0.30,
  temporalWeight: 0.15,
  infrastructureWeight: 0.20,
  campaignDetectionThreshold: 0.65,
  maxTemporalDistance: 168,
  autoMergeSimilarCampaigns: true,
  campaignMergeThreshold: 0.85
}
```

### Environment Variables
```env
ENABLE_AUTO_CORRELATION=true
RUN_INITIAL_CORRELATION_ANALYSIS=false
CORRELATION_MIN_SCORE=0.3
CORRELATION_CAMPAIGN_THRESHOLD=0.65
CORRELATION_MAX_TEMPORAL_DISTANCE=168
CORRELATION_RETENTION_DAYS=90
```

## 🐛 Quick Troubleshooting

### Issue: No correlations found
```bash
# Check flows
psql -d threatflow -c "SELECT COUNT(*) FROM saved_flows;"

# Lower threshold
# In config: minCorrelationScore: 0.2
```

### Issue: Campaigns not detected
```bash
# Lower threshold
# In config: campaignDetectionThreshold: 0.5

# Check existing correlations
psql -d threatflow -c "SELECT AVG(correlation_score) FROM threat_correlations;"
```

### Issue: Graph not rendering
```bash
# Check React Flow
npm list reactflow

# Reinstall if needed
npm install --save reactflow
npm run build
```

### Issue: API 404 errors
```bash
# Verify routes setup in server.ts
grep "setupCorrelationRoutes" server.ts

# Check server logs
npm run server
```

## 📊 Health Check

```bash
# API health
curl http://localhost:3001/api/correlation/health

# Database check
psql -d threatflow -c "\dt threat_*"

# Check background jobs
ps aux | grep "node.*server"
```

## 🚨 Emergency Commands

### Stop Background Jobs
```typescript
// In server.ts
clearInterval(correlationJob);
```

### Clean Old Data
```typescript
import { cleanupOldCorrelations } from './integration/flowStorageHooks';
await cleanupOldCorrelations(pool, 90); // Keep 90 days
```

### Force Reanalysis
```typescript
import { batchAnalyzeAllFlows } from './integration/flowStorageHooks';
await batchAnalyzeAllFlows(pool, 100);
```

## 📞 Get Help

1. Check logs: `npm run server` (look for `[Correlation]` messages)
2. Review docs: `docs/COMPLETE_IMPLEMENTATION_GUIDE.md`
3. Check database: `psql -d threatflow`
4. Test API: `curl http://localhost:3001/api/correlation/health`

## 🎓 Key Concepts

- **Correlation** - Relationship between two flows
- **Campaign** - Group of related flows
- **IOC** - Indicator of Compromise (IP, domain, hash, etc.)
- **TTP** - Tactics, Techniques, and Procedures (MITRE ATT&CK)
- **Confidence Score** - 0.0 to 1.0 (higher = more confident)

## 📈 Performance Tips

1. Use batch processing for large datasets
2. Enable periodic jobs for automatic analysis
3. Set appropriate thresholds to reduce noise
4. Use materialized views for reporting
5. Monitor with `getCorrelationStatistics()`

## 🎯 Success Metrics

- **Correlations Found** - Higher = better detection
- **Average Score** - 0.6-0.8 is typical
- **Active Campaigns** - Indicates ongoing threats
- **Detection Time** - Should be < 5 seconds

---

**Quick Start**: Copy-paste commands above ⬆️
**Full Guide**: See `docs/COMPLETE_IMPLEMENTATION_GUIDE.md`
**Support**: Check logs and documentation first
