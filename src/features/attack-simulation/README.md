# Attack Simulation & Purple Teaming Integration

Enterprise-grade attack simulation and validation system that automatically converts threat intelligence into executable security tests using platforms like Picus, Atomic Red Team, and CALDERA.

## 🎯 Overview

The Attack Simulation feature enables security teams to:

- **Convert attack flows to simulations** - Automatically transform threat intelligence into executable security tests
- **Multi-platform execution** - Run simulations across Picus, Atomic Red Team, CALDERA, AttackIQ, and custom scripts
- **Validation & scoring** - Measure detection and prevention effectiveness with detailed metrics
- **Gap analysis** - Identify security control gaps and coverage issues
- **Automated remediation** - Generate actionable recommendations with implementation steps
- **Purple team workflows** - Coordinate red and blue team activities effectively

## ✨ Key Features

### 1. Simulation Orchestration
- **4-step wizard** for creating simulation plans
- **Execution modes**: Safe, Simulation, Live, Validation
- **Progress monitoring** with real-time updates
- **Multi-technique execution** with comprehensive logging

### 2. Platform Integrations
- **Picus Security Platform** - Enterprise breach and attack simulation
- **Atomic Red Team** - Open-source MITRE ATT&CK testing
- **MITRE CALDERA** - Adversary emulation and automation
- **AttackIQ** - Breach and attack simulation (planned)
- **Custom Scripts** - Execute custom attack simulations

### 3. Validation Results
- **Detection tracking** - Monitor which techniques were detected
- **Prevention analysis** - Track which techniques were prevented
- **Timing metrics** - Measure detection and response times
- **Evidence collection** - Capture artifacts, logs, and screenshots
- **Filtering & search** - Find results quickly with advanced filters

### 4. Gap Analysis
- **Automated gap detection** - Identify missing controls
- **Severity scoring** - Prioritize gaps by risk level
- **Coverage mapping** - Map controls to defensive capabilities
- **MITRE D3FEND integration** - Link to defensive countermeasures

### 5. Remediation Recommendations
- **AI-generated recommendations** - Actionable remediation steps
- **Implementation tracking** - Step-by-step progress monitoring
- **Resource estimation** - Cost, effort, and complexity analysis
- **Requirement mapping** - Tools, skills, and dependencies

## 🚀 Quick Start

### 1. Database Setup

```bash
# Run migration to create simulation tables
psql -U postgres -d threatflow < scripts/migrations/create_simulation_tables.sql
```

### 2. Configure Platform Integration

```typescript
// Configure Picus integration
const picusConfig = {
  apiUrl: 'https://your-picus-instance.com',
  apiKey: process.env.PICUS_API_KEY,
  tenantId: 'your-tenant-id',
};

// Configure Atomic Red Team
const atomicConfig = {
  atomicsPath: 'C:\\AtomicRedTeam\\atomics',
  powershellPath: 'pwsh',
};

// Configure CALDERA
const calderaConfig = {
  apiUrl: 'http://localhost:8888',
  apiKey: process.env.CALDERA_API_KEY,
};
```

### 3. Add Routes to Server

```typescript
// server.ts
import { setupSimulationRoutes } from './features/attack-simulation/api/simulationRoutes';

setupSimulationRoutes(app, pool);
```

### 4. Add UI Components

```typescript
import {
  SimulationOrchestrator,
  ValidationResultsViewer,
  ControlGapAnalysis,
} from '@/features/attack-simulation/components';

// In your routes
<Route path="/simulations/new" element={<SimulationOrchestrator />} />
<Route path="/simulations/:id/results" element={<ValidationResultsViewer jobId={id} />} />
<Route path="/simulations/:id/gaps" element={<ControlGapAnalysis jobId={id} />} />
```

## 📖 Usage Examples

### Create Simulation from Flow

```typescript
// Convert attack flow to simulation plan
const response = await fetch('/api/simulations/plans/from-flow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    flowId: 'flow-123',
    targetEnvironment: 'staging',
    executionMode: 'safe',
    platform: 'picus',
  }),
});

const { plan, warnings, suggestions } = await response.json();
```

### Execute Simulation

```typescript
// Execute simulation plan
const response = await fetch('/api/simulations/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    planId: plan.id,
    executionMode: 'safe',
    executedBy: 'security-analyst',
  }),
});

const job = await response.json();
```

### Monitor Progress

```typescript
// Get job status
const response = await fetch(`/api/simulations/jobs/${jobId}`);
const job = await response.json();

console.log(`Progress: ${job.progressPercentage}%`);
console.log(`Executed: ${job.techniquesExecuted}/${job.totalTechniques}`);
console.log(`Detection Score: ${job.detectionScore}%`);
```

### Perform Gap Analysis

```typescript
// Run gap analysis
const response = await fetch(`/api/simulations/jobs/${jobId}/gap-analysis`, {
  method: 'POST',
});

const { gaps, summary } = await response.json();

console.log(`Found ${summary.totalGaps} gaps`);
console.log(`Critical: ${summary.criticalGaps}`);
console.log(`High: ${summary.highGaps}`);
```

### Generate Remediation Recommendations

```typescript
// Get recommendations for a gap
const response = await fetch(`/api/simulations/gaps/${gapId}/recommendations`, {
  method: 'POST',
});

const recommendations = await response.json();

recommendations.forEach(rec => {
  console.log(`${rec.title} (Priority: ${rec.priority})`);
  console.log(`Effort: ${rec.estimatedEffortHours}h`);
  console.log(`Steps: ${rec.implementationSteps.length}`);
});
```

