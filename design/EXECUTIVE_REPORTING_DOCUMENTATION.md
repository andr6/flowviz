# Executive Reporting & Metrics Dashboard

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Key Features](#key-features)
4. [Components](#components)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [Report Templates](#report-templates)
8. [Usage Examples](#usage-examples)
9. [Scheduled Reporting](#scheduled-reporting)
10. [Security & Compliance](#security--compliance)
11. [Deployment Guide](#deployment-guide)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The **Executive Reporting & Metrics Dashboard** provides a comprehensive business intelligence layer that translates technical threat intelligence data into executive-friendly insights. This system enables security leaders, board members, and compliance officers to make data-driven decisions based on quantitative security metrics.

### Purpose

Transform technical security data into:
- **Business language** executives understand
- **Quantitative metrics** for data-driven decisions
- **Compliance evidence** for regulatory requirements
- **Financial impact** assessments for budget justification
- **Trend analysis** for strategic planning

### Value Proposition

- **Time Savings**: Automated report generation saves 20+ hours/week
- **Data-Driven Decisions**: Quantitative metrics replace gut feelings
- **Compliance Ready**: Pre-built templates for NIST, ISO 27001, PCI-DSS
- **Board Confidence**: Professional presentations with clear ROI
- **Cost Reduction**: Identify inefficiencies and optimization opportunities

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Executive Dashboard UI                    │
│  (MetricsVisualization, TrendCharts, ComplianceScorecard)  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                    API Layer (Express Routes)                │
│  /api/executive-reporting/* (30+ REST endpoints)            │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                    Service Layer                             │
│  ┌───────────────────────┬──────────────────────────────┐  │
│  │ ExecutiveReportingService │ ReportTemplateService    │  │
│  │ - generateExecutiveSummary│ - 10 Standard Templates  │  │
│  │ - calculateThreatMetrics  │ - Custom Template Engine │  │
│  │ - trackMTTD_MTTR          │ - Template Application   │  │
│  │ - generateRiskScore       │                          │  │
│  │ - createTrendAnalysis     │                          │  │
│  │ - exportToBoardReport     │                          │  │
│  └───────────────────────────┴──────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                    Data Layer (PostgreSQL)                   │
│  - investigations (MTTD/MTTR tracking)                      │
│  - threat_intelligence (threat metrics)                     │
│  - executive_reports (generated reports)                    │
│  - risk_scores (risk tracking)                              │
│  - compliance_assessments (compliance status)               │
│  - security_costs (cost analysis)                           │
│  - metric_trends (time series data)                         │
│  - scheduled_reports (automation)                           │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL 12+ with JSONB support
- **Services**: ExecutiveReportingService, ReportTemplateService
- **Export**: PDF (production: Puppeteer/PDFKit), PowerPoint (production: PptxGenJS)
- **Scheduling**: Cron-based automated report generation
- **Caching**: Redis (optional, for metrics cache)

---

## Key Features

### 1. Executive Reporting

Generate comprehensive executive reports with:
- **Executive Summary**: High-level KPIs and key findings
- **Threat Metrics**: Total threats, top techniques, threat landscape
- **Response Metrics**: MTTD, MTTR, MTTI, MTTIC, SLA compliance
- **Risk Scoring**: Quantitative risk score (0-100) with breakdown
- **Financial Impact**: Cost analysis, ROI, breach impact estimates
- **Compliance Status**: Multi-framework compliance tracking
- **Recommendations**: Prioritized action items with business justification

### 2. Key Performance Indicators (KPIs)

#### Threat Metrics
- Total threats analyzed (weekly/monthly/quarterly)
- Top 10 attack techniques observed
- Threat distribution by severity
- New vs. recurring threats
- Threat actor attribution

#### Response Metrics
- **MTTD** (Mean Time To Detect): Average detection time in seconds
- **MTTR** (Mean Time To Respond): Average response time in seconds
- **MTTI** (Mean Time To Investigate): Average investigation time
- **MTTIC** (Mean Time To Contain): Average containment time
- **SLA Compliance**: Percentage of incidents meeting SLA targets

#### Risk Metrics
- Overall risk score (0-100)
- Risk breakdown (5 components):
  - Threat Exposure (25% weight)
  - Vulnerability Density (20% weight)
  - Control Effectiveness (25% weight)
  - Incident Frequency (15% weight)
  - Impact Severity (15% weight)
- Risk trend (increasing/stable/decreasing)
- Financial impact (estimated annual loss, potential breach cost)

#### Cost Metrics
- Total security operations costs
- Cost per investigation
- ROI on security tools
- Budget utilization
- Cost avoidance through prevention

#### Compliance Metrics
- Compliance score by framework (NIST, ISO, PCI-DSS, etc.)
- Control implementation percentage
- Gap counts (critical, high, medium, low)
- Remediation progress

### 3. Trend Analysis

Track metrics over time:
- **Hourly**: Real-time operational metrics
- **Daily**: Day-over-day comparisons
- **Weekly**: Week-over-week trends
- **Monthly**: Month-over-month performance
- **Quarterly**: Quarter-over-quarter strategic view
- **Yearly**: Year-over-year benchmarking

Statistical features:
- Moving averages (7-day, 30-day)
- Trend direction detection
- Percent change calculations
- Forecasting (next period prediction)

### 4. Report Templates

#### Standard Templates (10 Pre-built)

1. **NIST Cybersecurity Framework Compliance**
   - Target: Compliance Officers
   - Sections: Framework coverage, function analysis, gap remediation
   - Format: PDF

2. **ISO 27001 Compliance Report**
   - Target: Compliance Officers
   - Sections: Control implementation, audit findings, improvement plan
   - Format: PDF

3. **PCI-DSS v4.0 Compliance Report**
   - Target: Compliance Officers
   - Sections: Requirement status, compensating controls, remediation
   - Format: PDF

4. **CVSS Risk Assessment**
   - Target: Risk Managers
   - Sections: Vulnerability inventory, CVSS scoring, remediation priority
   - Format: PDF

5. **FAIR Risk Analysis**
   - Target: Risk Managers
   - Sections: Loss event frequency, loss magnitude, financial risk
   - Format: PDF

6. **SOC Performance Report**
   - Target: Technical Team
   - Sections: Team metrics, MTTD/MTTR, alert handling, SLA performance
   - Format: PDF

7. **SLA Tracking Report**
   - Target: Technical Team
   - Sections: SLA compliance, breach incidents, performance trends
   - Format: PDF

8. **Threat Landscape Analysis**
   - Target: Executives
   - Sections: Threat trends, actor attribution, industry comparisons
   - Format: PDF

9. **Budget Justification Report**
   - Target: Executives
   - Sections: ROI analysis, cost-benefit, breach impact, tool effectiveness
   - Format: PowerPoint

10. **Executive Briefing (1-page)**
    - Target: Board Members
    - Sections: Key metrics, top risks, urgent actions
    - Format: PDF

#### Custom Templates

Create organization-specific templates with:
- Custom sections and layouts
- Branded styling (colors, logos, fonts)
- Flexible data visualization
- Multiple export formats

### 5. Scheduled Reporting

Automate report generation and distribution:
- **Frequencies**: Daily, weekly, biweekly, monthly, quarterly, annually, custom (cron)
- **Timeframes**: Last 24h, 7d, 30d, quarter, year, custom
- **Distribution**: Email, Slack, Teams, webhook
- **Formats**: PDF, PowerPoint, HTML, Excel, JSON
- **Customization**: Subject, body, attachments, recipients

---

## Components

### Backend Services

#### ExecutiveReportingService

**Location**: `src/features/executive-reporting/services/ExecutiveReportingService.ts`

**Methods**:

```typescript
// Generate comprehensive executive report
async generateExecutiveSummary(timeframe: DateRange): Promise<ExecutiveReport>

// Calculate threat intelligence metrics
async calculateThreatMetrics(timeframe: DateRange): Promise<ThreatMetrics>

// Calculate incident response metrics
async calculateResponseMetrics(timeframe: DateRange): Promise<ResponseMetrics>

// Generate quantitative risk score
async generateRiskScore(timeframe: DateRange): Promise<RiskScore>

// Create time series trend analysis
async createTrendAnalysis(timeframe: DateRange): Promise<TrendAnalysis[]>

// Calculate cost and ROI metrics
async calculateCostAnalysis(timeframe: DateRange): Promise<CostAnalysis>

// Calculate compliance status
async calculateComplianceStatus(timeframe: DateRange): Promise<ComplianceStatus>

// Export report to PDF or PowerPoint
async exportToBoardReport(data: ExecutiveReport, format: 'pdf' | 'pptx'): Promise<File>
```

#### ReportTemplateService

**Location**: `src/features/executive-reporting/services/ReportTemplateService.ts`

**Methods**:

```typescript
// List all standard templates
listStandardTemplates(): ReportTemplate[]

// Get specific standard template
getStandardTemplate(templateId: string): ReportTemplate

// Apply template to report data
async applyTemplate(templateId: string, reportData: ExecutiveReport):
  Promise<{ template: ReportTemplate; formattedData: any }>

// Save custom template
async saveCustomTemplate(template: ReportTemplate): Promise<void>
```

### Database Tables

**Location**: `src/features/executive-reporting/db/schema-executive-reporting.sql`

**Core Tables** (13 total):

1. **investigations**: Track security investigations with MTTD/MTTR
2. **threat_intelligence**: Store threat data for metrics
3. **executive_reports**: Generated executive reports
4. **risk_scores**: Historical risk score tracking
5. **metrics_cache**: Performance cache for metrics
6. **compliance_assessments**: Compliance framework assessments
7. **security_costs**: Security operations cost tracking
8. **report_templates**: Custom report templates
9. **scheduled_reports**: Automated report schedules
10. **metric_trends**: Time series data
11. **executive_dashboards**: Custom dashboard configurations
12. **executive_reporting_audit_log**: Audit trail
13. **v_executive_summary_metrics**: Quick metrics view

### API Routes

**Location**: `src/features/executive-reporting/api/executiveReportingRoutes.ts`

**Endpoint Categories** (30+ endpoints):

1. **Executive Reports**: Generate, list, retrieve, approve
2. **Metrics**: Threat, response, risk, cost, compliance
3. **Trends**: Create, retrieve historical data
4. **Export**: PDF, PowerPoint
5. **Templates**: List, retrieve, create custom
6. **Scheduling**: Create, list, pause, resume
7. **Investigations**: Create, update, list
8. **Compliance**: Create assessments, list
9. **Health**: Status check, statistics

---

## API Reference

### Executive Report Generation

#### Generate Executive Report

```http
POST /api/executive-reporting/generate
Content-Type: application/json

{
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "reportType": "executive_briefing",
  "userId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "report": {
    "timeframe": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "generatedAt": "2024-02-01T10:00:00Z",
    "summary": {
      "totalThreats": 342,
      "criticalIncidents": 12,
      "avgMTTD": 180,
      "avgMTTR": 420,
      "controlCoverage": 87.5,
      "securityPosture": "strong"
    },
    "threatMetrics": { ... },
    "responseMetrics": { ... },
    "riskScore": { ... },
    "trends": [ ... ],
    "recommendations": [ ... ]
  },
  "reportId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### List Executive Reports

```http
GET /api/executive-reporting/reports?page=1&limit=20&reportType=executive_briefing&status=published
```

**Response**:
```json
{
  "success": true,
  "reports": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Executive Report - 2024-01-01 to 2024-01-31",
      "reportType": "executive_briefing",
      "timeframeStart": "2024-01-01T00:00:00Z",
      "timeframeEnd": "2024-01-31T23:59:59Z",
      "overallRiskScore": 42,
      "status": "published",
      "generatedAt": "2024-02-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "pages": 8
  }
}
```

### Metrics Endpoints

#### Calculate Threat Metrics

```http
POST /api/executive-reporting/metrics/threat
Content-Type: application/json

{
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

**Response**:
```json
{
  "success": true,
  "metrics": {
    "totalThreatsAnalyzed": 342,
    "newThreats": 87,
    "recurringThreats": 255,
    "criticalThreats": 23,
    "highThreats": 89,
    "mediumThreats": 156,
    "lowThreats": 74,
    "topTechniques": [
      {
        "techniqueId": "T1566",
        "techniqueName": "Phishing",
        "count": 45,
        "percentage": 13.2
      }
    ],
    "threatActors": [
      {
        "actor": "APT29",
        "count": 12,
        "severity": "critical"
      }
    ],
    "threatDistribution": {
      "malware": 123,
      "phishing": 89,
      "ransomware": 34,
      "apt": 28
    }
  }
}
```

#### Calculate Response Metrics (MTTD/MTTR)

```http
POST /api/executive-reporting/metrics/response
Content-Type: application/json

{
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

**Response**:
```json
{
  "success": true,
  "metrics": {
    "mttd": 180,
    "mttr": 420,
    "mtti": 600,
    "mttic": 1800,
    "slaCompliance": 92.5,
    "slaBreaches": 3,
    "totalIncidents": 40,
    "resolvedIncidents": 38,
    "averageResolutionTime": 3600,
    "criticalIncidentAvgTime": 1200,
    "highIncidentAvgTime": 2400,
    "mediumIncidentAvgTime": 4800
  }
}
```

#### Generate Risk Score

```http
POST /api/executive-reporting/metrics/risk
Content-Type: application/json

{
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

**Response**:
```json
{
  "success": true,
  "riskScore": {
    "overall": 42,
    "riskLevel": "medium",
    "breakdown": {
      "threatExposure": 45,
      "vulnerabilityDensity": 38,
      "controlEffectiveness": 82,
      "incidentFrequency": 35,
      "impactSeverity": 50
    },
    "trend": "decreasing",
    "trendConfidence": 0.85,
    "financialImpact": {
      "estimatedAnnualLoss": 1250000,
      "potentialBreachCost": 4500000,
      "insuranceCoverage": 2000000,
      "netExposure": 2500000
    },
    "recommendations": [
      {
        "priority": "high",
        "title": "Enhance Endpoint Detection",
        "description": "Deploy EDR to improve threat detection",
        "estimatedCostReduction": 300000,
        "implementationCost": 50000,
        "roi": 6.0
      }
    ]
  }
}
```

### Report Export

#### Export to PDF

```http
POST /api/executive-reporting/export/pdf
Content-Type: application/json

{
  "reportId": "550e8400-e29b-41d4-a716-446655440000",
  "templateId": "executive_briefing",
  "userId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "file": {
    "templateId": "executive_briefing",
    "name": "Executive Briefing (1-page)",
    "format": "pdf",
    "generatedAt": "2024-02-01T10:00:00Z",
    "fileUrl": "/reports/executive-briefing-2024-02-01.pdf",
    "fileSize": 524288
  }
}
```

### Scheduled Reports

#### Create Scheduled Report

```http
POST /api/executive-reporting/schedules
Content-Type: application/json

{
  "name": "Monthly Executive Briefing",
  "description": "Automated monthly report for board",
  "templateId": "executive_briefing",
  "frequency": "monthly",
  "timezone": "America/New_York",
  "timeframeType": "last_30d",
  "recipients": ["ciso@company.com", "ceo@company.com"],
  "distributionFormat": "pdf",
  "emailSubject": "Monthly Security Executive Briefing",
  "emailBody": "Please find attached the monthly security executive briefing.",
  "attachReport": true,
  "createdBy": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "schedule": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Monthly Executive Briefing",
    "templateId": "executive_briefing",
    "frequency": "monthly",
    "nextRunAt": "2024-03-01T09:00:00Z",
    "status": "active",
    "isActive": true,
    "createdAt": "2024-02-01T10:00:00Z"
  }
}
```

---

## Database Schema

### Key Tables

#### investigations

Tracks security investigations with automatic MTTD/MTTR calculation.

```sql
CREATE TABLE investigations (
  id UUID PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status VARCHAR(30),

  -- MTTD/MTTR timestamps
  created_at TIMESTAMP,
  detected_at TIMESTAMP,
  responded_at TIMESTAMP,
  resolved_at TIMESTAMP,

  -- Calculated metrics (auto-populated by trigger)
  mttd_seconds INTEGER,
  mttr_seconds INTEGER,

  -- Investigation details
  assigned_to VARCHAR(200),
  team VARCHAR(100),
  attack_techniques TEXT[],
  estimated_cost DECIMAL(15, 2)
);
```

**Trigger**: Automatically calculates MTTD/MTTR when timestamps are updated.

#### risk_scores

Historical risk score tracking for trend analysis.

```sql
CREATE TABLE risk_scores (
  id UUID PRIMARY KEY,
  calculated_at TIMESTAMP,
  timeframe_start TIMESTAMP,
  timeframe_end TIMESTAMP,

  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  risk_level VARCHAR(20),

  -- Component scores
  threat_exposure_score INTEGER,
  vulnerability_density_score INTEGER,
  control_effectiveness_score INTEGER,
  incident_frequency_score INTEGER,
  impact_severity_score INTEGER,

  -- Trend indicators
  trend VARCHAR(20),
  trend_confidence FLOAT,

  -- Financial impact
  estimated_annual_loss DECIMAL(15, 2),
  potential_breach_cost DECIMAL(15, 2),

  recommendations JSONB
);
```

#### executive_reports

Stores generated executive reports with full data.

```sql
CREATE TABLE executive_reports (
  id UUID PRIMARY KEY,
  name VARCHAR(500),
  report_type VARCHAR(50),

  timeframe_start TIMESTAMP,
  timeframe_end TIMESTAMP,

  report_data JSONB, -- Full ExecutiveReport object

  -- Denormalized metrics for quick filtering
  total_threats INTEGER,
  critical_incidents INTEGER,
  overall_risk_score INTEGER,
  mttd_seconds INTEGER,
  mttr_seconds INTEGER,

  -- Files
  pdf_url TEXT,
  pptx_url TEXT,

  -- Status
  status VARCHAR(20) CHECK (status IN ('draft', 'approved', 'published')),
  generated_by VARCHAR(200),
  generated_at TIMESTAMP
);
```

#### scheduled_reports

Automated report generation and distribution.

```sql
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY,
  name VARCHAR(200),
  template_id UUID REFERENCES report_templates(id),

  frequency VARCHAR(20),
  cron_expression VARCHAR(100),
  timezone VARCHAR(50),

  next_run_at TIMESTAMP,
  last_run_at TIMESTAMP,

  recipients TEXT[],
  distribution_format VARCHAR(20),

  is_active BOOLEAN DEFAULT true,
  status VARCHAR(30)
);
```

### Database Views

#### v_executive_summary_metrics

Quick access to key executive metrics.

```sql
CREATE VIEW v_executive_summary_metrics AS
SELECT
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as threats_last_30d,
  AVG(mttd_seconds) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as avg_mttd,
  AVG(mttr_seconds) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as avg_mttr,
  (SELECT overall_score FROM risk_scores ORDER BY calculated_at DESC LIMIT 1) as current_risk
FROM investigations;
```

---

## Report Templates

### Template Structure

Each template consists of:

```typescript
interface ReportTemplate {
  name: string;
  category: 'compliance' | 'risk' | 'operational' | 'strategic';
  targetAudience: 'executives' | 'board' | 'compliance_officers' | 'technical_team';
  format: 'pdf' | 'pptx' | 'html' | 'xlsx';
  sections: ReportSection[];
  styling: {
    theme: string;
    primaryColor: string;
    secondaryColor: string;
    font: string;
    logoUrl?: string;
  };
}

interface ReportSection {
  id: string;
  title: string;
  order: number;
  type: 'executive_summary' | 'metrics' | 'charts' | 'compliance' | 'recommendations';
  content: any;
  visuals?: Visual[];
}
```

### Example: Executive Briefing Template

```typescript
{
  name: 'Executive Briefing (1-page)',
  category: 'strategic',
  targetAudience: 'executives',
  format: 'pdf',
  sections: [
    {
      id: 'header',
      title: 'Security Posture Summary',
      order: 1,
      type: 'executive_summary',
      content: {
        layout: 'header',
        includeFields: ['timeframe', 'overall_risk', 'key_metrics']
      }
    },
    {
      id: 'metrics',
      title: 'Key Metrics',
      order: 2,
      type: 'metrics',
      content: {
        layout: '3-column',
        metrics: ['threats', 'mttd', 'mttr', 'risk_score', 'control_coverage', 'sla_compliance']
      },
      visuals: [
        { type: 'gauge', metric: 'risk_score', size: 'small' },
        { type: 'bar', metric: 'top_techniques', size: 'small' }
      ]
    },
    {
      id: 'recommendations',
      title: 'Priority Actions',
      order: 3,
      type: 'recommendations',
      content: {
        layout: 'bulleted_list',
        maxItems: 5,
        includeROI: true
      }
    }
  ],
  styling: {
    theme: 'executive',
    primaryColor: '#1976d2',
    secondaryColor: '#424242',
    font: 'Helvetica'
  }
}
```

---

## Usage Examples

### Example 1: Generate Monthly Executive Report

```typescript
import { ExecutiveReportingService } from './services/ExecutiveReportingService';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const service = new ExecutiveReportingService(pool);

// Generate report for last 30 days
const timeframe = {
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date()
};

const report = await service.generateExecutiveSummary(timeframe);

console.log(`Risk Score: ${report.riskScore.overall}/100 (${report.riskScore.riskLevel})`);
console.log(`MTTD: ${report.responseMetrics.mttd}s, MTTR: ${report.responseMetrics.mttr}s`);
console.log(`Total Threats: ${report.threatMetrics.totalThreatsAnalyzed}`);
console.log(`Top Technique: ${report.threatMetrics.topTechniques[0].techniqueName}`);
```

### Example 2: Export Report to PDF

```typescript
import { ReportTemplateService } from './services/ReportTemplateService';

const templateService = new ReportTemplateService();

// Apply executive briefing template
const { template, formattedData } = await templateService.applyTemplate(
  'executive_briefing',
  report
);

// Export to PDF
const pdfFile = await service.exportToBoardReport(formattedData, 'pdf');
console.log(`PDF generated: ${pdfFile.fileUrl} (${pdfFile.fileSize} bytes)`);
```

### Example 3: Create Scheduled Weekly Report

```typescript
// Schedule weekly SOC performance report
const schedule = {
  name: 'Weekly SOC Performance Report',
  templateId: 'soc_performance',
  frequency: 'weekly',
  timeframeType: 'last_7d',
  recipients: ['soc-team@company.com', 'ciso@company.com'],
  distributionFormat: 'pdf',
  emailSubject: 'Weekly SOC Performance Metrics',
  emailBody: 'Attached is the weekly SOC performance report.',
  attachReport: true,
  createdBy: 'admin'
};

const response = await fetch('/api/executive-reporting/schedules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(schedule)
});

const result = await response.json();
console.log(`Next run: ${result.schedule.nextRunAt}`);
```

### Example 4: Track Investigation MTTD/MTTR

```typescript
// Create investigation
const investigation = {
  title: 'Suspicious PowerShell Activity',
  severity: 'high',
  status: 'new',
  source: 'edr',
  assignedTo: 'analyst1',
  team: 'soc-team-1',
  attackTechniques: ['T1059.001'],
  affectedSystems: 3
};

const createResponse = await fetch('/api/executive-reporting/investigations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(investigation)
});

const created = await createResponse.json();
const invId = created.investigation.id;

// Update timestamps as investigation progresses
await fetch(`/api/executive-reporting/investigations/${invId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    detected_at: new Date(), // MTTD will be auto-calculated
    status: 'investigating'
  })
});

// Later: respond to incident
await fetch(`/api/executive-reporting/investigations/${invId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    responded_at: new Date(), // MTTR will be auto-calculated
    status: 'contained'
  })
});

// Metrics are automatically calculated via database trigger
```

### Example 5: Calculate Risk Score Trend

```typescript
// Generate risk scores for last 12 months
const monthlyScores = [];

for (let i = 11; i >= 0; i--) {
  const start = new Date();
  start.setMonth(start.getMonth() - (i + 1));
  start.setDate(1);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(0);

  const riskScore = await service.generateRiskScore({ start, end });
  monthlyScores.push({
    month: start.toISOString().slice(0, 7),
    score: riskScore.overall,
    level: riskScore.riskLevel
  });
}

// Analyze trend
const avgScore = monthlyScores.reduce((sum, m) => sum + m.score, 0) / monthlyScores.length;
const recentAvg = monthlyScores.slice(-3).reduce((sum, m) => sum + m.score, 0) / 3;
const trend = recentAvg < avgScore ? 'improving' : 'degrading';

console.log(`12-month avg: ${avgScore}, Recent avg: ${recentAvg}, Trend: ${trend}`);
```

---

## Scheduled Reporting

### Automation Workflow

```
1. Scheduler checks for due reports (cron job or event loop)
   ↓
2. For each due report:
   a. Calculate timeframe based on frequency
   b. Generate report using ExecutiveReportingService
   c. Apply template using ReportTemplateService
   d. Export to requested format (PDF/PPTX)
   ↓
3. Distribute report:
   a. Email to recipients with attachment
   b. Post to Slack/Teams channel
   c. Upload to shared drive
   d. Webhook notification
   ↓
4. Update schedule:
   a. Record execution in database
   b. Calculate next run time
   c. Increment execution counters
   ↓
5. Audit logging
```

### Frequency Options

| Frequency | Description | Use Case |
|-----------|-------------|----------|
| Daily | Every 24 hours | Operational dashboards |
| Weekly | Every 7 days | SOC performance, weekly summaries |
| Biweekly | Every 14 days | Sprint reviews |
| Monthly | First of month | Executive briefings, compliance |
| Quarterly | Every 3 months | Board presentations |
| Annually | Once per year | Annual security reviews |
| Custom (cron) | Custom schedule | Special cadences |

### Distribution Methods

1. **Email**
   - Recipients: Multiple email addresses
   - Attachments: PDF, PPTX, Excel
   - Inline HTML: For web-based viewing
   - Calendar invites: For quarterly reviews

2. **Collaboration Tools**
   - Slack: Post to channels with attachments
   - Microsoft Teams: Post to team channels
   - Webhooks: Custom integrations

3. **File Storage**
   - S3/Azure Blob: Cloud storage
   - SharePoint: Enterprise document management
   - Google Drive: Shared folders

---

## Security & Compliance

### Access Control

1. **Role-Based Access Control (RBAC)**
   - `executive`: View all reports, generate executive reports
   - `analyst`: View operational reports, create investigations
   - `compliance_officer`: View compliance reports, create assessments
   - `admin`: Full access, manage schedules and templates

2. **Data Classification**
   - Reports marked as: Public, Internal, Confidential, Restricted
   - Access based on user clearance level
   - Audit logging for all access

### Compliance Features

#### GDPR Compliance
- **Data Minimization**: Only collect necessary metrics
- **Right to Access**: Export all reports for data subject
- **Right to Erasure**: Delete reports on request
- **Data Retention**: Configurable retention policies

#### SOC 2 Compliance
- **Audit Logging**: All actions logged with user, timestamp, IP
- **Access Controls**: RBAC with principle of least privilege
- **Encryption**: Data at rest (database) and in transit (TLS)
- **Monitoring**: Anomaly detection on access patterns

#### PCI-DSS Compliance
- **Access Logging**: All data access logged for 1 year minimum
- **Strong Authentication**: MFA required for executive reports
- **Encryption**: AES-256 for stored reports
- **Network Segmentation**: Database in isolated VPC

### Audit Trail

All executive reporting activities are logged:

```typescript
interface AuditLogEntry {
  eventType: 'report_generated' | 'report_viewed' | 'report_approved' | ...;
  eventCategory: 'reporting' | 'security' | 'compliance' | 'access';
  userId: string;
  userName: string;
  ipAddress: string;
  userAgent: string;
  targetType: 'report' | 'dashboard' | 'template' | 'schedule';
  targetId: string;
  targetName: string;
  status: 'success' | 'failure' | 'error' | 'warning';
  timestamp: Date;
  eventData: object;
}
```

**Retention**: Audit logs retained for 7 years for compliance.

---

## Deployment Guide

### Prerequisites

1. **Database**: PostgreSQL 12+ with extensions:
   - `uuid-ossp`: UUID generation
   - `pg_trgm`: Text search optimization

2. **Node.js**: v18+ with TypeScript support

3. **Environment Variables**:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/threatflow
REDIS_URL=redis://localhost:6379 # Optional, for caching
SMTP_HOST=smtp.gmail.com # For email distribution
SMTP_PORT=587
SMTP_USER=reports@company.com
SMTP_PASS=***
AWS_S3_BUCKET=threatflow-reports # Optional, for file storage
```

### Installation Steps

#### 1. Database Setup

```bash
# Run schema creation
psql $DATABASE_URL -f src/features/executive-reporting/db/schema-executive-reporting.sql

# Verify tables created
psql $DATABASE_URL -c "\dt"
```

**Expected output**: 13 tables created (investigations, executive_reports, etc.)

#### 2. Service Integration

Add to `server.ts`:

```typescript
import { setupExecutiveReportingRoutes } from './features/executive-reporting/api/executiveReportingRoutes';

// After Express app initialization
setupExecutiveReportingRoutes(app, pool);
```

#### 3. Scheduled Reports Setup

Create cron job or scheduler service:

```typescript
// scheduler.ts
import cron from 'node-cron';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Run every hour to check for due reports
cron.schedule('0 * * * *', async () => {
  const dueReports = await pool.query(`
    SELECT * FROM scheduled_reports
    WHERE is_active = true AND next_run_at <= NOW()
  `);

  for (const schedule of dueReports.rows) {
    await executeScheduledReport(schedule);
  }
});

async function executeScheduledReport(schedule: any) {
  // Implementation...
}
```

#### 4. Frontend Integration

Create UI components:

```tsx
// src/features/executive-reporting/components/ExecutiveDashboard.tsx
import { useEffect, useState } from 'react';

export function ExecutiveDashboard() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetch('/api/executive-reporting/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        reportType: 'executive_briefing'
      })
    })
    .then(res => res.json())
    .then(data => setReport(data.report));
  }, []);

  if (!report) return <div>Loading...</div>;

  return (
    <div className="executive-dashboard">
      <h1>Executive Dashboard</h1>
      <div className="metrics-grid">
        <MetricCard title="Risk Score" value={report.riskScore.overall} />
        <MetricCard title="MTTD" value={`${report.responseMetrics.mttd}s`} />
        <MetricCard title="MTTR" value={`${report.responseMetrics.mttr}s`} />
        <MetricCard title="Threats" value={report.threatMetrics.totalThreatsAnalyzed} />
      </div>
      <TrendChart data={report.trends} />
      <RecommendationsList items={report.recommendations} />
    </div>
  );
}
```

### Performance Optimization

#### 1. Metrics Caching

```typescript
// Check cache first
const cacheKey = `metrics:${metricType}:${timeframe}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

// Calculate metrics
const metrics = await calculateMetrics();

// Cache for 15 minutes
await redis.setex(cacheKey, 900, JSON.stringify(metrics));
```

#### 2. Database Indexing

Already included in schema:
- Indexes on timeframe columns for date range queries
- Indexes on severity/status for filtering
- GIN indexes on JSONB columns for fast JSON queries
- Partial indexes for active records only

#### 3. Query Optimization

Use database views for common queries:
```sql
-- Pre-aggregated metrics for fast retrieval
CREATE MATERIALIZED VIEW mv_monthly_metrics AS
SELECT
  date_trunc('month', created_at) as month,
  COUNT(*) as total_threats,
  AVG(mttd_seconds) as avg_mttd,
  AVG(mttr_seconds) as avg_mttr
FROM investigations
GROUP BY date_trunc('month', created_at);

-- Refresh nightly
REFRESH MATERIALIZED VIEW mv_monthly_metrics;
```

---

## Troubleshooting

### Common Issues

#### 1. Slow Report Generation

**Symptoms**: Reports take >30 seconds to generate

**Diagnosis**:
```sql
-- Check for missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Solutions**:
- Enable query caching via Redis
- Add database indexes on frequently queried columns
- Use materialized views for pre-aggregated data
- Implement background job processing for large reports

#### 2. MTTD/MTTR Not Calculating

**Symptoms**: `mttd_seconds` and `mttr_seconds` remain NULL

**Diagnosis**:
```sql
-- Check trigger exists
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'calculate_investigation_metrics_trigger';

-- Test trigger manually
UPDATE investigations SET detected_at = NOW() WHERE id = 'test-id';
SELECT mttd_seconds FROM investigations WHERE id = 'test-id';
```

**Solutions**:
- Ensure trigger function exists and is enabled
- Verify timestamps are being set (not NULL)
- Check for database errors in logs

#### 3. Scheduled Reports Not Running

**Symptoms**: `next_run_at` timestamp passes but no report generated

**Diagnosis**:
```sql
-- Check scheduled reports status
SELECT id, name, next_run_at, last_run_at, status, is_active
FROM scheduled_reports
WHERE next_run_at <= NOW();

-- Check scheduler logs
SELECT * FROM executive_reporting_audit_log
WHERE event_type = 'schedule_executed'
ORDER BY timestamp DESC
LIMIT 10;
```

**Solutions**:
- Verify scheduler service is running
- Check cron expression syntax
- Ensure `is_active = true`
- Review error logs for failures

#### 4. Export Fails (PDF/PPTX)

**Symptoms**: Export endpoint returns 500 error

**Diagnosis**:
```bash
# Check report data exists
curl -X GET http://localhost:3001/api/executive-reporting/reports/{id}

# Check template exists
curl -X GET http://localhost:3001/api/executive-reporting/templates/executive_briefing
```

**Solutions**:
- Verify report data is valid JSON
- Ensure template structure matches expected format
- Check file system permissions for report storage
- Install production PDF/PPTX libraries (Puppeteer, PptxGenJS)

#### 5. High Database Load

**Symptoms**: CPU >80%, slow queries

**Diagnosis**:
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 minutes';
```

**Solutions**:
- Implement connection pooling (already included in code)
- Add read replicas for reporting queries
- Schedule heavy reports during off-peak hours
- Implement query timeouts

---

## Best Practices

### 1. Report Generation

✅ **Do:**
- Generate reports during off-peak hours (scheduled)
- Use appropriate timeframes (don't query 5 years of data)
- Cache frequently accessed metrics
- Pre-aggregate data in materialized views

❌ **Don't:**
- Generate large reports synchronously in API calls
- Query raw data for every metric (use views)
- Generate reports more frequently than data updates
- Store full report data in memory

### 2. Data Retention

✅ **Do:**
- Archive old reports to cold storage (S3 Glacier)
- Implement tiered storage (hot/warm/cold)
- Define retention policies per report type
- Compress archived reports

❌ **Don't:**
- Delete reports without archiving
- Keep all reports in primary database indefinitely
- Mix production and historical data

### 3. Security

✅ **Do:**
- Enforce RBAC for all endpoints
- Log all access to executive reports
- Encrypt sensitive financial data
- Implement MFA for approval workflows
- Use parameterized queries (SQL injection prevention)

❌ **Don't:**
- Expose raw database queries to API
- Store passwords in plain text
- Skip audit logging for "internal" reports
- Allow unauthenticated access to any endpoints

### 4. Performance

✅ **Do:**
- Use database indexes on query columns
- Implement pagination for list endpoints
- Cache calculated metrics
- Use async processing for exports
- Monitor query performance

❌ **Don't:**
- Load entire tables into memory
- Generate reports synchronously
- Skip query optimization
- Ignore slow query logs

---

## Future Enhancements

### Phase 2 Features

1. **Advanced Analytics**
   - Machine learning anomaly detection in metrics
   - Predictive risk forecasting
   - Automated trend analysis with insights
   - Natural language report summaries (via LLM)

2. **Enhanced Visualizations**
   - Interactive dashboards with drill-down
   - Real-time metric streaming
   - Customizable chart builders
   - Heat maps and correlation matrices

3. **Integration Expansions**
   - Tableau/Power BI connectors
   - Splunk dashboard export
   - ServiceNow incident correlation
   - Jira ticket linking

4. **Collaboration Features**
   - Report commenting and annotations
   - Approval workflows with multi-stage review
   - Version control for reports
   - Collaborative editing

5. **AI-Powered Insights**
   - Automated executive summaries
   - Anomaly detection and alerting
   - Recommendation prioritization
   - Natural language queries

---

## Support & Resources

### Documentation
- API Reference: `/api-docs/executive-reporting`
- Database Schema: `src/features/executive-reporting/db/schema-executive-reporting.sql`
- Service Code: `src/features/executive-reporting/services/`

### Contact
- Security Team: security@company.com
- Technical Support: support@company.com
- Emergency: +1-555-SECURITY

### References
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [ISO 27001 Standard](https://www.iso.org/isoiec-27001-information-security.html)
- [PCI-DSS Requirements](https://www.pcisecuritystandards.org/)
- [FAIR Risk Analysis](https://www.fairinstitute.org/)

---

## Changelog

### Version 1.0.0 (2024-02-01)
- Initial release
- Executive report generation
- 10 standard templates
- MTTD/MTTR tracking
- Risk scoring with 5-component breakdown
- Compliance tracking (NIST, ISO, PCI-DSS)
- Cost analysis and ROI
- Scheduled reporting
- PDF/PPTX export
- 30+ API endpoints
- 13 database tables
- Comprehensive audit logging

---

**End of Documentation**
