# Automated Playbook Generation

> Transform attack flows into actionable incident response procedures with AI-powered playbook generation.

## 🎯 Overview

The Automated Playbook Generation feature converts attack flow analysis into comprehensive, executable incident response playbooks. It leverages AI, MITRE ATT&CK, and MITRE D3FEND frameworks to automatically generate detection rules, containment actions, eradication steps, and recovery procedures.

## 📦 Components

```
playbook-generation/
├── types/              # TypeScript type definitions (500+ lines)
├── services/           # Core services
│   ├── PlaybookGeneratorService.ts  # Main generation logic (1,330 lines)
│   └── SOARIntegrationService.ts    # SOAR platform integrations (650 lines)
├── utils/              # Utilities
│   └── detectionRuleGenerators.ts   # Multi-platform rule generation (750 lines)
├── api/                # REST API
│   └── playbookRoutes.ts            # API endpoints (750 lines)
├── components/         # React components (UI - pending implementation)
└── README.md           # This file
```

## 🚀 Quick Start

### 1. Setup Database

```bash
psql -U postgres -d threatflow < scripts/migrations/create_playbook_tables.sql
```

### 2. Integrate with Server

```typescript
// server.ts
import { setupPlaybookRoutes } from './features/playbook-generation/api/playbookRoutes';

setupPlaybookRoutes(app, pool);
```

### 3. Generate Playbook from Flow

```typescript
import { PlaybookGeneratorService } from './features/playbook-generation/services/PlaybookGeneratorService';

const service = new PlaybookGeneratorService(pool);

const result = await service.generatePlaybook({
  source: 'flow',
  sourceId: 'flow-123',
  name: 'Phishing Response Playbook',
  severity: 'high',
  includeDetectionRules: true,
  includeAutomation: true,
});

console.log(`Generated playbook with ${result.playbook.phases.length} phases`);
console.log(`Confidence: ${result.confidence}`);
```

## 💡 Features

### Core Capabilities

- **AI-Powered Generation**: Automatically analyze attack flows and generate appropriate response procedures
- **7 Standard Phases**: Preparation, Detection, Analysis, Containment, Eradication, Recovery, Post-Incident
- **MITRE D3FEND Mapping**: Map ATT&CK techniques to defensive countermeasures
- **Multi-Platform Detection Rules**: Generate Sigma, YARA, Snort, Splunk SPL, KQL, Elastic DSL rules
- **SOAR Integration**: Sync playbooks to Cortex XSOAR, Splunk SOAR, and custom platforms
- **Execution Tracking**: Monitor playbook execution with detailed audit logs
- **Template System**: Save and reuse successful playbooks as templates

### Detection Rule Generation

Supports 7 detection rule formats:

1. **Sigma** - Universal SIEM rule format
2. **YARA** - Malware detection rules
3. **Snort/Suricata** - Network IDS rules
4. **Splunk SPL** - Splunk Search Processing Language
5. **Microsoft KQL** - Azure Sentinel / Defender queries
6. **Elastic DSL** - Elasticsearch detection rules
7. **Custom** - Extensible for additional formats

### SOAR Platforms

Integrates with:

- ✅ **Cortex XSOAR** (Palo Alto) - Full support
- ✅ **Splunk SOAR** (Phantom) - Full support
- 🚧 **IBM Resilient** - Planned
- 🚧 **ServiceNow SecOps** - Planned
- ✅ **Custom REST API** - Generic adapter

## 📡 API Reference

### Playbook Management

```typescript
// Create playbook
POST /api/playbooks
{
  "name": "Ransomware Response",
  "severity": "critical",
  "description": "Incident response for ransomware attacks"
}

// List playbooks with filters
GET /api/playbooks?status=active&severity=high&sortBy=createdAt&sortOrder=desc

// Get specific playbook
GET /api/playbooks/:id

// Update playbook
PUT /api/playbooks/:id
{
  "status": "approved",
  "tags": ["ransomware", "critical"]
}

// Clone playbook
POST /api/playbooks/:id/clone
{
  "name": "Modified Ransomware Response"
}

// Delete (archive) playbook
DELETE /api/playbooks/:id
```

### Playbook Generation

```typescript
// Generate from attack flow
POST /api/playbooks/generate/from-flow
{
  "flowId": "flow-123",
  "name": "Phishing Response",
  "severity": "medium",
  "includeDetectionRules": true,
  "includeAutomation": true
}

// Generate from campaign
POST /api/playbooks/generate/from-campaign
{
  "campaignId": "campaign-456",
  "name": "APT29 Response",
  "severity": "critical"
}

// Generic generation
POST /api/playbooks/generate
{
  "source": "manual",
  "name": "Custom Playbook",
  "severity": "medium",
  "customizePhases": ["detection", "containment", "eradication"]
}
```

### Execution