## 🔧 Configuration

### Execution Modes

- **Safe Mode** - Shows what would be executed without actually running techniques
- **Simulation Mode** - Runs techniques in isolated test environment
- **Live Mode** - Executes techniques in production (use with extreme caution!)
- **Validation Mode** - Tests detection only without prevention

### Platform Capabilities

| Platform | Safe Mode | Simulation | Live | Detection | Prevention |
|----------|-----------|------------|------|-----------|------------|
| Picus | ✅ | ✅ | ✅ | ✅ | ✅ |
| Atomic Red Team | ✅ | ✅ | ✅ | ✅ | ❌ |
| CALDERA | ✅ | ✅ | ✅ | ✅ | ❌ |
| AttackIQ | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 |
| Custom | ✅ | ✅ | ✅ | ⚙️ | ⚙️ |

✅ = Supported | ❌ = Not Supported | 🔄 = Planned | ⚙️ = Configurable

## 🏗️ Architecture

### Database Schema

```
simulation_plans
├── id (UUID)
├── name
├── flow_id (FK)
├── platform
├── execution_mode
├── techniques (JSONB)
└── ...

simulation_jobs
├── id (UUID)
├── plan_id (FK)
├── status
├── progress_percentage
├── detection_score
├── prevention_score
└── ...

validation_results
├── id (UUID)
├── job_id (FK)
├── technique_id
├── was_detected
├── was_prevented
├── detected_by
└── ...

gap_analysis
├── id (UUID)
├── job_id (FK)
├── gap_type
├── severity
├── risk_score
└── ...

remediation_recommendations
├── id (UUID)
├── gap_id (FK)
├── title
├── implementation_steps (JSONB)
├── priority
└── ...
```

### Service Architecture

```
AttackSimulationService
├── convertFlowToSimulation()
├── executeSimulation()
├── monitorSimulationProgress()
├── performGapAnalysis()
└── generateRemediationRecommendations()

Platform Adapters
├── PicusAdapter
├── AtomicRedTeamAdapter
├── CalderaAdapter
├── AttackIQAdapter (planned)
└── CustomAdapter
```

### API Endpoints

**Simulation Plans**
- `POST /api/simulations/plans` - Create simulation plan
- `POST /api/simulations/plans/from-flow` - Convert flow to plan
- `GET /api/simulations/plans/:id` - Get plan
- `GET /api/simulations/plans` - List plans

**Execution**
- `POST /api/simulations/execute` - Execute simulation
- `GET /api/simulations/jobs/:id` - Get job status
- `POST /api/simulations/jobs/:id/cancel` - Cancel simulation

**Validation**
- `POST /api/picus/validate-flow` - Picus validation
- `GET /api/simulations/jobs/:id/results` - Get results

**Gap Analysis**
- `POST /api/simulations/jobs/:id/gap-analysis` - Perform analysis
- `GET /api/simulations/gaps/:id` - Get gap
- `PATCH /api/simulations/gaps/:id` - Update gap

**Remediation**
- `POST /api/simulations/gaps/:id/recommendations` - Generate recommendations
- `POST /api/simulations/recommendations` - Save recommendation
- `PATCH /api/simulations/recommendations/:id` - Update recommendation

**Platform Integration**
- `GET /api/simulations/platforms` - List platforms
- `POST /api/simulations/platforms/:platform/configure` - Configure platform
- `POST /api/simulations/platforms/:platform/test` - Test connection

## 📊 Metrics & Scoring

### Detection Score
```
Detection Score = (Detected Techniques / Total Techniques) × 100
```

### Prevention Score
```
Prevention Score = (Prevented Techniques / Total Techniques) × 100
```

### Overall Score
```
Overall Score = (Detection Score + Prevention Score) / 2
```

### Risk Score
```
Risk Score = (Severity Weight × Gap Count) / Total Techniques
```

## 🔒 Security Best Practices

1. **Always use Safe Mode first** - Test simulation plan before live execution
2. **Limit live execution** - Use only in isolated environments
3. **Monitor actively** - Watch simulation progress in real-time
4. **Review results** - Analyze validation results before remediation
5. **Track changes** - Document all control updates
6. **Test remediation** - Validate fixes with new simulations

## 🐛 Troubleshooting

### Simulation fails to start
- Check platform integration is configured
- Verify API credentials are correct
- Ensure target environment is accessible

### No results returned
- Check simulation job status
- Verify techniques are supported by platform
- Review execution logs for errors

### Detection not working
- Confirm SIEM/EDR integration
- Verify detection rules are deployed
- Check log collection is working

### Gap analysis empty
- Ensure validation results exist
- Check detection/prevention flags
- Verify threshold settings

## 📈 Performance

- Simulation plan creation: ~2-3 seconds
- Technique execution: ~10-30 seconds per technique
- Gap analysis: ~3-5 seconds for 100 techniques
- Recommendation generation: ~1-2 seconds per gap

## 🔄 Roadmap

- [ ] AttackIQ platform integration
- [ ] ML-powered gap prediction
- [ ] Automated remediation deployment
- [ ] Integration with ticketing systems
- [ ] Custom playbook execution
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant support
- [ ] API rate limiting

## 📝 License

Part of ThreatFlow - Enterprise Threat Intelligence Platform

## 🤝 Support

For issues or questions:
- Review inline code documentation
- Check API endpoint examples
- Refer to implementation guide
- Contact security team

---

**Status**: Production Ready
**Version**: 1.0.0
**Last Updated**: 2025-10-08
