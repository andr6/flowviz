# ThreatFlow - Professional Cybersecurity Threat Intelligence Platform

<div align="center">

![ThreatFlow Logo](docs/assets/threatflow-logo.png)

**Transform threat intelligence into interactive attack flow visualizations**

[![Quality Gates](https://github.com/yourorg/threatflow/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/yourorg/threatflow/actions/workflows/quality-gates.yml)
[![Security Scan](https://img.shields.io/badge/security-scanned-green.svg)](https://github.com/yourorg/threatflow/security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org)

[📖 Documentation](docs/) • [🚀 Quick Start](#quick-start) • [💡 Features](#features) • [🔧 API Reference](docs/api/) • [🤝 Contributing](CONTRIBUTING.md)

</div>

---

## 🎯 Overview

**ThreatFlow** is a cutting-edge cybersecurity platform that transforms threat intelligence articles, incident reports, and security data into interactive, visual attack flow diagrams using the MITRE ATT&CK framework. Built for security analysts, threat hunters, and incident responders who need to quickly understand, analyze, and communicate complex attack patterns.

### ✨ What Makes ThreatFlow Special

- 🧠 **AI-Powered Analysis**: Multiple AI providers (Claude, OpenAI, Ollama, OpenRouter) for intelligent threat analysis
- 🎨 **Interactive Visualizations**: Real-time attack flow diagrams with React Flow
- 🏢 **Enterprise Ready**: PostgreSQL backend, RBAC, SIEM integrations, audit logs
- 📊 **MITRE ATT&CK Integration**: Full framework mapping with technique details
- 🔒 **Security First**: Server-side processing, SSRF protection, comprehensive rate limiting
- 📤 **Multi-Format Export**: PNG, SVG, STIX 2.1, Attack Flow Builder, interactive HTML

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 14+ (for enterprise features)
- **AI Provider** API key (Claude, OpenAI, or Ollama)

### 1. Clone & Install

```bash
git clone https://github.com/yourorg/threatflow.git
cd threatflow
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit configuration (required)
nano .env
```

**Minimum Required Configuration:**
```env
# AI Provider (choose one)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Security (generate with: openssl rand -hex 32)
JWT_SECRET=your_secure_jwt_secret_32_chars_minimum
SESSION_SECRET=your_secure_session_secret_32_chars_minimum

# Database (optional for basic features)
DATABASE_URL=postgresql://user:password@localhost:5432/threatflow_db
```

### 3. Database Setup (Optional - Enterprise Features)

```bash
# Install PostgreSQL and create database
sudo -u postgres psql
CREATE USER threatflow_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE threatflow_db OWNER threatflow_user;
GRANT ALL PRIVILEGES ON DATABASE threatflow_db TO threatflow_user;
\q

# Initialize demo user (optional)
npm run init-demo
```

### 4. Start Development

```bash
# Start both frontend and backend (recommended)
npm run dev:full

# Or start separately:
npm run server  # Backend on :3001
npm run dev     # Frontend on :5173
```

🎉 **Access ThreatFlow**: http://localhost:5173

---

## 💡 Features

### 🔍 Core Analysis
- **Multi-Format Input**: PDFs, Word docs, PowerPoint, images (OCR), URLs, plain text
- **Real-Time Streaming**: Watch analysis happen live with progress indicators
- **Intelligent Parsing**: AI extracts TTPs, IOCs, and attack sequences automatically
- **MITRE ATT&CK Mapping**: Automatic technique identification and classification

### 🎨 Interactive Visualization
- **Dynamic Attack Flows**: Drag, zoom, pan through complex attack chains
- **Node Clustering**: Group techniques by MITRE ATT&CK tactics
- **Timeline Analysis**: Temporal attack progression with playback controls
- **Confidence Scoring**: Visual confidence indicators for all analysis
- **Custom Themes**: Professional styling with cybersecurity aesthetics

### 🏢 Enterprise Features
- **User Authentication**: JWT-based with role-based access control
- **Database Storage**: Persistent flow storage with metadata and search
- **SIEM Integration**: Splunk, QRadar, Azure Sentinel connectors
- **Audit Logging**: Comprehensive security and usage logging
- **Team Collaboration**: Share, comment, and collaborate on threat analyses

### 📤 Export & Sharing
- **Multiple Formats**: PNG, SVG, PDF, STIX 2.1, Attack Flow Builder
- **Interactive HTML**: Self-contained web exports for sharing
- **Presentation Mode**: Full-screen mode for briefings and presentations
- **Batch Processing**: Analyze multiple documents simultaneously

---

## 🏗️ Core Project Structure

```
threatflow/
├── 🎯 Core Application
│   ├── src/
│   │   ├── features/           # Feature-based architecture
│   │   │   ├── app/           # Core app components (AppBar, Settings)
│   │   │   ├── auth/          # Enterprise authentication
│   │   │   ├── flow-analysis/ # Main analysis & visualization
│   │   │   ├── flow-export/   # Export functionality
│   │   │   ├── flow-storage/  # Save/load with metadata
│   │   │   └── [others]/      # Additional enterprise features
│   │   ├── shared/            # Shared utilities
│   │   │   ├── components/    # UI component system
│   │   │   ├── services/      # AI providers, database, auth
│   │   │   ├── theme/         # ThreatFlow design system
│   │   │   └── utils/         # Common utilities
│   │   └── main.tsx          # Application entry point
│   ├── server.ts             # Express server with security middleware
│   └── security-utils.js     # SSRF protection & secure utilities
│
├── 🔧 Configuration
│   ├── .env.example          # Environment template
│   ├── eslint.config.js      # Code quality rules
│   ├── vite.config.ts        # Build configuration
│   └── tsconfig.json         # TypeScript configuration
│
├── 🧪 Quality Assurance
│   ├── .github/workflows/    # CI/CD pipelines
│   ├── .husky/              # Git hooks for quality gates
│   ├── .prettierrc.js       # Code formatting rules
│   └── .eslintrc.enhanced.js # Enhanced ESLint rules
│
└── 📚 Documentation
    ├── docs/                # Detailed documentation
    ├── README.md           # This file
    └── CONTRIBUTING.md     # Contribution guidelines
```

### 🧩 Key Architectural Patterns

**🎯 Feature-Based Architecture**
- Each feature is self-contained with its own components, services, and types
- Clear separation of concerns and easy testing
- Independent deployment and scaling capabilities

**🔒 Security-First Design**
- All AI processing happens server-side
- SSRF protection for all external requests
- Comprehensive input validation and sanitization
- Rate limiting and abuse prevention

**⚡ Streaming Architecture**
- Real-time analysis updates via Server-Sent Events
- Chunked processing for large documents
- Progressive visualization updates

**🎨 Professional Theming**
- Consistent ThreatFlow brand across all components
- Material-UI with custom cybersecurity aesthetics
- Responsive design for desktop and mobile

---

## 🛠️ Development Guide

### Code Quality Standards

```bash
# Run all quality checks
npm run lint              # ESLint with zero warnings
npx prettier --check .    # Code formatting check
npx tsc --noEmit         # TypeScript compilation check
npm audit --omit dev     # Security vulnerability check
```

### Adding New Features

1. **Create Feature Directory**
   ```bash
   mkdir src/features/your-feature
   mkdir src/features/your-feature/{components,services,types}
   ```

2. **Follow Naming Conventions**
   - Components: PascalCase (e.g., `ThreatAnalysis.tsx`)
   - Services: camelCase (e.g., `threatAnalysisService.ts`)
   - Types: PascalCase interfaces (e.g., `ThreatAnalysisConfig`)

3. **Implement Tests**
   ```bash
   # Add tests following existing patterns
   # Test files: *.test.ts, *.spec.ts
   ```

4. **Update Documentation**
   - Add feature documentation in `docs/features/`
   - Update API documentation if adding server endpoints
   - Add configuration examples to `.env.example`

### AI Provider Integration

```typescript
// Example: Adding a new AI provider
export class NewProviderService implements AIProvider {
  async streamAnalysis(request: AnalysisRequest): Promise<ReadableStream> {
    // Implement streaming analysis
  }
}
```

### Database Migrations

```bash
# Create new migration
npm run migrate:create your_migration_name

# Run migrations
npm run migrate:up

# Rollback
npm run migrate:down
```

---

## 🔧 Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | ✅ | - | Claude AI API key |
| `DATABASE_URL` | ⚪ | - | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | - | JWT signing secret (32+ chars) |
| `SESSION_SECRET` | ✅ | - | Session encryption secret (32+ chars) |
| `PORT` | ⚪ | 3001 | Server port |
| `NODE_ENV` | ⚪ | development | Environment mode |
| `RATE_LIMIT_ANALYSIS` | ⚪ | 10 | Analysis requests per minute |
| `MAX_REQUEST_SIZE` | ⚪ | 10mb | Maximum request body size |

### AI Provider Configuration

<details>
<summary>📋 Click to expand provider configurations</summary>

**Claude (Anthropic)**
```env
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-20250514
```

**OpenAI**
```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

**Ollama (Local)**
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2-vision:latest
```

**OpenRouter**
```env
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

</details>

### Security Configuration

```env
# Rate Limiting (requests per time window)
RATE_LIMIT_ARTICLES=10        # Per 15 minutes
RATE_LIMIT_IMAGES=50          # Per 10 minutes
RATE_LIMIT_STREAMING=5        # Per 5 minutes

# Request Size Limits
MAX_ARTICLE_SIZE=5242880      # 5MB
MAX_IMAGE_SIZE=3145728        # 3MB

# CORS Origins (production)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Structure

```
tests/
├── unit/              # Unit tests for individual components
├── integration/       # API and service integration tests
├── e2e/              # End-to-end browser tests
├── fixtures/         # Test data and mock files
└── utils/            # Testing utilities and helpers
```

---

## 📊 Performance

### Bundle Size Targets
- **Main Bundle**: < 500KB gzipped
- **Vendor Chunks**: < 1MB total
- **Async Chunks**: < 200KB each

### Performance Monitoring

```bash
# Analyze bundle size
npm run build
npm run analyze

# Performance audit
npm run perf:audit

# Lighthouse CI
npm run lighthouse
```

---

## 🔒 Security

### Security Features
- ✅ Server-side AI processing
- ✅ SSRF protection for all external requests
- ✅ Input validation and sanitization
- ✅ Rate limiting and abuse prevention
- ✅ JWT authentication with refresh tokens
- ✅ SQL injection prevention
- ✅ XSS protection with CSP headers
- ✅ CORS configuration
- ✅ Helmet.js security headers

### Reporting Security Issues

Please report security vulnerabilities to: security@yourorg.com

**Do not** create public GitHub issues for security vulnerabilities.

---

## 🚀 Deployment

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Start production server
NODE_ENV=production npm start
```

### Docker Deployment

```dockerfile
# Example Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Checklist

**Production Deployment Checklist:**
- [ ] Set `NODE_ENV=production`
- [ ] Configure strong JWT/session secrets
- [ ] Set up PostgreSQL with SSL
- [ ] Configure CORS origins for your domain
- [ ] Set up HTTPS with valid certificates
- [ ] Configure rate limiting for your traffic
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy for database
- [ ] Test all AI provider integrations

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code of conduct
- Development workflow
- Pull request process
- Coding standards
- Testing requirements

### Quick Development Setup

```bash
# Fork and clone the repo
git clone https://github.com/yourusername/threatflow.git

# Install dependencies
npm install

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and test
npm run lint
npm run test

# Commit and push
git commit -m "Add amazing feature"
git push origin feature/amazing-feature
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **MITRE Corporation** for the ATT&CK framework
- **React Flow** team for the excellent visualization library
- **Material-UI** for the component system
- **OpenAI, Anthropic, Meta** for AI model access
- **Security research community** for threat intelligence

---

## 📞 Support & Community

- **📖 Documentation**: [Full documentation site](https://docs.threatflow.io)
- **💬 Discord**: [Join our community](https://discord.gg/threatflow)
- **🐛 Issues**: [GitHub Issues](https://github.com/yourorg/threatflow/issues)
- **📧 Email**: support@threatflow.io
- **🐦 Twitter**: [@ThreatFlow](https://twitter.com/threatflow)

---

<div align="center">

**Made with ❤️ by the cybersecurity community**

[⬆️ Back to Top](#threatflow---professional-cybersecurity-threat-intelligence-platform)

</div>