```typescript
// Execute playbook
POST /api/playbooks/:id/execute
{
  "incidentId": "INC-2025-001",
  "executedBy": "analyst@company.com",
  "notes": "Responding to phishing campaign"
}

// Get execution history
GET /api/playbooks/:id/executions?limit=50

// Get execution details
GET /api/executions/:executionId
```

### Detection Rules

```typescript
// Get playbook detection rules
GET /api/playbooks/:id/rules

// Add detection rule
POST /api/playbooks/:id/rules
{
  "ruleName": "Suspicious PowerShell",
  "ruleType": "sigma",
  "ruleContent": "...",
  "mitreTechniqueId": "T1059.001"
}

// Generate rules for techniques
POST /api/rules/generate
{
  "techniques": ["T1003.001", "T1055"],
  "ruleTypes": ["sigma", "yara", "kql"]
}
```

### SOAR Integration

```typescript
// List supported platforms
GET /api/soar/platforms

// Test connection
POST /api/soar/test
{
  "platform": "cortex_xsoar",
  "config": {
    "apiUrl": "https://xsoar.company.com",
    "apiKey": "xxx"
  }
}

// Connect to SOAR
POST /api/soar/connect
{
  "playbookId": "playbook-123",
  "platform": "cortex_xsoar",
  "config": {
    "apiUrl": "https://xsoar.company.com",
    "apiKey": "xxx",
    "autoSync": true
  }
}

// Sync playbook
POST /api/soar/sync
{
  "integrationId": "integration-456"
}
```

### Analytics

```typescript
// Get playbook analytics
GET /api/playbooks/analytics
// Returns: total playbooks, execution stats, success rates, trends
```

## 🔧 Configuration

### Service Configuration

```typescript
const service = new PlaybookGeneratorService(pool, {
  enableDetectionRules: true,
  enableAutomation: true,
  defaultSeverity: 'medium',
  maxActionsPerPhase: 10,
  minConfidenceThreshold: 0.5,
  includeSourceExcerpts: true,
  estimatedTimeMultiplier: 1.5, // Add buffer to time estimates
});
```

### Detection Rule Generators

```typescript
import { ruleGeneratorFactory, RuleGenerationContext } from './utils/detectionRuleGenerators';

const context: RuleGenerationContext = {
  technique: {
    techniqueId: 'T1003.001',
    techniqueName: 'LSASS Memory',
    tactic: 'Credential Access',
  },
  processes: ['mimikatz.exe', 'procdump.exe'],
  networkIndicators: [
    { ip: '192.168.1.100', port: 4444 },
    { domain: 'evil.com' }
  ],
};

// Generate single rule
const sigmaRule = ruleGeneratorFactory.generateRule('sigma', context);

// Generate all supported formats
const allRules = ruleGeneratorFactory.generateAllRules(context);
```

### SOAR Integration

```typescript
import { SOARIntegrationService } from './services/SOARIntegrationService';

const soarService = new SOARIntegrationService(pool);

// Create integration
const integration = await soarService.createIntegration(
  'playbook-123',
  'cortex_xsoar',
  {
    apiUrl: 'https://xsoar.company.com',
    apiKey: process.env.XSOAR_API_KEY,
    autoSync: true,
    bidirectionalSync: false,
  }
);

// Sync playbook
await soarService.syncPlaybook(integration.id);

// Execute on SOAR platform
const executionId = await soarService.executePlaybook(integration.id, {
  incidentId: 'INC-2025-001',
});
```

## 📊 Database Schema

### Main Tables

1. **`playbooks`** - Main playbook storage
   - Metadata, status, versioning
   - JSONB for full playbook data
   - Execution statistics

2. **`playbook_phases`** - Individual phases
   - 7 standard IR phases
   - Ordering and dependencies
   - Automation flags

3. **`playbook_actions`** - Individual actions
   - 9 action types
   - Execution details
   - MITRE/D3FEND mapping

4. **`playbook_detection_rules`** - Detection rules
   - Multiple rule formats
   - Effectiveness metrics
   - Platform targeting

5. **`playbook_executions`** - Execution history
   - Complete audit trail
   - Artifacts collection
   - Lessons learned

6. **`playbook_templates`** - Reusable templates
   - Categorized library
   - Usage statistics

7. **`soar_integrations`** - SOAR tracking
   - Platform connections
   - Sync status
   - Configuration storage

8. **`d3fend_mappings`** - ATT&CK to D3FEND
   - Defensive countermeasures
   - Effectiveness scoring
   - Implementation guidance

## 🎨 Playbook Structure

### Example Generated Playbook

