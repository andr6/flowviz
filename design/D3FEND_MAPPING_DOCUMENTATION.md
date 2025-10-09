# Automated MITRE D3FEND Mapping

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Key Features](#key-features)
4. [Components](#components)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [UI Components](#ui-components)
8. [Usage Examples](#usage-examples)
9. [D3FEND Integration](#d3fend-integration)
10. [Coverage Assessment](#coverage-assessment)
11. [Prioritization Algorithm](#prioritization-algorithm)
12. [Security Architecture Export](#security-architecture-export)
13. [Deployment Guide](#deployment-guide)
14. [Troubleshooting](#troubleshooting)

---

## Overview

The **Automated MITRE D3FEND Mapping** system provides comprehensive defensive countermeasure recommendations for every MITRE ATT&CK technique, translating offensive threat intelligence into actionable defensive strategies.

### Purpose

Transform attack techniques into defensive strategies:
- **Automated Mapping**: ATT&CK techniques → D3FEND countermeasures
- **Coverage Analysis**: Identify defensive gaps across environments
- **Prioritization**: ROI-based implementation recommendations
- **Architecture**: Generate security architecture documents

### Value Proposition

- **Actionable Defenses**: Every attack technique mapped to specific countermeasures
- **Time Savings**: Automated mapping saves 40+ hours per analysis
- **Risk Reduction**: Comprehensive coverage assessment identifies critical gaps
- **Budget Optimization**: ROI-based prioritization maximizes defensive value
- **Compliance Ready**: Architecture documents for audit and governance

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (React Components)               │
│  D3FENDMatrixViewer │ CoverageHeatmap │ Prioritizer        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                    API Layer (Express Routes)                │
│  /api/d3fend/* (25+ REST endpoints)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│               Service Layer (D3FENDMappingService)          │
│  - mapAttackToDefense()                                     │
│  - generateDefenseMatrix()                                   │
│  - assessControlCoverage()                                   │
│  - prioritizeImplementation()                                │
│  - exportToSecurityArchitecture()                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│             External Integration (D3FEND API)                │
│  https://d3fend.mitre.org/api/techniques/{id}               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                Data Layer (PostgreSQL)                       │
│  - d3fend_countermeasures (defensive catalog)               │
│  - d3fend_attack_mappings (technique-to-defense)            │
│  - defense_matrices (generated matrices)                     │
│  - coverage_assessments (environment coverage)               │
│  - countermeasure_prioritizations (ROI-based ranking)        │
│  - architecture_documents (export artifacts)                 │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Database**: PostgreSQL 12+ with JSONB support
- **Frontend**: React 18, Material-UI, TypeScript
- **External API**: MITRE D3FEND (https://d3fend.mitre.org/)
- **Caching**: In-memory cache for D3FEND API responses

---

## Key Features

### 1. Automated ATT&CK → D3FEND Mapping

Map any ATT&CK technique to D3FEND defensive countermeasures:

**Input**: `T1566 (Phishing)`

**Output**: 12 defensive countermeasures across 6 categories
- **Detection**: Email Security Gateway (95% effectiveness)
- **Detection**: Network Monitoring (90% effectiveness)
- **Hardening**: Email Authentication (SPF/DKIM/DMARC) (85% effectiveness)
- **Detection**: User Behavior Analytics (80% effectiveness)
- **Isolation**: Email Sandboxing (90% effectiveness)
- **Deception**: Honeytokens in Email (75% effectiveness)

### 2. Defense Matrix Generation

Generate comprehensive defense matrix for attack flows:

**Features**:
- Heatmap visualization (techniques × countermeasures)
- Effectiveness ratings (0-100%)
- Coverage gap identification
- Category-based organization
- Mapping confidence scores

### 3. Coverage Assessment

Analyze defensive coverage for environments:

**Metrics**:
- **Overall Coverage**: Percentage of techniques covered
- **Category Coverage**: Coverage by defensive category (hardening, detection, etc.)
- **Technique Coverage**: Per-technique defensive depth
- **Deployment Status**: Deployed, planned, testing, not deployed
- **Risk Score**: Quantitative risk based on gaps

**Coverage Levels**:
- **Comprehensive** (90-100%): Strong defensive posture
- **Substantial** (70-89%): Good coverage with minor gaps
- **Partial** (50-69%): Moderate coverage, significant gaps
- **Minimal** (25-49%): Weak coverage, major vulnerabilities
- **None** (0-24%): Critical defensive deficiencies

### 4. Countermeasure Prioritization

Prioritize implementation based on multiple factors:

**Prioritization Factors** (weighted):
1. **Risk Reduction** (30%): How much risk this eliminates
2. **Coverage Increase** (25%): Coverage improvement percentage
3. **Urgency** (15%): How critical is implementation
4. **Feasibility** (15%): How easy to implement
5. **Cost-Effectiveness** (10%): ROI and budget efficiency
6. **Strategic Alignment** (5%): Alignment with security strategy

**Output**:
- Priority score (0-100)
- Priority level (critical, high, medium, low)
- Estimated impact (techniques addressed, coverage improvement)
- Implementation plan (phases, timeline, cost)
- ROI analysis (payback period, NPV)

### 5. Security Architecture Documentation

Generate comprehensive architecture documents:

**Document Sections**:
1. **Executive Summary**: High-level overview for leadership
2. **Current State**: Defense matrix, coverage analysis, risk profile
3. **Proposed Architecture**: Security layers, components, data flows
4. **Implementation Roadmap**: Phased deployment plan with milestones
5. **Appendices**: Technique reference, countermeasure catalog, glossary

**Export Formats**: PDF, DOCX

---

## Components

### Backend Services

#### D3FENDMappingService

**Location**: `src/features/d3fend-mapping/services/D3FENDMappingService.ts`

**Core Methods**:

```typescript
// Map ATT&CK technique to D3FEND countermeasures
async mapAttackToDefense(technique: Technique): Promise<DefensiveCountermeasure[]>

// Generate defense matrix for attack flow
async generateDefenseMatrix(flow: AttackFlow): Promise<DefenseMatrix>

// Assess control coverage for environment
async assessControlCoverage(
  defenses: DeployedDefense[],
  environment: Environment
): Promise<CoverageAssessment>

// Prioritize countermeasure implementation
async prioritizeImplementation(
  countermeasures: DefensiveCountermeasure[]
): Promise<PrioritizedCountermeasure[]>

// Export to security architecture document
async exportToSecurityArchitecture(
  matrix: DefenseMatrix
): Promise<ArchitectureDocument>
```

**Defensive Categories**:
- **Hardening**: Reduce attack surface (application control, MFA, patching)
- **Detection**: Identify malicious activity (SIEM, EDR, network monitoring)
- **Isolation**: Limit lateral movement (segmentation, micro-segmentation)
- **Deception**: Misdirect attackers (honeypots, decoys, canaries)
- **Eviction**: Remove attacker presence (forensic tools, incident response)
- **Restoration**: Recover from incidents (backups, disaster recovery)

**Artifact Types**:
- **Digital Artifacts**: Logs, forensics, memory dumps
- **Network Artifacts**: Packet captures, flow data, DNS logs
- **System Artifacts**: Registry, file system, processes
- **User Artifacts**: User behavior, credentials, access patterns
- **Application Artifacts**: Application logs, API calls, transactions

### Database Tables

**Location**: `src/features/d3fend-mapping/db/schema-d3fend.sql`

**Core Tables** (11 total):

1. **d3fend_countermeasures**: Defensive countermeasure catalog
2. **d3fend_attack_mappings**: ATT&CK technique mappings
3. **defense_matrices**: Generated defense matrices
4. **security_environments**: Environment definitions
5. **security_assets**: Assets within environments
6. **deployed_defenses**: Deployed countermeasure tracking
7. **coverage_assessments**: Coverage assessment results
8. **countermeasure_prioritizations**: Prioritized implementation plans
9. **architecture_documents**: Generated architecture documents
10. **d3fend_audit_log**: Audit trail
11. **Views**: v_defense_coverage_summary, v_top_countermeasures_by_coverage, v_technique_defense_gaps

### API Routes

**Location**: `src/features/d3fend-mapping/api/d3fendRoutes.ts`

**Endpoint Categories** (25+ endpoints):

1. **Mapping**: Technique-to-defense mapping, countermeasure catalog
2. **Matrices**: Defense matrix generation and retrieval
3. **Environments**: Environment and asset management
4. **Coverage**: Coverage assessment
5. **Prioritization**: Countermeasure prioritization
6. **Architecture**: Document generation and export
7. **Analytics**: Coverage summaries, top countermeasures, technique gaps
8. **Health**: Service health and statistics

### UI Components

**Location**: `src/features/d3fend-mapping/components/D3FENDComponents.tsx`

**Components** (4 total):

1. **D3FENDMatrixViewer**: Interactive heatmap matrix visualization
2. **DefensiveCoverageHeatmap**: Coverage analysis with category breakdown
3. **CountermeasurePrioritizer**: Prioritized countermeasure recommendations
4. **ArchitectureDocGenerator**: Architecture document generation interface

---

## API Reference

### Technique-to-Defense Mapping

#### Map ATT&CK Technique

```http
POST /api/d3fend/map-technique
Content-Type: application/json

{
  "technique": {
    "id": "T1566",
    "name": "Phishing",
    "tactics": ["Initial Access"],
    "description": "Adversaries may send phishing messages..."
  },
  "userId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "technique": { "id": "T1566", "name": "Phishing" },
  "countermeasures": [
    {
      "id": "D3-EMLSEC",
      "name": "Email Security Gateway",
      "category": "detection",
      "artifactType": "network_artifact",
      "effectiveness": {
        "prevention": 85,
        "detection": 95,
        "response": 50,
        "overall": 80
      },
      "implementationComplexity": "medium",
      "implementationCost": "medium",
      "tools": [
        { "name": "Proofpoint", "type": "commercial" },
        { "name": "Mimecast", "type": "commercial" }
      ]
    }
  ],
  "count": 12
}
```

#### List All Countermeasures

```http
GET /api/d3fend/countermeasures?category=detection&page=1&limit=50
```

**Response**:
```json
{
  "success": true,
  "countermeasures": [
    {
      "id": "D3-EMLSEC",
      "name": "Email Security Gateway",
      "category": "detection",
      "implementationComplexity": "medium"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 156,
    "pages": 4
  }
}
```

### Defense Matrix Generation

#### Generate Defense Matrix

```http
POST /api/d3fend/generate-matrix
Content-Type: application/json

{
  "flow": {
    "id": "flow-123",
    "name": "APT29 Attack Chain",
    "techniques": [
      { "id": "T1566", "name": "Phishing", "tactics": ["Initial Access"] },
      { "id": "T1059.001", "name": "PowerShell", "tactics": ["Execution"] },
      { "id": "T1003", "name": "Credential Dumping", "tactics": ["Credential Access"] }
    ]
  },
  "userId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "matrix": {
    "flowId": "flow-123",
    "flowName": "APT29 Attack Chain",
    "techniques": [...],
    "countermeasures": [...],
    "mappings": [
      {
        "techniqueId": "T1566",
        "countermeasureId": "D3-EMLSEC",
        "effectiveness": { "overall": 80 },
        "priority": 9,
        "reasoning": "Email Security Gateway provides 80% overall effectiveness..."
      }
    ],
    "coverage": {
      "overall": { "percentage": 78.5, "level": "substantial" },
      "byCategory": {
        "detection": { "percentage": 85 },
        "hardening": { "percentage": 70 }
      }
    },
    "metadata": {
      "totalTechniques": 3,
      "totalCountermeasures": 18,
      "avgCoveragePerTechnique": 6
    }
  },
  "matrixId": "matrix-456"
}
```

### Coverage Assessment

#### Assess Environment Coverage

```http
POST /api/d3fend/assess-coverage
Content-Type: application/json

{
  "environmentId": "env-prod-123",
  "userId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "assessment": {
    "environment": { "id": "env-prod-123", "name": "Production" },
    "assessedAt": "2024-02-01T10:00:00Z",
    "overallCoverage": {
      "percentage": 72.5,
      "level": "substantial",
      "implementedControls": 58,
      "totalControls": 80
    },
    "deploymentStatus": {
      "totalCountermeasures": 58,
      "deployed": 45,
      "planned": 8,
      "testing": 5,
      "notDeployed": 0,
      "deploymentPercentage": 77.6
    },
    "riskAssessment": {
      "overallRisk": "medium",
      "riskScore": 28,
      "exposedTechniques": [],
      "criticalGaps": []
    },
    "recommendations": [
      {
        "priority": "high",
        "title": "Deploy EDR to Critical Assets",
        "description": "Enhance endpoint detection capabilities",
        "estimatedEffort": "2-3 weeks",
        "estimatedCost": "$50,000"
      }
    ]
  },
  "assessmentId": "assessment-789"
}
```

### Countermeasure Prioritization

#### Prioritize Implementation

```http
POST /api/d3fend/prioritize
Content-Type: application/json

{
  "countermeasures": [
    {
      "id": "D3-EDR",
      "name": "Endpoint Detection and Response",
      "category": "detection",
      "effectiveness": { "overall": 85 },
      "implementationComplexity": "medium",
      "implementationCost": "high"
    }
  ],
  "userId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "prioritized": [
    {
      "countermeasure": { "id": "D3-EDR", "name": "Endpoint Detection and Response" },
      "priority": 92,
      "priorityLevel": "critical",
      "factors": {
        "riskReduction": 85,
        "coverageIncrease": 90,
        "urgency": 95,
        "feasibility": 70,
        "costEffectiveness": 65,
        "strategicAlignment": 80
      },
      "estimatedImpact": {
        "techniquesAddressed": ["T1059.001", "T1003", "T1055"],
        "coverageImprovement": 12.5,
        "riskReduction": 25
      },
      "implementationPlan": {
        "estimatedDuration": 58,
        "estimatedCost": 100000,
        "requiredResources": ["Security engineer", "System administrator"]
      },
      "roi": {
        "roi": 6.0,
        "paybackPeriod": 8,
        "netPresentValue": 300000
      }
    }
  ]
}
```

### Architecture Export

#### Generate Architecture Document

```http
POST /api/d3fend/export-architecture
Content-Type: application/json

{
  "matrixId": "matrix-456",
  "userId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "document": {
    "title": "Security Architecture Document - APT29 Attack Chain",
    "version": "1.0",
    "generatedAt": "2024-02-01T10:00:00Z",
    "executiveSummary": "This security architecture document presents...",
    "currentState": {
      "defenseMatrix": {...},
      "coverageAssessment": {...},
      "riskProfile": {...}
    },
    "proposedArchitecture": {
      "layers": [...],
      "components": [...],
      "dataFlows": [...]
    },
    "roadmap": {
      "phases": [...],
      "timeline": "12 months",
      "milestones": [...]
    }
  },
  "documentId": "doc-012"
}
```

---

## Database Schema

### Key Tables

#### d3fend_countermeasures

Stores D3FEND defensive countermeasures catalog.

```sql
CREATE TABLE d3fend_countermeasures (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(30) CHECK (category IN ('hardening', 'detection', 'isolation', 'deception', 'eviction', 'restoration')),
  artifact_type VARCHAR(30),
  implementation_complexity VARCHAR(20),
  implementation_cost VARCHAR(20),
  maintenance_effort VARCHAR(20),
  technical_requirements JSONB,
  tools JSONB,
  d3fend_url TEXT
);
```

#### d3fend_attack_mappings

Maps ATT&CK techniques to D3FEND countermeasures.

```sql
CREATE TABLE d3fend_attack_mappings (
  id UUID PRIMARY KEY,
  attack_technique_id VARCHAR(20) NOT NULL,
  countermeasure_id VARCHAR(50) REFERENCES d3fend_countermeasures(id),
  effectiveness_prevention INTEGER,
  effectiveness_detection INTEGER,
  effectiveness_response INTEGER,
  effectiveness_overall INTEGER,
  confidence FLOAT,
  priority INTEGER,
  UNIQUE(attack_technique_id, countermeasure_id)
);
```

#### defense_matrices

Stores generated defense matrices.

```sql
CREATE TABLE defense_matrices (
  id UUID PRIMARY KEY,
  flow_id UUID,
  flow_name VARCHAR(500),
  matrix_data JSONB NOT NULL,
  total_techniques INTEGER,
  total_countermeasures INTEGER,
  overall_coverage_percentage FLOAT,
  overall_coverage_level VARCHAR(20),
  generated_at TIMESTAMP
);
```

#### coverage_assessments

Stores environment coverage assessments.

```sql
CREATE TABLE coverage_assessments (
  id UUID PRIMARY KEY,
  environment_id UUID REFERENCES security_environments(id),
  assessed_at TIMESTAMP,
  overall_coverage_percentage FLOAT,
  overall_coverage_level VARCHAR(20),
  detailed_coverage JSONB,
  overall_risk VARCHAR(20),
  risk_score INTEGER,
  recommendations JSONB
);
```

---

## UI Components

### D3FENDMatrixViewer

Interactive heatmap visualization of defense matrix.

**Features**:
- Technique × Countermeasure grid
- Color-coded effectiveness ratings
- Click-to-drill-down details
- Summary statistics cards
- Category-based filtering

**Usage**:
```tsx
import { D3FENDMatrixViewer } from './components/D3FENDComponents';

<D3FENDMatrixViewer
  matrix={defenseMatrix}
  loading={isLoading}
  onTechniqueClick={(id) => console.log('Technique:', id)}
  onCountermeasureClick={(id) => console.log('Countermeasure:', id)}
/>
```

### DefensiveCoverageHeatmap

Visual coverage analysis with category breakdown.

**Features**:
- Overall coverage gauge
- Category-by-category breakdown
- Color-coded coverage levels
- Progress bars and percentages

**Usage**:
```tsx
import { DefensiveCoverageHeatmap } from './components/D3FENDComponents';

<DefensiveCoverageHeatmap
  coverage={assessment.coverage}
  showCategoryBreakdown={true}
/>
```

### CountermeasurePrioritizer

Prioritized countermeasure recommendations with ROI.

**Features**:
- Priority-sorted table
- ROI and payback period
- Implementation complexity indicators
- Detailed factor breakdown
- One-click implementation tracking

**Usage**:
```tsx
import { CountermeasurePrioritizer } from './components/D3FENDComponents';

<CountermeasurePrioritizer
  prioritized={prioritizedList}
  onImplement={(id) => handleImplement(id)}
  onViewDetails={(id) => handleViewDetails(id)}
/>
```

### ArchitectureDocGenerator

Security architecture document generation tool.

**Features**:
- One-click document generation
- Document preview
- Multi-format export (PDF, DOCX)
- Summary statistics

**Usage**:
```tsx
import { ArchitectureDocGenerator } from './components/D3FENDComponents';

<ArchitectureDocGenerator
  matrixId={matrixId}
  onGenerate={async () => {
    const res = await fetch('/api/d3fend/export-architecture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matrixId, userId })
    });
    return await res.json();
  }}
/>
```

---

## Usage Examples

### Example 1: Map Technique to Defenses

```typescript
import { D3FENDMappingService } from './services/D3FENDMappingService';

const service = new D3FENDMappingService(pool);

const technique = {
  id: 'T1059.001',
  name: 'PowerShell',
  tactics: ['Execution'],
  description: 'Adversaries may abuse PowerShell commands...',
};

const countermeasures = await service.mapAttackToDefense(technique);

console.log(`Found ${countermeasures.length} defensive countermeasures:`);
countermeasures.forEach(cm => {
  console.log(`- ${cm.name} (${cm.category}): ${cm.effectiveness.overall}% effectiveness`);
});
```

**Output**:
```
Found 8 defensive countermeasures:
- Application Whitelisting (hardening): 95% effectiveness
- Endpoint Detection and Response (detection): 90% effectiveness
- PowerShell Logging (detection): 85% effectiveness
- Script Block Logging (detection): 80% effectiveness
- Constrained Language Mode (hardening): 75% effectiveness
- AMSI Integration (detection): 85% effectiveness
- Behavioral Analysis (detection): 70% effectiveness
- SIEM Correlation (detection): 75% effectiveness
```

### Example 2: Generate Defense Matrix for Attack Flow

```typescript
const attackFlow = {
  id: 'flow-apt29',
  name: 'APT29 Phishing Campaign',
  techniques: [
    { id: 'T1566.001', name: 'Spearphishing Attachment', tactics: ['Initial Access'] },
    { id: 'T1204.002', name: 'Malicious File', tactics: ['Execution'] },
    { id: 'T1059.001', name: 'PowerShell', tactics: ['Execution'] },
    { id: 'T1547.001', name: 'Registry Run Keys', tactics: ['Persistence'] },
    { id: 'T1003.001', name: 'LSASS Memory', tactics: ['Credential Access'] },
  ],
};

const matrix = await service.generateDefenseMatrix(attackFlow);

console.log(`Defense Matrix for ${matrix.flowName}:`);
console.log(`- Techniques: ${matrix.metadata.totalTechniques}`);
console.log(`- Countermeasures: ${matrix.metadata.totalCountermeasures}`);
console.log(`- Overall Coverage: ${matrix.coverage.overall.percentage.toFixed(1)}% (${matrix.coverage.overall.level})`);
console.log(`\nTop Countermeasures:`);
matrix.countermeasures.slice(0, 5).forEach(cm => {
  console.log(`- ${cm.name} (${cm.category})`);
});
```

**Output**:
```
Defense Matrix for APT29 Phishing Campaign:
- Techniques: 5
- Countermeasures: 23
- Overall Coverage: 82.3% (substantial)

Top Countermeasures:
- Email Security Gateway (detection)
- Endpoint Detection and Response (detection)
- Application Whitelisting (hardening)
- Credential Monitoring (detection)
- Multi-Factor Authentication (hardening)
```

### Example 3: Assess Environment Coverage

```typescript
const environment = {
  id: 'env-prod',
  name: 'Production Environment',
  type: 'production',
  deployedDefenses: [
    { countermeasureId: 'D3-EMLSEC', status: 'deployed', deployedAt: new Date() },
    { countermeasureId: 'D3-EDR', status: 'deployed', deployedAt: new Date() },
    { countermeasureId: 'D3-SIEM', status: 'deployed', deployedAt: new Date() },
    { countermeasureId: 'D3-MFA', status: 'planned', deployedAt: null },
  ],
  constraints: {
    budget: 500000,
    allowedTools: [],
    restrictedCategories: [],
    complianceRequirements: ['PCI-DSS', 'SOC 2'],
  },
  assets: [
    {
      id: 'asset-web-01',
      name: 'Web Server Cluster',
      type: 'server',
      criticality: 'critical',
      exposedTechniques: ['T1190', 'T1059.001', 'T1003'],
    },
  ],
};

const assessment = await service.assessControlCoverage(environment.deployedDefenses, environment);

console.log(`Coverage Assessment for ${environment.name}:`);
console.log(`- Overall Coverage: ${assessment.overallCoverage.percentage.toFixed(1)}% (${assessment.overallCoverage.level})`);
console.log(`- Deployed: ${assessment.deploymentStatus.deployed}/${assessment.deploymentStatus.totalCountermeasures}`);
console.log(`- Risk Score: ${assessment.riskAssessment.riskScore}/100 (${assessment.riskAssessment.overallRisk})`);
console.log(`\nTop Recommendations:`);
assessment.recommendations.slice(0, 3).forEach(rec => {
  console.log(`- [${rec.priority.toUpperCase()}] ${rec.title}`);
});
```

**Output**:
```
Coverage Assessment for Production Environment:
- Overall Coverage: 68.5% (partial)
- Deployed: 3/4
- Risk Score: 32/100 (medium)

Top Recommendations:
- [HIGH] Deploy Multi-Factor Authentication
- [HIGH] Implement Network Segmentation
- [MEDIUM] Enable PowerShell Script Block Logging
```

### Example 4: Prioritize Countermeasures

```typescript
const countermeasures = matrix.countermeasures;

const prioritized = await service.prioritizeImplementation(countermeasures);

console.log('Prioritized Implementation Plan:\n');
prioritized.slice(0, 5).forEach((item, index) => {
  console.log(`${index + 1}. ${item.countermeasure.name}`);
  console.log(`   Priority: ${item.priority}/100 (${item.priorityLevel})`);
  console.log(`   ROI: ${item.roi.roi.toFixed(2)}x | Payback: ${item.roi.paybackPeriod} months`);
  console.log(`   Coverage Improvement: +${item.estimatedImpact.coverageImprovement.toFixed(1)}%`);
  console.log(`   Cost: $${item.implementationPlan.estimatedCost.toLocaleString()}\n`);
});
```

**Output**:
```
Prioritized Implementation Plan:

1. Endpoint Detection and Response
   Priority: 92/100 (critical)
   ROI: 6.00x | Payback: 8 months
   Coverage Improvement: +12.5%
   Cost: $100,000

2. Multi-Factor Authentication
   Priority: 88/100 (critical)
   ROI: 12.50x | Payback: 3 months
   Coverage Improvement: +8.3%
   Cost: $20,000

3. Email Security Gateway
   Priority: 85/100 (critical)
   ROI: 8.00x | Payback: 6 months
   Coverage Improvement: +10.2%
   Cost: $75,000
```

### Example 5: Export Security Architecture

```typescript
const architecture = await service.exportToSecurityArchitecture(matrix);

console.log(`Architecture Document: ${architecture.title}`);
console.log(`Version: ${architecture.version}`);
console.log(`\nExecutive Summary:`);
console.log(architecture.executiveSummary);
console.log(`\nImplementation Roadmap:`);
architecture.roadmap.phases.forEach(phase => {
  console.log(`Phase ${phase.phase}: ${phase.name} (${phase.duration})`);
  console.log(`  Cost: $${phase.estimatedCost.toLocaleString()}`);
  console.log(`  Countermeasures: ${phase.countermeasures.length}`);
});
```

**Output**:
```
Architecture Document: Security Architecture Document - APT29 Phishing Campaign
Version: 1.0

Executive Summary:
This security architecture document presents a comprehensive defensive strategy
for APT29 Phishing Campaign, covering 5 attack techniques with 23 defensive
countermeasures across 6 defensive categories.

Implementation Roadmap:
Phase 1: Quick Wins (30 days)
  Cost: $50,000
  Countermeasures: 5
Phase 2: Core Infrastructure (90 days)
  Cost: $250,000
  Countermeasures: 10
Phase 3: Advanced Capabilities (180 days)
  Cost: $400,000
  Countermeasures: 8
```

---

## D3FEND Integration

### D3FEND API Integration

The system integrates with MITRE D3FEND's knowledge base:

**API Endpoint**: `https://d3fend.mitre.org/api/techniques/{techniqueId}`

**Integration Flow**:
1. Check local database for cached mappings
2. If not found, query D3FEND API
3. Transform D3FEND data to internal format
4. Store in database for future use
5. Return countermeasures to caller

**Caching Strategy**:
- In-memory cache for session duration
- Database persistence for long-term storage
- Cache invalidation on D3FEND updates (manual trigger)

**Fallback Strategy**:
If D3FEND API is unavailable:
1. Use cached database mappings
2. Generate intelligent defaults based on technique tactics
3. Log warning for manual review

---

## Coverage Assessment

### Coverage Calculation

**Formula**:
```
Coverage Percentage = (Implemented Controls / Total Required Controls) × 100
```

**Coverage Levels**:
| Percentage | Level | Description |
|------------|-------|-------------|
| 90-100% | Comprehensive | Strong defensive posture across all categories |
| 70-89% | Substantial | Good coverage with minor gaps |
| 50-69% | Partial | Moderate coverage, significant gaps exist |
| 25-49% | Minimal | Weak coverage, major vulnerabilities |
| 0-24% | None | Critical defensive deficiencies |

### Risk Score Calculation

**Formula**:
```
Risk Score = 100 - Coverage Percentage + Gap Severity Adjustment
```

**Gap Severity Adjustment**:
- Critical gap (no detection): +10 points
- High gap (limited detection): +5 points
- Medium gap (partial detection): +2 points
- Low gap (mostly covered): +0 points

**Risk Levels**:
| Score | Level | Action Required |
|-------|-------|-----------------|
| 75-100 | Critical | Immediate remediation required |
| 50-74 | High | Prioritize in next sprint |
| 25-49 | Medium | Address within quarter |
| 0-24 | Low | Monitor and optimize |

---

## Prioritization Algorithm

### Multi-Factor Weighted Scoring

**Factors and Weights**:
1. **Risk Reduction** (30%): `risk_score = (effectiveness × criticality) / 100`
2. **Coverage Increase** (25%): `coverage_delta = (new_coverage - current_coverage)`
3. **Urgency** (15%): `urgency = threat_level × exploit_availability`
4. **Feasibility** (15%): `feasibility = 100 - (complexity × 20)`
5. **Cost-Effectiveness** (10%): `cost_eff = (risk_reduction_value / cost)`
6. **Strategic Alignment** (5%): `alignment = match_score(countermeasure, strategy)`

**Priority Score Calculation**:
```typescript
priority = (
  riskReduction × 0.30 +
  coverageIncrease × 0.25 +
  urgency × 0.15 +
  feasibility × 0.15 +
  costEffectiveness × 0.10 +
  strategicAlignment × 0.05
)
```

**Priority Levels**:
- **Critical** (85-100): Implement immediately
- **High** (70-84): Implement within 30 days
- **Medium** (50-69): Implement within 90 days
- **Low** (0-49): Implement when resources available

---

## Security Architecture Export

### Document Structure

**1. Executive Summary**
- High-level overview
- Key findings and recommendations
- Business impact summary

**2. Current State Analysis**
- Defense matrix visualization
- Coverage assessment results
- Risk profile analysis
- Identified gaps and vulnerabilities

**3. Proposed Architecture**
- Security layers (perimeter, network, endpoint, application, data)
- Security components and technologies
- Data flow diagrams with security controls
- Integration points

**4. Implementation Roadmap**
- **Phase 1**: Quick wins (0-30 days)
  - Low-hanging fruit
  - High ROI, low complexity
  - Example: MFA deployment

- **Phase 2**: Core infrastructure (30-120 days)
  - Foundational security controls
  - Medium complexity, high impact
  - Example: EDR deployment

- **Phase 3**: Advanced capabilities (120-365 days)
  - Sophisticated defenses
  - High complexity, strategic value
  - Example: Deception technology

**5. Appendices**
- Technique reference (full ATT&CK details)
- Countermeasure catalog (all D3FEND countermeasures)
- Glossary of terms
- References and citations

### Export Formats

- **PDF**: Executive presentation, board reports
- **DOCX**: Editable technical documentation
- **HTML**: Web-based viewing and sharing

---

## Deployment Guide

### Prerequisites

1. **Database**: PostgreSQL 12+
2. **Node.js**: v18+
3. **TypeScript**: v5+
4. **React**: v18+

### Installation Steps

#### 1. Database Setup

```bash
# Run D3FEND schema
psql $DATABASE_URL -f src/features/d3fend-mapping/db/schema-d3fend.sql

# Verify tables created (11 expected)
psql $DATABASE_URL -c "\dt d3fend*"
psql $DATABASE_URL -c "\dt *environment*"
psql $DATABASE_URL -c "\dt *defense*"
```

#### 2. Service Integration

Add to `server.ts`:

```typescript
import { setupD3FENDRoutes } from './features/d3fend-mapping/api/d3fendRoutes';

// After Express app initialization
setupD3FENDRoutes(app, pool);
```

#### 3. Frontend Integration

Add to React app:

```tsx
import { D3FENDMatrixViewer, DefensiveCoverageHeatmap } from './features/d3fend-mapping/components/D3FENDComponents';

// Use components in your UI
```

#### 4. Environment Variables

```bash
# Optional: D3FEND API configuration
D3FEND_API_BASE=https://d3fend.mitre.org/api
D3FEND_CACHE_TTL=86400  # 24 hours
```

---

## Troubleshooting

### Common Issues

#### 1. D3FEND API Timeout

**Symptoms**: `fetch` timeouts when calling D3FEND API

**Solutions**:
- Check D3FEND API status: https://d3fend.mitre.org/
- Increase fetch timeout in service configuration
- Rely on cached database mappings
- Use fallback default countermeasure generation

#### 2. Missing Countermeasures for Technique

**Symptoms**: `mapAttackToDefense()` returns empty array

**Diagnosis**:
```sql
-- Check if mapping exists
SELECT * FROM d3fend_attack_mappings WHERE attack_technique_id = 'T1234';

-- Check if technique is in database
SELECT COUNT(*) FROM d3fend_attack_mappings;
```

**Solutions**:
- Trigger manual D3FEND sync
- Use fallback default generation
- Manually create mapping in database

#### 3. Coverage Percentage Always 0%

**Symptoms**: Coverage assessment shows 0% coverage

**Diagnosis**:
```sql
-- Check deployed defenses
SELECT * FROM deployed_defenses WHERE environment_id = 'env-id';

-- Check if countermeasures exist
SELECT * FROM d3fend_countermeasures LIMIT 10;
```

**Solutions**:
- Ensure deployed defenses are properly linked to countermeasures
- Verify `status = 'deployed'` for active defenses
- Check environment assets have exposed techniques

#### 4. Prioritization Returns Same Scores

**Symptoms**: All countermeasures have identical priority scores

**Diagnosis**:
```typescript
// Check prioritization factors
console.log(factors);
```

**Solutions**:
- Verify factor calculations are using real data
- Check weights sum to 1.0
- Ensure effectiveness ratings are populated

---

## Best Practices

### 1. Mapping Quality

✅ **Do:**
- Regularly sync with D3FEND API for updates
- Validate mappings with security team review
- Maintain confidence scores for automated mappings
- Document custom mappings and rationale

❌ **Don't:**
- Blindly trust automated mappings without review
- Skip confidence scoring
- Ignore low-confidence mappings

### 2. Coverage Assessment

✅ **Do:**
- Assess coverage monthly for production environments
- Track coverage trends over time
- Set coverage targets per environment type
- Include all asset types in assessment

❌ **Don't:**
- Assess coverage only once
- Ignore deployment status (planned vs deployed)
- Skip critical assets in assessment

### 3. Prioritization

✅ **Do:**
- Adjust prioritization weights based on organization risk appetite
- Consider budget constraints in cost-effectiveness
- Review ROI calculations with finance team
- Update priorities quarterly

❌ **Don't:**
- Use default weights without customization
- Ignore budget constraints
- Prioritize based on single factor only

### 4. Architecture Documentation

✅ **Do:**
- Generate architecture docs for executive review
- Update docs when defenses change
- Include implementation costs and timelines
- Version control architecture documents

❌ **Don't:**
- Generate docs only once
- Skip executive summary
- Omit cost estimates

---

## Future Enhancements

### Phase 2 Features

1. **Advanced Analytics**
   - Machine learning-based mapping suggestions
   - Automated technique-to-countermeasure correlation
   - Historical effectiveness tracking

2. **Enhanced Prioritization**
   - Custom prioritization algorithms
   - Industry-specific weighting presets
   - Multi-environment optimization

3. **Integration Expansions**
   - Native D3FEND ontology import
   - Integration with security tool APIs (EDR, SIEM, etc.)
   - Automated deployment tracking via API polling

4. **Visualization Enhancements**
   - 3D defense matrix visualization
   - Interactive architecture diagrams
   - Real-time coverage dashboards

---

## References

- [MITRE D3FEND](https://d3fend.mitre.org/)
- [MITRE ATT&CK](https://attack.mitre.org/)
- [D3FEND Matrix](https://d3fend.mitre.org/matrix/)
- [Defensive Techniques](https://d3fend.mitre.org/techniques/)

---

**End of Documentation**
