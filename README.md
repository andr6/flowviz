# ThreatFlow - Enterprise Threat Intelligence Platform

A cutting-edge, enterprise-grade cybersecurity threat intelligence platform that transforms security articles, incident reports, and threat data into interactive attack flow visualizations using the MITRE ATT&CK framework. Built for security analysts, threat hunters, SOC teams, and incident response professionals.

## 📋 Table of Contents

- [Overview](#overview)
- [Core Functionality](#core-functionality)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Starting & Stopping](#starting--stopping)
- [Modules & Features](#modules--features)
- [Integrations](#integrations)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

ThreatFlow is a comprehensive threat intelligence platform that combines AI-powered analysis, real-time visualization, and enterprise-grade security operations capabilities. It processes threat intelligence from multiple sources, visualizes attack patterns, generates defensive recommendations, and integrates with existing security infrastructure.

### Key Capabilities

- **AI-Powered Analysis**: Multi-provider AI support (Claude, Ollama, OpenAI, OpenRouter) for intelligent threat analysis
- **Real-time Visualization**: Interactive attack flow diagrams with MITRE ATT&CK framework mapping
- **Defensive Intelligence**: Automated MITRE D3FEND mapping for countermeasure recommendations
- **Enterprise Features**: Authentication, RBAC, audit logging, SIEM integration, and compliance reporting
- **SOC Operations**: Alert triage, case management, investigation workflows, and playbook generation
- **Threat Hunting**: IOC/IOA extraction, threat correlation, and advanced search capabilities
- **Purple Teaming**: Attack simulation, defense validation, and purple team collaboration
- **Executive Reporting**: Metrics dashboards, compliance reports, and risk scoring

## ✨ Core Functionality

### 1. **Threat Intelligence Analysis**
Transform security articles, reports, and threat feeds into actionable intelligence:
- **URL Analysis**: Extract attack patterns from cybersecurity articles and reports
- **Text Analysis**: Process raw text, IOCs, and threat data directly
- **Image Analysis**: Extract attack flows from screenshots and diagrams
- **Multi-source Processing**: Aggregate intelligence from various threat feeds
- **Real-time Streaming**: Watch attack flows build as AI processes content
- **MITRE ATT&CK Mapping**: Automatic technique and tactic identification

### 2. **Attack Flow Visualization**
Interactive, professional visualizations for threat analysis:
- **Dynamic Flow Diagrams**: Node-based attack progression visualization
- **Multiple Node Types**: Operator, Tool, Malware, Action, Asset, Infrastructure, Vulnerability, URL nodes
- **Story Mode**: Cinematic playback of attack progression with customizable controls
- **Interactive Exploration**: Click nodes for detailed information, zoom, pan, and rearrange
- **Custom Layouts**: Hierarchical, force-directed, and custom arrangements
- **Export Capabilities**: PNG, STIX 2.1 bundles, Attack Flow Builder (.afb) files

### 3. **Defensive Intelligence**
Automated defensive recommendations and security architecture:
- **D3FEND Mapping**: Automatic mapping of ATT&CK techniques to defensive countermeasures
- **Defense Matrix**: Heatmap visualization of technique-to-countermeasure effectiveness
- **Coverage Assessment**: Quantitative analysis of defensive posture and gaps
- **Countermeasure Prioritization**: ROI-based prioritization with 6-factor scoring
- **Architecture Documents**: Generate security architecture documentation
- **Gap Analysis**: Identify critical, high, medium, and low priority gaps

### 4. **SOC Operations**
Streamline security operations center workflows:
- **Alert Triage**: Intelligent alert categorization and prioritization
- **Case Management**: Track investigations, evidence, and remediation
- **Investigation Workflows**: Guided investigation processes with playbooks
- **Playbook Generation**: Auto-generate response playbooks from attack flows
- **Collaboration**: Team collaboration features for incident response
- **Timeline Analysis**: Temporal analysis of attack progression

### 5. **Threat Hunting**
Advanced capabilities for proactive threat hunting:
- **IOC/IOA Extraction**: Automatic extraction from articles and reports
- **IOC Enrichment**: Enhance IOCs with threat intelligence feeds
- **Correlation Engine**: Correlate threats across multiple sources
- **Advanced Search**: Search by technique, actor, malware, or IOC
- **Threat Correlation**: Link related threats and campaigns
- **Pattern Detection**: Identify emerging attack patterns

### 6. **Purple Teaming & Attack Simulation**
Validate defenses and improve security posture:
- **Attack Simulation**: Simulate MITRE ATT&CK techniques
- **Defense Validation**: Test control effectiveness
- **Purple Team Workflows**: Collaborative red/blue team exercises
- **Gap Identification**: Identify defensive coverage gaps
- **Simulation Reports**: Detailed reports on simulation results
- **Remediation Tracking**: Track defensive improvements

### 7. **Executive Reporting & Metrics**
Comprehensive reporting for leadership and compliance:
- **Metrics Dashboard**: MTTD, MTTR, threat trends, and KPIs
- **Risk Scoring**: Quantitative risk assessment
- **Compliance Reports**: SOC 2, ISO 27001, NIST CSF templates
- **Operational Reports**: SOC performance and incident trends
- **Strategic Reports**: Long-term threat landscape analysis
- **Export Formats**: PDF, Excel, JSON

### 8. **Machine Learning & AI**
Advanced AI capabilities for threat intelligence:
- **Pattern Recognition**: ML-based attack pattern detection
- **Anomaly Detection**: Identify unusual attack behaviors
- **Threat Prediction**: Predictive analytics for emerging threats
- **Auto-classification**: Automatic threat categorization
- **Model Training**: Custom ML models for organization-specific threats
- **Confidence Scoring**: AI confidence indicators for analysis

### 9. **UI Adaptability**
Professional, customizable user interface:
- **Adaptive Density Control**: User-controlled UI complexity (Compact, Comfortable, Spacious)
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Dark/Light Themes**: Professional color schemes
- **Accessibility**: WCAG 2.1 AA compliance
- **Customizable Dashboards**: Personalized layouts and widgets
- **Keyboard Shortcuts**: Efficient navigation and controls

## 🏗️ Architecture

### Technology Stack

#### Frontend
- **Framework**: React 18 with TypeScript (strict mode)
- **UI Library**: Material-UI (MUI) v5 with custom ThreatFlow theme
- **Visualization**: React Flow for attack flow diagrams
- **State Management**: React Context API, React Query for server state
- **Build Tool**: Vite with optimizations and tree-shaking
- **Routing**: React Router v6 for navigation

#### Backend
- **Server**: Express.js with TypeScript
- **Database**: PostgreSQL with JSONB support
- **Authentication**: JWT-based with refresh tokens
- **Security**: Helmet, CORS, rate limiting, SSRF protection
- **API**: RESTful endpoints with server-sent events (SSE) for streaming
- **Middleware**: Request validation, error handling, audit logging

#### AI Integration
- **Providers**: Claude (Anthropic), Ollama, OpenAI, OpenRouter
- **Streaming**: Real-time analysis with server-sent events
- **Vision**: Multi-modal support for image analysis
- **Fallback**: Graceful degradation to alternative providers

### Architectural Patterns

**Feature-based Architecture**: Modular design with independent feature modules
```
src/features/
├── app/                    # Core application
├── auth/                   # Authentication & authorization
├── flow-analysis/          # Attack flow analysis
├── flow-export/            # Export functionality
├── flow-storage/           # Save/load operations
├── ioc-analysis/           # IOC/IOA extraction
├── threat-intelligence/    # Threat intel feeds
├── siem/                   # SIEM integrations
├── d3fend-mapping/         # Defensive mapping
├── executive-reporting/    # Metrics & reports
├── attack-simulation/      # Purple teaming
├── alert-triage/           # Alert management
├── case-management/        # Case tracking
└── playbook-generation/    # Playbook automation
```

**Shared Infrastructure**: Common components, services, and utilities
```
src/shared/
├── components/     # Reusable UI components
├── services/       # AI, auth, database, storage
├── theme/          # Design system & theming
├── context/        # Global state (density, theme)
├── utils/          # Utilities & helpers
└── constants/      # Application constants
```

**Security-first Design**:
- Server-side API processing (no client-side API keys)
- SSRF protection for external requests
- Rate limiting on all endpoints
- Input validation and sanitization
- Audit logging for compliance
- Role-based access control (RBAC)

### Data Flow

```
User Input → Frontend → Express Server → AI Provider
                ↓              ↓              ↓
         Local State    PostgreSQL      Streaming Response
                ↓              ↓              ↓
         React UI    ← Database Query ← Real-time Update
```

### Database Schema

**Core Tables**:
- `users`, `organizations`, `roles` - Authentication & RBAC
- `attack_flows`, `attack_techniques`, `iocs` - Threat intelligence
- `defense_matrices`, `d3fend_countermeasures` - Defensive mapping
- `alerts`, `cases`, `investigations` - SOC operations
- `simulations`, `simulation_results` - Purple teaming
- `reports`, `metrics`, `audit_logs` - Reporting & compliance

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher (or yarn/pnpm)
- **PostgreSQL**: v14 or higher (for enterprise features)
- **AI Provider** (choose one or more):
  - **Claude**: Anthropic API key ([get one here](https://console.anthropic.com))
  - **Ollama**: Local installation ([install guide](https://ollama.ai))
  - **OpenAI**: OpenAI API key (optional)
  - **OpenRouter**: OpenRouter API key (optional)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/davidljohnson/threatflow.git
cd threatflow
```

**2. Install dependencies**
```bash
npm install
```

**3. Setup PostgreSQL Database**
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE USER threatflow_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE threatflow_db OWNER threatflow_user;
GRANT ALL PRIVILEGES ON DATABASE threatflow_db TO threatflow_user;
\q

# Initialize schema
psql -U threatflow_user -d threatflow_db -f src/server/database/schema.sql
psql -U threatflow_user -d threatflow_db -f src/features/d3fend-mapping/db/schema-d3fend.sql
psql -U threatflow_user -d threatflow_db -f src/features/executive-reporting/db/schema-executive-reporting.sql
psql -U threatflow_user -d threatflow_db -f src/features/attack-simulation/db/schema-attack-simulation.sql
```

**4. Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

**Required environment variables**:
```env
# Database
DATABASE_URL=postgresql://threatflow_user:your_secure_password@localhost:5432/threatflow_db

# AI Provider (choose at least one)
ANTHROPIC_API_KEY=sk-ant-xxxxx                # Claude
OLLAMA_BASE_URL=http://localhost:11434        # Ollama (if using)
OPENAI_API_KEY=sk-xxxxx                       # OpenAI (if using)
OPENROUTER_API_KEY=sk-or-xxxxx                # OpenRouter (if using)

# JWT Secrets (generate strong random strings)
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here

# Server
PORT=3001
NODE_ENV=development
```

**5. Initialize database with demo data**
```bash
npm run init-demo
```

**Demo credentials**:
- **Email**: admin@threatflow-demo.local
- **Username**: admin
- **Password**: ThreatFlow@2024
- **Role**: admin

**6. Start the application**

**Option A: Using Management Script (Recommended)**
```bash
# Validates prerequisites and starts both services
./threatflow.sh start
```

**Option B: Using npm**
```bash
npm run dev:full
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

**Tip**: Use `./threatflow.sh status` to check if services are running, or `./threatflow.sh health` for detailed health checks.

## 🎮 Starting & Stopping

### Management Script (Recommended)

ThreatFlow includes a comprehensive management script with automatic prerequisite validation:

```bash
# Start with validation (recommended)
./threatflow.sh start

# Check status
./threatflow.sh status

# View health
./threatflow.sh health

# Stop services
./threatflow.sh stop

# View all commands
./threatflow.sh --help
```

**Features**:
- ✅ Automatic prerequisite validation (Node.js, PostgreSQL, .env, dependencies)
- ✅ Health checks for frontend, backend, database, and AI providers
- ✅ Process management with PID tracking
- ✅ Log management and viewing
- ✅ Production mode with PM2 support
- ✅ Port availability checking
- ✅ Color-coded output

See [Management Script Documentation](./docs/MANAGEMENT_SCRIPT.md) for complete guide.

### Start Commands (Manual)

**Development (Recommended)**:
```bash
# Start both frontend and backend together
npm run dev:full
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

**Individual Services**:
```bash
# Frontend only (Vite dev server)
npm run dev

# Backend only (Express server)
npm run server
```

**Production**:
```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Start production server
NODE_ENV=production node server.ts
```

### Stop Commands

**Development**:
```bash
# Stop dev:full or individual services
Ctrl+C (in terminal)

# Kill background processes
pkill -f "vite"
pkill -f "node server"
```

**Production**:
```bash
# If using PM2
pm2 stop threatflow
pm2 delete threatflow

# If using systemd
sudo systemctl stop threatflow

# Manual process kill
ps aux | grep node
kill -9 <PID>
```

### Service Management

**Using PM2 (Recommended for production)**:
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "threatflow-frontend" -- run dev
pm2 start server.ts --name "threatflow-backend"

# Manage services
pm2 status                 # Check status
pm2 logs                   # View logs
pm2 restart threatflow-*   # Restart all
pm2 stop threatflow-*      # Stop all
pm2 delete threatflow-*    # Remove all

# Auto-start on boot
pm2 startup
pm2 save
```

**Using Docker (Alternative)**:
```bash
# Build and start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Rebuild
docker-compose up -d --build
```

### Health Checks

```bash
# Check frontend
curl http://localhost:5173

# Check backend
curl http://localhost:3001/api/health

# Check database
psql -U threatflow_user -d threatflow_db -c "SELECT 1;"

# Check AI provider
curl http://localhost:3001/api/providers/status
```

## 📦 Modules & Features

### Core Modules

#### 1. **Application Core** (`src/features/app/`)
Main application shell and navigation
- **Components**: AppBar, SearchForm, SettingsDialog, NavigationSidebar
- **Hooks**: useAppState, useProviderSettings
- **Services**: Application configuration, provider management

#### 2. **Authentication & Authorization** (`src/features/auth/`)
Enterprise authentication system
- **Components**: LoginForm, RegisterForm, RoleManager
- **Services**: JWT authentication, session management, RBAC
- **Database**: users, organizations, roles, permissions
- **Features**: Multi-factor authentication, SSO support, audit logging

#### 3. **Flow Analysis** (`src/features/flow-analysis/`)
Attack flow analysis and visualization
- **Components**: StreamingFlowVisualization, NodeFactory, StoryModeControls
- **Services**: AI integration, flow conversion, graph layout
- **Node Types**: Operator, Tool, Malware, Action, Asset, Infrastructure, Vulnerability, URL
- **Hooks**: useStreamingGraph, useStoryMode, useGraphLayout
- **Converters**: 8 specialized node converters for different entity types

#### 4. **Flow Export** (`src/features/flow-export/`)
Export attack flows to various formats
- **Services**:
  - STIX 2.1 Bundle Exporter
  - Attack Flow Builder (.afb) Exporter
  - PNG Image Exporter
  - Interactive HTML Exporter
  - Vector Export (SVG)
- **Templates**: Export templates for customization

#### 5. **Flow Storage** (`src/features/flow-storage/`)
Save, load, and manage attack flows
- **Components**: SaveFlowDialog, LoadFlowDialog, FlowVersioning, FlowComparison
- **Services**: LocalStorageService, FlowManagementService
- **Features**: Versioning, tags, search, metadata, templates

#### 6. **IOC/IOA Analysis** (`src/features/ioc-analysis/`)
Indicator of Compromise extraction and analysis
- **Components**: IOCExtractor, IOCEnrichment, IOCVisualization
- **Services**: IOC extraction, enrichment, validation
- **Types**: IP addresses, domains, URLs, hashes, file paths, registry keys

#### 7. **Threat Intelligence** (`src/features/threat-intelligence/`)
Threat feed integration and management
- **Components**: ThreatFeedManager, ThreatCorrelation
- **Services**: Feed aggregation, STIX processing, threat correlation
- **Integrations**: MISP, TAXII, custom feeds
- **Database**: threat_feeds, threat_indicators, threat_actors

#### 8. **SIEM Integration** (`src/features/siem/`)
Security Information and Event Management connectivity
- **Integrations**:
  - Splunk (REST API, HEC)
  - Elastic Security (Elasticsearch API)
  - QRadar (REST API)
  - ArcSight (REST API)
  - Chronicle (API)
- **Services**: Event forwarding, alert ingestion, query execution
- **Features**: Bi-directional sync, custom mappings, field normalization

#### 9. **D3FEND Mapping** (`src/features/d3fend-mapping/`)
Automated defensive countermeasure recommendations
- **Services**: D3FENDMappingService with 5 core methods
- **Components**: D3FENDMatrixViewer, DefensiveCoverageHeatmap, CountermeasurePrioritizer
- **Database**: 11 tables for countermeasures, mappings, coverage
- **API**: 25+ REST endpoints for mapping and analysis
- **Features**:
  - 20+ pre-configured countermeasures
  - 6-factor ROI prioritization
  - Coverage assessment
  - Architecture document generation

#### 10. **Executive Reporting** (`src/features/executive-reporting/`)
Metrics, dashboards, and compliance reporting
- **Services**: ExecutiveReportingService, ReportTemplateService
- **Reports**: Compliance (SOC 2, ISO 27001, NIST), Risk, Operational, Strategic
- **Metrics**: MTTD, MTTR, threat trends, coverage, incident statistics
- **Database**: reports, metrics, report_templates, scheduled_reports
- **Components**: MetricsDashboard, ReportGenerator, ComplianceReports
- **Export**: PDF, Excel, JSON formats

#### 11. **Attack Simulation** (`src/features/attack-simulation/`)
Purple teaming and defense validation
- **Services**: AttackSimulationService, PurpleTeamWorkflowService
- **Components**: SimulationRunner, ResultsViewer, GapAnalysis
- **Database**: simulations, simulation_techniques, simulation_results
- **Features**:
  - MITRE ATT&CK technique simulation
  - Defense validation
  - Gap identification
  - Remediation tracking
  - Purple team collaboration

#### 12. **Alert Triage** (`src/features/alert-triage/`)
Intelligent alert management and prioritization
- **Components**: AlertQueue, AlertDetails, TriageWorkflow
- **Services**: Alert categorization, ML-based prioritization
- **Database**: alerts, triage_decisions, alert_rules
- **Features**: Auto-triage, escalation rules, SLA tracking

#### 13. **Case Management** (`src/features/case-management/`)
Incident and investigation tracking
- **Components**: CaseBoard, CaseDetails, TimelineView, EvidenceManager
- **Services**: Case lifecycle management, evidence chain of custody
- **Database**: cases, case_evidence, case_timeline, case_collaborators
- **Features**: Templates, workflows, collaboration, reporting

#### 14. **Investigation** (`src/features/investigation/`)
Guided investigation workflows
- **Components**: InvestigationWorkbench, EvidenceCollector, AnalysisTools
- **Services**: Investigation orchestration, evidence analysis
- **Features**: Guided playbooks, evidence graphs, hypothesis tracking

#### 15. **Playbook Generation** (`src/features/playbook-generation/`)
Automated response playbook creation
- **Services**: PlaybookGenerator, PlaybookTemplates
- **Components**: PlaybookEditor, PlaybookLibrary, PlaybookExecutor
- **Database**: playbooks, playbook_steps, playbook_executions
- **Templates**: MITRE ATT&CK-based response playbooks

#### 16. **Machine Learning** (`src/features/ml-ai/`)
Advanced AI capabilities for threat intelligence
- **Services**: PatternRecognition, AnomalyDetection, ThreatPrediction
- **Models**: Clustering, classification, regression
- **Features**: Auto-training, model versioning, confidence scoring

#### 17. **SOC Dashboard** (`src/features/soc-dashboard/`)
Real-time SOC operations dashboard
- **Components**: LiveMetrics, AlertFeed, ThreatMap, TeamActivity
- **Services**: Real-time data aggregation, WebSocket updates
- **Widgets**: Customizable dashboard widgets

#### 18. **Threat Hunting** (`src/features/threat-hunting/`)
Proactive threat hunting capabilities
- **Components**: HuntingConsole, QueryBuilder, ResultsAnalysis
- **Services**: Advanced search, pattern detection, correlation
- **Features**: Saved hunts, hunt templates, collaboration

#### 19. **Threat Correlation** (`src/features/threat-correlation/`)
Multi-source threat correlation engine
- **Services**: CorrelationEngine, SimilarityAnalysis
- **Components**: CorrelationGraph, RelatedThreats
- **Features**: Campaign tracking, actor attribution, pattern linking

#### 20. **Data Management** (`src/features/data-management/`)
Data retention and lifecycle management
- **Services**: DataRetention, Archival, Cleanup
- **Features**: Retention policies, data export, compliance

### Shared Components

#### UI Component System (`src/shared/components/`)
Professional, reusable components:
- **Alert**: Status messages and notifications
- **Button**: Primary, secondary, text variants
- **Dropdown**: Select menus and multi-select
- **EnhancedDialog**: Modal dialogs with actions
- **EnhancedForm**: Form builder with validation
- **ErrorBoundary**: Error handling and recovery
- **LoadingIndicator**: Loading states and skeletons
- **SearchInput**: Advanced search with filters
- **Typography**: Consistent text styling
- **DensitySettings**: UI density controls
- **ThemeToggle**: Dark/light mode switcher
- **CommandPalette**: Keyboard-driven navigation
- **NavigationSidebar**: Feature navigation
- **Breadcrumb**: Navigation breadcrumbs
- **AccessibleModal**: WCAG-compliant modals

#### Services (`src/shared/services/`)
Core infrastructure services:
- **AI Providers**: Claude, Ollama, OpenAI, OpenRouter adapters
- **Authentication**: JWT service, session management
- **Database**: PostgreSQL connection pool, query builder
- **Storage**: LocalStorage, IndexedDB wrappers
- **Streaming**: SSE client for real-time updates
- **Image**: Download, extract, filter, optimize images
- **Vision**: AI vision analysis for diagrams
- **Config**: Application configuration management

#### Theme System (`src/shared/theme/`)
Professional design system:
- **threatflow-theme.ts**: Main theme configuration
- **density.ts**: Adaptive density system (Compact, Comfortable, Spacious)
- **theme-variants.ts**: Dark/light theme variants
- **Constants**: Colors, typography, spacing, shadows

#### Context Providers (`src/shared/context/`)
Global state management:
- **DensityContext**: UI density preferences
- **ThemeContext**: Dark/light theme
- **AuthContext**: Authentication state
- **ConfigContext**: Application configuration

## 🔌 Integrations

### SIEM Platforms

#### Splunk
- **Connection**: REST API + HTTP Event Collector (HEC)
- **Features**: Event forwarding, search queries, alert ingestion
- **Configuration**: `SPLUNK_HOST`, `SPLUNK_TOKEN`, `SPLUNK_HEC_TOKEN`
- **Endpoints**: `/api/siem/splunk/*`

#### Elastic Security
- **Connection**: Elasticsearch REST API
- **Features**: Index management, alert queries, detection rules
- **Configuration**: `ELASTIC_HOST`, `ELASTIC_API_KEY`
- **Endpoints**: `/api/siem/elastic/*`

#### QRadar
- **Connection**: REST API v15+
- **Features**: Offense management, event forwarding, reference sets
- **Configuration**: `QRADAR_HOST`, `QRADAR_SEC_TOKEN`
- **Endpoints**: `/api/siem/qradar/*`

#### ArcSight
- **Connection**: REST API
- **Features**: Event submission, active list management
- **Configuration**: `ARCSIGHT_HOST`, `ARCSIGHT_TOKEN`
- **Endpoints**: `/api/siem/arcsight/*`

#### Chronicle
- **Connection**: Chronicle API
- **Features**: Event ingestion, UDM search, detection rules
- **Configuration**: `CHRONICLE_CUSTOMER_ID`, `CHRONICLE_API_KEY`
- **Endpoints**: `/api/siem/chronicle/*`

### Threat Intelligence Platforms

#### MISP (Malware Information Sharing Platform)
- **Connection**: REST API
- **Features**: Event import/export, attribute sync, galaxy mapping
- **Configuration**: `MISP_URL`, `MISP_API_KEY`
- **Endpoints**: `/api/threat-intel/misp/*`

#### TAXII Servers
- **Connection**: TAXII 2.1 protocol
- **Features**: Collection subscription, STIX object sync
- **Configuration**: `TAXII_SERVER_URL`, `TAXII_API_KEY`
- **Endpoints**: `/api/threat-intel/taxii/*`

#### Picus Security
- **Connection**: REST API
- **Features**: Attack simulation integration, threat scenario import
- **Configuration**: `PICUS_BASE_URL`, `PICUS_REFRESH_TOKEN`
- **Setup**: Use `python scripts/picus-token-helper.py --setup`
- **Endpoints**: `/api/integrations/picus/*`

### AI/ML Providers

#### Claude (Anthropic)
- **Models**: claude-sonnet-4, claude-opus-4
- **Features**: Attack flow analysis, vision analysis, streaming
- **Configuration**: `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`
- **Server-side**: All API calls via Express proxy

#### Ollama (Local)
- **Models**: llama3.2-vision, mistral, codellama
- **Features**: Local processing, privacy-focused, offline capable
- **Configuration**: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
- **Setup**: `ollama serve` + `ollama pull llama3.2-vision:latest`

#### OpenAI
- **Models**: gpt-4-turbo, gpt-4-vision
- **Features**: Alternative AI provider, vision analysis
- **Configuration**: `OPENAI_API_KEY`, `OPENAI_MODEL`

#### OpenRouter
- **Features**: Multi-model router, cost optimization
- **Configuration**: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`

### MITRE Frameworks

#### ATT&CK Enterprise
- **Version**: Latest (auto-updated)
- **Features**: Technique mapping, tactic classification, sub-technique support
- **Data**: Embedded ATT&CK data + API integration

#### D3FEND
- **Source**: https://d3fend.mitre.org/api/
- **Features**: Defensive countermeasure mapping, effectiveness scoring
- **Database**: 20+ pre-configured countermeasures + custom additions

### Export Integrations

#### STIX 2.1
- **Format**: JSON bundles with full STIX compliance
- **Objects**: Attack patterns, indicators, relationships, identity
- **Use case**: Share with TAXII servers, MISP, other STIX platforms

#### Attack Flow Builder
- **Format**: .afb files (MITRE Attack Flow Builder)
- **Features**: Import into MITRE's visualization tool
- **Use case**: Collaborative analysis, standardized documentation

#### Chronicle SecOps
- **Format**: UDM events
- **Features**: Direct ingestion into Chronicle
- **Use case**: SIEM integration, detection engineering

## 🛠️ Development

### Available Scripts

**Development**:
```bash
npm run dev:full        # Start both frontend and backend (recommended)
npm run dev             # Frontend only (Vite dev server - port 5173)
npm run server          # Backend only (Express server - port 3001)
```

**Building**:
```bash
npm run build           # Production build with TypeScript validation
npm run preview         # Preview production build locally
npm run type-check      # TypeScript type checking only
```

**Code Quality**:
```bash
npm run lint            # ESLint with TypeScript support (max 0 warnings)
npm run lint:fix        # Auto-fix ESLint issues
npm run format          # Prettier code formatting
```

**Database**:
```bash
npm run init-demo       # Initialize database with demo user
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed database with sample data
```

**Testing**:
```bash
npm run test            # Run test suite
npm run test:coverage   # Test coverage report
npm run test:e2e        # End-to-end tests
```

### Production Build Features

- **Console Removal**: All `console.log`, `console.debug`, `console.info` removed automatically
- **Tree Shaking**: Dead code elimination for smaller bundles
- **Code Splitting**: Automatic chunking for optimal loading
- **Minification**: JavaScript and CSS minification
- **Source Maps**: Production source maps for debugging
- **Bundle Analysis**: `npm run build -- --analyze` for bundle size analysis

### Environment Configuration

**Development** (`.env.development`):
```env
NODE_ENV=development
VITE_API_URL=http://localhost:3001
VITE_ENABLE_DEBUG=true
```

**Production** (`.env.production`):
```env
NODE_ENV=production
VITE_API_URL=https://your-domain.com
VITE_ENABLE_DEBUG=false
```

**Environment Variables**:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes* | - | Claude API key |
| `OLLAMA_BASE_URL` | Yes* | - | Ollama server URL |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `JWT_REFRESH_SECRET` | Yes | - | Refresh token secret |
| `PORT` | No | 3001 | Server port |
| `NODE_ENV` | No | development | Environment |
| `RATE_LIMIT_ARTICLES` | No | 10 | Article fetches per 15 min |
| `RATE_LIMIT_STREAMING` | No | 5 | AI requests per 5 min |
| `MAX_REQUEST_SIZE` | No | 10mb | Max request body size |
| `ALLOWED_ORIGINS` | No | localhost:5173 | CORS origins (comma-separated) |

*At least one AI provider (Claude or Ollama) is required.

See `.env.example` for complete configuration template.

### Adding New Features

**1. Create feature directory**:
```bash
mkdir -p src/features/my-feature/{components,services,types,db,api}
```

**2. Follow structure**:
```
src/features/my-feature/
├── components/         # React components
│   ├── MyComponent.tsx
│   └── index.tsx
├── services/          # Business logic
│   ├── MyService.ts
│   └── index.ts
├── types/             # TypeScript types
│   └── index.ts
├── db/                # Database schema
│   └── schema-my-feature.sql
├── api/               # API routes
│   └── myFeatureRoutes.ts
└── README.md          # Feature documentation
```

**3. Register API routes** (`server.ts`):
```typescript
import myFeatureRoutes from './src/features/my-feature/api/myFeatureRoutes';
app.use('/api/my-feature', myFeatureRoutes);
```

**4. Add database schema**:
```bash
psql -U threatflow_user -d threatflow_db -f src/features/my-feature/db/schema-my-feature.sql
```

**5. Follow conventions**:
- Use TypeScript strict mode
- Export types from `types/index.ts`
- Use shared components from `src/shared/components/`
- Follow ThreatFlow theme system
- Add error boundaries
- Include loading states
- Write comprehensive JSDoc comments

### Code Style

**TypeScript**:
- Strict mode enabled
- No implicit any
- Explicit return types for functions
- Interface over type (except for unions)

**React**:
- Functional components with hooks
- Props interfaces with JSDoc
- Memoization for expensive calculations
- Error boundaries for error handling

**CSS**:
- Material-UI `sx` prop for styling
- Theme-based values (no hardcoded colors/spacing)
- Responsive design with breakpoints
- Accessibility (ARIA labels, semantic HTML)

## 🔍 Troubleshooting

### Common Issues

#### CORS Errors
**Symptoms**: "CORS policy" errors in browser console
**Solution**:
```bash
# 1. Ensure proxy server is running
npm run server

# 2. Check ALLOWED_ORIGINS in .env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# 3. Restart server after .env changes
```

#### API Key Issues
**Symptoms**: Authentication errors, "Invalid API key"
**Solution**:
```bash
# 1. Verify API key format
ANTHROPIC_API_KEY=sk-ant-xxxxx  # Should start with sk-ant-

# 2. Check for extra spaces/newlines
cat .env | grep ANTHROPIC_API_KEY  # Should be single line

# 3. Verify key in Anthropic Console
# Visit console.anthropic.com to check key validity

# 4. Restart server
npm run dev:full
```

#### Database Connection Errors
**Symptoms**: "Connection refused", "Database does not exist"
**Solution**:
```bash
# 1. Check PostgreSQL is running
sudo systemctl status postgresql

# 2. Verify connection string
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# 3. Test connection
psql -U threatflow_user -d threatflow_db -c "SELECT 1;"

# 4. Initialize schema if needed
npm run init-demo
```

#### Ollama Issues
**Symptoms**: "Ollama not available", connection errors
**Solution**:
```bash
# 1. Start Ollama service
ollama serve

# 2. Pull required model
ollama pull llama3.2-vision:latest

# 3. Verify Ollama is accessible
curl http://localhost:11434/api/tags

# 4. Check OLLAMA_BASE_URL in .env
OLLAMA_BASE_URL=http://localhost:11434
```

#### Build Failures
**Symptoms**: TypeScript errors, build process fails
**Solution**:
```bash
# 1. Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# 2. Check TypeScript errors
npm run type-check

# 3. Clear build cache
rm -rf dist .vite

# 4. Rebuild
npm run build
```

#### Rate Limiting
**Symptoms**: "Too many requests" errors
**Solution**:
```bash
# Adjust rate limits in .env
RATE_LIMIT_ARTICLES=20         # Increase from default 10
RATE_LIMIT_STREAMING=10        # Increase from default 5
RATE_LIMIT_IMAGES=100          # Increase from default 50
```

#### Memory Issues
**Symptoms**: Node heap out of memory
**Solution**:
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run dev:full
```

### Debug Mode

**Enable verbose logging**:
```env
# .env
DEBUG=true
LOG_LEVEL=debug
```

**View server logs**:
```bash
# Development
npm run server  # Logs to console

# Production with PM2
pm2 logs threatflow-backend

# Production logs
tail -f logs/application.log
tail -f logs/error.log
```

### Health Checks

**System health**:
```bash
# Frontend
curl http://localhost:5173

# Backend
curl http://localhost:3001/api/health

# Database
curl http://localhost:3001/api/health/database

# AI Providers
curl http://localhost:3001/api/providers/status
```

### Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Unauthorized | Check JWT token or re-login |
| 403 | Forbidden | Insufficient permissions |
| 429 | Rate Limited | Wait and retry, or increase limits |
| 500 | Server Error | Check server logs |
| 503 | Service Unavailable | Check AI provider status |

## 📚 Documentation

**Feature Documentation**:
- [UI Density System](./UI_DENSITY_DOCUMENTATION.md) - Adaptive information density
- [D3FEND Mapping](./D3FEND_MAPPING_DOCUMENTATION.md) - Defensive countermeasures
- [Executive Reporting](./docs/executive-reporting.md) - Metrics and reports
- [Attack Simulation](./docs/attack-simulation.md) - Purple teaming
- [CLAUDE.md](./CLAUDE.md) - Developer guide for Claude Code

**API Documentation**:
- REST API reference: http://localhost:3001/api/docs (when running)
- OpenAPI spec: `/docs/api/openapi.yaml`

**Architecture Diagrams**:
- System architecture: `/docs/architecture/system-overview.md`
- Database schema: `/docs/architecture/database-schema.md`
- Security model: `/docs/architecture/security.md`

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

**1. Fork and clone**:
```bash
git clone https://github.com/your-username/threatflow.git
cd threatflow
git checkout -b feature/my-feature
```

**2. Make changes**:
- Follow code style guidelines
- Add tests for new features
- Update documentation
- Ensure all tests pass

**3. Commit with conventional commits**:
```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "docs: update README"
```

**4. Submit pull request**:
- Clear description of changes
- Reference related issues
- Include screenshots if UI changes

**Types of contributions**:
- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance improvements
- 🔒 Security enhancements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

**Community Support**:
- GitHub Issues: [github.com/davidljohnson/threatflow/issues](https://github.com/davidljohnson/threatflow/issues)
- Discussions: [github.com/davidljohnson/threatflow/discussions](https://github.com/davidljohnson/threatflow/discussions)

**Professional Support**:
- Email: support@threatflow.io
- Documentation: [docs.threatflow.io](https://docs.threatflow.io)

**Security Issues**:
- Security vulnerabilities should be reported privately to security@threatflow.io
- Do not open public issues for security vulnerabilities

## 🙏 Acknowledgments

- **MITRE Corporation** - ATT&CK and D3FEND frameworks
- **Anthropic** - Claude AI platform
- **Ollama** - Local AI inference
- **React Flow** - Visualization library
- **Material-UI** - Component library
- **PostgreSQL** - Database system

## 🗺️ Roadmap

**Version 2.0** (Q2 2024):
- [ ] Mobile app (iOS/Android)
- [ ] Real-time collaboration features
- [ ] Advanced ML models for threat prediction
- [ ] Plugin ecosystem for custom integrations

**Version 2.1** (Q3 2024):
- [ ] Automated threat hunting workflows
- [ ] Enhanced purple team capabilities
- [ ] Custom reporting engine
- [ ] API marketplace

**Long-term**:
- Kubernetes deployment templates
- Multi-tenant SaaS platform
- Federated threat intelligence sharing
- Advanced graph analytics

---

**Built with ❤️ for the cybersecurity community**

For detailed setup instructions, API documentation, and advanced features, visit our [documentation](https://docs.threatflow.io).