```json
{
  "id": "playbook-123",
  "name": "Phishing Response Playbook",
  "severity": "high",
  "estimatedTimeMinutes": 240,
  "status": "approved",
  "phases": [
    {
      "phaseName": "preparation",
      "actions": [
        {
          "title": "Assemble incident response team",
          "actionType": "manual",
          "estimatedDurationMinutes": 10
        }
      ]
    },
    {
      "phaseName": "detection",
      "actions": [
        {
          "title": "Query SIEM for indicators",
          "actionType": "automated",
          "apiEndpoint": "/api/siem/query",
          "estimatedDurationMinutes": 5
        },
        {
          "title": "Deploy detection rules",
          "actionType": "automated",
          "estimatedDurationMinutes": 10
        }
      ]
    },
    {
      "phaseName": "containment",
      "actions": [
        {
          "title": "Block malicious sender",
          "actionType": "automated",
          "requiresApproval": true,
          "estimatedDurationMinutes": 5
        },
        {
          "title": "Quarantine affected emails",
          "actionType": "api_call",
          "apiEndpoint": "/api/email/quarantine",
          "estimatedDurationMinutes": 10
        }
      ]
    }
  ],
  "detectionRules": [
    {
      "ruleName": "Sigma: Phishing Email Detection",
      "ruleType": "sigma",
      "ruleContent": "...",
      "mitreTechniqueId": "T1566.001"
    }
  ]
}
```

## 🧪 Testing

### Unit Tests

```typescript
import { PlaybookGeneratorService } from './services/PlaybookGeneratorService';

describe('PlaybookGeneratorService', () => {
  it('should generate playbook from flow', async () => {
    const service = new PlaybookGeneratorService(testPool);
    const result = await service.generatePlaybook({
      source: 'flow',
      sourceId: 'test-flow-1',
      name: 'Test Playbook',
      severity: 'medium',
    });

    expect(result.playbook).toBeDefined();
    expect(result.playbook.phases.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});
```

### Integration Tests

```typescript
describe('Playbook API', () => {
  it('should create and retrieve playbook', async () => {
    const response = await request(app)
      .post('/api/playbooks/generate/from-flow')
      .send({
        flowId: 'flow-123',
        name: 'Test Playbook',
        severity: 'high',
      });

    expect(response.status).toBe(200);
    expect(response.body.playbook).toBeDefined();

    const getResponse = await request(app)
      .get(`/api/playbooks/${response.body.playbook.id}`);

    expect(getResponse.status).toBe(200);
  });
});
```

## 📈 Performance

- **Playbook Generation**: ~3-5 seconds for standard attack flow
- **Detection Rule Generation**: ~1-2 seconds per rule (all formats: ~10 seconds)
- **SOAR Sync**: ~2-3 seconds per platform
- **Database Operations**: Optimized with 25+ indexes

## 🔒 Security

- ✅ Parameterized queries (SQL injection prevention)
- ✅ Input validation on all endpoints
- ✅ RBAC-ready authentication hooks
- ✅ Secure credential storage for SOAR integrations
- ✅ Audit logging via execution tracking
- ✅ Approval workflows for critical actions

## 🐛 Troubleshooting

### Playbook Generation Fails

```bash
# Check database connection
psql -d threatflow -c "SELECT COUNT(*) FROM playbooks;"

# Check logs
tail -f /var/log/threatflow/playbook-generation.log

# Verify flow exists
curl http://localhost:3001/api/flows/{flowId}
```

### Low Confidence Score

- Ensure attack flow has MITRE ATT&CK technique mappings
- Add IOCs to improve detection rule generation
- Include affected assets for better context

### SOAR Sync Issues

```bash
# Test connection
curl -X POST http://localhost:3001/api/soar/test \
  -H "Content-Type: application/json" \
  -d '{"platform":"cortex_xsoar","config":{"apiUrl":"...","apiKey":"..."}}'

# Check integration status
curl http://localhost:3001/api/soar/status?integrationId=xxx
```

## 📚 Related Features

- **Threat Correlation Engine** - Provides campaigns for playbook generation
- **Attack Flow Visualization** - Source of attack data
- **MITRE ATT&CK Integration** - Technique mapping
- **SIEM Integrations** - Detection rule deployment

## 🎓 Best Practices

1. **Review Generated Playbooks**: Always review and customize for your environment
2. **Test Detection Rules**: Test in dev/staging before deploying to production
3. **Update Time Estimates**: Adjust based on your team's actual execution times
4. **Use Templates**: Save successful playbooks as templates for reuse
5. **Track Metrics**: Monitor success rates and execution times
6. **Enable Auto-Sync**: Keep SOAR platforms synchronized automatically
7. **Document Lessons Learned**: Capture insights in post-incident phase

## 🚢 Production Checklist

- [ ] Database migration completed
- [ ] API endpoints integrated with server
- [ ] SOAR platform credentials configured
- [ ] Authentication and authorization enabled
- [ ] Rate limiting configured
- [ ] Monitoring and alerting setup
- [ ] Backup strategy implemented
- [ ] Team training completed
- [ ] Documentation reviewed

## 📝 License

Part of ThreatFlow platform - see main LICENSE

---

**Version:** 1.0.0
**Status:** Core Services Complete (Backend 100%, UI Components Pending)
**Last Updated:** 2025-10-07
**Total Lines of Code:** 4,000+ (excluding UI components)
